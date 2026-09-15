// Gemini API bilan ishlash. lib/claude.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import { GoogleGenAI } from '@google/genai';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';

const MODEL = 'gemini-3.8-flash';

let client;
function getClient() {
  // Kalitni oldin tekshiramiz — lib/config.js dagi izohga qarang.
  const key = requireKey('GEMINI_API_KEY');
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

// Foydalanuvchi matnini Gemini'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: userText,
    system_instruction: systemPrompt(),
    // Chat savollari uchun 'low'. Standart 'medium' bo'lib, o'lchashda oddiy
    // savolga 414 token fikrlash ketgan — javobning o'zi 67 token edi.
    // Butunlay o'chirib bo'lmaydi, 'low' — eng past daraja.
    generation_config: { thinking_level: 'low' },
  });

  const text = interaction.output_text?.trim();
  return text || 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
// SDK xato sinflariga emas, HTTP kodiga qaraymiz — u barqarorroq.
export function errorMessage(err) {
  const missing = missingKeyMessage(err);
  if (missing) return missing;

  const status = err?.status ?? err?.code;

  if (status === 400 || status === 401 || status === 403) {
    return 'AI kaliti noto\'g\'ri sozlangan. Administrator tekshirishi kerak.';
  }
  // Bepul limit tugaganda ham shu kod keladi.
  if (status === 429) {
    return 'Hozir so\'rovlar ko\'p yoki kunlik limit tugagan. Birozdan keyin urinib ko\'ring.';
  }
  return 'Javob tayyorlashda xatolik bo\'ldi. Qayta urinib ko\'ring.';
}
