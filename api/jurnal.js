// /jurnal.md — agentlar jurnali markdown ko'rinishida (vercel.json dagi rewrite).
// ofis.html shu manzilni har necha soniyada o'qiydi.
import { markdown } from '../lib/jurnal.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  // Kesh bo'lsa ofis eski holatni ko'rsatib turardi.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(await markdown());
}
