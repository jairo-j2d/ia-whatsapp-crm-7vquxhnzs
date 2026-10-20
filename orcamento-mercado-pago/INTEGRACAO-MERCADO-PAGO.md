# Integração Mercado Pago — App de Orçamento Gráfica J2D

> Documento de referência da integração do Mercado Pago com o sistema de orçamento.
> Última atualização: 20/10/2026 · Situação: **código pronto e testado localmente, aguardando o ambiente de teste**

---

## 1. Por que estamos fazendo isso

- Clientes estão pedindo **pagamento no cartão de crédito**, e o portal só oferece Pix.
- Hoje todo Pix é **conferido à mão**: o cliente avisa que pagou pelo portal ou manda o comprovante para a Lima no WhatsApp, e alguém da equipe confere no banco antes de confirmar.
- Com o Mercado Pago, **Pix e cartão são confirmados automaticamente**, e o pedido segue sozinho para a produção.

### Números de hoje (28/09 a 19/10/2026)

| Indicador | Valor |
|---|---|
| Pagamentos registrados | 45, todos via Pix |
| Avisados pelo cliente (aguardando conferência) | 15 confirmados + 2 rejeitados |
| Rejeitados na conferência | 3 (R$ 1,7 mil) |
| Orçamentos no sistema | 126 |

---

## 2. Regras de negócio (definidas pelo Jairo)

### 2.1 Formas de pagamento

O cliente tem **duas opções**, e o pagamento é feito de uma vez:

| Forma | Valor | Parcelas |
|---|---|---|
| **Pix** | Valor do orçamento | À vista |
| **Cartão de crédito** | Valor do orçamento + acréscimo do cartão | Até **10x** |

### 2.2 Acréscimo do cartão

- O **valor do orçamento é o valor do Pix**, o que a gráfica quer receber.
- Na hora de montar o orçamento, a equipe define um **acréscimo para cartão**: 0%, 10%, 12% ou o que fizer sentido para o pedido.
- **O cliente não vê o percentual**, só os dois preços finais.
- **Com acréscimo de 0%**, Pix e cartão têm o mesmo preço. Isso vale para pedidos de volume, para facilitar o fechamento.

**Exemplos:**

| Pedido | Valor do orçamento | Acréscimo | Cartão | Pix | O portal mostra |
|---|---|---|---|---|---|
| Comum | R$ 1.000 | 12% | R$ 1.120 | R$ 1.000 | "Pix: R$ 1.000 — economize R$ 120" |
| Volume | R$ 5.000 | 0% | R$ 5.000 | R$ 5.000 | Mesmo preço |

> A economia do Pix aparece **em reais, nunca em porcentagem**. Com 12% de acréscimo, o Pix sai cerca
> de 10,7% mais barato que o cartão, e não 10% exatos. Para dar exatamente 10%, o acréscimo seria 11,1%.

### 2.3 Parcelamento

| Parcelas | Quem paga os juros |
|---|---|
| 1x a 3x | **Sem juros** para o cliente. A taxa fica com a J2D |
| 4x a 10x | **O cliente paga os juros** ao Mercado Pago |

- O cliente escolhe o número de parcelas na página do Mercado Pago.
- O "sem juros até 3x" é configurado **no painel do Mercado Pago** (Seu negócio → Custos → Parcelamento).

### 2.4 Fim da entrada de 50%

- A opção de **entrada de 50% + restante na entrega deixa de existir**. No cartão, a primeira parcela já faz o papel da entrada.
- O pedido fica **quitado no primeiro pagamento** e vai direto para produção.
- Os pedidos antigos que já têm entrada paga continuam funcionando até serem quitados.

---

## 3. Como funciona hoje (antes do Mercado Pago)

```
Cliente aprova no portal
   └─> Pix fixo (chave da empresa, QR estático com o valor)
         └─> Cliente avisa que pagou (portal ou WhatsApp com a Lima)
               └─> pagamento "aguardando"
                     └─> EQUIPE CONFERE NO BANCO E CONFIRMA À MÃO   <── gargalo
                           └─> automático: livro caixa, aviso ao cliente,
                               cancela cobranças, pedido vai para produção
```

Tudo o que acontece **depois** da confirmação já é automático. O Mercado Pago substitui **só a etapa da conferência manual**.

---

## 4. Como vai funcionar (com o Mercado Pago)

### 4.1 Para o cliente

1. Abre o portal (`proposta.graficaj2dsys.com.br/?t=...`) e aprova o orçamento.
2. Vê dois botões:
   - **"Pagar no Pix: R$ 1.000 — economize R$ 120"**: aparece o QR Code e o copia e cola daquele pedido, válidos por 24h.
   - **"Pagar no cartão: R$ 1.120 em até 10x"**: abre a página do Mercado Pago, só com cartão de crédito.
3. Paga e volta para o portal com o pagamento já reconhecido.

### 4.2 Por trás

