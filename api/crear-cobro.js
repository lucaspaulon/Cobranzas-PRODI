export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "Falta MP_ACCESS_TOKEN" });

  const { nombre, cliente, monto, recurrente, email } = req.body || {};
  if (!nombre || !monto) return res.status(400).json({ error: "Faltan datos" });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };

  try {
    if (recurrente) {
      const body = {
        reason: `${nombre} — ${cliente || "Cliente"}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(monto),
          currency_id: "ARS",
        },
        back_url: process.env.BACK_URL || "https://www.mercadopago.com.ar",
        ...(email ? { payer_email: email } : {}),
      };
      const r = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST", headers, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || "Error MP", detalle: data });
      return res.status(200).json({ tipo: "suscripcion", id: data.id, link: data.init_point, estado: data.status });
    } else {
      const body = {
        items: [{ title: `${nombre} — ${cliente || "Cliente"}`, quantity: 1, unit_price: Number(monto), currency_id: "ARS" }],
        back_urls: {
          success: process.env.BACK_URL || "https://www.mercadopago.com.ar",
          failure: process.env.BACK_URL || "https://www.mercadopago.com.ar",
          pending: process.env.BACK_URL || "https://www.mercadopago.com.ar",
        },
      };
      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST", headers, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || "Error MP", detalle: data });
      return res.status(200).json({ tipo: "pago_unico", id: data.id, link: data.init_point });
    }
  } catch (e) {
    return res.status(500).json({ error: "Error interno", detalle: String(e) });
  }
}
