// OpenAI API bilan ishlash. lib/claude.js va lib/gemini.js bilan bir xil interfeys:
// ask(matn, tarix) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import OpenAI from 'openai';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';
import { vositalarRoyxati, MAX_VOSITA, bajar } from './vositalar.js';

const MODEL = 'gpt-6-astra';

const BO_SH_JAVOB = 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';

let client;
function getClient() {
  // Kalitni oldin tekshiramiz — lib/config.js dagi izohga qarang.
  const key = requireKey('OPENAI_API_KEY');
  if (!client) client = new OpenAI({ apiKey: key });
  return client;
}

// Suhbat tarixini OpenAI formatiga o'girish: bot javobi — 'assistant'.
function input(tarix, userText) {
  return [
    ...tarix.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];
}

// Vositalarni OpenAI formatiga o'girish.
function vositalar() {
  return vositalarRoyxati().map((v) => ({
    type: 'function',
    name: v.name,
    description: v.description,
    parameters: v.parameters,
  }));
}

// OpenAI argumentlarni JSON matn sifatida yuboradi — obyektga o'giramiz.
function argumentlar(chaqiruv) {
  try {
    return JSON.parse(chaqiruv.arguments || '{}');
  } catch (err) {
    console.error('Vosita argumentlari o\'qilmadi:', chaqiruv.arguments, err?.message);
    return {};
  }
}

// Foydalanuvchi matnini OpenAI'ga yuborib, javob matnini qaytaradi.
// `tarix` — shu chatning oldingi xabarlari (lib/xotira.js).
//
// Model vosita chaqirsa halqa davom etadi: chiqishdagi `function_call`
// elementiga `function_call_output` bilan javob beriladi.
export async function ask(userText, tarix = []) {
  const elementlar = input(tarix, userText);
  let oxirgiMatn = '';
  const tools = vositalar();   // VOSITA=off bo'lsa bo'sh

  // Halqa qadamlar soni bilan chegaralangan: tugashi model xulqiga emas, kodga
  // bog'liq bo'lsin. Oxirgi qadamda vositalar berilmaydi.
  for (let qadam = 0; qadam <= MAX_VOSITA; qadam++) {
    const vositaBerish = qadam < MAX_VOSITA && tools.length > 0;

    const response = await getClient().responses.create({
      model: MODEL,
      instructions: systemPrompt(),
      input: elementlar,
      ...(vositaBerish ? { tools } : {}),
    });

    const chiqish = response.output ?? [];
    oxirgiMatn = response.output_text?.trim() || oxirgiMatn;

    const chaqiruvlar = chiqish.filter((o) => o.type === 'function_call');
    if (chaqiruvlar.length === 0) return oxirgiMatn || BO_SH_JAVOB;

    // Model chiqishini kiritishga qaytaramiz — chaqiruv va natija bir zanjirda.
    elementlar.push(...chiqish);

    for (const chaqiruv of chaqiruvlar) {
      const { matn } = await bajar(chaqiruv.name, argumentlar(chaqiruv));
      elementlar.push({
        type: 'function_call_output',
        call_id: chaqiruv.call_id,
        output: matn,
      });
    }
  }

  return oxirgiMatn || BO_SH_JAVOB;
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
