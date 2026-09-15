// Qaysi AI ishlashini shu fayl hal qiladi.
//
// AI_PROVIDER env var: "claude" (standart), "gemini" yoki "openai".
// Vercel'da shu bitta qiymatni o'zgartirib, modelni almashtirasiz — kod tegilmaydi.
import * as claude from './claude.js';
import * as gemini from './gemini.js';
import * as openai from './openai.js';

const PROVIDERS = { claude, gemini, openai };
const DEFAULT_PROVIDER = 'claude';

// Telegram bitta xabarda 4096 belgidan ko'pini qabul qilmaydi — biroz zaxira bilan.
const TELEGRAM_LIMIT = 4000;

// AI javobini kutishning ichki chegarasi.
//
// Vercel funksiyasi 60 soniyada majburan to'xtatiladi. Telegram esa allaqachon
// 200 olgani uchun xabarni qayta yubormaydi — natijada foydalanuvchiga hech narsa
// kelmaydi va logda ham xato qolmaydi. Shuning uchun limitdan oldinroq o'zimiz
// to'xtatamiz va hech bo'lmaganda sababini aytamiz.
const TIMEOUT_MS = 45_000;

export class TimeoutError extends Error {
  constructor(ms) {
    super(`AI ${ms} ms ichida javob bermadi`);
    this.name = 'TimeoutError';
  }
}

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
export function ask(userText, timeoutMs = TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });

  const call = provider().ask(userText);

  // Chegara g'olib chiqsa, so'rovning keyingi rad javobi egasiz qoladi va Node
  // buni "unhandled rejection" deb jarayonni yiqitishi mumkin. Shuning uchun
  // yutqazgan tomonni ham ushlab qo'yamiz — logga yozamiz, foydalanuvchiga emas.
  call.catch((err) => console.error('Chegaradan keyin kelgan AI xatosi:', err?.message ?? err));

  // Promise.race so'rovni bekor qilmaydi — u fonda davom etadi, lekin biz kutmaymiz.
  // Taymerni tozalash shart: aks holda funksiya bo'sh turib vaqt sarflaydi.
  return Promise.race([call, timeout]).finally(() => clearTimeout(timer));
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
export function errorMessage(err) {
  if (err instanceof TimeoutError) {
    return 'Javob juda uzoq tayyorlanyapti. Savolni qisqaroq qilib qayta yuboring.';
  }
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
