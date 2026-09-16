// Shablon kover — rasm API ishlamaganda ishlatiladigan zaxira yo'l.
//
// Vercel funksiyasida rasm chizadigan hech narsa yo'q: `canvas` ham, `sharp`
// ham native kutubxona, ularni qo'shish katta yuk va deploy xavfi. Shuning
// uchun PNG shu yerda, `node:zlib` ustida yig'iladi — tashqi kutubxonasiz.
//
// Shrift ham ichkarida: 5x7 nuqtali harflar kattalashtirib chiziladi. Harflar
// burchakli chiqadi va faqat lotin harflari bor, lekin bu yo'l hech narsaga
// bog'liq emas va hech qachon ishlamay qolmaydi.
import zlib from 'node:zlib';

export const KENGLIK = 1280;
export const BALANDLIK = 720;

// Fon ranglari. Mavzudan hisoblanadi — bir xil mavzu har doim bir xil rang.
const FONLAR = [
  [17, 34, 64], [26, 48, 40], [51, 26, 51], [64, 38, 17], [20, 40, 66], [45, 22, 30],
];
const MATN_RANGI = [245, 245, 245];
const ISM_RANGI = [150, 180, 220];

// 5x7 shrift. Har harf 7 qator, har qator 5 nuqta.
const SHRIFT = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01110/10001/10000/10000/10000/10001/01110',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01110/10001/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/00010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/11011/10001',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  0: '01110/10001/10011/10101/11001/10001/01110',
  1: '00100/01100/00100/00100/00100/00100/01110',
  2: '01110/10001/00001/00110/01000/10000/11111',
  3: '11111/00010/00100/00010/00001/10001/01110',
  4: '00010/00110/01010/10010/11111/00010/00010',
  5: '11111/10000/11110/00001/00001/10001/01110',
  6: '00110/01000/10000/11110/10001/10001/01110',
  7: '11111/00001/00010/00100/01000/01000/01000',
  8: '01110/10001/10001/01110/10001/10001/01110',
  9: '01110/10001/10001/01111/00001/00010/01100',
  '.': '00000/00000/00000/00000/00000/01100/01100',
  ',': '00000/00000/00000/00000/01100/01100/11000',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '?': '01110/10001/00001/00110/00100/00000/00100',
  ':': '00000/01100/01100/00000/01100/01100/00000',
  '-': '00000/00000/00000/11111/00000/00000/00000',
  "'": '00100/00100/01000/00000/00000/00000/00000',
  '@': '01110/10001/10111/10101/10111/10000/01110',
  '/': '00001/00010/00010/00100/01000/01000/10000',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  ' ': '00000/00000/00000/00000/00000/00000/00000',
};

const NOMA_LUM = SHRIFT[' '];
const HARF_KENGLIK = 5;
const HARF_BALANDLIK = 7;

