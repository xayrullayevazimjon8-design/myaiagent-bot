// Botning xarakteri — xarakter.md dan o'qiladi va system prompt sifatida ishlatiladi.
//
// Nega alohida fayl: xarakterni o'zgartirish uchun kodga tegish shart bo'lmasin.
// Nega bitta joyda: ilgari har bir provayder faylida o'z nusxasi bor edi —
// birini tahrirlab ikkinchisini unutish oson, natijada bot provayderga qarab
// boshqacha gapirib qolardi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM'da __dirname yo'q — yo'lni import.meta.url dan olamiz.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const XARAKTER_FAYLI = path.join(HERE, '..', 'xarakter.md');

// Fayl topilmasa bot butunlay to'xtab qolmasligi kerak.
const ZAXIRA = `Sen Telegram'dagi yordamchi botsan. O'zbek tilida, qisqa javob ber.
Bilmagan narsangni to'qib chiqarma — bilmasligingni ayt.`;

let matn;

// System prompt. Birinchi chaqiruvda o'qiladi, keyin xotirada saqlanadi.
export function systemPrompt() {
  if (matn) return matn;

  try {
    matn = fs.readFileSync(XARAKTER_FAYLI, 'utf8').trim();
  } catch (err) {
    // Vercel'da bu odatda vercel.json dagi includeFiles unutilganini bildiradi.
    console.warn('xarakter.md o\'qilmadi, zaxira prompt ishlatiladi:', err.message);
    matn = ZAXIRA;
  }

  return matn;
}
