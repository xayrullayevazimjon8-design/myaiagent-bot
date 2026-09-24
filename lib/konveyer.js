// Post konveyeri: tayyor post egasiga tugmalar bilan keladi, egasi qaror qiladi.
//
//   [Chiqar]    → post kanalga nusxalanadi (KANAL_ID)
//   [Qayta yoz] → egasining keyingi xabari izoh bo'ladi, yozuvchi qayta yozadi;
//                 izohda rasm tilga olinsa, kover ham qayta chiziladi
//   [Yangi rasm] → matn o'sha, faqat kover qayta chiziladi
//   [Bekor]     → qoralama o'chiriladi
//
// Har bosqich alohida webhook chaqiruvi, holat lib/qoralama.js da. Qoralama
// yo'qolgan bo'lsa (Redis ulanmagan va funksiya nusxasi almashgan) tugmalar
// baribir ishlaydi: post matni va rasmi Telegram xabarining o'zidan olinadi.
import {
  sendMessage, sendPhoto, rasmId, answerCallbackQuery, tugmalarniQoy, copyMessage,
} from './telegram.js';
import {
  yangiId, qoralamaOl, qoralamaSaqla, qoralamaOchir, band, bandniBosh,
  yakunlanganmi, izohKut, izohKutilmoqda, izohniTozala,
} from './qoralama.js';
import { izohBilanQaytaYoz, izohJarayonMatni } from './post.js';
import { kover } from './kover.js';
import { tavsifQur } from './kover-api.js';
import * as jurnal from './jurnal.js';
import { splitMessage } from './ai.js';

// Rasm izohi (caption) shundan uzun bo'lolmaydi — matn alohida xabar bo'lib ketadi.
export const IZOH_CHEGARASI = 1024;

// Kanal egasi — /post va tugmalar faqat unga ishlaydi.
export function egaId() {
  return process.env.EGA_ID?.trim() || '';
}

export function egami(userId) {
  return Boolean(egaId()) && String(userId) === egaId();
}

function kanalId() {
  return process.env.KANAL_ID?.trim() || '';
}

// callback_data: "<amal>:<id>" yoki "<amal>:<id>:<bosh>".
// `bosh` — post bir nechta xabardan iborat bo'lsa birinchisining id si.
// Qoralama yo'qolganda kanalga qaysi xabarlarni ko'chirishni shundan bilamiz.
function tugmalar(id, bosh) {
  const d = (amal) => [amal, id, bosh].filter(Boolean).join(':');
  return [
    [{ text: '✅ Chiqar', callback_data: d('c') }],
    [{ text: '✏️ Qayta yoz', callback_data: d('q') }, { text: '🎨 Yangi rasm', callback_data: d('r') }],
    [{ text: '❌ Bekor', callback_data: d('b') }],
  ];
}

function oraliq(bosh, oxiri) {
  const ids = [];
  for (let i = bosh; i <= oxiri; i++) ids.push(i);
  return ids;
}

// Qoralamani egasiga ko'rsatish va saqlash.
//
// `q` — { id, mavzu, natija, post, rasm, mime }. `rasm` — baytlar, file_id yoki null.
// Post izohga sig'sa rasm bilan bitta xabar, sig'masa rasm + matn. Tugmalar
// doim oxirgi xabarda.
export async function korsat(chatId, { rasm, mime, ...q }) {
  const xabarlar = [];
  let fileId = typeof rasm === 'string' ? rasm : null;

  if (rasm && q.post.length <= IZOH_CHEGARASI) {
    const xabar = await sendPhoto(chatId, rasm, q.post, mime, tugmalar(q.id));
    if (xabar) {
      xabarlar.push(xabar.message_id);
      fileId = rasmId(xabar);
    }
  } else if (rasm) {
    const xabar = await sendPhoto(chatId, rasm, '', mime);
    if (xabar) {
      xabarlar.push(xabar.message_id);
      fileId = rasmId(xabar);
    }
  }

  // Rasm bilan birga ketmagan bo'lsa (uzun post, rasm yo'q yoki yuborilmadi) —
  // matn alohida, tugmalar oxirgi bo'lakda.
  if (xabarlar.length === 0 || q.post.length > IZOH_CHEGARASI) {
    const bosh = xabarlar[0];
    const bolaklar = splitMessage(q.post);
    for (let i = 0; i < bolaklar.length; i++) {
      const oxirgi = i === bolaklar.length - 1;
      const xabar = await sendMessage(chatId, bolaklar[i], oxirgi ? tugmalar(q.id, bosh ?? null) : undefined);
      if (xabar) xabarlar.push(xabar.message_id);
    }
  }

  // Saqlanmasa ham tugmalar ishlaydi (fayl boshidagi izohga qarang) —
  // shuning uchun xato postni to'xtatmaydi.
  try {
    await qoralamaSaqla({ ...q, chatId, fileId, xabarlar });
  } catch (err) {
    console.error('Qoralama saqlanmadi:', err?.message ?? err);
  }
}

