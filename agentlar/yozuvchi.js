// Yozuvchi agentning funksiyalari.
//
// Xarakteri — yonidagi yozuvchi.md faylda. Bu yerda faqat unga beriladigan
// topshiriq matni: nima yozish kerak va qanday material bilan.
import { ishlat, materialYoki } from './agent.js';
import { natijaMatni } from '../lib/vositalar.js';

export const NOM = 'yozuvchi';

// Birinchi qoralama: mavzu va qidiruv materiali beriladi.
export function yoz(mavzu, natija, sozlama = {}) {
  const topshiriq = [
    `Telegram uchun post yoz. Mavzu: "${mavzu}".`,
    '',
    'Quyidagi material qidiruvdan olindi. Faqat shunga tayan — yangi fakt, narx',
    'yoki muddat o\'ylab topma.',
    '',
    natijaMatni(natija),
  ].join('\n');

  return ishlat(NOM, topshiriq, sozlama);
}

// Muharrir qaytargandan keyingi urinish: sabab va oldingi post ham beriladi,
// chunki tuzatish kerak, boshqatdan yozish emas.
export function qaytaYoz(mavzu, natija, post, sabab, sozlama = {}) {
  const topshiriq = [
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

  return ishlat(NOM, topshiriq, sozlama);
}

// Egasi "Qayta yoz" bosib izoh yozgandan keyingi urinish. Izoh — egasining
// qarori, muharrir fikridan ustun: aynan o'sha bajariladi.
export function izohBilanYoz(mavzu, natija, post, izoh, sozlama = {}) {
  const topshiriq = [
    `Kanal egasi postni o'qib, qayta yozishni so'radi. Mavzu: "${mavzu}".`,
    '',
    'Egasining izohi — shuni albatta bajar:',
    izoh,
    '',
    'Hozirgi post:',
    post,
    '',
    'Izohda aytilganini o\'zgartir, qolgan yaxshi joylarini saqlab qol.',
    'Izoh materialda yo\'q fakt so\'rasa ham, uni o\'ylab topma.',
    '',
    'Material:',
    '',
    materialYoki(natija),
  ].join('\n');

  return ishlat(NOM, topshiriq, sozlama);
}