```
Portal ──(token + forma)──> edge function mp-cobranca
                               ├─ Pix:    cria pagamento Pix no MP  ─> QR Code + copia e cola
                               └─ Cartão: cria preferência no MP    ─> link do Checkout Pro

Cliente paga no Mercado Pago

Mercado Pago ──(aviso)──> edge function mp-webhook
                            ├─ confere a assinatura do aviso
                            ├─ CONSULTA o pagamento na API do MP (não confia no aviso)
                            └─ mp_registrar_pagamento()
                                 └─ confirmar_pagamento()  (a mesma da tela de hoje)
                                      └─ gatilhos que já existem:
                                         • livro caixa: entrada do valor + saída da taxa do MP
                                         • aviso ao cliente pelo WhatsApp
                                         • cancela cobranças pendentes
                                         • pedido vai para "em produção"
```

### 4.3 Segurança

- **O número do cartão nunca passa pelo nosso sistema.** Tudo acontece na página do Mercado Pago.
- O webhook **não confia no conteúdo do aviso**: busca o pagamento direto na API do Mercado Pago com o nosso token.
- A **assinatura** do aviso (`x-signature`) é conferida com a chave secreta.
- O mesmo pagamento **nunca entra duas vezes**, mesmo que o Mercado Pago repita o aviso: o número da transação é único.
- Pagamentos da mesma conta Mercado Pago que **não vieram do orçamento** (maquininha, por exemplo) são ignorados.
- As funções de registro só podem ser chamadas pelo servidor (`service_role`), nunca pelo portal público.
- Os tokens ficam nos **segredos das Edge Functions do Supabase**, e não no banco nem no código.

### 4.4 Estorno e contestação (chargeback)

- O sistema **não desfaz nada sozinho**. O pagamento recebe um alerta na observação, por exemplo
  "ATENÇÃO: contestado pelo cliente (chargeback) no Mercado Pago em 20/10 14:30", e a equipe decide o que fazer.

---

## 5. Mudanças no banco (migração 56)

Projeto Supabase: **J2D App Orçamento** (`liutbzqufmuawfukmwih`). Todas as mudanças **só acrescentam**: nada que existe é removido.

| Item | O que muda |
|---|---|
| `orcamentos.acrescimo_cartao_pct` | Novo campo, de 0 a 30%, **padrão 0** (os orçamentos atuais não mudam) |
| `pagamentos` | Novos campos: `gateway`, `gateway_id` (único), `gateway_status`, `parcelas`, `taxa`, `valor_liquido`, `gateway_payload` |
| `cobrancas_mp` (nova tabela) | Pix e links de cartão gerados, para reaproveitar o QR Code ainda válido |
| `valores_pagamento_online()` | Calcula Pix = saldo e cartão = saldo + acréscimo |
| `portal_opcoes_pagamento(token)` | O portal pergunta os dois preços (sem revelar o acréscimo) |
| `mp_dados_cobranca(token)` | Dados para montar a cobrança. Só para o servidor |
| `mp_registrar_pagamento(dados)` | Registra o resultado do Mercado Pago e confirma. Só para o servidor |
| `pagamento_lanca_no_caixa()` | **Alterada:** lança também a **taxa do MP como saída** ("Taxas Mercado Pago") e não confunde dois pagamentos de mesmo valor no mesmo dia |

### O que vai para o livro caixa

Exemplo: cartão de R$ 1.120 em 3x, com taxa de R$ 50,40.

| Tipo | Categoria | Valor |
|---|---|---|
| Entrada | Vendas | R$ 1.120,00 |
| Saída | Taxas Mercado Pago | R$ 50,40 |

Se o cliente parcelar em 4x ou mais, os juros que ele paga ficam com o Mercado Pago e **não entram no caixa**. A J2D recebe o mesmo valor do cartão.

---

## 6. Edge functions

| Função | Quem chama | JWT | O que faz |
|---|---|---|---|
| `mp-cobranca` | Portal do cliente | Sim (chave anon) | Recebe `{token, forma}` e devolve o Pix (QR Code, copia e cola, validade) ou o link do cartão |
| `mp-webhook` | Mercado Pago | **Não** (o MP não envia JWT) | Confere, consulta a API e registra o pagamento |

### Segredos (Supabase → Edge Functions → Secrets)

| Nome | O que é |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token da aplicação. `TEST-...` no teste, `APP_USR-...` em produção |
| `MP_WEBHOOK_SECRET` | "Assinatura secreta" da tela de Webhooks da aplicação no Mercado Pago |
| `MP_PAYER_EMAIL_PADRAO` | E-mail usado no Pix quando o cliente não tem e-mail (cerca de 200 dos 768 clientes não têm) |
| `MP_RETORNO_URL` | Opcional. Para onde o cliente volta depois de pagar. Padrão: o próprio portal |

> ⚠️ **Nunca cole tokens no chat, no código ou no WhatsApp.** Cadastre direto no painel do Supabase.

---

## 7. Telas que precisam mudar (front-end)

> O código do app de orçamento **não está em nenhum repositório do GitHub acessível**.
> Para fazer as telas, precisamos saber em qual plataforma ele foi feito e ligá-la ao GitHub.

