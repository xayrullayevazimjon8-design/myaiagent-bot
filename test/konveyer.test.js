// Post konveyeri sinovi: /post → tugmalar → Chiqar / Qayta yoz / Bekor.
//
// Tashqi dunyo soxtalashtiriladi:
//   - Telegram — global fetch: har chaqiruv `chaqiruvlar` ro'yxatiga yoziladi
//   - AI — lib/claude.js moduli: yozuvchi va muharrirga tayyor javob
//   - waitUntil — va'dalar yig'iladi, sinov ularni kutadi
// Redis sozlanmagan — qoralamalar funksiya xotirasida turadi.
//
// Ishga tushirish: npm test
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.TELEGRAM_BOT_TOKEN = 'sinov';
process.env.AI_PROVIDER = 'claude';
process.env.KOVER = 'off';
process.env.XOTIRA = 'off';
delete process.env.KV_REST_API_URL;
delete process.env.TAVILY_API_KEY;

const EGA = 111;
const BEGONA = 222;
const KANAL = '@sinov_kanal';

// AI: system promptning boshidan qaysi agent ekanini bilamiz
// (yozuvchi.md ichida ham "muharrir" so'zi bor).
const muharrirmi = (system) => /^(# Muharrir|Sen muharrir)/.test(system ?? '');
const aiChaqiruvlari = [];
mock.module('../lib/claude.js', {
  namedExports: {
    ask: async (topshiriq, _tarix, sozlama = {}) => {
      aiChaqiruvlari.push({ topshiriq, system: sozlama.system ?? '' });
      if (muharrirmi(sozlama.system)) return 'O\'TDI';
      if (topshiriq.includes('egasining izohi') || topshiriq.includes('Egasining izohi')) {
        return 'YANGI POST\nizoh bajarildi';
      }
      return 'BIRINCHI POST\nsinov matni';
    },
    errorMessage: () => 'xato',
  },
});

const kutilgan = [];
mock.module('@vercel/functions', {
  namedExports: { waitUntil: (p) => kutilgan.push(p) },
});

// Soxta Telegram.
let chaqiruvlar = [];
let keyingiId = 1000;
let copyXatosi = null;

globalThis.fetch = async (url, sozlama) => {
  const method = String(url).split('/').pop();
  let tana = {};
  if (sozlama?.body instanceof FormData) {
    for (const [k, v] of sozlama.body.entries()) tana[k] = typeof v === 'string' ? v : '<fayl>';
    if (tana.reply_markup) tana.reply_markup = JSON.parse(tana.reply_markup);
  } else if (sozlama?.body) {
    tana = JSON.parse(sozlama.body);
  }
  const chaqiruv = { method, tana };
  chaqiruvlar.push(chaqiruv);

  let javob = { ok: true, result: true };
  if (method === 'sendMessage') {
    javob = { ok: true, result: { message_id: ++keyingiId, text: tana.text } };
  }
  if (method === 'sendPhoto') {
    javob = {
      ok: true,
      result: { message_id: ++keyingiId, caption: tana.caption, photo: [{ file_id: 'kichik' }, { file_id: 'RASM_ID' }] },
    };
  }
  if (method === 'copyMessage' && copyXatosi) {
    javob = { ok: false, description: copyXatosi };
  }
  chaqiruv.id = javob.result?.message_id;
  return new Response(JSON.stringify(javob), { status: javob.ok ? 200 : 400 });
};

const { default: handler } = await import('../api/bot.js');
const { korsat } = await import('../lib/konveyer.js');

async function yubor(update) {
  const res = {
    status() { return this; },
    json() { return this; },
    send() { return this; },
  };
  await handler({ method: 'POST', headers: {}, body: update }, res);
  while (kutilgan.length) await kutilgan.shift();
}

const xabar = (from, text) => ({ message: { chat: { id: from }, from: { id: from }, text } });

let cqId = 0;
const bos = (from, data, message) => ({
  callback_query: { id: String(++cqId), from: { id: from }, data, message },
});

const turi = (m) => chaqiruvlar.filter((c) => c.method === m);
const matnlar = () => turi('sendMessage').map((c) => c.tana.text);
// editMessageReplyMarkup ham tugma qaytaradi — faqat yuborilgan xabarlar olinadi.
const oxirgiTugmali = () => [...chaqiruvlar].reverse()
  .find((c) => c.id && c.tana.reply_markup?.inline_keyboard?.length);

// Tugmali xabarni callback_query ichidagi `message` ko'rinishiga keltirish.
function tugmaliXabar() {
  const c = oxirgiTugmali();
  const id = c.id;
  return {
    data: Object.fromEntries(c.tana.reply_markup.inline_keyboard.flat().map((t) => [t.text, t.callback_data])),
    message: {
      message_id: id, chat: { id: EGA },
      ...(c.method === 'sendPhoto' ? { caption: c.tana.caption, photo: [{ file_id: 'RASM_ID' }] } : { text: c.tana.text }),
    },
  };
}

beforeEach(() => {
  chaqiruvlar = [];
  keyingiId = 1000;
  copyXatosi = null;
  aiChaqiruvlari.length = 0;
  process.env.EGA_ID = String(EGA);
  process.env.KANAL_ID = KANAL;
});

test('EGA_ID yo\'q bo\'lsa /post o\'chiq va so\'raganga ID sini aytadi', async () => {
  delete process.env.EGA_ID;
  await yubor(xabar(EGA, '/post sayt'));
  assert.match(matnlar()[0], /EGA_ID=111/);
  assert.equal(aiChaqiruvlari.length, 0);
});

test('begona odam /post ishlata olmaydi', async () => {
  await yubor(xabar(BEGONA, '/post sayt'));
  assert.equal(matnlar()[0], 'Bu buyruq faqat kanal egasi uchun.');
  assert.equal(aiChaqiruvlari.length, 0);
});

test('/post → tugmali post → Chiqar kanalga ko\'chiradi, ikkinchi bosish ishlamaydi', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const { data, message } = tugmaliXabar();
  assert.deepEqual(Object.keys(data), ['✅ Chiqar', '✏️ Qayta yoz', '❌ Bekor']);
  assert.equal(message.text, 'BIRINCHI POST\nsinov matni');

  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));

  // Tugmalar ko'chirishdan oldin olinadi — aks holda ular kanalga ham tushadi.
  const tartib = chaqiruvlar.map((c) => c.method);
  assert.ok(tartib.indexOf('editMessageReplyMarkup') < tartib.indexOf('copyMessage'));
  assert.deepEqual(turi('copyMessage').map((c) => c.tana), [
    { chat_id: KANAL, from_chat_id: EGA, message_id: message.message_id },
  ]);
  assert.ok(matnlar().includes('✅ Kanalga chiqdi.'));

  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));
  assert.equal(turi('copyMessage').length, 0);
  assert.equal(turi('answerCallbackQuery')[0].tana.text, 'Bu post allaqachon yakunlangan');
});

