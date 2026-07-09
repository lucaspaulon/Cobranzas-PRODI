export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "Falta MP_ACCESS_TOKEN" });

  try {
    const r = await fetch("https://api.mercadopago.com/preapproval/search?limit=50", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Error MP" });

    const subs = (data.results || []).map((s) => ({
      id: s.id,
      nombre: s.reason,
      monto: s.auto_recurring?.transaction_amount,
      estado: s.status,
      proximo_cobro: s.next_payment_date,
      link: s.init_point,
    }));

    return res.status(200).json({ suscripciones: subs });
  } catch (e) {
    return res.status(500).json({ error: "Error interno", detalle: String(e) });
  }
}
