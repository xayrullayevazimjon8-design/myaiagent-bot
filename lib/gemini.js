// Gemini API bilan ishlash. lib/claude.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3.8-flash';

// Javob uslubi. Claude'dagi bilan bir xil bo'lsin — bot bir xil "gapirsin".
const SYSTEM_PROMPT = `Sen Telegram'dagi yordamchi botsan. Foydalanuvchi bilan o'zbek tilida gaplashasan
(agar u boshqa tilda yozsa, o'sha tilda javob ber).

Qoidalar:
- Javobing qisqa va aniq bo'lsin: Telegram'da o'qiladi, uzun matn noqulay.
- Markdown belgilaridan (**, ##, |) foydalanma — oddiy matn yoz. Ro'yxat kerak bo'lsa "- " ishlat.
- Bilmagan narsangni to'qib chiqarma, bilmayman deb ayt.`;

let client;
function getClient() {
  // Kalit yo'q bo'lsa konstruktorda xato bermasligi uchun kech yaratamiz.
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Foydalanuvchi matnini Gemini'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  const interaction = await getClient().interactions.create({
    model: MODEL,
    input: userText,
    system_instruction: SYSTEM_PROMPT,
  });

  const text = interaction.output_text?.trim();
  return text || 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
// SDK xato sinflariga emas, HTTP kodiga qaraymiz — u barqarorroq.
export function errorMessage(err) {
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
