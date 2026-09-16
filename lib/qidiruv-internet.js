// Internet qidiruv — qidiruv vositasining ikkinchi manbasi.
//
// Tavily (https://tavily.com) ishlatiladi: u oddiy qidiruv tizimidan farqli
// o'laroq har natija uchun sahifadan olingan matn bo'lagini ham qaytaradi,
// ya'ni modelga berish uchun tayyor. SDK qo'shilmagan — REST API va `fetch`.
//
// Kalit sozlanmagan bo'lsa bu manba butunlay o'chadi va vosita faqat bilim
// bazasi bilan ishlaydi. Xato bo'lsa ham xuddi shunday: qidiruv yiqilsa bot
// javob berishda davom etadi.
const MANZIL = 'https://api.tavily.com/search';
const MAX_NATIJA = 5;
const MAX_BELGI = 500;

// Internet qidiruv uzoq cho'zilmasin: umumiy javob chegarasi 45 soniya, uning
// kattasini qidiruvga berib bo'lmaydi.
const TIMEOUT_MS = 8000;

// Umumiy zaxira nom — lib/config.js dagi AI_API_KEY bilan bir mantiq.
function kalit() {
  return process.env.TAVILY_API_KEY?.trim() || process.env.QIDIRUV_API_KEY?.trim() || '';
}

export function yoqilganmi() {
  return Boolean(kalit());
}

function qirq(matn) {
  const toza = (matn ?? '').trim().replace(/\s+/g, ' ');
  return toza.length > MAX_BELGI ? `${toza.slice(0, MAX_BELGI)}…` : toza;
}

// Internetdan qidirish: [{ sarlavha, url, matn }].
// Kalit yo'q bo'lsa bo'sh ro'yxat — chaqiruvchi buni oldindan tekshirishi shart emas.
export async function qidir(sorov, chegara = MAX_NATIJA) {
  const key = kalit();
  if (!key) return [];

  const res = await fetch(MANZIL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: sorov,
      max_results: chegara,
      // 'advanced' chuqurroq qidiradi, lekin sekinroq va qimmatroq.
      search_depth: 'basic',
      include_answer: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    // Sababni logda ko'rish uchun tanani ham olamiz: 401 — kalit, 432/429 — limit.
    throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();

  return (data.results ?? []).map((r) => ({
    sarlavha: (r.title ?? '').trim(),
    url: r.url ?? '',
    matn: qirq(r.content),
  }));
}
