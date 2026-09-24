// Upstash Redis (yoki Vercel KV) — REST orqali, SDK'siz.
//
// Suhbat xotirasi (lib/xotira.js) va post qoralamalari (lib/qoralama.js) shu
// bitta ulanishdan foydalanadi. KV_REST_API_URL va KV_REST_API_TOKEN bo'lmasa
// `redisSozlamasi()` null qaytaradi va har modul o'z zaxira yo'lini tanlaydi.

export function redisSozlamasi() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

// Upstash REST: buyruq JSON massiv sifatida yuboriladi, javob { result: ... }.
// Node'ning o'z fetch'i yetadi.
export async function redisBuyruq({ url, token }, buyruq) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buyruq),
  });

  if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}
