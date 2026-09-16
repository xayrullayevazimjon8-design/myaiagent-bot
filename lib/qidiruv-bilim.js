// Bilim bazasidan qidirish — qidiruv vositasining birinchi manbasi.
//
// bilim/ fayllari `##` sarlavhalari bo'yicha bo'laklarga bo'linadi va so'rov
// so'zlariga eng mos bo'laklar qaytariladi. Tashqi kutubxona yo'q: baza kichik
// (bir necha ming belgi), oddiy ball berish yetarli.
import { bilimFayllari } from './bilim.js';

const MAX_NATIJA = 3;
const MAX_BELGI = 900;

// Qidiruvga hech narsa qo'shmaydigan, deyarli har matnda uchraydigan so'zlar.
const TO_SOZLAR = new Set([
  'va', 'bilan', 'uchun', 'ham', 'bir', 'bu', 'shu', 'yoki', 'lekin', 'kerak',
  'mumkin', 'bor', 'yo\'q', 'emas', 'nima', 'qanday', 'qancha', 'men', 'siz',
  'sizning', 'mening', 'meni', 'sizga', 'menga', 'haqida', 'the', 'for', 'and',
]);

// O'zbekcha apostrof uch xil yoziladi (o', oʻ, o‘) — hammasini bittaga keltiramiz.
function normal(matn) {
  return matn.toLowerCase().replace(/[ʻʼ‘’`´]/g, '\'');
}

function sozlar(matn) {
  return normal(matn).split(/[^a-z0-9']+/).filter(Boolean);
}

// So'zning o'zagi. To'liq morfologiya shart emas — "narx" bilan "narxlar",
// "narxi", "narxni" ni bir-biriga bog'lash uchun boshidagi bo'lak yetarli.
function ozak(soz) {
  return soz.slice(0, Math.max(4, soz.length - 3));
}

function mosMi(soz, sorovSozi) {
  return soz.startsWith(ozak(sorovSozi)) || sorovSozi.startsWith(ozak(soz));
}

let keshBolaklar;

// Fayllarni `##` sarlavhalari bo'yicha bo'laklarga ajratish.
// Sarlavhadan oldingi kirish qismi ham alohida bo'lak bo'ladi.
function bolaklar() {
  if (keshBolaklar) return keshBolaklar;

  keshBolaklar = [];

  for (const fayl of bilimFayllari()) {
    let sarlavha = fayl.nom;
    let satrlar = [];

    const yopish = () => {
      const matn = satrlar.join('\n').trim();
      // `# Sarlavha` dan keyingi bo'sh kirish qismini tashlaymiz.
      if (matn) keshBolaklar.push({ fayl: fayl.nom, sarlavha, matn });
    };

    for (const satr of fayl.ichi.split('\n')) {
      if (satr.startsWith('## ')) {
        yopish();
        sarlavha = satr.slice(3).trim();
        satrlar = [];
      } else {
        satrlar.push(satr);
      }
    }
    yopish();
  }

  return keshBolaklar;
}

// Uzunlik jazosining boshlanish nuqtasi: shundan uzun bo'lakning matn ballari
// kamaytiriladi.
const ODATIY_BELGI = 400;

// Bo'lakka ball berish. Sarlavhadagi moslik matn ichidagisidan qimmatroq:
// "narxlar" sarlavhali bo'lak narx so'ralganda eng mos javob bo'ladi.
//
// Matn ballari bo'lak uzunligiga bo'linadi. Jazosiz eng uzun bo'lak deyarli
// har so'rovda birinchi chiqadi — u ko'p so'z saqlagani uchun, mazmunan mos
// bo'lgani uchun emas. Sinovda beshta so'rovdan beshtasida ranjirovka
// yaxshilandi.
function ball(bolak, sorovSozlari) {
  const sarlavhaSozlari = sozlar(`${bolak.fayl} ${bolak.sarlavha}`);
  const matnSozlari = sozlar(bolak.matn);
  let sarlavhaBall = 0;
  let matnBall = 0;

  for (const s of sorovSozlari) {
    if (sarlavhaSozlari.some((w) => mosMi(w, s))) sarlavhaBall += 3;

    const uchradi = matnSozlari.filter((w) => mosMi(w, s)).length;
    // Bitta so'zning ko'p takrorlanishi bo'lakni sun'iy ko'tarib yubormasin.
    matnBall += Math.min(uchradi, 3);
  }

  const uzunlik = Math.max(ODATIY_BELGI, bolak.matn.length);
  return sarlavhaBall + matnBall * (ODATIY_BELGI / uzunlik);
}

function qirq(matn) {
  return matn.length > MAX_BELGI ? `${matn.slice(0, MAX_BELGI)}…` : matn;
}

// So'rovga eng mos bo'laklar: [{ fayl, sarlavha, matn, ball }].
// Hech narsa topilmasa — bo'sh ro'yxat.
export function qidir(sorov, chegara = MAX_NATIJA) {
  const sorovSozlari = sozlar(sorov).filter((s) => s.length >= 3 && !TO_SOZLAR.has(s));
  if (sorovSozlari.length === 0) return [];

  return bolaklar()
    .map((b) => ({ ...b, ball: ball(b, sorovSozlari) }))
    .filter((b) => b.ball > 0)
    .sort((a, b) => b.ball - a.ball)
    .slice(0, chegara)
    .map((b) => ({ ...b, matn: qirq(b.matn) }));
}
