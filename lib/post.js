// /post buyrug'i: qidiruv → yozuvchi → muharrir → tayyor post.
//
// Bu fayl oqimni boshqaradi: qidiruv natijasini ko'rsatadi, agentlarni
// navbat bilan chaqiradi va natijani Telegram uchun matnga aylantiradi.
//
// Agentlarning o'zi `agentlar/` papkasida: har birining xarakteri (.md) va
// funksiyalari (.js) yonma-yon turadi. Bu yerda ular nima qilishini bilmaymiz —
// faqat qachon chaqirilishini.
import * as yozuvchi from '../agentlar/yozuvchi.js';
import * as muharrir from '../agentlar/muharrir.js';
import { kuzat } from './jurnal.js';

// Muharrir necha marta qaytara oladi. Undan keyin natija baribir ko'rsatiladi:
// cheksiz tuzatishdan ko'ra, egasi o'zi qaror qilgani yaxshi.
export const MAX_QAYTA = 2;

// Butun /post uchun vaqt byudjeti.
//
// Eng yomon holatda 5 ta AI chaqiruvi bo'ladi (3 qoralama + 2 tekshiruv).
// Vercel esa 60 soniyada funksiyani jimgina o'ldiradi — o'shanda foydalanuvchiga
// hech narsa kelmaydi va logda ham xato qolmaydi. Shuning uchun undan oldinroq
// o'zimiz to'xtaymiz va bor qoralamani ko'rsatamiz.
const BYUDJET_MS = 35_000;

// Bitta chaqiruvga beriladigan eng kam vaqt — byudjet tugayotgan bo'lsa ham
// chaqiruvni shu qadar kutamiz.
const ENG_KAM_MS = 8000;

// Telegram'da ko'rsatiladigan bo'lak — odam o'qiydi, model emas.
const KO_RINADIGAN_BELGI = 220;

function qisqa(matn) {
  const toza = (matn ?? '').replace(/\s+/g, ' ').trim();
  return toza.length > KO_RINADIGAN_BELGI ? `${toza.slice(0, KO_RINADIGAN_BELGI)}…` : toza;
}

function internetSarlavhasi({ holat, natijalar, xato }) {
  if (holat === 'ochirilgan') return 'Internet — o\'chirilgan (TAVILY_API_KEY sozlanmagan)';
  // Xatoni to'g'ridan-to'g'ri ko'rsatamiz: /post ni egasi ishlatadi va sababni
  // Vercel loglaridan qidirmasdan shu yerda ko'rgani tezroq.
  if (holat === 'xato') return `Internet — qidiruv ishlamadi: ${qisqa(xato ?? '')}`;
  return `Internet — ${natijalar.length} ta natija`;
}

// Topilgan materialni odam o'qiydigan ko'rinishga keltirish.
export function materialMatni(natija) {
  const satrlar = [`🔍 "${natija.sorov}" bo'yicha topilgan material`, ''];

  satrlar.push(`📚 Bilim bazasi — ${natija.bilim.length} ta bo'lak`);
  if (natija.bilim.length === 0) {
    satrlar.push('   (mos bo\'lak topilmadi)');
  } else {
    natija.bilim.forEach((b, i) => {
      satrlar.push(`${i + 1}. ${b.fayl} › ${b.sarlavha}`);
      satrlar.push(`   ${qisqa(b.matn)}`);
    });
  }

  satrlar.push('', `🌐 ${internetSarlavhasi(natija.internet)}`);
  natija.internet.natijalar.forEach((n, i) => {
    satrlar.push(`${i + 1}. ${n.sarlavha}`);
    satrlar.push(`   ${n.url}`);
    satrlar.push(`   ${qisqa(n.matn)}`);
  });

  satrlar.push('', '✍️ Qalamkash va Nazoratchi ishlayapti...');
  return satrlar.join('\n');
}

// Jurnal uchun natija haqida bir qator.
const postHaqida = (post) => `Qoralama tayyor: ${post.split('\n').filter(Boolean).length} qator — ${post.split('\n')[0]}`;
const hukmHaqida = (h) => (h.otdi ? 'O\'tdi' : `Qaytardi: ${h.sabab}`);

