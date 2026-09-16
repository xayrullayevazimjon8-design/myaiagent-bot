// Yozuvchi agentning funksiyalari.
//
// Xarakteri — yonidagi yozuvchi.md faylda. Bu yerda faqat unga beriladigan
// topshiriq matni: nima yozish kerak va qanday material bilan.
import { ishlat } from './agent.js';
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
