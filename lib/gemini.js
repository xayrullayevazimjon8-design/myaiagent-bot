// Gemini API bilan ishlash. lib/claude.js bilan bir xil interfeys:
// ask(matn, tarix) → javob matni, errorMessage(xato) → foydalanuvchiga ko'rsatiladigan matn.
import { GoogleGenAI } from '@google/genai';
import { requireKey, missingKeyMessage } from './config.js';
import { systemPrompt } from './xarakter.js';
import { vositalarRoyxati, MAX_VOSITA, bajar } from './vositalar.js';

const MODEL = 'gemini-3.8-flash';

const BO_SH_JAVOB = 'Javob bo\'sh chiqdi, savolni boshqacha yozib ko\'ring.';

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

// Vositalarni Gemini formatiga o'girish.
function vositalar() {
  return vositalarRoyxati().map((v) => ({
    type: 'function',
    name: v.name,
    description: v.description,
    parameters: v.parameters,
  }));
}

// Foydalanuvchi matnini Gemini'ga yuborib, javob matnini qaytaradi.
// `tarix` — shu chatning oldingi xabarlari (lib/xotira.js).
//
// Model vosita chaqirsa halqa davom etadi: Gemini'da chaqiruv `function_call`
// qadami bo'lib keladi, natija esa `function_result` qadami bo'lib qaytariladi.
export async function ask(userText, tarix = [], { system, vositasiz } = {}) {
  const qadamlar = input(tarix, userText);
  let oxirgiMatn = '';
  // Agent o'z system promptini beradi; bermasa — Jarvis xarakteri.
  const prompt = system ?? systemPrompt();
  const tools = vositasiz ? [] : vositalar();   // VOSITA=off bo'lsa ham bo'sh

  // Halqa qadamlar soni bilan chegaralangan: tugashi model xulqiga emas, kodga
  // bog'liq bo'lsin. Oxirgi qadamda vositalar berilmaydi.
  for (let qadam = 0; qadam <= MAX_VOSITA; qadam++) {
    const vositaBerish = qadam < MAX_VOSITA && tools.length > 0;

    const interaction = await getClient().interactions.create({
      model: MODEL,
      input: qadamlar,
      system_instruction: prompt,
      // Chat savollari uchun 'low'. Standart 'medium' bo'lib, o'lchashda oddiy
      // savolga 414 token fikrlash ketgan — javobning o'zi 67 token edi.
      // Butunlay o'chirib bo'lmaydi, 'low' — eng past daraja.
      generation_config: { thinking_level: 'low' },
      ...(vositaBerish ? { tools } : {}),
    });

    const javobQadamlari = interaction.steps ?? [];
    oxirgiMatn = interaction.output_text?.trim() || oxirgiMatn;

    const chaqiruvlar = javobQadamlari.filter((q) => q.type === 'function_call');
    if (chaqiruvlar.length === 0) return oxirgiMatn || BO_SH_JAVOB;

    // Modelning butun chiqishini o'zgartirmasdan qaytaramiz.
    //
    // Diqqat: fikrlash (`thought`) qadamlarini ham. Ular `signature` maydonini
    // saqlaydi — backend shu bilan chaqiruvning haqiqiyligini tekshiradi.
    // Ilgari bu qadamlar filtrlanardi va ikkinchi so'rov production'da
    // "400 Request contains an invalid argument" bilan yiqilardi: qidiruv
    // ishlagan, natija olingan, lekin javob foydalanuvchiga yetib bormagan.
    qadamlar.push(...javobQadamlari);

    for (const chaqiruv of chaqiruvlar) {
      const { matn } = await bajar(chaqiruv.name, chaqiruv.arguments);
      qadamlar.push({
        type: 'function_result',
        call_id: chaqiruv.id,
        name: chaqiruv.name,
        result: matn,
      });
    }
  }

  return oxirgiMatn || BO_SH_JAVOB;
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
