// OpenAI API bilan ishlash. lib/claude.js va lib/gemini.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import OpenAI from 'openai';

const MODEL = 'gpt-6-astra';

// Javob uslubi. Boshqa provayderlardagi bilan bir xil — bot bir xil "gapirsin".
const SYSTEM_PROMPT = `Sen Telegram'dagi yordamchi botsan. Foydalanuvchi bilan o'zbek tilida gaplashasan
(agar u boshqa tilda yozsa, o'sha tilda javob ber).

Qoidalar:
- Javobing qisqa va aniq bo'lsin: Telegram'da o'qiladi, uzun matn noqulay.
- Markdown belgilaridan (**, ##, |) foydalanma — oddiy matn yoz. Ro'yxat kerak bo'lsa "- " ishlat.
- Bilmagan narsangni to'qib chiqarma, bilmayman deb ayt.`;

let client;
function getClient() {
  // Kalit yo'q bo'lsa konstruktorda xato bermasligi uchun kech yaratamiz.
  if (!client) client = new OpenAI();
  return client;
}

// Foydalanuvchi matnini OpenAI'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  const response = await getClient().responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: userText,
  });

  const text = response.output_text?.trim();
  return text || 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
export function errorMessage(err) {
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
