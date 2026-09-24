// Muharrir agentning funksiyalari.
//
// Xarakteri va tekshirish mezonlari — yonidagi muharrir.md faylda. Bu yerda
// topshiriq matni va hukmni o'qish.
import { ishlat, materialYoki } from './agent.js';

export const NOM = 'muharrir';

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
// oxirgi qaror egasiniki. Agentning noaniq bitta javobi tayyor postni
// yo'q qilmasligi kerak — bunday holat xabarda belgilanadi.
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

// Postni tekshirish. Qaytadi: { otdi, sabab, tanildi }.
export async function tekshir(mavzu, natija, post, sozlama = {}) {
  const topshiriq = [
    `Quyidagi postni tekshir. So'ralgan mavzu: "${mavzu}".`,
    '',
    'POST:',
    post,
    '',
    'Post shu materialdan yozilgan. Undagi har bir fakt shu yerda bormi — tekshir:',
    '',
    materialYoki(natija),
  ].join('\n');

  return hukmniOqi(await ishlat(NOM, topshiriq, sozlama));
}