// Post yozish va tekshirish halqasi.
//
// Qaytaradi: { post, raundlar, toxtash }
//   raundlar — har tekshiruvning hukmi
//   toxtash  — 'otdi' | 'chegara' (2 marta qaytardi) | 'byudjet' (vaqt tugadi)
export async function postYoz(mavzu, natija, { maxQayta = MAX_QAYTA, byudjetMs = BYUDJET_MS } = {}) {
  const boshlandi = Date.now();
  const qolgan = () => byudjetMs - (Date.now() - boshlandi);
  const sozlama = () => ({ timeoutMs: Math.max(ENG_KAM_MS, qolgan()) });

  const raundlar = [];
  let post = await kuzat('yozuvchi', `Qoralama yozmoqda: ${mavzu}`,
    () => yozuvchi.yoz(mavzu, natija, sozlama()), postHaqida);

  for (let i = 0; i < maxQayta; i++) {
    if (qolgan() <= 0) return { post, raundlar, toxtash: 'byudjet' };

    const hukm = await kuzat('muharrir', `${i + 1}-tekshiruv: ${mavzu}`,
      () => muharrir.tekshir(mavzu, natija, post, sozlama()), hukmHaqida);
    raundlar.push(hukm);
    console.log(`muharrir ${i + 1}-tekshiruv: ${hukm.otdi ? 'o\'tdi' : 'qayta yoz'}`);

    if (hukm.otdi) return { post, raundlar, toxtash: 'otdi' };
    if (qolgan() <= 0) return { post, raundlar, toxtash: 'byudjet' };

    const sabab = hukm.sabab;
    post = await kuzat('yozuvchi', `Nazoratchi qaytardi, tuzatmoqda: ${sabab}`,
      () => yozuvchi.qaytaYoz(mavzu, natija, post, sabab, sozlama()), postHaqida);
  }

  return { post, raundlar, toxtash: 'chegara' };
}

// Tekshiruv jarayonini odam o'qiydigan ko'rinishga keltirish.
export function jarayonMatni({ raundlar, toxtash }) {
  const satrlar = ['🧪 Nazoratchi tekshiruvi'];

  raundlar.forEach((h, i) => {
    if (h.otdi) {
      satrlar.push(`${i + 1}. o'tdi${h.tanildi ? '' : ' (hukm tanilmadi — javobi quyida)'}`);
      if (!h.tanildi && h.sabab) satrlar.push(`   ${qisqa(h.sabab)}`);
    } else {
      satrlar.push(`${i + 1}. qayta yoz — ${qisqa(h.sabab)}`);
    }
  });

  if (raundlar.length === 0) satrlar.push('(tekshiruvga vaqt qolmadi)');

  if (toxtash === 'chegara') {
    satrlar.push('', `⚠️ ${MAX_QAYTA} marta qayta yozildi, muharrir hali ham rozi emas.`);
    satrlar.push('Oxirgi variant quyida — qaror sizniki.');
  }
  if (toxtash === 'byudjet') {
    satrlar.push('', '⚠️ Vaqt byudjeti tugadi, tekshiruv to\'liq bo\'lmadi.');
  }

  return satrlar.join('\n');
}

// Egasining izohi bilan qayta yozish: yozuvchi izohni bajaradi, muharrir bir
// marta tekshiradi. Muharrir postni qaytarmaydi — uning fikri egasiga faqat
// ma'lumot sifatida ko'rsatiladi, qaror egasiniki.
//
// Qaytaradi: { post, hukm } — hukm null bo'lsa tekshiruvga vaqt qolmagan.
export async function izohBilanQaytaYoz({ mavzu, natija, post }, izoh, { byudjetMs = BYUDJET_MS } = {}) {
  const boshlandi = Date.now();
  const qolgan = () => byudjetMs - (Date.now() - boshlandi);

  // Izohning o'zi jurnalga tushmaydi — u egasining shaxsiy gapi, jurnal esa ochiq.
  const yangi = await kuzat('yozuvchi', 'Egasining izohi bo\'yicha qayta yozmoqda',
    () => yozuvchi.izohBilanYoz(mavzu, natija, post, izoh, {
      timeoutMs: Math.max(ENG_KAM_MS, qolgan()),
    }), postHaqida);
  if (qolgan() <= 0) return { post: yangi, hukm: null };

  const hukm = await kuzat('muharrir', 'Qayta yozilgan postni tekshirmoqda',
    () => muharrir.tekshir(mavzu, natija, yangi, {
      timeoutMs: Math.max(ENG_KAM_MS, qolgan()),
    }), hukmHaqida);
  console.log(`muharrir (izohdan keyin): ${hukm.otdi ? 'o\'tdi' : 'e\'tirozi bor'}`);
  return { post: yangi, hukm };
}

// Izohdan keyingi tekshiruvni odam o'qiydigan ko'rinishga keltirish.
export function izohJarayonMatni(hukm) {
  if (!hukm) return '🧪 Nazoratchi: tekshiruvga vaqt qolmadi.';
  if (hukm.otdi) return '🧪 Nazoratchi: o\'tdi.';
  return `🧪 Nazoratchining fikri (post qaytarilmadi, qaror sizniki):\n${qisqa(hukm.sabab)}`;
}
