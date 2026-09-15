// Claude API bilan ishlash. lib/gemini.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5';

// Javob uslubi. lib/gemini.js dagi bilan bir xil bo'lsin — bot bir xil "gapirsin".
const SYSTEM_PROMPT = `Sen Telegram'dagi yordamchi botsan. Foydalanuvchi bilan o'zbek tilida gaplashasan
(agar u boshqa tilda yozsa, o'sha tilda javob ber).

Qoidalar:
- Javobing qisqa va aniq bo'lsin: Telegram'da o'qiladi, uzun matn noqulay.
- Markdown belgilaridan (**, ##, |) foydalanma — oddiy matn yoz. Ro'yxat kerak bo'lsa "- " ishlat.
- Bilmagan narsangni to'qib chiqarma, bilmayman deb ayt.`;

let client;
function getClient() {
  // Kalit yo'q bo'lsa SDK konstruktorda xato beradi — shuning uchun kech yaratamiz.
  if (!client) client = new Anthropic();
  return client;
}

// Foydalanuvchi matnini Claude'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  // Uzun chiqishlarda HTTP timeout'ga urilmaslik uchun stream ishlatamiz.
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    // Chat uchun 'low' — tez javob. Chuqurroq tahlil kerak bo'lsa 'high' qiling.
    output_config: { effort: 'low' },
    // Model javob berishdan bosh tortsa, so'rov avtomatik boshqa modelga o'tadi.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: userText }],
  });

  const message = await stream.finalMessage();

  // Butun zanjir rad etgan holat.
  if (message.stop_reason === 'refusal') {
    return 'Bu so\'rovga javob bera olmayman. Boshqacha savol bering.';
  }

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return text || 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';
}

// Xatoni foydalanuvchiga tushunarli matnga aylantirish.
export function errorMessage(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'AI kaliti noto\'g\'ri sozlangan. Administrator tekshirishi kerak.';
  }
  // Balans tugaganda API 400 qaytaradi — sababi kodda emas, Console'dagi hisobda.
  if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message ?? '')) {
    return 'AI hisobida mablag\'i tugagan. Anthropic Console\'da kredit qo\'shilishi kerak.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Hozir so\'rovlar ko\'p. Bir daqiqadan keyin qayta urinib ko\'ring.';
  }
  return 'Javob tayyorlashda xatolik bo\'ldi. Qayta urinib ko\'ring.';
}
