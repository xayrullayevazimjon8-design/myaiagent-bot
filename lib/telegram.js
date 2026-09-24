// Telegram Bot API chaqiruvlari. Token faqat shu faylda o'qiladi.
//
// Har funksiya xatoni logga yozadi va null qaytaradi — xato tashlamaydi:
// bitta xabar yuborilmay qolsa, qolgan ish to'xtamasligi kerak.

const TELEGRAM_API = 'https://api.telegram.org';

function apiUrl(method) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN topilmadi');
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

// Umumiy chaqiruv. Qaytaradi: { ok, result, description }.
// `tana` — oddiy obyekt (JSON bo'lib ketadi) yoki FormData (fayl yuklash uchun).
export async function tg(method, tana) {
  const forma = tana instanceof FormData;
  try {
    const res = await fetch(apiUrl(method), {
      method: 'POST',
      ...(forma ? {} : { headers: { 'Content-Type': 'application/json' } }),
      body: forma ? tana : JSON.stringify(tana),
    });
    const javob = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
    if (!javob.ok) console.error(`${method} xato:`, res.status, javob.description);
    return javob;
  } catch (err) {
    console.error(`${method} xato:`, err);
    return { ok: false, description: err?.message ?? String(err) };
  }
}

const natija = (javob) => (javob.ok ? javob.result : null);

// Inline tugmalar: [[{ text, callback_data }], ...] ko'rinishida qatorlar.
const tugmali = (tugmalar) => (tugmalar ? { reply_markup: { inline_keyboard: tugmalar } } : {});

// Xabar yuborish. Qaytaradi: yuborilgan xabar yoki null.
export async function sendMessage(chatId, text, tugmalar) {
  return natija(await tg('sendMessage', { chat_id: chatId, text, ...tugmali(tugmalar) }));
}

// Rasm yuborish. `rasm` — baytlar (multipart bilan yuklanadi) yoki Telegram'dagi
// file_id satri (qayta yuklash shart emas). Qaytaradi: yuborilgan xabar yoki null.
export async function sendPhoto(chatId, rasm, izoh = '', mime = 'image/png', tugmalar) {
  if (typeof rasm === 'string') {
    return natija(await tg('sendPhoto', {
      chat_id: chatId, photo: rasm, ...(izoh ? { caption: izoh } : {}), ...tugmali(tugmalar),
    }));
  }

  // Node 20 da FormData ham, Blob ham bor — qo'shimcha kutubxona kerak emas.
  const kengaytma = mime.split('/')[1]?.split('+')[0] || 'png';
  const forma = new FormData();
  forma.append('chat_id', String(chatId));
  if (izoh) forma.append('caption', izoh);
  if (tugmalar) forma.append('reply_markup', JSON.stringify({ inline_keyboard: tugmalar }));
  forma.append('photo', new Blob([rasm], { type: mime }), `kover.${kengaytma}`);
  return natija(await tg('sendPhoto', forma));
}

// Xabardagi rasmning file_id si — eng katta o'lchamdagisi ro'yxat oxirida.
export function rasmId(xabar) {
  return xabar?.photo?.at(-1)?.file_id ?? null;
}

export async function sendTyping(chatId) {
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
}

// Tugma bosilganini tasdiqlash. Chaqirilmasa tugmada soat belgisi aylanib turadi.
export async function answerCallbackQuery(id, text = '') {
  await tg('answerCallbackQuery', { callback_query_id: id, ...(text ? { text } : {}) });
}

// Xabardagi tugmalarni almashtirish yoki (tugmalar berilmasa) olib tashlash.
export async function tugmalarniQoy(chatId, messageId, tugmalar = []) {
  const javob = await tg('editMessageReplyMarkup', {
    chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: tugmalar },
  });
  return javob.ok;
}

// Xabarni boshqa chatga nusxalash (forward belgisisiz). Asl xabardagi inline
// tugmalar ham ko'chadi — shuning uchun avval ularni olib tashlang.
// Qaytaradi: { ok, result, description }.
export async function copyMessage(chatId, fromChatId, messageId) {
  return tg('copyMessage', { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId });
}

// Bot qabul qiladigan hodisalar. callback_query bo'lmasa tugmalar bosilganda
// Telegram botga hech narsa yubormaydi — tugmalar "ishlamaydi".
export const HODISALAR = ['message', 'edited_message', 'callback_query'];

// Production manzili. Preview deploydan chaqirilsa ham webhook shu yerga qo'yiladi.
const WEBHOOK_URL = 'https://myaiagent-bot.vercel.app/api/bot';

// Webhook'ni to'g'ri sozlash va natijasini qaytarish. Takroriy chaqiruv zararsiz:
// har safar aynan bir xil sozlama qo'yiladi.
export async function webhookniTuzat() {
  const url = process.env.WEBHOOK_URL?.trim() || WEBHOOK_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const qoyildi = await tg('setWebhook', {
    url, allowed_updates: HODISALAR, ...(secret ? { secret_token: secret } : {}),
  });
  const holat = await tg('getWebhookInfo', {});
  return { setWebhook: qoyildi, getWebhookInfo: holat.result ?? holat };
}
