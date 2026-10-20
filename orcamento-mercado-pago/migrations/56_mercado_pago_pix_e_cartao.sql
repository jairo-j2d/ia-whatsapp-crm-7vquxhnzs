-- 56: Mercado Pago — Pix dinâmico e cartão com confirmação automática.
--
-- Regras combinadas com o Jairo (20/10/2026):
--   * O total do orçamento é o valor do Pix (o que a gráfica quer receber).
--   * Cada orçamento pode ter um acréscimo para cartão (0%, 10%, 12%...), invisível
--     para o cliente. Cartão = total + acréscimo. Com 0%, Pix e cartão custam igual.
--   * Cartão em até 10x: até 3x sem juros (taxa fica com a gráfica), 4x a 10x com
--     juros pagos pelo cliente ao Mercado Pago.
--   * Sem entrada de 50%: o pedido é quitado no primeiro pagamento.
--
-- Tudo aqui é aditivo: orçamentos existentes ficam com acréscimo 0% e o fluxo de
-- Pix manual + conferência continua funcionando igual.

-- 1. Acréscimo do cartão por orçamento ------------------------------------------
alter table orcamentos
  add column if not exists acrescimo_cartao_pct numeric not null default 0;
alter table orcamentos drop constraint if exists orcamentos_acrescimo_cartao_pct_check;
alter table orcamentos add constraint orcamentos_acrescimo_cartao_pct_check
  check (acrescimo_cartao_pct >= 0 and acrescimo_cartao_pct <= 30);

-- 2. Dados do Mercado Pago no pagamento ------------------------------------------
alter table pagamentos
  add column if not exists gateway        text,
  add column if not exists gateway_id     text,
  add column if not exists gateway_status text,
  add column if not exists parcelas       integer,
  add column if not exists taxa           numeric,
  add column if not exists valor_liquido  numeric,
  add column if not exists gateway_payload jsonb;
-- o mesmo pagamento do Mercado Pago nunca entra duas vezes (o aviso pode repetir)
create unique index if not exists pagamentos_gateway_id_key
  on pagamentos (gateway, gateway_id) where gateway_id is not null;

-- 3. Cobranças geradas (Pix com QR Code e links de cartão) -----------------------
create table if not exists cobrancas_mp (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid not null references orcamentos(id) on delete cascade,
  forma         text not null check (forma in ('pix', 'cartao')),
  valor         numeric not null check (valor > 0),
  mp_id         text not null,           -- id do pagamento (Pix) ou da preferência (cartão)
  status        text not null default 'pendente',
  qr_code       text,                    -- Pix copia e cola
  qr_code_base64 text,                   -- imagem do QR Code
  link          text,                    -- página do Mercado Pago (cartão) ou do Pix
  expira_em     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cobrancas_mp_orcamento_idx on cobrancas_mp (orcamento_id, forma, created_at desc);
alter table cobrancas_mp enable row level security;
drop policy if exists ler_equipe on cobrancas_mp;
create policy ler_equipe on cobrancas_mp for select to authenticated using (true);
-- escrita só pelas edge functions (service_role passa por cima do RLS)

-- 4. Valores que o cliente vê ----------------------------------------------------
-- Pix = saldo; cartão = saldo + acréscimo. Usa o saldo para os pedidos antigos que
-- ficaram com entrada paga; nos novos o saldo é o total.
create or replace function public.valores_pagamento_online(p_orcamento_id uuid)
returns jsonb
language sql stable security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'pix',    s.saldo,
    'cartao', round(s.saldo * (1 + coalesce(o.acrescimo_cartao_pct, 0) / 100), 2),
    'economia_pix', round(s.saldo * (1 + coalesce(o.acrescimo_cartao_pct, 0) / 100), 2) - s.saldo,
    'max_parcelas', 10,
    'sem_juros_ate', 3)
  from orcamentos o
  cross join lateral (select public.saldo_do_orcamento(o.id) as saldo) s
  where o.id = p_orcamento_id;
$$;
revoke all on function public.valores_pagamento_online(uuid) from public, anon, authenticated;
grant execute on function public.valores_pagamento_online(uuid) to service_role;

