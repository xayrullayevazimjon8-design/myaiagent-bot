// Gemini API bilan ishlash. lib/claude.js bilan bir xil interfeys:
// ask(matn, tarix) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
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

// Suhbat tarixini Gemini formatiga o'girish.
//
// `input` bitta matn ham, qadamlar ro'yxati ham bo'la oladi. Ko'p xabarli
// suhbat uchun ikkinchisi kerak: foydalanuvchi xabari — 'user_input',
// botniki — 'model_output'.
function input(tarix, userText) {
  return [...tarix, { role: 'user', text: userText }].map((m) => ({
    type: m.role === 'bot' ? 'model_output' : 'user_input',
    content: [{ type: 'text', text: m.text }],
  }));
}

// Foydalanuvchi matnini Gemini'ga yuborib, javob matnini qaytaradi.
// `tarix` — shu chatning oldingi xabarlari (lib/xotira.js).
export async function ask(userText, tarix = []) {
  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: input(tarix, userText),
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
  // Bepul limit tugaganda ham shu kod keladi (limit: 20, oyna hujjatda ko'rsatilmagan).
  if (status === 429) {
    return 'Hozir so\'rovlar ko\'p yoki limit tugagan. Birozdan keyin urinib ko\'ring.';
  }
  return 'Javob tayyorlashda xatolik bo\'ldi. Qayta urinib ko\'ring.';
}
