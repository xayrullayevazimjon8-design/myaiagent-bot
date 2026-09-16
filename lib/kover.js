// Kover vositasi: post uchun rasm.
//
// Ikki yo'l bor va ular ketma-ket sinaladi:
//   1. Rasm API (Imagen) — kalit bo'lsa
//   2. Shablon kover — fon rangi, sarlavha va ism bilan
//
// Ikkinchisi birinchisining zaxirasi emas, balki kafolati: kalit yo'q bo'lsa,
// limit tugasa, API yiqilsa yoki kechiksa ham /post rasmsiz qolmaydi va
// foydalanuvchi xato ko'rmaydi.
import * as api from './kover-api.js';
import { shablonKover } from './kover-shablon.js';

const ISM = 'Prestigious';

// Koverni butunlay o'chirish: KOVER=off.
function yoqilgan() {
  return (process.env.KOVER ?? '').trim().toLowerCase() !== 'off';
}

// Kover yasash. Hech qachon xato tashlamaydi.
//
// Qaytaradi: { rasm, mime, usul, sabab }
//   usul: 'api' | 'shablon' | 'ochirilgan'
//   sabab: shablonga nega o'tilgani (faqat shablon bo'lsa)
export async function kover({ mavzu, tavsif, sarlavha } = {}) {
  const matn = (sarlavha || mavzu || '').trim();

  if (!yoqilgan()) return { rasm: null, mime: '', usul: 'ochirilgan', sabab: 'KOVER=off' };

  if (api.yoqilganmi()) {
    try {
      const { rasm, mime } = await api.yasa(tavsif || api.tavsifQur(mavzu ?? matn));
      console.log(`kover: api, ${rasm.length} bayt, ${mime}`);
      return { rasm, mime, usul: 'api', sabab: '' };
    } catch (err) {
      const sabab = err?.message ?? String(err);
      console.error('Rasm API ishlamadi, shablonga o\'tildi:', sabab);
      return { rasm: shablonKover(matn, ISM), mime: 'image/png', usul: 'shablon', sabab };
    }
  }

  console.log('kover: shablon (rasm kaliti sozlanmagan)');
  return {
    rasm: shablonKover(matn, ISM), mime: 'image/png', usul: 'shablon',
    sabab: 'rasm kaliti sozlanmagan',
  };
}