-- O portal pergunta pelo token. Não mostra o acréscimo, só os dois preços finais.
create or replace function public.portal_opcoes_pagamento(p_token uuid)
returns jsonb
language plpgsql stable security definer
set search_path to 'public'
as $$
declare o record; v jsonb;
begin
  select * into o from orcamentos where tracking_token = p_token;
  if not found then return jsonb_build_object('ok', false, 'erro', 'nao_encontrado'); end if;
  if o.token_ativo is false then return jsonb_build_object('ok', false, 'erro', 'desativado'); end if;
  if o.token_expira_em is not null and now() > o.token_expira_em then
    return jsonb_build_object('ok', false, 'erro', 'expirado');
  end if;
  v := public.valores_pagamento_online(o.id);
  return jsonb_build_object(
    'ok', true,
    'disponivel', o.feedback_status = 'aprovado' and o.status <> 'cancelado' and (v->>'pix')::numeric > 0,
    'pix', jsonb_build_object('valor', (v->>'pix')::numeric),
    'cartao', jsonb_build_object('valor', (v->>'cartao')::numeric,
                                 'max_parcelas', (v->>'max_parcelas')::int,
                                 'sem_juros_ate', (v->>'sem_juros_ate')::int),
    'economia_pix', (v->>'economia_pix')::numeric);
end $$;
grant execute on function public.portal_opcoes_pagamento(uuid) to anon, authenticated, service_role;

-- Dados para a edge function montar a cobrança (só service_role).
create or replace function public.mp_dados_cobranca(p_token uuid)
returns jsonb
language plpgsql security definer
set search_path to 'public'
as $$
declare id_orc uuid; o record; c record; v jsonb; emp record;
begin
  begin
    id_orc := public.portal_porta(p_token, 'gerar_cobranca_mp');   -- valida token e limita tentativas
  exception when others then
    return jsonb_build_object('ok', false, 'erro', sqlerrm);
  end;
  select * into o from orcamentos where id = id_orc;
  if o.feedback_status is distinct from 'aprovado' then return jsonb_build_object('ok', false, 'erro', 'nao_aprovado'); end if;
  if o.status = 'cancelado' then return jsonb_build_object('ok', false, 'erro', 'cancelado'); end if;
  v := public.valores_pagamento_online(o.id);
  if (v->>'pix')::numeric <= 0 then return jsonb_build_object('ok', false, 'erro', 'quitado'); end if;
  select nome, email, documento into c from clientes where id = o.cliente_id;
  select portal_url, nome_fantasia into emp from empresa order by atualizado_em desc limit 1;
  return jsonb_build_object(
    'ok', true, 'orcamento_id', o.id, 'numero', o.numero,
    'valor_pix', (v->>'pix')::numeric, 'valor_cartao', (v->>'cartao')::numeric,
    'max_parcelas', (v->>'max_parcelas')::int,
    'cliente', jsonb_build_object('nome', c.nome, 'email', nullif(btrim(coalesce(c.email, '')), ''),
                                  'documento', nullif(regexp_replace(coalesce(c.documento, ''), '\D', '', 'g'), '')),
    'portal_url', emp.portal_url, 'empresa', emp.nome_fantasia);
end $$;
revoke all on function public.mp_dados_cobranca(uuid) from public, anon, authenticated;
grant execute on function public.mp_dados_cobranca(uuid) to service_role;

-- 5. Recebe o resultado do Mercado Pago (chamada só pelo webhook) -----------------
-- p: {orcamento_id, gateway_id, forma, status_mp, valor, taxa, valor_liquido, parcelas, payload}
-- valor = o que a gráfica cobrou (transaction_amount). Juros do parcelamento pagos pelo
-- cliente ficam com o Mercado Pago e não entram aqui.
create or replace function public.mp_registrar_pagamento(p jsonb)
returns jsonb
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_orc uuid := nullif(p->>'orcamento_id', '')::uuid;
  v_gid text := p->>'gateway_id';
  v_st  text := p->>'status_mp';
  v_forma text := case when p->>'forma' in ('pix', 'cartao') then p->>'forma' else 'outro' end;
  pg record; v_id uuid; r jsonb;
