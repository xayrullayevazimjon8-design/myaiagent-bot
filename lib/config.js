// Kalitlarni tekshirish. Kichik fayl, lekin sababi jiddiy:
//
// Kalit berilmasa SDK'lar buni "xato" deb emas, "boshqa usulda autentifikatsiya qil"
// deb tushunadi. Masalan @google/genai Google Cloud'ning standart credential'larini
// qidira boshlaydi va oxirida "Could not load the default credentials" deydi —
// sabab esa oddiy: env var qo'yilmagan. Shuning uchun oldindan to'xtatamiz.

export class MissingKeyError extends Error {
  constructor(keyName) {
    super(`${keyName} topilmadi`);
    this.name = 'MissingKeyError';
    this.keyName = keyName;
  }
}

// Kalitni o'qish; bo'lmasa aniq xato bilan to'xtash.
export function requireKey(keyName) {
  const value = process.env[keyName]?.trim();
  if (!value) throw new MissingKeyError(keyName);
  return value;
}

// Kalit yo'qligi xatosi bo'lsa — tayyor matn, bo'lmasa null.
export function missingKeyMessage(err) {
  if (err instanceof MissingKeyError) {
    return `AI kaliti sozlanmagan (${err.keyName}). Administrator qo'shishi kerak.`;
  }
  return null;
}
