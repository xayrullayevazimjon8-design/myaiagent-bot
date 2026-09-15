// Qaysi AI ishlashini shu fayl hal qiladi.
//
// AI_PROVIDER env var: "gemini" (standart), "claude" yoki "openai".
// Vercel'da shu bitta qiymatni o'zgartirib, modelni almashtirasiz — kod tegilmaydi.
import * as claude from './claude.js';
import * as gemini from './gemini.js';
import * as openai from './openai.js';

const PROVIDERS = { claude, gemini, openai };
const DEFAULT_PROVIDER = 'gemini';

// Telegram bitta xabarda 4096 belgidan ko'pini qabul qilmaydi — biroz zaxira bilan.
const TELEGRAM_LIMIT = 4000;

// Tanlangan provayder nomi. Noto'g'ri qiymat yozilsa logda ko'rinadi.
export function providerName() {
  const name = (process.env.AI_PROVIDER ?? DEFAULT_PROVIDER).trim().toLowerCase();
  if (!PROVIDERS[name]) {
    console.warn(`AI_PROVIDER="${name}" noma'lum, "${DEFAULT_PROVIDER}" ishlatiladi`);
    return DEFAULT_PROVIDER;
  }
  return name;
}

function provider() {
  return PROVIDERS[providerName()];
}

// Foydalanuvchi matnini tanlangan AI'ga yuborib, javob matnini qaytaradi.
export function ask(userText) {
  return provider().ask(userText);
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
export function errorMessage(err) {
  return provider().errorMessage(err);
}

// Uzun javobni Telegram chegarasiga sig'adigan bo'laklarga bo'lish.
// Provayderga bog'liq emas — shuning uchun shu yerda.
export function splitMessage(text, limit = TELEGRAM_LIMIT) {
  const parts = [];
  let rest = text;

  while (rest.length > limit) {
    // Qatordan, bo'lmasa probeldan uzamiz — so'z o'rtasidan kesmaslik uchun.
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(' ', limit);
    if (cut < limit / 2) cut = limit;

    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);

  return parts;
}
