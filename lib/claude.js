// Claude API bilan ishlash. lib/gemini.js bilan bir xil interfeys:
// ask(matn, tarix) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import Anthropic from '@anthropic-ai/sdk';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';
import { vositalarRoyxati, MAX_VOSITA, bajar } from './vositalar.js';

const MODEL = 'claude-opus-5-5';

const BO_SH_JAVOB = 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';

let client;
function getClient() {
  // Kalitni oldin tekshiramiz — lib/config.js dagi izohga qarang.
  const key = requireKey('ANTHROPIC_API_KEY');
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

// Suhbat tarixini Claude formatiga o'girish: bot javobi — 'assistant'.
function messages(tarix, userText) {
  return [
    ...tarix.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];
}

// Vositalarni Claude formatiga o'girish: JSON Schema `input_schema` deb ataladi.
function vositalar() {
  return vositalarRoyxati().map((v) => ({
    name: v.name,
    description: v.description,
    input_schema: v.parameters,
  }));
}

function matnOl(message) {
  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

// Foydalanuvchi matnini Claude'ga yuborib, javob matnini qaytaradi.
// `tarix` — shu chatning oldingi xabarlari (lib/xotira.js).
//
// Model vosita chaqirsa halqa davom etadi: chaqiruvni bajaramiz, natijasini
// qaytaramiz va model yakuniy javobini yozguncha kutamiz.
export async function ask(userText, tarix = [], sozlama = {}) {
  const { system, vositasiz } = sozlama;
  const xabarlar = messages(tarix, userText);
  let oxirgiMatn = '';
  // Agent o'z system promptini beradi; bermasa — Jarvis xarakteri.
  const prompt = system ?? systemPrompt();
  const tools = vositasiz ? [] : vositalar();   // VOSITA=off bo'lsa ham bo'sh

  // Halqa qadamlar soni bilan chegaralangan: tugashi model xulqiga emas, kodga
  // bog'liq bo'lsin. Oxirgi qadamda vositalar berilmaydi.
  for (let qadam = 0; qadam <= MAX_VOSITA; qadam++) {
    const vositaBerish = qadam < MAX_VOSITA && tools.length > 0;

    // Uzun chiqishlarda HTTP timeout'ga urilmaslik uchun stream ishlatamiz.
    //
    // Diqqat: Opus 5.5 da fikrlashni o'chirib bo'lmaydi — `thinking: disabled`
    // ham, `budget_tokens` ham 400 qaytaradi. Yagona boshqaruv — effort
    // (standart `medium`). Chat uchun `low`: tez va arzon, 45 soniyaga sig'adi.
    // Fikrlash tokenlari ham max_tokens ichida hisoblanadi — shuning uchun zaxira katta.
    const stream = getClient().messages.stream({
      model: MODEL,
      max_tokens: 8192,
      output_config: { effort: 'low' },
      system: prompt,
      messages: xabarlar,
      ...(vositaBerish ? { tools } : {}),
    });

    const message = await stream.finalMessage();

    // Butun zanjir rad etgan holat.
    if (message.stop_reason === 'refusal') {
      return 'Bu so\'rovga javob bera olmayman. Boshqacha savol bering.';
    }

    oxirgiMatn = matnOl(message) || oxirgiMatn;

    const chaqiruvlar = message.content.filter((block) => block.type === 'tool_use');
    if (chaqiruvlar.length === 0) return oxirgiMatn || BO_SH_JAVOB;

    // Model chaqiruvi va natija bir xabarlar zanjirida turishi shart.
    xabarlar.push({ role: 'assistant', content: message.content });

    const natijalar = [];
    for (const chaqiruv of chaqiruvlar) {
      const { matn } = await bajar(chaqiruv.name, chaqiruv.input, sozlama);
      natijalar.push({ type: 'tool_result', tool_use_id: chaqiruv.id, content: matn });
    }
    xabarlar.push({ role: 'user', content: natijalar });
  }

  return oxirgiMatn || BO_SH_JAVOB;
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
