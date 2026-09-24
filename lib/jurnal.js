// Agentlar jurnali — ofis sahifasi (ofis.html) shuni o'qiydi.
//
// Har qadam bitta qator: kim, qanday holatda, nima qildi. Redis'da ro'yxat
// bo'lib turadi (eng yangisi boshida), /jurnal.md manzilida markdown bo'lib
// beriladi (api/jurnal.js). Redis bo'lmasa — funksiya xotirasida.
//
// Jurnal bezak: yozilmay qolsa ham post tayyorlanishi to'xtamasligi kerak,
// shuning uchun bu fayldagi hech narsa xato tashlamaydi.
import { redisSozlamasi, redisBuyruq } from './redis.js';

export const AGENTLAR = ['yozuvchi', 'muharrir', 'rasm'];
export const HOLATLAR = ['kutmoqda', 'ishlayapti', 'tugatdi'];

const KALIT = 'jurnal';

// Nechta qator saqlanadi. Ofisga oxirgi holat kerak, uzun tarix emas.
const MAX_QATOR = 200;

// Harakat matni qisqa bo'lsin: jurnal ochiq sahifa, egasining izohi yoki
// postning to'liq matni bu yerga tushmasligi kerak.
const MAX_BELGI = 120;

const xotira = [];

function qisqa(matn) {
  const toza = String(matn ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
  return toza.length > MAX_BELGI ? `${toza.slice(0, MAX_BELGI)}…` : toza;
}

// Qator shakli: "- 2026-09-24T19:02:28.123Z | yozuvchi | ishlayapti | Qoralama yozmoqda"
export function qatorYasa(agent, holat, harakat, vaqt = new Date()) {
  return `- ${vaqt.toISOString()} | ${agent} | ${holat} | ${qisqa(harakat)}`;
}

export async function yoz(agent, holat, harakat) {
  const qator = qatorYasa(agent, holat, harakat);
  const redis = redisSozlamasi();
  try {
    if (!redis) {
      xotira.unshift(qator);
      xotira.length = Math.min(xotira.length, MAX_QATOR);
      return;
    }
    await redisBuyruq(redis, ['LPUSH', KALIT, qator]);
    await redisBuyruq(redis, ['LTRIM', KALIT, '0', String(MAX_QATOR - 1)]);
  } catch (err) {
    console.error('Jurnalga yozilmadi:', err?.message ?? err);
  }
}

// Agent ishini jurnal bilan o'rash: boshida "ishlayapti", oxirida "tugatdi".
// `yakun(natija)` — tugagandagi harakat matni. Xato bo'lsa ham "tugatdi" yoziladi
// (sababi bilan) — aks holda ofisda agent abadiy "ishlayapti" bo'lib qolardi.
export async function kuzat(agent, harakat, ish, yakun) {
  await yoz(agent, 'ishlayapti', harakat);
  try {
    const natija = await ish();
    await yoz(agent, 'tugatdi', yakun(natija));
    return natija;
  } catch (err) {
    await yoz(agent, 'tugatdi', `Xato: ${err?.message ?? err}`);
    throw err;
  }
}

// Qatorlar ro'yxati, eng yangisi birinchi.
export async function qatorlar() {
  const redis = redisSozlamasi();
  if (!redis) return [...xotira];
  try {
    return (await redisBuyruq(redis, ['LRANGE', KALIT, '0', String(MAX_QATOR - 1)])) ?? [];
  } catch (err) {
    console.error('Jurnal o\'qilmadi:', err?.message ?? err);
    return [];
  }
}

export async function markdown() {
  const royxat = await qatorlar();
  return [
    '# Agentlar jurnali',
    '',
    'Eng yangisi birinchi. Qator: vaqt | agent | holat | harakat',
    `Agentlar: ${AGENTLAR.join(', ')}. Holatlar: ${HOLATLAR.join(', ')}.`,
    '',
    ...royxat,
    '',
  ].join('\n');
}
