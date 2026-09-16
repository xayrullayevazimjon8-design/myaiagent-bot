// Rasm generatsiyasi — koverning asosiy yo'li.
//
// Rasm `@google/genai` orqali yasaladi: kutubxona loyihada allaqachon bor va
// kalit ham o'sha (GEMINI_API_KEY). Alohida kalit kerak bo'lsa RASM_API_KEY.
//
// Diqqat: SDK'dagi `models.generateImages` (Imagen) bu yerda ishlamaydi — u
// faqat Vertex AI uchun va oddiy kalit bilan chaqirilsa SDK darhol rad etadi:
// "This method is only supported by the Gemini Enterprise Agent Platform".
// Shuning uchun matn bilan bir xil yo'l ishlatiladi — `interactions.create`,
// faqat modeli rasm modeli va javobi `output_image` bo'lib keladi.
//
// Bu fayl xato tashlaydi — uni ushlab, zaxira yo'lga o'tish lib/kover.js ning ishi.
import { GoogleGenAI } from '@google/genai';

// Rasm modeli. Flash — matndagi kabi: tezroq va arzonroq.
const MODEL = process.env.RASM_MODEL?.trim() || 'gemini-3.1-flash-image';

// Rasm generatsiyasi matn javobidan sekinroq. /post umumiy vaqtga sig'ishi
// uchun chegara qo'yamiz — kechiksa shablon kover tezroq chiqadi.
const TIMEOUT_MS = 15_000;

function kalit() {
  return process.env.RASM_API_KEY?.trim()
    || process.env.GEMINI_API_KEY?.trim()
    || process.env.AI_API_KEY?.trim()
    || '';
}

export function yoqilganmi() {
  return Boolean(kalit());
}

let client;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: kalit() });
  return client;
}

// Mavzudan rasm tavsifini tuzish.
//
// "Matnsiz" degan talab muhim: rasm modellari harflarni buzib chizadi,
// o'zbekchani ayniqsa. Sarlavha rasmda emas, post matnida qoladi.
export function tavsifQur(mavzu) {
  return [
    `A clean, modern cover illustration for a social media post about "${mavzu}".`,
    'Professional and business-friendly, minimal composition, soft gradient background,',
    'abstract geometric shapes, calm colors.',
    'No text, no letters, no words, no numbers, no logos, no watermarks.',
  ].join(' ');
}

// Javobdan rasmni ajratib olish. SDK uni `output_image` da beradi, lekin
// qadamlar ichidagi rasm blokini ham tekshiramiz — shakl o'zgarsa ham topilsin.
function rasmniOl(interaction) {
  const tayyor = interaction?.output_image;
  if (tayyor?.data) return { data: tayyor.data, mime: tayyor.mime_type || 'image/png' };

  for (const qadam of interaction?.steps ?? []) {
    for (const blok of qadam?.content ?? []) {
      if (blok?.type === 'image' && blok.data) {
        return { data: blok.data, mime: blok.mime_type || 'image/png' };
      }
    }
  }
  return null;
}

// Rasm yasash. Muvaffaqiyatli bo'lsa { rasm, mime } qaytadi.
export async function yasa(tavsif, timeoutMs = TIMEOUT_MS) {
  let timer;
  const chegara = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Rasm ${timeoutMs} ms ichida tayyor bo'lmadi`)), timeoutMs);
  });

  const chaqiruv = getClient().interactions.create({
    model: MODEL,
    input: tavsif,
  });

  // Chegara g'olib chiqsa chaqiruvning keyingi rad javobi egasiz qolmasin.
  chaqiruv.catch(() => {});

  const javob = await Promise.race([chaqiruv, chegara]).finally(() => clearTimeout(timer));

  const rasm = rasmniOl(javob);
  if (!rasm) throw new Error('Rasm API javobida rasm yo\'q');

  return { rasm: Buffer.from(rasm.data, 'base64'), mime: rasm.mime };
}
