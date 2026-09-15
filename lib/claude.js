// Claude API bilan ishlash. lib/gemini.js bilan bir xil interfeys:
// ask(matn) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import Anthropic from '@anthropic-ai/sdk';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';

const MODEL = 'claude-haiku-4-5';

let client;
function getClient() {
  // Kalitni oldin tekshiramiz — lib/config.js dagi izohga qarang.
  const key = requireKey('ANTHROPIC_API_KEY');
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

// Foydalanuvchi matnini Claude'ga yuborib, javob matnini qaytaradi.
export async function ask(userText) {
  // Uzun chiqishlarda HTTP timeout'ga urilmaslik uchun stream ishlatamiz.
  //
  // Diqqat: Haiku 4.5 Opus'dan boshqacha parametrlarni qabul qiladi.
  // Unda adaptiv fikrlash ham, output_config.effort ham yo'q — yuborilsa xato.
  // Chat uchun fikrlashni umuman yoqmaymiz: tez va arzon javob shu.
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt(),
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
  const missing = missingKeyMessage(err);
  if (missing) return missing;

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
