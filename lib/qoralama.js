// Post qoralamalari — /post natijasi egasi qaror qilguncha shu yerda turadi.
//
// Konveyer bir nechta webhook chaqiruviga bo'lingan: post tayyorlanadi, egasi
// tugma bosadi, izoh yozadi. Har chaqiruv alohida funksiya nusxasida ishlashi
// mumkin, shuning uchun holat Redis'da saqlanadi (lib/redis.js). Redis
// sozlanmagan bo'lsa — funksiya xotirasida: sinov uchun yetarli, lekin nusxa
// o'chsa qoralama yo'qoladi. api/bot.js bu holatni ham ko'taradi.
//
// Uch xil yozuv:
//   qoralama:<id> — { id, mavzu, natija, post, fileId, xabarlar }
//   qulf:<id>     — qoralama yakunlandi ("Chiqar" yoki "Bekor"), qayta bosilmaydi
//   izoh:<chatId> — egasi "Qayta yoz" bosdi, keyingi xabari shu qoralamaga izoh
import crypto from 'node:crypto';
import { redisSozlamasi, redisBuyruq } from './redis.js';

// Qoralama bir kun turadi: egasi ertalab ko'rib qaror qilishi mumkin.
const TTL_S = 24 * 60 * 60;

// Izoh kutish qisqaroq: bir soatdan keyin yozilgan matn oddiy savol deb olinadi.
const IZOH_TTL_S = 60 * 60;

const k = {
  qoralama: (id) => `qoralama:${id}`,
  qulf: (id) => `qulf:${id}`,
  izoh: (chatId) => `izoh:${chatId}`,
};

// Funksiya xotirasi: kalit → { qiymat, tugaydi }.
const xotira = new Map();

function xotiradanOl(kalit) {
  const yozuv = xotira.get(kalit);
  if (!yozuv) return null;
  if (Date.now() > yozuv.tugaydi) {
    xotira.delete(kalit);
    return null;
  }
  return yozuv.qiymat;
}

function xotiragaYoz(kalit, qiymat, ttlS) {
  xotira.set(kalit, { qiymat, tugaydi: Date.now() + ttlS * 1000 });
}

async function ol(kalit) {
  const redis = redisSozlamasi();
  if (!redis) return xotiradanOl(kalit);
  const xom = await redisBuyruq(redis, ['GET', kalit]);
  return xom ? JSON.parse(xom) : null;
}

async function yoz(kalit, qiymat, ttlS) {
  const redis = redisSozlamasi();
  if (!redis) return xotiragaYoz(kalit, qiymat, ttlS);
  await redisBuyruq(redis, ['SET', kalit, JSON.stringify(qiymat), 'EX', String(ttlS)]);
}

async function ochir(kalit) {
  const redis = redisSozlamasi();
  if (!redis) return xotira.delete(kalit);
  await redisBuyruq(redis, ['DEL', kalit]);
}

// Callback_data 64 baytdan oshmasligi kerak — qisqa id yetadi.
export function yangiId() {
  return crypto.randomBytes(4).toString('hex');
}

export const qoralamaOl = (id) => ol(k.qoralama(id));
export const qoralamaSaqla = (q) => yoz(k.qoralama(q.id), q, TTL_S);
export const qoralamaOchir = (id) => ochir(k.qoralama(id));

// Qoralamani yakunlash huquqini olish. Faqat birinchi chaqiruv true oladi.
//
// Tugma ikki marta bosilsa yoki Telegram callback'ni qayta yuborsa, post
// kanalga ikki marta chiqmasligi kerak. Redis'da SET NX — atomar.
export async function band(id) {
  const redis = redisSozlamasi();
  if (!redis) {
    if (xotiradanOl(k.qulf(id))) return false;
    xotiragaYoz(k.qulf(id), 1, TTL_S);
    return true;
  }
  const javob = await redisBuyruq(redis, ['SET', k.qulf(id), '1', 'NX', 'EX', String(TTL_S)]);
  return javob === 'OK';
}

// Yakunlash muvaffaqiyatsiz bo'lsa (masalan, kanalga chiqmadi) qulf olinadi —
// egasi tugmani qayta bosa olsin.
export const bandniBosh = (id) => ochir(k.qulf(id));

export async function yakunlanganmi(id) {
  return Boolean(await ol(k.qulf(id)));
}

export const izohKut = (chatId, id) => yoz(k.izoh(chatId), id, IZOH_TTL_S);
export const izohKutilmoqda = (chatId) => ol(k.izoh(chatId));
export const izohniTozala = (chatId) => ochir(k.izoh(chatId));
