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

let matn;

// Bazani bitta matnga jamlash. Har fayl o'z nomi bilan belgilanadi — model
// qaysi ma'lumot qayerdan kelganini ajrata olsin va [[havola]] larni tushunsin.
export function bilimBazasi() {
  if (matn !== undefined) return matn;

  try {
    const fayllar = fs.readdirSync(PAPKA)
      .filter((f) => f.endsWith('.md'))
      .sort();

    if (fayllar.length === 0) {
      console.warn('bilim/ papkasi bo\'sh');
      matn = '';
      return matn;
    }

    matn = fayllar
      .map((f) => {
        const nom = path.basename(f, '.md');
        const ichi = fs.readFileSync(path.join(PAPKA, f), 'utf8').trim();
        return `### Fayl: ${nom}\n\n${ichi}`;
      })
      .join('\n\n---\n\n');

    console.log(`bilim bazasi o'qildi: ${fayllar.length} fayl, ${matn.length} belgi`);
  } catch (err) {
    // Vercel'da bu odatda vercel.json dagi includeFiles unutilganini bildiradi.
    console.warn('bilim/ o\'qilmadi:', err.message);
    matn = '';
  }

  return matn;
}