test('kanalga chiqmasa sababini aytadi, tugmalarni qaytaradi va qayta urinish mumkin', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const { data, message } = tugmaliXabar();

  copyXatosi = 'Bad Request: chat not found';
  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));
  assert.ok(matnlar().some((m) => m.includes('chat not found')));
  const qaytgan = turi('editMessageReplyMarkup').at(-1).tana.reply_markup.inline_keyboard;
  assert.equal(qaytgan.flat().length, 3);

  copyXatosi = null;
  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));
  assert.equal(turi('copyMessage').length, 1);
  assert.ok(matnlar().includes('✅ Kanalga chiqdi.'));
});

test('begona odam tugmani bosa olmaydi', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const { data, message } = tugmaliXabar();
  chaqiruvlar = [];
  await yubor(bos(BEGONA, data['✅ Chiqar'], message));
  assert.equal(turi('copyMessage').length, 0);
  assert.equal(turi('answerCallbackQuery')[0].tana.text, 'Bu tugma faqat kanal egasi uchun.');
});

test('Bekor → jarayon to\'xtaydi, keyin Chiqar ishlamaydi', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const { data, message } = tugmaliXabar();
  chaqiruvlar = [];
  await yubor(bos(EGA, data['❌ Bekor'], message));
  assert.ok(matnlar().includes('❌ Bekor qilindi.'));

  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));
  assert.equal(turi('copyMessage').length, 0);
});

