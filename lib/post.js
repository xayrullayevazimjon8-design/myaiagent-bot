// /post buyrug'i: qidiruv vositasini sinash uchun.
//
// Ikki qism: topilgan xom materialni ko'rsatish (egasi vosita nima topganini
// ko'rsin) va shu material asosida post matnini yozdirish.
import { natijaMatni } from './vositalar.js';

// Telegram'da ko'rsatiladigan bo'lak — odam o'qiydi, model emas.
const KO_RINADIGAN_BELGI = 220;

function qisqa(matn) {
  const toza = matn.replace(/\s+/g, ' ').trim();
  return toza.length > KO_RINADIGAN_BELGI ? `${toza.slice(0, KO_RINADIGAN_BELGI)}…` : toza;
}

function internetSarlavhasi({ holat, natijalar }) {
  if (holat === 'ochirilgan') return 'Internet — o\'chirilgan (TAVILY_API_KEY sozlanmagan)';
  if (holat === 'xato') return 'Internet — qidiruv ishlamadi (log\'ga qarang)';
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

  satrlar.push('', '✍️ Post tayyorlanmoqda...');
  return satrlar.join('\n');
}

// Post yozish uchun AI'ga beriladigan so'rov. Material shu yerda beriladi —
// model uni qayta qidirishi shart emas.
export function postSorovi(mavzu, natija) {
  return [
    `Telegram uchun post yoz. Mavzu: "${mavzu}".`,
    '',
    'Quyidagi material qidiruvdan olindi. Faqat shunga tayan — yangi fakt, narx',
    'yoki muddat o\'ylab topma. Materialda yetarli ma\'lumot bo\'lmasa, borini yoz',
    'va qolganini to\'qima.',
    '',
    natijaMatni(natija),
  ].join('\n');
}
