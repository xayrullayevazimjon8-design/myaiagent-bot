# Ish hisoboti — 2026-09-16

Bir sessiyada qilingan ishlar. Loyihaning umumiy yilnomasi — [`myAIagent.md`](myAIagent.md),
bu fayl esa shu kungi ishning bosqichma-bosqich qaydnomasi.

| | |
|---|---|
| Boshlangan holat | `083e5c8` — 8-bosqich, bot savolga javob beradi, xotirasi yo'q |
| Yakuniy holat | `6b59b06` — 12-bosqich, xotira + 2 vosita + 2 agent |
| Commit | 9 ta |
| Yangi fayl | 12 ta |

---

## 1. Bajarilgan bosqichlar

### 9-bosqich — suhbat xotirasi (`4a6cfe8`)

Bot har xabarni alohida ko'rardi: "qaysi sohada ishlaysiz?" deb so'rab, javobni
tushunmasdi.

`lib/xotira.js` qo'shildi — har chat uchun oxirgi 10 juftlik saqlanadi va keyingi
so'rovda AI'ga qo'shib yuboriladi. 30 daqiqa jimlikdan keyin o'zi tozalanadi,
`/tozala` va `/start` darhol o'chiradi.

Ikki saqlash usuli: `KV_REST_API_URL` + `KV_REST_API_TOKEN` bo'lsa Redis
(Upstash REST, SDK'siz), bo'lmasa funksiyaning o'z xotirasi. Tarix neytral
shaklda saqlanadi (`{ role, text }`), har provayder o'z formatiga o'giradi —
`AI_PROVIDER` almashtirilganda tarix yaroqsiz bo'lib qolmaydi.

### 10-bosqich — birinchi vosita: qidiruv (`d647729`)

Botga vosita qo'shildi, AI'ga tavsif bilan e'lon qilinadi — chaqirish qarori
modelniki.

Ikki manba: `bilim/` papkasi (bo'laklarga bo'linadi, so'rov so'zlariga ball
beriladi, o'zbekcha qo'shimchalar so'z o'zagi bo'yicha solishtiriladi) va
internet (Tavily REST). Kalit yo'q bo'lsa internet manbasi jimgina o'chadi.

Uchala provayder ham qo'llab-quvvatlaydi. `/post [mavzu]` — sinov buyrug'i.

### 11-bosqich — ikki agent (`528a03b`, `9bad7fc`)

`/post` ketma-ketlikka aylandi: qidiruv → yozuvchi → muharrir.

Har agentning hammasi `agentlar/` papkasida: xarakteri `<nom>.md` da,
funksiyalari `<nom>.js` da. Muharrir "qayta yoz" desa yozuvchi tuzatadi, ko'pi
bilan 2 marta.

`ask()` ga `sozlama` qo'shildi: `system` (Jarvis o'rniga boshqa prompt) va
`vositasiz` (vosita e'lon qilinmaydi).

### 12-bosqich — uchinchi vosita: kover rasm (`6b59b06`)

`/post` rasm bilan chiqadi. Asosiy yo'l — Gemini rasm modeli. Zaxira yo'l —
shablon kover: `node:zlib` ustida qo'lda yig'ilgan PNG va ichki 5×7 nuqtali
shrift, tashqi kutubxonasiz. Zaxira yo'l hech qachon xato tashlamaydi.

---

## 2. Tuzatilgan nosozliklar

### Bot soha savolini qayta-qayta berardi (`8d947f3`)

Ikki sabab birga edi. Asosiysi — xotira hali `main` ga qo'shilmagan, ya'ni
production'da bot oldingi xabarni umuman ko'rmasdi. Ikkinchisi — prompt tartibni
aytmasdi.

`xarakter.md` uch bosqichga bo'lindi: soha (faqat bir marta so'raladi), o'sha
sohaga oid 2-3 savol, taklif. Buyurtma bildirilsa savol berish to'xtaydi va
mijoz egaga yo'naltiriladi.

### Bot qidiruvni ishlatmasdi (`02c55f0`)

Vosita e'lon qilingan, model uni ko'rgan — lekin ishlatmagan. Sababi promptdagi
tartib: "Eng muhim qoida: to'qima" bo'limi bazada yo'q savolga tayyor javob
berardi ("ma'lumotim yo'q, egasiga yozing"), model uchun eng arzon yo'l shu edi.

Tartib aniq yozildi: avval qidir, keyin "bilmayman" de. Narx/muddat/shartnoma
bundan mustasno — ular ichki masala.

### Gemini vosita halqasi 400 qaytarardi (`94aaead`)

Production logi: qidiruv ishlagan (`internet ok 5`), keyingi so'rov
`400 Request contains an invalid argument` bilan yiqilgan. Foydalanuvchi oddiy
xato matnini ko'rgan.

Sababi: javobdan `thought` qadamlari filtrlanib tashlangan edi. Ularda
`signature` bor — backend shu bilan chaqiruvni tekshiradi. Endi modelning
chiqishi o'zgartirilmasdan qaytariladi.

### Log bitta nosozlikni ikkita qilib ko'rsatardi (`94aaead`)

"Chegaradan keyin kelgan AI xatosi" qatori har qanday xatoda chiqardi — vaqt
chegarasi umuman ishlamagan bo'lsa ham. Endi faqat chegara g'olib chiqqanda.

### Bot umumiy savollarga javob bermasdi (`cbfe5ef`)

Egasining qarori bilan o'zgartirildi: valyuta kursi, ob-havo, yangilik — bot
hammasiga javob beradi va o'zgaruvchan javoblarni qidiruv orqali oladi.

Uch joy birga o'zgartirildi: `xarakter.md`, `lib/xarakter.js` dagi bilim bazasi
qoidasi va vosita tavsifi. Bittasi eski holida qolsa bot ziddiyatga tushardi.

---

## 3. Yangi fayllar

```
lib/xotira.js            suhbat tarixi — Redis yoki funksiya xotirasi
lib/vositalar.js         vosita e'lonlari va bajarilishi
lib/qidiruv-bilim.js     bilim/ dan qidirish
lib/qidiruv-internet.js  Tavily orqali internet qidiruv
lib/kover.js             kover vositasi: API, yiqilsa shablon
lib/kover-api.js         rasm generatsiyasi
lib/kover-shablon.js     PNG yasovchi — kutubxonasiz
lib/post.js              /post oqimi
agentlar/agent.js        agentning umumiy qismi
agentlar/yozuvchi.md/.js post yozuvchi
agentlar/muharrir.md/.js tekshiruvchi
```

---

## 4. Env o'zgaruvchilar

| Nom | Vazifasi | Majburiymi |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather tokeni | Ha |
| `AI_PROVIDER` | `gemini` / `claude` / `openai` | Yo'q (standart `claude`) |
| `GEMINI_API_KEY` | Gemini kaliti | Joriy provayder uchun ha |
| `ANTHROPIC_API_KEY` | Claude kaliti | Yo'q |
| `OPENAI_API_KEY` | OpenAI kaliti | Yo'q |
| `AI_API_KEY` | Umumiy zaxira nom | Yo'q |
| `TAVILY_API_KEY` | Internet qidiruv | Yo'q — bo'lmasa faqat bilim bazasi |
| `RASM_API_KEY` | Kover uchun kalit | Yo'q — bo'lmasa `GEMINI_API_KEY` |
| `RASM_MODEL` | Rasm modeli | Yo'q |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Suhbat xotirasi uchun Redis | Yo'q — bo'lmasa funksiya xotirasi |
| `XOTIRA` | `off` — xotira o'chadi | Yo'q |
| `VOSITA` | `off` — vositalar o'chadi | Yo'q |
| `KOVER` | `off` — kover o'chadi | Yo'q |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook himoyasi | Yo'q |

---

## 5. Buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `/start` | Salomlashadi va suhbat xotirasini tozalaydi |
| `/tozala` | Suhbat tarixini o'chiradi |
| `/help` | Buyruqlar ro'yxati |
| `/post [mavzu]` | Qidiruv → yozuvchi → muharrir → kover → rasm bilan post |

---

## 6. Sinovlar

Sessiya davomida 11 ta sinov fayli yozildi va har o'zgarishda ishga tushirildi:
xotira (Redis va funksiya xotirasi, xatolarni yutish), provayderlarning suhbat
tarixi formati, vosita halqasi (uchala provayder), `MAX_VOSITA` chegarasi,
bilim qidiruvining ranjirovkasi, Tavily so'rov/javob shakli, agentlar halqasi
(o'tish, qaytarish, chegara, byudjet, tanilmagan hukm), kover (PNG tuzilishi,
API yo'li, zaxira yo'l, vaqt chegarasi), `/post` uchidan-uchiga.

**Sinovlar repoda saqlanmagan** — ular vaqtinchalik papkada yozilgan. Loyihada
sinov tizimi yo'q. Bu ochiq masala: keyingi o'zgarishda ularni qayta yozishga
to'g'ri keladi.

---

## 7. Ochiq masalalar

| Masala | Holat |
|---|---|
| ~~Sinovlar repoda yo'q~~ | 13-bosqichda `test/` qo'shildi — `npm test` |
| ~~Upstash Redis ulanmagan~~ | 2026-09-24 da ulandi |
| Bilim bazasi to'ldirilmagan | `bilim/` da `<!-- NAMUNA — to'ldiring -->` belgilari bor |
| Bilim bazasi promptda ham, vositada ham | Har so'rovda promptga to'liq qo'shiladi (~3300 token) — qidiruv bo'lgach ortiqcha |
| Kalitlar suhbat tarixida | Tavily kaliti chatda yozilgan — almashtirish tavsiya etiladi |
| `TELEGRAM_WEBHOOK_SECRET` | Kod tayyor, yoqilmagan |
| Yozuvchining ohangi jonli sinalmagan | `/post` production'da to'liq sinalmadi |

---

## 8. Lokal kompyuterga ko'chirish

Repo: `https://github.com/xayrullayevazimjon8-design/myaiagent-bot`

**Papka bo'sh yoki mavjud emas:**

```powershell
cd C:\AI-vibecoding
git clone https://github.com/xayrullayevazimjon8-design/myaiagent-bot.git myagent
cd myagent
npm install
```

**Papkada eski fayllar bor:**

```powershell
cd C:\AI-vibecoding\myagent
git init
git remote add origin https://github.com/xayrullayevazimjon8-design/myaiagent-bot.git
git fetch origin main
git checkout -f -B main origin/main
npm install
```

Ikkinchi yo'l papkadagi bir xil nomli fayllarni **almashtiradi** — kerakli
narsa bo'lsa avval nusxa oling.

**Keyin `.env` yarating.** U Git'ga tushmaydi (`.gitignore` da), shuning uchun
klonda bo'lmaydi. `.env.example` dan nusxa olib, kalitlarni Vercel'dagi
qiymatlardan ko'chiring:

```powershell
copy .env.example .env
```

Lokalda ishga tushirish shart emas — bot Vercel'da webhook orqali ishlaydi.
Lokal nusxa tahrirlash va commit qilish uchun.
