// Telegram bot — webhook kirish nuqtasi.
// Telegram yangi xabar kelganda shu manzilga POST qiladi: https://<domain>/api/bot
//
// Matnli xabarlar AI'ga yuboriladi — qaysi biriga, lib/ai.js hal qiladi.
// Suhbat tarixi lib/xotira.js da saqlanadi va har so'rovda AI'ga qo'shib beriladi.
// /post — qidiruv vositasini sinash buyrug'i (lib/post.js).
import { waitUntil } from '@vercel/functions';
import { ask, splitMessage, errorMessage, providerName } from '../lib/ai.js';
import { tarix, saqla, tozala } from '../lib/xotira.js';
import { qidiruvniBajar } from '../lib/vositalar.js';
import { materialMatni, postYoz, jarayonMatni } from '../lib/post.js';
import { kover } from '../lib/kover.js';

const TELEGRAM_API = 'https://api.telegram.org';

// Telegram "yozmoqda..." holatini qancha vaqtda yangilash (u ~5 soniyada o'chadi).
const TYPING_REFRESH_MS = 4000;

// Rasm izohi (caption) shundan uzun bo'lolmaydi — matn alohida xabar bo'lib ketadi.
const IZOH_CHEGARASI = 1024;

// Telegram API manzilini yig'ish. Token faqat shu yerda o'qiladi.
function apiUrl(method) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN topilmadi');
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

// Foydalanuvchiga xabar yuborish.
async function sendMessage(chatId, text) {
  const res = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    console.error('sendMessage xato:', res.status, await res.text());
  }
  return res.ok;
}

// Rasm yuborish. Baytlar multipart bilan ketadi — Node 20 da FormData ham,
// Blob ham bor, qo'shimcha kutubxona kerak emas.
async function sendPhoto(chatId, rasm, izoh = '', mime = 'image/png') {
  const kengaytma = mime.split('/')[1]?.split('+')[0] || 'png';
  const forma = new FormData();
  forma.append('chat_id', String(chatId));
  if (izoh) forma.append('caption', izoh);
  forma.append('photo', new Blob([rasm], { type: mime }), `kover.${kengaytma}`);

  const res = await fetch(apiUrl('sendPhoto'), { method: 'POST', body: forma });

  if (!res.ok) {
    console.error('sendPhoto xato:', res.status, await res.text());
  }
  return res.ok;
}

