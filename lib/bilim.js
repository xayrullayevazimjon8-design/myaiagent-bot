// Bilim bazasi — bilim/ papkasidagi barcha .md fayllar.
//
// Har so'rovda AI'ga kontekst sifatida uzatiladi: bot faqat shu ma'lumotga
// tayanib javob beradi. Papkaga yangi fayl qo'shsangiz kodga tegish shart emas —
// o'zi topadi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM'da __dirname yo'q — yo'lni import.meta.url dan olamiz.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAPKA = path.join(HERE, '..', 'bilim');

let fayllarKeshi;
let matn;

// Papkadagi barcha .md fayllar: [{ nom, ichi }]. Bir marta o'qiladi.
//
// Ikki iste'molchisi bor: system prompt (hammasini bitta matnga qo'shadi) va
// qidiruv vositasi (fayllarni alohida-alohida ko'rishi kerak).
export function bilimFayllari() {
  if (fayllarKeshi) return fayllarKeshi;

  try {
    const nomlar = fs.readdirSync(PAPKA).filter((f) => f.endsWith('.md')).sort();

    fayllarKeshi = nomlar.map((f) => ({
      nom: path.basename(f, '.md'),
      ichi: fs.readFileSync(path.join(PAPKA, f), 'utf8').trim(),
    }));

    if (fayllarKeshi.length === 0) console.warn('bilim/ papkasi bo\'sh');
  } catch (err) {
    // Vercel'da bu odatda vercel.json dagi includeFiles unutilganini bildiradi.
    console.warn('bilim/ o\'qilmadi:', err.message);
    fayllarKeshi = [];
  }

  return fayllarKeshi;
}

// Bazani bitta matnga jamlash. Har fayl o'z nomi bilan belgilanadi — model
// qaysi ma'lumot qayerdan kelganini ajrata olsin va [[havola]] larni tushunsin.
export function bilimBazasi() {
  if (matn !== undefined) return matn;

  const fayllar = bilimFayllari();
  matn = fayllar
    .map((f) => `### Fayl: ${f.nom}\n\n${f.ichi}`)
    .join('\n\n---\n\n');

  if (matn) console.log(`bilim bazasi o'qildi: ${fayllar.length} fayl, ${matn.length} belgi`);
  return matn;
}
