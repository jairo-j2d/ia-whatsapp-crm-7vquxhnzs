// Recebe os avisos do Mercado Pago (Webhooks, evento "Pagamentos").
// Nunca confia no corpo do aviso: busca o pagamento na API com o nosso token e só
// então registra. Publicar com verify_jwt = false (o Mercado Pago não manda JWT).
//
// Segredos (Edge Functions > Secrets):
//   MP_ACCESS_TOKEN     token da aplicação
//   MP_WEBHOOK_SECRET   "assinatura secreta" da tela de Webhooks do Mercado Pago
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// x-signature: "ts=...,v1=..."; manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
async function assinaturaValida(req: Request, dataId: string) {
  const segredo = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!segredo) return true; // sem segredo configurado: segue, a consulta na API é a garantia
  const partes = Object.fromEntries((req.headers.get("x-signature") ?? "").split(",")
    .map((p) => p.split("=").map((s) => s.trim())));
  if (!partes.ts || !partes.v1) return false;
  const reqId = req.headers.get("x-request-id");
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `id:${id};` + (reqId ? `request-id:${reqId};` : "") + `ts:${partes.ts};`;
  return (await hmacHex(segredo, manifesto)) === partes.v1;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const url = new URL(req.url);
  const corpo = await req.json().catch(() => ({}));

  // Formato novo (Webhooks): ?data.id=123&type=payment. Antigo (IPN): ?id=123&topic=payment.
  const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? corpo.type ?? corpo.topic;
  const dataId = String(url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? corpo.data?.id ?? "");
  if (tipo !== "payment" || !dataId) return new Response("ignorado");

  if (!(await assinaturaValida(req, dataId))) {
    console.warn("assinatura invalida", dataId);
    return new Response("assinatura", { status: 401 });
  }

  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
  });
  if (!res.ok) {
    console.error("consulta pagamento", dataId, res.status);
    return new Response("consulta", { status: 502 }); // o Mercado Pago tenta de novo
  }
  const pag = await res.json();
  // Só pagamentos gerados pelo orçamento (referência = id do orçamento). Vendas da
  // maquininha ou de outros canais da mesma conta são ignoradas.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pag.external_reference ?? "")) {
    return new Response("fora do orcamento");
  }

  // Taxa = o que sai do bolso da gráfica. Juros pagos pelo cliente (fee_payer "payer") não entram.
  const taxa = (pag.fee_details ?? [])
    .filter((f: { fee_payer?: string }) => f.fee_payer === "collector")
    .reduce((s: number, f: { amount: number }) => s + Number(f.amount || 0), 0);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await db.rpc("mp_registrar_pagamento", {
    p: {
      orcamento_id: pag.external_reference,
      gateway_id: String(pag.id),
      forma: pag.payment_method_id === "pix" ? "pix"
        : ["credit_card", "debit_card"].includes(pag.payment_type_id) ? "cartao" : "outro",
      status_mp: pag.status,
      valor: pag.transaction_amount,
      taxa: taxa > 0 ? Number(taxa.toFixed(2)) : null,
      valor_liquido: pag.transaction_details?.net_received_amount ?? null,
      parcelas: pag.installments ?? null,
      payload: {
        status_detail: pag.status_detail, payment_method_id: pag.payment_method_id,
        payment_type_id: pag.payment_type_id, date_approved: pag.date_approved,
        total_paid_amount: pag.transaction_details?.total_paid_amount, live_mode: pag.live_mode,
      },
    },
  });
  if (error) {
    console.error("registrar", dataId, error.message);
    return new Response("erro", { status: 500 }); // o Mercado Pago tenta de novo
  }
  console.log("mp", dataId, pag.status, JSON.stringify(data));
  return new Response("ok");
});
