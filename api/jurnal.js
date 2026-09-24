// /jurnal.md — agentlar jurnali markdown ko'rinishida (vercel.json dagi rewrite).
// ofis.html shu manzilni o'qiydi (10–60 s da bir marta, faqat oyna ochiq bo'lsa).
import { markdown } from '../lib/jurnal.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  // Vercel CDN javobni 10 soniya saqlaydi: nechta odam ochib turmasin, funksiya
  // (va Redis) 10 soniyada ko'pi bilan bir marta chaqiriladi. Brauzer saqlamaydi
  // (max-age=0) — har safar CDN'dan yangi nusxani so'raydi.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20');
  return res.status(200).send(await markdown());
}