// "yozmoqda..." holati — AI javobi bir necha soniya olishi mumkin,
// foydalanuvchi bot qotib qolgan deb o'ylamasligi uchun.
async function sendTyping(chatId) {
  try {
    await fetch(apiUrl('sendChatAction'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
  } catch (err) {
    console.error('sendChatAction xato:', err);
  }
}

// Suhbatni noldan boshlaydigan buyruqlar: javobdan oldin xotira tozalanadi.
const TOZALOVCHI_BUYRUQLAR = ['/start', '/tozala'];

// Buyruqlarga AI'siz, lokal javob. null qaytsa — xabar AI'ga ketadi.
export function commandReply(text) {
  if (text.startsWith('/start')) {
    return 'Salom! Men AI yordamchi botman. Savolingizni yozing.';
  }
  if (text.startsWith('/tozala')) {
    return 'Suhbat tarixi tozalandi. Yangi suhbat boshlaymiz.';
  }
  if (text.startsWith('/help')) {
    return [
      'Shunchaki savolingizni yoki matnni yozing — men javob beraman.',
      'Suhbat davomida oldingi xabarlarni eslab qolaman.',
      '',
      'Buyruqlar:',
      '/start — boshlash',
      '/tozala — suhbat tarixini unutish',
      '/post [mavzu] — mavzu bo\'yicha material qidirib, post yozish',
      '/help — shu yordam',
    ].join('\n');
  }
  return null;
}

// Uzun ishni "yozmoqda..." holati bilan o'rash.
//
// Telegram bu holatni ~5 soniyada o'chiradi, AI javobi esa undan ancha uzoq
// tayyorlanadi — takrorlamasak, foydalanuvchi uzun jimlikni ko'rib bot
// ishlamayapti deb o'ylaydi.
async function yozmoqda(chatId, ish) {
  await sendTyping(chatId);
  const typing = setInterval(() => sendTyping(chatId), TYPING_REFRESH_MS);

  try {
    return await ish();
  } finally {
    // Tozalash shart: taymer qolsa funksiya bo'sh turib vaqt sarflaydi.
    clearInterval(typing);
  }
}

// Javobni bo'laklarga bo'lib yuborish (Telegram 4096 belgidan ko'pini olmaydi).
async function sendLong(chatId, text) {
  for (const part of splitMessage(text)) {
    await sendMessage(chatId, part);
  }
}

// Javobni ilovalari bilan yuborish.
//
// Matn izohga sig'sa rasm bilan birga ketadi — bitta chiroyli xabar bo'ladi.
// Sig'masa avval rasm, keyin matn. Rasm yuborilmay qolsa ham matn yetib boradi:
// rasm bezak, matn esa javobning o'zi.
async function javobYubor(chatId, matn, ilovalar = []) {
  const [birinchi, ...qolgani] = ilovalar;

  if (birinchi && matn.length <= IZOH_CHEGARASI) {
    const yubordi = await sendPhoto(chatId, birinchi.rasm, matn, birinchi.mime);
    if (!yubordi) await sendLong(chatId, matn);
  } else {
    if (birinchi) await sendPhoto(chatId, birinchi.rasm, '', birinchi.mime);
    await sendLong(chatId, matn);
  }

  for (const ilova of qolgani) {
    await sendPhoto(chatId, ilova.rasm, '', ilova.mime);
  }
}

// AI javobini tayyorlab yuborish. 200 qaytarilgandan keyin fonda ishlaydi.
async function replyWithAi(chatId, text) {
  try {
    await yozmoqda(chatId, async () => {
      // Tarixni javobdan oldin o'qiymiz va saqlashda o'shani qayta ishlatamiz —
      // xotiraga ikkinchi marta borish shart emas.
      const oldingi = await tarix(chatId);

      // Vosita rasm yasasa, u shu ro'yxatga tushadi va javob bilan yuboriladi.
      const ilovalar = [];
      const answer = await ask(text, oldingi, { ilovalar });

      await javobYubor(chatId, answer, ilovalar);

      // Faqat muvaffaqiyatli javob saqlanadi: xato matni suhbat tarixiga tushsa,
      // bot keyingi javoblarida o'shanga tayanib qolardi.
      await saqla(chatId, oldingi, text, answer);
    });
  } catch (err) {
    console.error(`AI xato (${providerName()}):`, err);
    await sendMessage(chatId, errorMessage(err));
  }
}

// /post [mavzu] — qidiruv, yozuvchi va muharrir birga ishlaydi.
//
// Uch xabar boradi: topilgan material, muharrir tekshiruvi va tayyor post.
// Vositani bu yerda kod chaqiradi, model emas: maqsad qidiruv nima topishini
// va agentlar u bilan nima qilishini ko'rsatish.
async function postJavobi(chatId, mavzu) {
  try {
    await yozmoqda(chatId, async () => {
      const natija = await qidiruvniBajar({ sorov: mavzu, manba: 'hammasi' });
      await sendLong(chatId, materialMatni(natija));

      const yakun = await postYoz(mavzu, natija);

      // Kover agentlar byudjetidan tashqarida: rasm kechiksa ham post yetib boradi.
      const koveri = await kover({ mavzu, sarlavha: yakun.post.split('\n')[0] });
      const koverQatori = `🖼 Kover: ${koveri.usul}${koveri.sabab ? ` — ${koveri.sabab}` : ''}`;

      await sendLong(chatId, `${jarayonMatni(yakun)}\n\n${koverQatori}`);
      await javobYubor(chatId, yakun.post, koveri.rasm ? [{ rasm: koveri.rasm, mime: koveri.mime }] : []);
    });
  } catch (err) {
    console.error(`/post xato (${providerName()}):`, err);
    await sendMessage(chatId, errorMessage(err));
  }
}

// So'rov tanasini o'qish. Vercel odatda o'zi JSON'ga aylantiradi,
// qolgan holatlar uchun oqimdan o'qiydigan zaxira yo'l.
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  // Brauzerdan ochilganda bot tirikligini ko'rsatish uchun.
  if (req.method === 'GET') {
    return res.status(200).send('Bot ishlayapti.');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Faqat POST');
  }

  // Ixtiyoriy himoya: secret o'rnatilgan bo'lsa, Telegram yuborgan sarlavhani tekshiramiz.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    console.warn('Notog\'ri secret token bilan so\'rov keldi');
    return res.status(401).send('Ruxsat yo\'q');
  }

  try {
    const update = await readBody(req);
    const message = update.message ?? update.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text?.trim() ?? '';

    if (chatId && !text) {
      // Rasm, stiker, ovozli xabar va hokazo.
      await sendMessage(chatId, 'Hozircha faqat matnli xabarlarni tushunaman.');
    } else if (chatId) {
      const command = commandReply(text);
      if (text.startsWith('/post')) {
        const mavzu = text.slice('/post'.length).trim();
        if (!mavzu) {
          await sendMessage(chatId, 'Mavzu yozing. Masalan: /post qurilish firmasi uchun sayt');
        } else {
          // Qidiruv va post yozish — ikkalasi ham uzoq, javobdan keyinga qoladi.
          waitUntil(postJavobi(chatId, mavzu));
        }
      } else if (command) {
        if (TOZALOVCHI_BUYRUQLAR.some((b) => text.startsWith(b))) {
          await tozala(chatId);
        }
        await sendMessage(chatId, command);
      } else {
        // Telegram 60 soniyada javob kutadi, kutmasa xabarni qayta yuboradi.
        // Shuning uchun AI chaqiruvini javobdan keyinga qoldiramiz.
        waitUntil(replyWithAi(chatId, text));
      }
    }
  } catch (err) {
    // Xatoni yutamiz: aks holda Telegram xabarni qayta-qayta yuboraveradi.
    console.error('Update ishlanmadi:', err);
  }

  // Telegram har doim 200 kutadi.
  return res.status(200).json({ ok: true });
}
