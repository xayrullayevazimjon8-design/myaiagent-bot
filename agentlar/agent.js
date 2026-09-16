// Agentlarning umumiy qismi: xarakter faylini o'qish va ishga tushirish.
//
// Jarvis mijoz bilan gaplashadi, agentlar esa ichki ish bajaradi: yozuvchi
// post yozadi, muharrir uni tekshiradi.
//
// Har bir agent shu papkada ikki fayldan iborat:
//   <nom>.md — xarakteri (system prompt), kodda emas — xuddi xarakter.md kabi
//   <nom>.js — o'sha agentning funksiyalari: topshiriq matni, javobni o'qish
//
// Yangi agent qo'shish uchun shu ikki faylni yozish yetarli.
//
// Agentlar vositasiz ishlaydi: yozuvchiga material allaqachon berilgan,
// muharrirga tekshiriladigan matn berilgan — qidiruv ikkalasiga ham kerak emas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ask } from '../lib/ai.js';

// ESM'da __dirname yo'q — yo'lni import.meta.url dan olamiz.
// Xarakter fayllari shu papkaning o'zida: agentlar/<nom>.md
const PAPKA = path.dirname(fileURLToPath(import.meta.url));

// Fayl topilmasa ish butunlay to'xtamasligi kerak. Vercel'da bu odatda
// vercel.json dagi includeFiles ro'yxatiga agentlar/** qo'shilmaganini bildiradi.
const ZAXIRA = {
  yozuvchi: `Sen Telegram uchun post yozasan. O'zbek tilida, 5-8 qator, sodda til.
Faqat berilgan materialdagi faktlarga tayan, yangi raqam o'ylab topma.
Oxirgi qator savol yoki chaqiriq bo'lsin. Markdown belgilaridan foydalanma.`,

  muharrir: `Sen muharrirsan. Postni tekshirasan va birinchi qatorda faqat hukm yozasan:
O'TDI yoki QAYTA YOZ. Keyingi qatorlarda sababini qisqa tushuntirasan.
Tekshiradigan narsalar: mavzuga moslik, uydirma fakt, ohang, uzunlik (5-8 qator).`,
};

const kesh = new Map();

// Agentning system prompti. Birinchi chaqiruvda o'qiladi, keyin xotirada qoladi.
export function agentPrompt(nom) {
  if (kesh.has(nom)) return kesh.get(nom);

  let matn;
  try {
    matn = fs.readFileSync(path.join(PAPKA, `${nom}.md`), 'utf8').trim();
  } catch (err) {
    console.warn(`agentlar/${nom}.md o'qilmadi, zaxira prompt ishlatiladi:`, err.message);
    matn = ZAXIRA[nom] ?? `Sen "${nom}" agentisan. O'zbek tilida qisqa va aniq ishla.`;
  }

  kesh.set(nom, matn);
  return matn;
}

// Agentni ishga tushirish: topshiriq matnini berib, javobini olish.
// Suhbat tarixi uzatilmaydi — har chaqiruv mustaqil topshiriq.
export function ishlat(nom, topshiriq, sozlama = {}) {
  return ask(topshiriq, [], {
    system: agentPrompt(nom),
    vositasiz: true,
    ...sozlama,
  });
}
