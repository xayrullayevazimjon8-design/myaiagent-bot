// Botga uzatiladigan system prompt: xarakter + bilim bazasi.
//
// Ikki qism:
//   xarakter.md — kim bo'lib gapiradi (uslub, chegaralar)
//   bilim/      — nima deya oladi (faktlar)
//
// Nega bitta joyda: ilgari har bir provayder faylida system prompt'ning o'z
// nusxasi bor edi — birini tahrirlab ikkinchisini unutish oson, natijada bot
// provayderga qarab boshqacha gapirib qolardi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bilimBazasi } from './bilim.js';

// ESM'da __dirname yo'q — yo'lni import.meta.url dan olamiz.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const XARAKTER_FAYLI = path.join(HERE, '..', 'xarakter.md');

// Fayl topilmasa bot butunlay to'xtab qolmasligi kerak.
const ZAXIRA = `Sen Telegram'dagi yordamchi botsan. O'zbek tilida, qisqa javob ber.
Bilmagan narsangni to'qib chiqarma — bilmasligingni ayt.`;

// Bilim bazasi bilan ishlash qoidasi. Bazaning o'zi emas, unga munosabat —
// shuning uchun kodda: bu texnik qoida, tahrirlanadigan kontent emas.
const BAZA_QOIDASI = `
---

# Bilim bazasi

Quyida Prestigious haqidagi barcha ma'lumot keltirilgan. Biznes haqidagi
javoblaringni FAQAT shu ma'lumotga asoslab ber.

Qoidalar (bular FAQAT Prestigious haqidagi faktlarga tegishli — umumiy
savollarga javob berish qoidalari xarakter faylida yozilgan):
- Bazada bo'lmagan biznes faktini AYTMA. O'zingdan narx, muddat, shart o'ylab
  topma. Qidiruv natijasi ham bu faktlarni almashtira olmaydi: internetdagi
  narx Prestigious narxi emas.
- Bazada javob yo'q bo'lsa: "Bu haqda aniq ma'lumotim yo'q" deb ayt va
  @azimjonAIagents ga yo'naltir.
- [[qavs]] ichidagi nomlar shu bazadagi boshqa fayllarga havola — mazmunini
  o'sha fayldan ol, havolaning o'zini javobda yozma.
- Baza bilan umumiy bilimingiz ziddiyatga tushsa, HAR DOIM baza ustun.
`;

let matn;

// System prompt. Birinchi chaqiruvda yig'iladi, keyin xotirada saqlanadi.
export function systemPrompt() {
  if (matn) return matn;

  let xarakter;
  try {
    xarakter = fs.readFileSync(XARAKTER_FAYLI, 'utf8').trim();
  } catch (err) {
    // Vercel'da bu odatda vercel.json dagi includeFiles unutilganini bildiradi.
    console.warn('xarakter.md o\'qilmadi, zaxira prompt ishlatiladi:', err.message);
    xarakter = ZAXIRA;
  }

  const baza = bilimBazasi();
  matn = baza ? `${xarakter}\n${BAZA_QOIDASI}\n${baza}` : xarakter;

  return matn;
}