// O'zbekcha apostrofning uch shakli bitta shaklga keltiriladi, qolgan noma'lum
// belgi tashlanadi — shrift lotin harflari uchun.
function tozala(matn) {
  return (matn ?? '')
    .replace(/[ʻʼ‘’`´]/g, '\'')
    .toUpperCase()
    .split('')
    .filter((c) => SHRIFT[c] !== undefined || c === ' ')
    .join('');
}

function fonRangi(mavzu) {
  let hash = 0;
  for (const c of mavzu ?? '') hash = (hash * 31 + c.charCodeAt(0)) % 100000;
  return FONLAR[hash % FONLAR.length];
}

// --- PNG yig'ish ---

const CRC_JADVAL = (() => {
  const jadval = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    jadval[n] = c;
  }
  return jadval;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_JADVAL[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(turi, data) {
  const uzunlik = Buffer.alloc(4);
  uzunlik.writeUInt32BE(data.length);
  const tana = Buffer.concat([Buffer.from(turi, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tana));
  return Buffer.concat([uzunlik, tana, crc]);
}

function pngYig(piksellar, kenglik, balandlik) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(kenglik, 0);
  ihdr.writeUInt32BE(balandlik, 4);
  ihdr[8] = 8;   // bit chuqurligi
  ihdr[9] = 2;   // rang turi: RGB
  // 10-12: siqish, filtr, interlace — hammasi 0

  // Har qatorning oldida filtr bayti (0 = filtrsiz).
  const xom = Buffer.alloc(balandlik * (1 + kenglik * 3));
  for (let y = 0; y < balandlik; y++) {
    const manba = y * kenglik * 3;
    const maqsad = y * (1 + kenglik * 3);
    xom[maqsad] = 0;
    piksellar.copy(xom, maqsad + 1, manba, manba + kenglik * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(xom, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Chizish ---

function toldir(piksellar, rang) {
  for (let i = 0; i < piksellar.length; i += 3) {
    piksellar[i] = rang[0];
    piksellar[i + 1] = rang[1];
    piksellar[i + 2] = rang[2];
  }
}

function nuqta(piksellar, x, y, rang) {
  if (x < 0 || y < 0 || x >= KENGLIK || y >= BALANDLIK) return;
  const i = (y * KENGLIK + x) * 3;
  piksellar[i] = rang[0];
  piksellar[i + 1] = rang[1];
  piksellar[i + 2] = rang[2];
}

function harfChiz(piksellar, harf, x, y, olcham, rang) {
  const naqsh = (SHRIFT[harf] ?? NOMA_LUM).split('/');
  for (let qator = 0; qator < HARF_BALANDLIK; qator++) {
    for (let ustun = 0; ustun < HARF_KENGLIK; ustun++) {
      if (naqsh[qator][ustun] !== '1') continue;
      for (let dy = 0; dy < olcham; dy++) {
        for (let dx = 0; dx < olcham; dx++) {
          nuqta(piksellar, x + ustun * olcham + dx, y + qator * olcham + dy, rang);
        }
      }
    }
  }
}

function matnChiz(piksellar, matn, x, y, olcham, rang) {
  let joriy = x;
  for (const harf of matn) {
    harfChiz(piksellar, harf, joriy, y, olcham, rang);
    joriy += (HARF_KENGLIK + 1) * olcham;
  }
}

function matnKengligi(matn, olcham) {
  return matn.length * (HARF_KENGLIK + 1) * olcham;
}

// Matnni qatorlarga bo'lish. So'z sig'masa, so'zning o'zi bo'linadi.
function qatorlarga(matn, olcham, maxKenglik, maxQator) {
  const belgiKenglik = (HARF_KENGLIK + 1) * olcham;
  const sigadi = Math.max(1, Math.floor(maxKenglik / belgiKenglik));
  const qatorlar = [];
  let joriy = '';

  for (const soz of matn.split(' ').filter(Boolean)) {
    let qolgan = soz;
    while (qolgan.length > sigadi) {
      if (joriy) { qatorlar.push(joriy); joriy = ''; }
      qatorlar.push(qolgan.slice(0, sigadi));
      qolgan = qolgan.slice(sigadi);
    }
    if (!joriy) joriy = qolgan;
    else if (joriy.length + 1 + qolgan.length <= sigadi) joriy += ` ${qolgan}`;
    else { qatorlar.push(joriy); joriy = qolgan; }
  }
  if (joriy) qatorlar.push(joriy);

  if (qatorlar.length > maxQator) {
    const oxirgi = qatorlar[maxQator - 1].slice(0, Math.max(1, sigadi - 3));
    return [...qatorlar.slice(0, maxQator - 1), `${oxirgi}...`];
  }
  return qatorlar;
}

// Shablon kover. Hech qachon xato tashlamaydi: eng yomon holatda bir rangli
// rasm qaytadi, chunki bu yo'lning o'zi boshqa yo'l yiqilganda ishlaydi.
export function shablonKover(sarlavha, ism = 'Prestigious') {
  const piksellar = Buffer.alloc(KENGLIK * BALANDLIK * 3);
  const fon = fonRangi(sarlavha);
  toldir(piksellar, fon);

  try {
    const chekka = 90;
    const olcham = 9;                       // 5x7 shrift shuncha marta kattalashadi
    const qatorBalandlik = (HARF_BALANDLIK + 3) * olcham;
    const qatorlar = qatorlarga(tozala(sarlavha), olcham, KENGLIK - chekka * 2, 3);

    // Yuqori chap burchakda urg'u chizig'i
    for (let y = chekka - 30; y < chekka - 18; y++) {
      for (let x = chekka; x < chekka + 120; x++) nuqta(piksellar, x, y, ISM_RANGI);
    }

    const boshY = Math.round((BALANDLIK - qatorlar.length * qatorBalandlik) / 2) - 20;
    qatorlar.forEach((qator, i) => {
      matnChiz(piksellar, qator, chekka, boshY + i * qatorBalandlik, olcham, MATN_RANGI);
    });

    const ismMatni = tozala(ism);
    const ismOlcham = 5;
    matnChiz(
      piksellar,
      ismMatni,
      KENGLIK - chekka - matnKengligi(ismMatni, ismOlcham),
      BALANDLIK - chekka,
      ismOlcham,
      ISM_RANGI,
    );
  } catch (err) {
    // Matn chizishda nimadir noto'g'ri ketsa ham rasm qaytadi.
    console.error('Shablon koverda matn chizilmadi:', err?.message ?? err);
  }

  return pngYig(piksellar, KENGLIK, BALANDLIK);
}
