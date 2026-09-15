// OpenAI API bilan ishlash. lib/claude.js va lib/gemini.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import OpenAI from 'openai';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';

const MODEL = 'gpt-6-astra';

let client;
function getClient() {
  // Kalitni oldin tekshiramiz — lib/config.js dagi izohga qarang.
  const key = requireKey('OPENAI_API_KEY');
  if (!client) client = new OpenAI({ apiKey: key });
  return client;
}

// Foydalanuvchi matnini OpenAI'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  const response = await getClient().responses.create({
    model: MODEL,
    instructions: systemPrompt(),
    input: userText,
  });

  const text = response.output_text?.trim();
  return text || 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
export function errorMessage(err) {
  const missing = missingKeyMessage(err);
  if (missing) return missing;

  // Balans tugaganda ham 429 keladi, lekin sababi limit emas — hisobda pul yo'q.
  // Amalda kuzatilgan kod: credit_balance_exhausted.
  if (err?.code === 'credit_balance_exhausted' || err?.code === 'insufficient_quota') {
    return 'AI hisobida mablag\'i tugagan. OpenAI platformasida to\'ldirilishi kerak.';
  }
  if (err?.status === 401 || err?.status === 403) {
    return 'AI kaliti noto\'g\'ri sozlangan. Administrator tekshirishi kerak.';
  }
  if (err?.status === 429) {
    return 'Hozir so\'rovlar ko\'p. Bir daqiqadan keyin qayta urinib ko\'ring.';
  }
  return 'Javob tayyorlashda xatolik bo\'ldi. Qayta urinib ko\'ring.';
}