test('Qayta yoz → izoh → yozuvchi izoh bilan qayta yozadi, yangi post tugmalar bilan', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const eski = tugmaliXabar();

  chaqiruvlar = [];
  await yubor(bos(EGA, eski.data['✏️ Qayta yoz'], eski.message));
  assert.match(matnlar()[0], /Izohingizni/);

  chaqiruvlar = [];
  aiChaqiruvlari.length = 0;
  await yubor(xabar(EGA, 'qisqaroq qil, narxni olib tashla'));

  const yozuvchi = aiChaqiruvlari.find((c) => !muharrirmi(c.system));
  assert.ok(yozuvchi.topshiriq.includes('qisqaroq qil, narxni olib tashla'));
  assert.ok(yozuvchi.topshiriq.includes('BIRINCHI POST'));
  assert.ok(aiChaqiruvlari.some((c) => muharrirmi(c.system)), 'muharrir bir marta tekshiradi');

  // Eski variantning tugmalari olindi, yangisi tugmalar bilan keldi.
  const olindi = turi('editMessageReplyMarkup')[0].tana;
  assert.equal(olindi.message_id, eski.message.message_id);
  assert.deepEqual(olindi.reply_markup.inline_keyboard, []);
  const yangi = tugmaliXabar();
  assert.equal(yangi.message.text, 'YANGI POST\nizoh bajarildi');

  // Keyingi oddiy xabar endi izoh emas — Jarvis'ga ketadi.
  aiChaqiruvlari.length = 0;
  await yubor(xabar(EGA, 'salom'));
  assert.equal(aiChaqiruvlari[0].topshiriq, 'salom');

  // Yangi variant kanalga chiqadi.
  chaqiruvlar = [];
  await yubor(bos(EGA, yangi.data['✅ Chiqar'], yangi.message));
  assert.equal(turi('copyMessage')[0].tana.message_id, yangi.message.message_id);
});

test('izoh kutilayotganda buyruq yozilsa kutish bekor bo\'ladi', async () => {
  await yubor(xabar(EGA, '/post sayt'));
  const { data, message } = tugmaliXabar();
  await yubor(bos(EGA, data['✏️ Qayta yoz'], message));
  await yubor(xabar(EGA, '/help'));

  aiChaqiruvlari.length = 0;
  await yubor(xabar(EGA, 'oddiy savol'));
  assert.equal(aiChaqiruvlari[0].topshiriq, 'oddiy savol');
});

test('uzun post rasm bilan: rasm + matn, ikkalasi ham kanalga ko\'chadi', async () => {
  await korsat(EGA, {
    id: 'uzun0001', mavzu: 'm', natija: null, post: 'x'.repeat(1500),
    rasm: Buffer.from('png'), mime: 'image/png',
  });
  assert.equal(turi('sendPhoto')[0].tana.caption, undefined);
  const { data, message } = tugmaliXabar();
  assert.equal(data['✅ Chiqar'], `c:uzun0001:${message.message_id - 1}`);

  chaqiruvlar = [];
  await yubor(bos(EGA, data['✅ Chiqar'], message));
  assert.deepEqual(turi('copyMessage').map((c) => c.tana.message_id), [message.message_id - 1, message.message_id]);
});

test('qisqa post rasm bilan: bitta xabar, qayta yozilganda rasm file_id bilan qayta ishlatiladi', async () => {
  await korsat(EGA, {
    id: 'rasm0001', mavzu: 'sayt', natija: null, post: 'qisqa post',
    rasm: Buffer.from('png'), mime: 'image/png',
  });
  const eski = tugmaliXabar();
  assert.equal(eski.message.caption, 'qisqa post');

  await yubor(bos(EGA, eski.data['✏️ Qayta yoz'], eski.message));
  chaqiruvlar = [];
  await yubor(xabar(EGA, 'boshqacha'));
  const photo = turi('sendPhoto')[0];
  assert.equal(photo.tana.photo, 'RASM_ID');
  assert.equal(photo.tana.caption, 'YANGI POST\nizoh bajarildi');
});

