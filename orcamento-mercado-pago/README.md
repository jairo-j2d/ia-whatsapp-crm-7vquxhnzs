# Mercado Pago no App de Orçamento (J2D)

Pix dinâmico e cartão de crédito no portal do cliente, com confirmação automática.
Projeto Supabase: **J2D App Orçamento** (`liutbzqufmuawfukmwih`).

## Regras de negócio

- O **total do orçamento é o valor do Pix**, o que a gráfica quer receber.
- `orcamentos.acrescimo_cartao_pct` (0–30%) é definido por orçamento e é invisível ao cliente.
  Cartão = total × (1 + acréscimo). Com 0%, Pix e cartão custam igual.
- Cartão em **até 10x**. Até 3x sem juros (a taxa fica com a gráfica) e de 4x a 10x com juros
  pagos pelo cliente. O "sem juros até 3x" é configurado no painel do Mercado Pago
  (Seu negócio → Custos → Parcelamento).
- **Sem entrada de 50%**: o pedido é quitado no primeiro pagamento.

## Peças

| Arquivo | O que faz |
|---|---|
| `migrations/56_mercado_pago_pix_e_cartao.sql` | Coluna de acréscimo, dados do MP em `pagamentos`, tabela `cobrancas_mp`, funções do portal e do webhook, taxa no livro caixa |
| `functions/mp-cobranca` | O portal pede `{token, forma}`. Gera o Pix (QR Code e copia e cola) ou o link do cartão |
| `functions/mp-webhook` | O Mercado Pago avisa, a função consulta o pagamento na API e chama `mp_registrar_pagamento` |

Fluxo: o webhook confirma o pagamento com `confirmar_pagamento`. Os gatilhos que já existem
cuidam do resto: livro caixa, aviso ao cliente, cancelamento de cobranças e envio para produção.
A taxa do Mercado Pago entra no caixa como saída, na categoria "Taxas Mercado Pago".
Estorno e chargeback não desfazem nada sozinhos: o pagamento ganha um alerta na observação
para a equipe resolver.

## Portal (front-end)

- Valores: `rpc('portal_opcoes_pagamento', { p_token })` retorna
  `{ disponivel, pix: {valor}, cartao: {valor, max_parcelas, sem_juros_ate}, economia_pix }`.
  Mostrar "Pix: R$ X — economize R$ Y" (em reais, nunca em %).
- Pagar: `functions.invoke('mp-cobranca', { body: { token, forma: 'pix' | 'cartao' } })`.
  - Pix: mostrar `qr_code_base64` (imagem), `qr_code` (botão copiar) e `expira_em`.
  - Cartão: redirecionar para `link`. O cliente volta para o portal depois de pagar.
- Remover a opção de entrada (`entrada_pct`) e o Pix estático das telas novas.

Tela do orçamento: campo "Acréscimo para cartão (%)", gravado em `orcamentos.acrescimo_cartao_pct`.

## Segredos (Edge Functions → Secrets)

| Nome | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token da aplicação (`TEST-...` no teste, `APP_USR-...` em produção) |
| `MP_WEBHOOK_SECRET` | "Assinatura secreta" da tela de Webhooks da aplicação |
| `MP_PAYER_EMAIL_PADRAO` | E-mail usado no Pix quando o cliente não tem e-mail cadastrado |
| `MP_RETORNO_URL` | Opcional. Padrão: `{portal_url}/?t={token}` |

## Publicação no ambiente de teste

1. Aplicar `migrations/56_...sql`.
2. Publicar `mp-cobranca` (verify_jwt **true**) e `mp-webhook` (verify_jwt **false**).
3. No Mercado Pago, em Suas integrações → aplicação → Webhooks: URL
   `https://<projeto>.supabase.co/functions/v1/mp-webhook`, evento **Pagamentos**.
4. Testar com os cartões de teste do Mercado Pago: aprovado, recusado, 1x, 3x e 10x, além de um Pix.

## Testes já feitos

A migração foi aplicada numa cópia local do banco, com as funções de produção
`confirmar_pagamento`, `saldo_do_orcamento`, `portal_porta` e os gatilhos de pagamento. Cenários:
valores com 12% e 0% de acréscimo, orçamento não aprovado, cartão aprovado em 3x (quitado, em
produção, caixa com entrada e taxa, aviso ao cliente), aviso repetido (sem duplicar), Pix pendente
ignorado, Pix aprovado, estorno, orçamento inexistente e bloqueio de `anon`.
