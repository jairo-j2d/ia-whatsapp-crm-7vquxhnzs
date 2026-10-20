// Gera a cobrança do Mercado Pago para o portal do cliente.
//   POST { token: "<tracking_token>", forma: "pix" | "cartao" }
//   pix    -> { qr_code, qr_code_base64, link, valor, expira_em }
//   cartao -> { link, valor }   (página do Mercado Pago, só cartão, até 10x)
//
// Segredos (Edge Functions > Secrets):
//   MP_ACCESS_TOKEN         token da aplicação no Mercado Pago (TEST-... no teste)
//   MP_PAYER_EMAIL_PADRAO   e-mail usado no Pix quando o cliente não tem e-mail cadastrado
//   MP_RETORNO_URL          opcional; padrão = portal_url da empresa. "{token}" é trocado pelo token
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";
const PIX_VALIDADE_HORAS = 24;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function mp(path: string, body: unknown, idempotencia: string) {
  const res = await fetch(`${MP_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencia,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("mercado pago", path, res.status, JSON.stringify(data));
    throw new Error("mercado_pago_indisponivel");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, erro: "metodo" }, 405);
  if (!Deno.env.get("MP_ACCESS_TOKEN")) return json({ ok: false, erro: "mercado_pago_nao_configurado" }, 503);

  const { token, forma } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !["pix", "cartao"].includes(forma)) {
    return json({ ok: false, erro: "parametros" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: d, error } = await db.rpc("mp_dados_cobranca", { p_token: token });
  if (error) return json({ ok: false, erro: "token_invalido" }, 400);
  if (!d?.ok) return json(d, 400);

  const valor: number = forma === "pix" ? Number(d.valor_pix) : Number(d.valor_cartao);
  const descricao = `Pedido ${d.numero} - ${d.empresa ?? "Gráfica J2D"}`;
  const notificacao = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`;
  const retorno = (Deno.env.get("MP_RETORNO_URL") ?? `${d.portal_url}/?t={token}`).replace("{token}", token);

  // Reaproveita a cobrança ainda válida do mesmo valor: recarregar o portal não gera outra.
  const { data: aberta } = await db.from("cobrancas_mp").select("*")
    .eq("orcamento_id", d.orcamento_id).eq("forma", forma).eq("valor", valor).eq("status", "pendente")
    .gt("expira_em", new Date(Date.now() + 10 * 60_000).toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (aberta) {
    return json({ ok: true, forma, valor, qr_code: aberta.qr_code, qr_code_base64: aberta.qr_code_base64,
                  link: aberta.link, expira_em: aberta.expira_em });
  }

  const [primeiro, ...resto] = String(d.cliente?.nome ?? "Cliente").trim().split(/\s+/);
  const idem = `${d.orcamento_id}-${forma}-${valor.toFixed(2)}-${Math.floor(Date.now() / 60_000)}`;

  try {
    if (forma === "pix") {
      const expira = new Date(Date.now() + PIX_VALIDADE_HORAS * 3600_000);
      const pag = await mp("/v1/payments", {
        transaction_amount: valor,
        payment_method_id: "pix",
        description: descricao,
        external_reference: d.orcamento_id,
        notification_url: notificacao,
        date_of_expiration: expira.toISOString().replace("Z", "+00:00"),
        payer: {
          email: d.cliente?.email ?? Deno.env.get("MP_PAYER_EMAIL_PADRAO"),
          first_name: primeiro,
          last_name: resto.join(" ") || undefined,
          ...(d.cliente?.documento
            ? { identification: { type: d.cliente.documento.length > 11 ? "CNPJ" : "CPF", number: d.cliente.documento } }
            : {}),
        },
      }, idem);
      const tx = pag.point_of_interaction?.transaction_data ?? {};
      const cob = {
        orcamento_id: d.orcamento_id, forma, valor, mp_id: String(pag.id), status: "pendente",
        qr_code: tx.qr_code, qr_code_base64: tx.qr_code_base64, link: tx.ticket_url,
        expira_em: expira.toISOString(),
      };
      await db.from("cobrancas_mp").insert(cob);
      return json({ ok: true, forma, valor, qr_code: cob.qr_code, qr_code_base64: cob.qr_code_base64,
                    link: cob.link, expira_em: cob.expira_em });
    }

    // Cartão: Checkout Pro só com cartão de crédito, até 10x. Quantas parcelas saem sem
    // juros (até 3x) é configurado no painel do Mercado Pago da conta.
    const expira = new Date(Date.now() + 3 * 24 * 3600_000);
    const pref = await mp("/checkout/preferences", {
      items: [{ id: d.numero, title: descricao, quantity: 1, unit_price: valor, currency_id: "BRL" }],
      external_reference: d.orcamento_id,
      notification_url: notificacao,
      back_urls: { success: retorno, pending: retorno, failure: retorno },
      auto_return: "approved",
      statement_descriptor: "GRAFICA J2D",
      payer: { name: primeiro, surname: resto.join(" ") || undefined, email: d.cliente?.email ?? undefined },
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }, { id: "debit_card" }],
        installments: Number(d.max_parcelas ?? 10),
      },
      expires: true,
      expiration_date_to: expira.toISOString().replace("Z", "+00:00"),
    }, idem);
    const teste = (Deno.env.get("MP_ACCESS_TOKEN") ?? "").startsWith("TEST-");
    const link = teste && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point;
    await db.from("cobrancas_mp").insert({
      orcamento_id: d.orcamento_id, forma, valor, mp_id: String(pref.id), status: "pendente",
      link, expira_em: expira.toISOString(),
    });
    return json({ ok: true, forma, valor, link });
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 502);
  }
});