test('qoralama yo\'qolgan bo\'lsa ham Chiqar xabarning o\'zini ko\'chiradi', async () => {
  const message = { message_id: 555, chat: { id: EGA }, text: 'eski post' };
  await yubor(bos(EGA, 'c:yoqolgan', message));
  assert.deepEqual(turi('copyMessage').map((c) => c.tana.message_id), [555]);
});

test('KANAL_ID yo\'q bo\'lsa post chiqmaydi va qoralama yakunlanmaydi', async () => {
  delete process.env.KANAL_ID;
  const message = { message_id: 556, chat: { id: EGA }, text: 'post' };
  await yubor(bos(EGA, 'c:kanalsiz', message));
  assert.equal(turi('copyMessage').length, 0);
  assert.ok(matnlar().some((m) => m.startsWith('KANAL_ID sozlanmagan')));

  process.env.KANAL_ID = KANAL;
  await yubor(bos(EGA, 'c:kanalsiz', message));
  assert.equal(turi('copyMessage').length, 1);
});

test('GET ?webhook=tuzat webhook\'ni callback_query bilan qayta qo\'yadi', async () => {
  let javob;
  const res = {
    status() { return this; },
    json(j) { javob = j; return this; },
    send() { return this; },
  };
  await handler({ method: 'GET', headers: {}, query: { webhook: 'tuzat' } }, res);

  const qoyish = turi('setWebhook')[0].tana;
  assert.equal(qoyish.url, 'https://myaiagent-bot.vercel.app/api/bot');
  assert.ok(qoyish.allowed_updates.includes('callback_query'));
  assert.equal(turi('getWebhookInfo').length, 1);
  assert.ok(javob.setWebhook.ok);
});

test('jurnal: /post har agentni kutmoqda → ishlayapti → tugatdi qiladi, /jurnal.md markdown beradi', async () => {
  const jurnal = await import('../lib/jurnal.js');
  const { default: jurnalHandler } = await import('../api/jurnal.js');

  await yubor(xabar(EGA, '/post jurnal sinovi'));

  // Oldingi sinovlar ham jurnalga yozgan — shu /post boshlangan joydan olamiz.
  const qatorlar = (await jurnal.qatorlar()).slice().reverse().map((q) => q.slice(2).split(' | '));
  const boshi = qatorlar.findIndex(([, a, , h]) => a === 'yozuvchi' && h === 'Navbatda: jurnal sinovi');
  const songgi = qatorlar.slice(boshi);
  const holatlari = (agent) => songgi.filter(([, a]) => a === agent).map(([, , h]) => h);

  for (const agent of ['yozuvchi', 'muharrir', 'rasm']) {
    const h = holatlari(agent);
    assert.equal(h[0], 'kutmoqda', `${agent} navbatdan boshlanadi`);
    assert.equal(h.at(-1), 'tugatdi', `${agent} tugatdi bilan tugaydi`);
    assert.ok(h.includes('ishlayapti'));
  }
  const rasmOxirgi = songgi.filter(([, a]) => a === 'rasm').at(-1);
  assert.match(rasmOxirgi[3], /^Kover tayyor: ochirilgan/);

  let tana = '';
  const sarlavhalar = {};
  const res = {
    setHeader(k, v) { sarlavhalar[k] = v; },
    status() { return this; },
    send(t) { tana = t; return this; },
  };
  await jurnalHandler({ method: 'GET' }, res);
  assert.match(sarlavhalar['Content-Type'], /text\/markdown/);
  assert.equal(sarlavhalar['Cache-Control'], 'no-store');
  assert.match(tana, /^# Agentlar jurnali/);
  assert.match(tana, /\n- \S+ \| rasm \| tugatdi \| Kover tayyor/);
});

test('jurnal: harakat qisqartiriladi va | belgisi qatorni buzmaydi', async () => {
  const { qatorYasa } = await import('../lib/jurnal.js');
  const q = qatorYasa('yozuvchi', 'ishlayapti', `a | b\n${'x'.repeat(300)}`, new Date('2026-01-01T00:00:00Z'));
  assert.equal(q.split(' | ').length, 4);
  assert.ok(q.length < 200);
});
