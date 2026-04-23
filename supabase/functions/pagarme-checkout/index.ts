/**
 * Supabase Edge Function — pagarme-checkout
 *
 * Gera uma cobrança PIX via Pagar.me e retorna o QR Code + payload.
 *
 * Variáveis de ambiente necessárias (configure em Supabase → Edge Functions → Secrets):
 *   PAGARME_SECRET_KEY  → sua chave secreta do Pagar.me (começa com "sk_live_" ou "sk_test_")
 *
 * Deploy:
 *   supabase functions deploy pagarme-checkout --no-verify-jwt
 *
 * Endpoint (após deploy):
 *   POST https://<seu-projeto>.supabase.co/functions/v1/pagarme-checkout
 *
 * Body JSON:
 *   { valor, alunoNome, email, descricao, matriculaId }
 *
 * Response JSON:
 *   { orderId, status, qrCode, qrCodeUrl, expiresAt }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { valor, alunoNome, email, descricao, matriculaId } =
      await req.json() as {
        valor:       number;
        alunoNome:   string;
        email?:      string;
        descricao?:  string;
        matriculaId?: string;
      };

    const PAGARME_KEY = Deno.env.get('PAGARME_SECRET_KEY') ?? '';
    if (!PAGARME_KEY) {
      return jsonResp({ error: 'PAGARME_SECRET_KEY não configurada nas secrets da Edge Function.' }, 500);
    }

    // Pagar.me exige valor em centavos (inteiro)
    const valorCentavos = Math.round((parseFloat(String(valor)) || 0) * 100);
    if (valorCentavos <= 0) {
      return jsonResp({ error: 'Valor inválido.' }, 400);
    }

    const auth = btoa(`${PAGARME_KEY}:`);

    const orderBody = {
      customer: {
        name:  alunoNome || 'Aluno',
        email: email || 'sem@email.com',
        type:  'individual',
      },
      items: [
        {
          amount:      valorCentavos,
          description: descricao || 'Mensalidade',
          quantity:    1,
          code:        matriculaId || 'mat',
        },
      ],
      payments: [
        {
          payment_method: 'pix',
          pix: {
            expires_in: 3600, // 1 hora
          },
        },
      ],
    };

    const pmResp = await fetch('https://api.pagar.me/core/v5/orders', {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(orderBody),
    });

    const pmData = await pmResp.json() as Record<string, unknown>;

    if (!pmResp.ok) {
      const msg = (pmData as { message?: string }).message || JSON.stringify(pmData);
      return jsonResp({ error: `Pagar.me: ${msg}` }, 400);
    }

    // Extrai dados do PIX da resposta
    const charges = (pmData.charges as Array<Record<string, unknown>>) ?? [];
    const charge  = charges[0] ?? {};
    const pix     = (charge.last_transaction as Record<string, unknown>) ?? {};

    return jsonResp({
      orderId:    pmData.id,
      status:     pmData.status,
      qrCode:     pix.qr_code,      // string longa (Pix Copia e Cola)
      qrCodeUrl:  pix.qr_code_url,  // URL da imagem PNG do QR Code
      expiresAt:  pix.expires_at,
    });

  } catch (err: unknown) {
    return jsonResp({ error: String(err) }, 500);
  }
});

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
