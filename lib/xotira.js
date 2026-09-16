// Suhbat xotirasi — bot oldingi xabarlarni eslab qolishi uchun.
//
// Har chat uchun oxirgi bir necha juftlik (savol + javob) saqlanadi va keyingi
// so'rovda AI'ga kontekst sifatida uzatiladi. Xotirasiz bot "qaysi sohada
// ishlaysiz?" deb so'raganidan keyin kelgan "qurilish" javobini tushunmasdi —
// har xabarni alohida ko'rar edi.
//
// Ikki saqlash usuli bor:
//
//   Redis (Upstash yoki Vercel KV) — KV_REST_API_URL va KV_REST_API_TOKEN
//     qo'yilgan bo'lsa shu ishlatiladi. Xotira funksiyaning barcha nusxalari
//     uchun umumiy bo'ladi va deploy'dan keyin ham qoladi.
//
//   Funksiya xotirasi — zaxira yo'l, hech narsa sozlash kerak emas. Lekin
//     Vercel funksiya nusxasini istalgan payt o'chiradi va yangi nusxa bo'sh
//     boshlaydi: suhbat o'rtasida xotira yo'qolishi mumkin. Sinov uchun
//     yetarli, jiddiy ishlatish uchun Redis qo'ying.
//
// Xotira ishlamay qolsa bot javob berishda davom etadi: xato logga yoziladi,
// suhbat esa xotirasiz ketaveradi. Javobsiz qolishdan ko'ra shunisi yaxshi.

// Nechta juftlik (savol + javob) eslab qolinadi. Har juftlik promptga
// qo'shimcha token — o'zbekcha matn ingliz tilidagidan ~1.8 barobar ko'p token
// yeyishini hisobga oling.
const MAX_JUFTLIK = 10;

// Suhbat shuncha vaqt jim tursa, xotira tozalanadi: ertaga yozgan odam kechagi
// suhbatning davomi emas, yangi suhbat boshlaydi.
const TTL_MS = 30 * 60 * 1000;

// Bitta xabardan saqlanadigan qism. Uzun matn kontekstni to'ldirib yuboradi.
const MAX_BELGI = 2000;

// Funksiya xotirasida saqlanadigan chatlar soni. Nusxasi uzoq tirik qolsa
// Map cheksiz o'smasligi uchun.
const MAX_CHAT = 500;

const kalit = (chatId) => `xotira:${chatId}`;

// Xotira butunlay kerak emas bo'lsa: XOTIRA=off.
function yoqilgan() {
  return (process.env.XOTIRA ?? '').trim().toLowerCase() !== 'off';
}

function redisSozlamasi() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

// Qaysi usul ishlayotgani — loglar uchun.
export function saqlovchiNomi() {
  if (!yoqilgan()) return 'o\'chirilgan';
  return redisSozlamasi() ? 'redis' : 'funksiya xotirasi';
}

// Upstash REST: buyruq JSON massiv sifatida yuboriladi, javob { result: ... }.
// SDK qo'shmaymiz — Node'ning o'z fetch'i yetadi.
async function redisBuyruq({ url, token }, buyruq) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buyruq),
  });

  if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

const xotira = new Map();

function xotiradanOl(chatId) {
  const yozuv = xotira.get(kalit(chatId));
  if (!yozuv) return [];

  if (Date.now() - yozuv.vaqt > TTL_MS) {
    xotira.delete(kalit(chatId));
    return [];
  }
  return yozuv.xabarlar;
}

function xotiragaYoz(chatId, xabarlar) {
  // O'chirib qayta qo'yamiz: Map kiritish tartibini saqlaydi, shunda eng oxirida
  // ishlatilgan chat oxirga tushadi va birinchi bo'lib eng eskisi o'chiriladi.
  xotira.delete(kalit(chatId));
  xotira.set(kalit(chatId), { vaqt: Date.now(), xabarlar });

  while (xotira.size > MAX_CHAT) {
    xotira.delete(xotira.keys().next().value);
  }
}

// Xabarlarning umumiy shakli: { role: 'user' | 'bot', text }.
// Har provayder buni o'z formatiga o'giradi — xotira provayderga bog'liq emas.
function qirq(matn) {
  const toza = (matn ?? '').trim();
  return toza.length > MAX_BELGI ? `${toza.slice(0, MAX_BELGI)}…` : toza;
}

// Qaysi usul ishlayotgani bir marta logga yoziladi. "Bot nega eslamayapti?"
// degan savolda birinchi qaraladigan joy shu.
let logYozildi = false;

// Shu chatning oldingi xabarlari. Xotira yo'q yoki o'qilmasa — bo'sh ro'yxat.
export async function tarix(chatId) {
  if (!logYozildi) {
    logYozildi = true;
    console.log(`suhbat xotirasi: ${saqlovchiNomi()}`);
  }
  if (!yoqilgan()) return [];

  const redis = redisSozlamasi();
  if (!redis) return xotiradanOl(chatId);

  try {
    const xom = await redisBuyruq(redis, ['GET', kalit(chatId)]);
    return xom ? JSON.parse(xom) : [];
  } catch (err) {
    console.error('Xotira o\'qilmadi:', err?.message ?? err);
    return [];
  }
}

// Yangi juftlikni qo'shish. `oldingi` — shu so'rov boshida o'qilgan tarix:
// qayta o'qimaymiz, ortiqcha chaqiruv ham, ikki yozuv o'rtasidagi poyga ham yo'q.
export async function saqla(chatId, oldingi, savol, javob) {
  if (!yoqilgan()) return;

  const xabarlar = [
    ...oldingi,
    { role: 'user', text: qirq(savol) },
    { role: 'bot', text: qirq(javob) },
  ].slice(-MAX_JUFTLIK * 2);

  const redis = redisSozlamasi();
  if (!redis) {
    xotiragaYoz(chatId, xabarlar);
    return;
  }

  try {
    // EX bilan TTL: eski suhbatlar o'z-o'zidan o'chadi, tozalash kerak emas.
    await redisBuyruq(redis, [
      'SET', kalit(chatId), JSON.stringify(xabarlar), 'EX', String(TTL_MS / 1000),
    ]);
  } catch (err) {
    console.error('Xotira saqlanmadi:', err?.message ?? err);
  }
}

// Suhbatni noldan boshlash: /start va /tozala shuni chaqiradi.
export async function tozala(chatId) {
  const redis = redisSozlamasi();
  if (!redis) {
    xotira.delete(kalit(chatId));
    return;
  }

  try {
    await redisBuyruq(redis, ['DEL', kalit(chatId)]);
  } catch (err) {
    console.error('Xotira tozalanmadi:', err?.message ?? err);
  }
}