// Qoralamani o'qish; Redis xatosi bo'lsa null — tugma baribir ishlasin.
async function xavfsizOl(id) {
  try {
    return await qoralamaOl(id);
  } catch (err) {
    console.error('Qoralama o\'qilmadi:', err?.message ?? err);
    return null;
  }
}

// Qoralama yo'q bo'lsa, Telegram xabarining o'zidan tiklash.
function xabardanTikla(id, xabar, bosh) {
  const post = xabar.caption ?? xabar.text ?? '';
  return {
    id,
    mavzu: post.split('\n')[0],
    natija: null,
    post,
    fileId: rasmId(xabar),
    xabarlar: bosh ? oraliq(Number(bosh), xabar.message_id) : [xabar.message_id],
  };
}

async function chiqar(cq, id, bosh) {
  const xabar = cq.message;
  const chatId = xabar.chat.id;
  const kanal = kanalId();

  if (!kanal) {
    await answerCallbackQuery(cq.id, 'KANAL_ID sozlanmagan');
    await sendMessage(chatId, 'KANAL_ID sozlanmagan. Vercel\'ga kanal manzilini (@kanal yoki -100...) qo\'shing va Redeploy qiling.');
    return;
  }
  if (!(await band(id))) {
    await answerCallbackQuery(cq.id, 'Bu post allaqachon yakunlangan');
    return;
  }
  await answerCallbackQuery(cq.id, 'Kanalga chiqarilmoqda...');

  // Tugmalar avval olinadi: copyMessage ularni ham kanalga ko'chirardi.
  await tugmalarniQoy(chatId, xabar.message_id);

  const q = (await xavfsizOl(id)) ?? xabardanTikla(id, xabar, bosh);
  for (const messageId of q.xabarlar) {
    const javob = await copyMessage(kanal, chatId, messageId);
    if (!javob.ok) {
      await bandniBosh(id);
      await tugmalarniQoy(chatId, xabar.message_id, tugmalar(id, bosh));
      await sendMessage(chatId, [
        `❌ Kanalga chiqmadi: ${javob.description ?? 'noma\'lum xato'}`,
        '',
        'Tekshiring: bot kanalda admin va "xabar yuborish" huquqi bor,',
        `KANAL_ID to'g'ri (hozir: ${kanal}).`,
      ].join('\n'));
      return;
    }
  }

  await sendMessage(chatId, '✅ Kanalga chiqdi.');
  await tozalaHammasini(chatId, id);
}

async function bekor(cq, id) {
  const xabar = cq.message;
  if (!(await band(id))) {
    await answerCallbackQuery(cq.id, 'Bu post allaqachon yakunlangan');
    return;
  }
  await answerCallbackQuery(cq.id, 'Bekor qilindi');
  await tugmalarniQoy(xabar.chat.id, xabar.message_id);
  await sendMessage(xabar.chat.id, '❌ Bekor qilindi.');
  await tozalaHammasini(xabar.chat.id, id);
}

async function qaytaYozSora(cq, id, bosh) {
  const xabar = cq.message;
  const chatId = xabar.chat.id;

  if (await yakunlanganmi(id)) {
    await answerCallbackQuery(cq.id, 'Bu post allaqachon yakunlangan');
    return;
  }
  if (!(await xavfsizOl(id))) {
    await qoralamaSaqla(xabardanTikla(id, xabar, bosh));
  }

  await izohKut(chatId, id);
  await answerCallbackQuery(cq.id);
  await sendMessage(chatId, [
    '✏️ Nimani o\'zgartirish kerak? Izohingizni bitta xabarda yozing.',
    'Fikringiz o\'zgarsa — istalgan buyruq (masalan /help) kutishni bekor qiladi.',
  ].join('\n'));
}

async function tozalaHammasini(chatId, id) {
  try {
    await qoralamaOchir(id);
    if ((await izohKutilmoqda(chatId)) === id) await izohniTozala(chatId);
  } catch (err) {
    console.error('Qoralama tozalanmadi:', err?.message ?? err);
  }
}

// Tugma bosilganda (callback_query).
export async function tugmaBosildi(cq) {
  if (!egami(cq.from?.id)) {
    await answerCallbackQuery(cq.id, 'Bu tugma faqat kanal egasi uchun.');
    return;
  }
  if (!cq.message) {
    await answerCallbackQuery(cq.id, 'Xabar juda eski — /post bilan qaytadan boshlang.');
    return;
  }

  const [amal, id, bosh] = (cq.data ?? '').split(':');
  if (amal === 'c') return chiqar(cq, id, bosh);
  if (amal === 'b') return bekor(cq, id);
  if (amal === 'q') return qaytaYozSora(cq, id, bosh);
  if (amal === 'r') return rasmniYangila(cq, id, bosh);
  await answerCallbackQuery(cq.id);
}

