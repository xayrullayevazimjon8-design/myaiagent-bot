// /post buyrug'i: qidiruv → yozuvchi → muharrir → tayyor post.
//
// Uch qism: topilgan xom materialni ko'rsatish (egasi vosita nima topganini
// ko'rsin), post yozdirish va uni tekshirtirish.
//
// Yozuvchi va muharrir — alohida agentlar, har birining xarakteri
// `agentlar/` papkasida (lib/agent.js).
import { natijaMatni } from './vositalar.js';
import { ishlat } from './agent.js';

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

  satrlar.push('', '✍️ Yozuvchi va muharrir ishlayapti...');
  return satrlar.join('\n');
}

function yozuvchiTopshirigi(mavzu, natija) {
  return [
    `Telegram uchun post yoz. Mavzu: "${mavzu}".`,
    '',
    'Quyidagi material qidiruvdan olindi. Faqat shunga tayan — yangi fakt, narx',
    'yoki muddat o\'ylab topma.',
    '',
    natijaMatni(natija),
  ].join('\n');
}

function qaytaYozTopshirigi(mavzu, natija, post, sabab) {
  return [
    `Muharrir postni qaytardi. Mavzu: "${mavzu}".`,
    '',
    'Muharrirning sababi:',
    sabab,
    '',
    'Sening oldingi posting:',
    post,
    '',
    'Aynan ko\'rsatilgan kamchilikni tuzat. Yaxshi joylarini saqlab qol,',
    'postni boshqatdan o\'ylab topma.',
    '',
    'Material o\'sha-o\'sha:',
    '',
    natijaMatni(natija),
  ].join('\n');
}

function muharrirTopshirigi(mavzu, natija, post) {
  return [
    `Quyidagi postni tekshir. So'ralgan mavzu: "${mavzu}".`,
    '',
    'POST:',
    post,
    '',
    'Post shu materialdan yozilgan. Undagi har bir fakt shu yerda bormi — tekshir:',
    '',
    natijaMatni(natija),
  ].join('\n');
}

// Apostrofning uch shakli va katta-kichik harf farqini yo'qotamiz.
function normal(matn) {
  return (matn ?? '')
    .toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, '\'')
    .replace(/[^a-z' ]+/g, ' ')
    .trim();
}

// Muharrir javobining birinchi qatori — hukm, qolgani sabab.
//
// O'qish bag'rikeng: "QAYTA YOZ", "qayta yoz.", "Hukm: QAYTA YOZ" — hammasi
// tanilishi kerak. Hukm umuman tanilmasa "o'tdi" deb qabul qilamiz: post bor,
// oxirgi qaror egasiniki. Bunday holat xabarda belgilanadi.
export function hukmniOqi(javob) {
  const satrlar = (javob ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const birinchi = normal(satrlar[0] ?? '');
  const sabab = satrlar.slice(1).join(' ').trim() || 'sabab ko\'rsatilmadi';

  if (birinchi.includes('qayta')) return { otdi: false, sabab, tanildi: true };
  if (birinchi.includes('o\'tdi') || birinchi.includes('otdi')) {
    return { otdi: true, sabab: '', tanildi: true };
  }

  console.warn('Muharrir hukmi tanilmadi:', satrlar[0]);
  return { otdi: true, sabab: satrlar.join(' '), tanildi: false };
}

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
  let post = await ishlat('yozuvchi', yozuvchiTopshirigi(mavzu, natija), sozlama());

  for (let i = 0; i < maxQayta; i++) {
    if (qolgan() <= 0) return { post, raundlar, toxtash: 'byudjet' };

    const hukm = hukmniOqi(
      await ishlat('muharrir', muharrirTopshirigi(mavzu, natija, post), sozlama()),
    );
    raundlar.push(hukm);
    console.log(`muharrir ${i + 1}-tekshiruv: ${hukm.otdi ? 'o\'tdi' : 'qayta yoz'}`);

    if (hukm.otdi) return { post, raundlar, toxtash: 'otdi' };
    if (qolgan() <= 0) return { post, raundlar, toxtash: 'byudjet' };

    post = await ishlat('yozuvchi', qaytaYozTopshirigi(mavzu, natija, post, hukm.sabab), sozlama());
  }

  return { post, raundlar, toxtash: 'chegara' };
}

// Tekshiruv jarayonini odam o'qiydigan ko'rinishga keltirish.
export function jarayonMatni({ raundlar, toxtash }) {
  const satrlar = ['🧪 Muharrir tekshiruvi'];

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
