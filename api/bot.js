// Telegram bot — webhook kirish nuqtasi.
// Telegram yangi xabar kelganda shu manzilga POST qiladi: https://<domain>/api/bot
//
// 1-bosqich: AI yo'q. Bot kelgan matnni shunchaki qaytaradi (echo).

const TELEGRAM_API = 'https://api.telegram.org';

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

// Kelgan matnga qanday javob berishni shu funksiya hal qiladi.
// Keyingi bosqichda AI qo'shilganda aynan shu joy o'zgaradi.
export function buildReply(text) {
  if (text.startsWith('/start')) {
    return 'Salom! Men hozircha sinov rejimidaman — yozgan xabaringizni qaytaraman.';
  }
  if (text.startsWith('/help')) {
    return [
      'Menga istalgan matn yozing — men uni qaytaraman.',
      '',
      'Buyruqlar:',
      '/start — boshlash',
      '/help — shu yordam',
    ].join('\n');
  }
  return `Siz yozdingiz: ${text}`;
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
  // Bu begona odam webhook manzilingizga so'rov yuborishining oldini oladi.
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

    if (chatId && text) {
      await sendMessage(chatId, buildReply(text));
    } else if (chatId) {
      // Rasm, stiker, ovozli xabar va hokazo.
      await sendMessage(chatId, 'Hozircha faqat matnli xabarlarni tushunaman.');
    }
  } catch (err) {
    // Xatoni yutamiz: aks holda Telegram xabarni qayta-qayta yuboraveradi.
    console.error('Update ishlanmadi:', err);
  }

  // Telegram har doim 200 kutadi.
  return res.status(200).json({ ok: true });
}