// Egasi izoh kutilayotgan paytda yozgan xabar: shu qoralama uchun izoh.
// Qaytaradi: qoralama id si yoki null (izoh kutilmayapti).
export async function kutilayotganIzoh(chatId) {
  try {
    return await izohKutilmoqda(chatId);
  } catch (err) {
    console.error('Izoh holati o\'qilmadi:', err?.message ?? err);
    return null;
  }
}

export async function izohniBekorQil(chatId) {
  try {
    await izohniTozala(chatId);
  } catch (err) {
    console.error('Izoh holati tozalanmadi:', err?.message ?? err);
  }
}

// Izoh rasm haqida bo'lsa kover ham qayta chiziladi. Ortiqcha chizilgan rasm
// arzon xato, egasi so'ragan rasmning o'zgarmay qolishi esa qimmatroq.
const RASM_SOZLARI = /(rasm|kover|surat|muqova|foto|image)/i;

export function rasmHaqidami(izoh) {
  return RASM_SOZLARI.test(izoh ?? '');
}

// Kover qayta chizish. `izoh` bo'lsa rasm modeliga qo'shimcha talab bo'lib boradi.
//
// Qaytaradi: { rasm, mime, xabar } — rasm null bo'lsa eskisi qoladi.
// Shablon kover mavzudan hisoblanadi, ya'ni har safar bir xil chiqadi — shuning
// uchun API ishlamasa egasiga buni ochiq aytamiz, aks holda "rasm o'zgarmadi"
// degan jumboq qoladi.
async function koverniQaytaChiz(q, izoh) {
  const mavzu = q.mavzu || q.post.split('\n')[0];
  const tavsif = izoh
    ? `${tavsifQur(mavzu)} Additional request from the post owner (may be in Uzbek): "${izoh}". Still no text in the image.`
    : tavsifQur(mavzu);

  const k = await jurnal.kuzat('rasm', `Kover qayta chizmoqda: ${mavzu}`,
    () => kover({ mavzu, tavsif, sarlavha: q.post.split('\n')[0] }),
    (natija) => `Kover tayyor: ${natija.usul}${natija.sabab ? ` (${natija.sabab})` : ''}`);

  if (k.usul === 'api') return { rasm: k.rasm, mime: k.mime, xabar: '🎨 Yangi rasm chizildi.' };
  if (k.usul === 'ochirilgan') return { rasm: null, mime: '', xabar: '⚠️ Kover o\'chirilgan (KOVER=off) — rasm o\'sha qoldi.' };
  return {
    rasm: k.rasm, mime: k.mime,
    xabar: `⚠️ Rasm API ishlamadi (${k.sabab}) — shablon kover qo'yildi, u har safar bir xil chiqadi.`,
  };
}

// 🎨 Yangi rasm — matn o'sha, kover qayta chiziladi.
async function rasmniYangila(cq, id, bosh) {
  const xabar = cq.message;
  const chatId = xabar.chat.id;

  if (await yakunlanganmi(id)) {
    await answerCallbackQuery(cq.id, 'Bu post allaqachon yakunlangan');
    return;
  }
  await answerCallbackQuery(cq.id, 'Yangi rasm chizilmoqda...');

  const q = (await xavfsizOl(id)) ?? xabardanTikla(id, xabar, bosh);
  const yangi = await koverniQaytaChiz(q);
  await sendMessage(chatId, yangi.xabar);
  if (!yangi.rasm) return;

  // Eski variantning tugmalari olinadi — amaldagisi faqat yangisi.
  await tugmalarniQoy(chatId, xabar.message_id);
  await korsat(chatId, { ...q, rasm: yangi.rasm, mime: yangi.mime });
}

// Izoh bilan qayta yozish. Uzoq ish — api/bot.js uni waitUntil ichida chaqiradi.
export async function izohBilanQayta(chatId, id, izoh) {
  await izohniTozala(chatId);

  const q = await xavfsizOl(id);
  if (!q) {
    await sendMessage(chatId, 'Qoralama topilmadi — muddati o\'tgan bo\'lishi mumkin. /post bilan qaytadan boshlang.');
    return;
  }
  if (await yakunlanganmi(id)) {
    await sendMessage(chatId, 'Bu post allaqachon yakunlangan.');
    return;
  }

  const { post, hukm } = await izohBilanQaytaYoz(q, izoh);
  const yangiRasm = rasmHaqidami(izoh) ? await koverniQaytaChiz({ ...q, post }, izoh) : null;

  // Eski variantning tugmalari olinadi — amaldagisi faqat yangisi.
  const eski = q.xabarlar.at(-1);
  if (eski) await tugmalarniQoy(chatId, eski);

  await sendMessage(chatId, [izohJarayonMatni(hukm), yangiRasm?.xabar].filter(Boolean).join('\n'));
  await korsat(chatId, {
    ...q, post,
    ...(yangiRasm?.rasm ? { rasm: yangiRasm.rasm, mime: yangiRasm.mime } : { rasm: q.fileId, mime: 'image/png' }),
  });
}