begin
  if v_orc is null or v_gid is null then return jsonb_build_object('ok', false, 'erro', 'dados_incompletos'); end if;
  if not exists (select 1 from orcamentos where id = v_orc) then
    return jsonb_build_object('ok', false, 'erro', 'orcamento_nao_encontrado');
  end if;

  -- Cobranças: o Pix gerado é o próprio pagamento (mesmo id). Pago por qualquer forma,
  -- as outras cobranças em aberto do pedido são encerradas. Aviso de "pendente" não
  -- muda nada, senão o portal deixaria de reaproveitar o QR Code ainda válido.
  if v_st not in ('pending', 'in_process', 'authorized') then
    update cobrancas_mp
       set status = case when mp_id = v_gid then v_st else 'encerrada' end, updated_at = now()
     where orcamento_id = v_orc
       and (mp_id = v_gid or (v_st = 'approved' and status = 'pendente'));
  end if;

  select * into pg from pagamentos where gateway = 'mercadopago' and gateway_id = v_gid;

  if v_st = 'approved' then
    if found then
      update pagamentos set gateway_status = v_st, gateway_payload = p->'payload' where id = pg.id;
      if pg.status = 'confirmado' then return jsonb_build_object('ok', true, 'ja_confirmado', true); end if;
      v_id := pg.id;
    else
      insert into pagamentos (orcamento_id, valor, forma, status, declarado_pelo_cliente, observacao,
                              gateway, gateway_id, gateway_status, parcelas, taxa, valor_liquido, gateway_payload)
      values (v_orc, (p->>'valor')::numeric, v_forma, 'aguardando', false,
              'Pago pelo Mercado Pago' || case when coalesce((p->>'parcelas')::int, 1) > 1
                                              then ' em ' || (p->>'parcelas') || 'x' else '' end,
              'mercadopago', v_gid, v_st, nullif(p->>'parcelas', '')::int,
              nullif(p->>'taxa', '')::numeric, nullif(p->>'valor_liquido', '')::numeric, p->'payload')
      returning id into v_id;
    end if;
    -- mesma confirmação da tela: caixa, aviso ao cliente, cobranças e produção seguem sozinhos
    r := public.confirmar_pagamento(v_id);
    return jsonb_build_object('ok', true, 'pagamento_id', v_id, 'confirmacao', r);
  end if;

  -- Estorno ou contestação de algo já confirmado: marca para a equipe resolver.
  if v_st in ('refunded', 'charged_back', 'cancelled') and found then
    update pagamentos
       set gateway_status = v_st, gateway_payload = p->'payload',
           observacao = left(coalesce(observacao, '') || ' | ATENÇÃO: ' ||
             case v_st when 'refunded' then 'estornado' when 'charged_back' then 'contestado pelo cliente (chargeback)'
                       else 'cancelado' end || ' no Mercado Pago em ' || to_char(now() at time zone 'America/Recife', 'DD/MM HH24:MI'), 300)
     where id = pg.id;
    return jsonb_build_object('ok', true, 'alerta', v_st);
  end if;

  -- pendente, em análise, recusado: nada entra em pagamentos.
  return jsonb_build_object('ok', true, 'ignorado', v_st);
exception when unique_violation then
  -- dois avisos do mesmo pagamento ao mesmo tempo: o outro já registrou
  return jsonb_build_object('ok', true, 'ja_registrado', true);
end $$;
revoke all on function public.mp_registrar_pagamento(jsonb) from public, anon, authenticated;
grant execute on function public.mp_registrar_pagamento(jsonb) to service_role;

-- 6. Caixa: lança a taxa do Mercado Pago e não confunde dois pagamentos iguais ----
-- Antes o caixa evitava duplicidade por (orçamento, valor, dia). Para pagamentos do
-- Mercado Pago o id do pagamento já garante isso, então a checagem não se aplica.
create or replace function public.pagamento_lanca_no_caixa()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare num text;
begin
  if new.status <> 'confirmado' or coalesce(old.status, '') = 'confirmado' then
    return new;
  end if;
  -- hoje_local(), não current_date: às 22h o recebimento ainda é de HOJE
  -- aqui em Recife, mesmo que em Londres já seja amanhã (passo 26).
  if new.gateway_id is null and exists (
       select 1 from livro_caixa_lancamentos
        where orcamento_id = new.orcamento_id and valor = new.valor and tipo = 'entrada'
          and data = hoje_local()) then
    return new;
  end if;

  select numero into num from orcamentos where id = new.orcamento_id;

  insert into livro_caixa_lancamentos (data, tipo, categoria, valor, descricao, orcamento_id, forma_pagamento)
  values (hoje_local(), 'entrada', 'Vendas', new.valor,
          'Recebimento do orçamento ' || coalesce(num, ''), new.orcamento_id, new.forma);

  if coalesce(new.taxa, 0) > 0 then
    insert into livro_caixa_lancamentos (data, tipo, categoria, valor, descricao, orcamento_id, forma_pagamento)
    values (hoje_local(), 'saida', 'Taxas Mercado Pago', new.taxa,
            'Taxa do Mercado Pago — orçamento ' || coalesce(num, '') ||
              case when coalesce(new.parcelas, 1) > 1 then ' (' || new.parcelas || 'x)' else '' end,
            new.orcamento_id, new.forma);
  end if;
  return new;
end $$;

-- 7. Tela do orçamento -----------------------------------------------------------
-- O acréscimo é gravado direto na coluna (a equipe já tem permissão de update em
-- orcamentos), sem mexer no salvar_orcamento:
--   update orcamentos set acrescimo_cartao_pct = 12 where id = ...;