**Portal do cliente**
- Mostrar os dois botões (Pix e cartão) com os valores de `portal_opcoes_pagamento`.
- Pix: mostrar a imagem do QR Code, um botão "copiar código" e a validade.
- Cartão: redirecionar para o link do Mercado Pago.
- **Remover** a opção de entrada de 50% e o Pix estático.

**Tela de montar o orçamento**
- Novo campo **"Acréscimo para cartão (%)"**, interno e invisível ao cliente.
- Novo texto padrão de condições: *"Pagamento à vista no Pix ou no cartão de crédito em até 10x."*

**Lima (agente do WhatsApp, n8n)**
- Parar de oferecer a entrada de 50%.
- Mandar o link do portal para o cliente pagar, no Pix ou no cartão.
- Revisar os workflows "J2D Enviar Pix" e "J2D Registrar Comprovante" (hoje sem acesso via MCP).

---

## 8. Ambiente de teste

**Regra: nada é aplicado em produção antes de funcionar no teste.**

### Achado importante

A branch do Supabase é montada a partir do **histórico de migrações**, mas **boa parte das mudanças recentes foi aplicada direto em produção**, sem entrar nesse histórico. Entre elas estão a entrada de 50%, partes do portal e o registro de comprovante pela Lima. Uma branch nova viria **desatualizada** e precisa ser sincronizada com a produção antes dos testes.

### Passo a passo

| # | Passo | Responsável | Situação |
|---|---|---|---|
| 1 | Criar a branch `teste-mercado-pago` (Supabase → J2D App Orçamento → Branches) | Jairo | ⏳ Pendente |
| 2 | Comparar a branch com a produção e completar o que faltar | Claude | ⏳ |
| 3 | Aplicar a migração 56 e publicar as edge functions na branch | Claude | ⏳ |
| 4 | Criar a aplicação "J2D Orçamento" no Mercado Pago e cadastrar os segredos de **teste** na branch | Jairo | ⏳ |
| 5 | Configurar o webhook no Mercado Pago: URL da `mp-webhook` da branch, evento **Pagamentos** | Jairo + Claude | ⏳ |
| 6 | Ativar o "sem juros até 3x" no painel do Mercado Pago | Jairo | ⏳ |
| 7 | Testes com cartões de teste: 1x, 3x, 10x, recusado + um Pix | Juntos | ⏳ |
| 8 | Telas do portal e do orçamento | Claude (com acesso ao código) | ⏳ |
| 9 | Aplicar em produção com o **token de produção** | Claude | ⏳ |
| 10 | Atualizar a Lima e os textos de condição de pagamento | Claude | ⏳ |
| 11 | Desligar o Pix estático e a entrada de 50% | Jairo decide | ⏳ |

> A branch tem custo por hora enquanto existir (o valor aparece no painel ao criar). Ela pode ser apagada depois da virada.

### Testes já feitos (cópia local do banco)

| Cenário | Resultado |
|---|---|
| Orçamento de R$ 1.000 com 12% → Pix R$ 1.000 / cartão R$ 1.120 / economia R$ 120 | ✅ |
| Orçamento com 0% → Pix e cartão iguais | ✅ |
| Orçamento não aprovado → não gera cobrança | ✅ |
| Cartão aprovado em 3x → quitado, em produção, caixa (entrada + taxa), aviso ao cliente | ✅ |
| Mesmo aviso repetido → não duplica nada | ✅ |
| Pix pendente → ignorado; Pix aprovado → quitado | ✅ |
| Estorno → alerta no pagamento | ✅ |
| Orçamento inexistente → recusado | ✅ |
| Acesso público tentando registrar pagamento → bloqueado | ✅ |
| Checagem de tipos das edge functions | ✅ |
| **Chamadas reais ao Mercado Pago** | ⏳ Só no ambiente de teste |

---

## 9. Pendências e decisões em aberto

- [ ] **Branch de teste** criada no Supabase
- [ ] **Aplicação no Mercado Pago** criada (conta PJ) e tokens de teste cadastrados
- [ ] **"Sem juros até 3x"** ativado no painel do Mercado Pago
- [ ] **Código do app de orçamento**: em qual plataforma está e acesso via GitHub
- [ ] Acesso via MCP aos workflows "J2D Enviar Pix" e "J2D Registrar Comprovante" no n8n
- [ ] Prazo de recebimento do dinheiro no Mercado Pago (na hora ou em alguns dias), o que muda a taxa. Conferir no painel

---

## 10. Onde está o código

- Repositório: `jairo-j2d/ia-whatsapp-crm-7vquxhnzs`
- Branch: `claude/mercado-pago-orcamento-jq2t96`
- Pasta: `orcamento-mercado-pago/`
  - `migrations/56_mercado_pago_pix_e_cartao.sql`: mudanças no banco
  - `functions/mp-cobranca/index.ts`: gera o Pix e o link do cartão
  - `functions/mp-webhook/index.ts`: recebe os avisos do Mercado Pago
  - `README.md`: resumo técnico
  - `INTEGRACAO-MERCADO-PAGO.md`: este documento
