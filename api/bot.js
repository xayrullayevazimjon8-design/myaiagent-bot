// Telegram bot — webhook kirish nuqtasi.
// Telegram yangi xabar kelganda shu manzilga POST qiladi: https://<domain>/api/bot
//
// Matnli xabarlar AI'ga yuboriladi — qaysi biriga, lib/ai.js hal qiladi.
// Suhbat tarixi lib/xotira.js da saqlanadi va har so'rovda AI'ga qo'shib beriladi.
// /post — post konveyeri: qidiruv, agentlar, kover, keyin egasining qarori
// (lib/post.js, lib/konveyer.js). Tugma bosilishi callback_query bo'lib keladi.
import { waitUntil } from '@vercel/functions';
import { ask, splitMessage, errorMessage, providerName } from '../lib/ai.js';
import { tarix, saqla, tozala } from '../lib/xotira.js';
import { qidiruvniBajar } from '../lib/vositalar.js';
import { materialMatni, postYoz, jarayonMatni } from '../lib/post.js';
import { kover } from '../lib/kover.js';
import { sendMessage, sendPhoto, sendTyping, webhookniTuzat } from '../lib/telegram.js';
import {
  IZOH_CHEGARASI, egaId, egami, korsat, tugmaBosildi,
  kutilayotganIzoh, izohniBekorQil, izohBilanQayta,
} from '../lib/konveyer.js';
import { yangiId } from '../lib/qoralama.js';
import * as jurnal from '../lib/jurnal.js';

// Telegram "yozmoqda..." holatini qancha vaqtda yangilash (u ~5 soniyada o'chadi).
const TYPING_REFRESH_MS = 4000;

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
      '/post [mavzu] — post tayyorlash (faqat kanal egasi uchun)',
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

// /post [mavzu] — qidiruv, yozuvchi, muharrir va kover birga ishlaydi.
//
// Egasiga uch xabar boradi: topilgan material, muharrir tekshiruvi va tayyor
// post — tugmalar bilan. Kanalga chiqarish qarori egasiniki (lib/konveyer.js).
async function postJavobi(chatId, mavzu) {
  try {
    await yozmoqda(chatId, async () => {
      // Ofis sahifasida hamma agent navbatga turadi.
      for (const agent of jurnal.AGENTLAR) await jurnal.yoz(agent, 'kutmoqda', `Navbatda: ${mavzu}`);

      const natija = await qidiruvniBajar({ sorov: mavzu, manba: 'hammasi' });
      await sendLong(chatId, materialMatni(natija));

      const yakun = await postYoz(mavzu, natija);

      // Kover agentlar byudjetidan tashqarida: rasm kechiksa ham post yetib boradi.
      const koveri = await jurnal.kuzat('rasm', `Kover chizmoqda: ${mavzu}`,
        () => kover({ mavzu, sarlavha: yakun.post.split('\n')[0] }),
        (k) => `Kover tayyor: ${k.usul}${k.sabab ? ` (${k.sabab})` : ''}`);
      const koverQatori = `🖼 Kover: ${koveri.usul}${koveri.sabab ? ` — ${koveri.sabab}` : ''}`;

      await sendLong(chatId, `${jarayonMatni(yakun)}\n\n${koverQatori}`);
      await korsat(chatId, {
        id: yangiId(), mavzu, natija, post: yakun.post, rasm: koveri.rasm, mime: koveri.mime,
      });
    });
  } catch (err) {
    console.error(`/post xato (${providerName()}):`, err);
    await sendMessage(chatId, errorMessage(err));
  }
}

// Egasining izohi bilan qayta yozish — /post kabi uzoq ish.
async function izohJavobi(chatId, id, izoh) {
  try {
    await yozmoqda(chatId, () => izohBilanQayta(chatId, id, izoh));
  } catch (err) {
    console.error(`Qayta yozish xato (${providerName()}):`, err);
    await sendMessage(chatId, errorMessage(err));
  }
}

// /post ni kim ishlata oladi. null — ruxsat bor, aks holda rad javobi.
//
// EGA_ID qo'yilmagan bo'lsa, so'ragan odamga o'z ID sini aytamiz: egasi uni
// qayerdan olishni qidirib o'tirmasin.
function postRuxsati(userId) {
  if (!egaId()) {
    return [
      'EGA_ID sozlanmagan — /post hozircha o\'chiq.',
      `Siz kanal egasi bo'lsangiz, Vercel'ga EGA_ID=${userId} qo'shing va Redeploy qiling.`,
    ].join('\n');
  }
  if (!egami(userId)) return 'Bu buyruq faqat kanal egasi uchun.';
  return null;
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
    // ?webhook=tuzat — webhook'ni to'g'ri hodisalar ro'yxati bilan qayta qo'yadi.
    // Token faqat serverda: brauzerga tokenni yozish shart emas.
    if (req.query?.webhook === 'tuzat') {
      return res.status(200).json(await webhookniTuzat());
    }
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

    // Tugma bosildi. "Yangi rasm" rasm chizishni kutadi (~15 s), shuning uchun
    // javobdan keyinga qoldiramiz — Telegram kutib qolib, qayta yubormasin.
    if (update.callback_query) {
      waitUntil(tugmaBosildi(update.callback_query)
        .catch((err) => console.error('Tugma ishlanmadi:', err)));
      return res.status(200).json({ ok: true });
    }

    const message = update.message ?? update.edited_message;
    const chatId = message?.chat?.id;
    const userId = message?.from?.id;
    const text = message?.text?.trim() ?? '';

    // Egasi "Qayta yoz" bosgan bo'lsa, keyingi matni — izoh. Buyruq yozsa
    // kutish bekor bo'ladi. Boshqalar uchun Redis'ga bormaymiz.
    const izohId = chatId && text && egami(userId) ? await kutilayotganIzoh(chatId) : null;
    if (izohId && text.startsWith('/')) await izohniBekorQil(chatId);

    if (chatId && !text) {
      // Rasm, stiker, ovozli xabar va hokazo.
      await sendMessage(chatId, 'Hozircha faqat matnli xabarlarni tushunaman.');
    } else if (izohId && !text.startsWith('/')) {
      waitUntil(izohJavobi(chatId, izohId, text));
    } else if (chatId) {
      const command = commandReply(text);
      if (text.startsWith('/post')) {
        const mavzu = text.slice('/post'.length).trim();
        const rad = postRuxsati(userId);
        if (rad) {
          await sendMessage(chatId, rad);
        } else if (!mavzu) {
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
