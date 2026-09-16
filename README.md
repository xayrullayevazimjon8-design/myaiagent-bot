# myAIagent — Telegram bot

Webhook orqali ishlaydigan Telegram bot. Vercel'da serverless funksiya sifatida turadi.

**Joriy bosqich: 9 — suhbat xotirasi.** Kelgan matn AI'ga oldingi xabarlar bilan
birga yuboriladi. `/start`, `/tozala` va `/help` AI'siz, lokal javob beradi.

## Uchta AI, bitta tugma

Bot **Gemini**, **Claude** va **OpenAI** bilan ishlay oladi. Qaysi biri ishlashini
`AI_PROVIDER` env var belgilaydi — kodni o'zgartirish shart emas:

| `AI_PROVIDER` | Model | Izoh |
|---|---|---|
| `gemini` (joriy) | `gemini-3.8-flash` | Bepul tarifda limit juda past |
| `claude` | `claude-haiku-4-5` | Tez va arzon; fikrlash o'chirilgan |
| `openai` | `gpt-6-astra` | Hisobda kredit kerak |

Noto'g'ri qiymat yozilsa bot to'xtamaydi — logga ogohlantirish yozib, `gemini` ga qaytadi.

Almashtirish uchun Vercel → Settings → Environment Variables → `AI_PROVIDER` qiymatini
o'zgartiring va **Redeploy** qiling.

**Oqim:** Telegram webhook'dan 60 soniyada javob kutadi va kutmasa xabarni qayta
yuboradi. Shuning uchun bot darhol `200 OK` qaytaradi, AI chaqiruvi esa `waitUntil`
bilan fonda bajariladi. Foydalanuvchi shu payt "yozmoqda..." holatini ko'radi.

| | |
|---|---|
| Bot | [@myAIagent_25_bot](https://t.me/myAIagent_25_bot) |
| Kirish nuqtasi | `api/bot.js` |
| Webhook manzili | `https://<domain>/api/bot` |
| Kutubxonalar | `@google/genai`, `@anthropic-ai/sdk`, `openai`, `@vercel/functions` |

## Fayllar

```
api/bot.js      # webhook handler — yagona kirish nuqtasi
lib/ai.js       # qaysi AI ishlashini tanlaydi + javobni bo'laklarga bo'lish
lib/gemini.js   # Gemini chaqiruvi
lib/openai.js   # OpenAI chaqiruvi
lib/claude.js   # Claude chaqiruvi
lib/xotira.js   # suhbat tarixi — Redis yoki funksiya xotirasi
lib/xarakter.js # system prompt: xarakter + bilim bazasi
lib/bilim.js    # bilim/ papkasini o'qiydi
lib/config.js   # kalitlarni tekshirish
vercel.json     # funksiya uchun maxDuration: 60
```

`lib/gemini.js`, `lib/claude.js` va `lib/openai.js` bir xil interfeysga ega:
`ask(matn, tarix)` va `errorMessage(xato)`. Yangi provayder qo'shish uchun shu ikki
funksiyani yozib, `lib/ai.js` dagi `PROVIDERS` ro'yxatiga qo'shish yetarli.

Vercel `api/` papkasidagi fayllarni avtomatik funksiyaga aylantiradi —
shuning uchun handler ildizda emas, `api/` ichida turadi.

## 1. Lokal sozlash

`.env.example`dan nusxa olib `.env` yarating va kalitlarni qo'ying:

```
TELEGRAM_BOT_TOKEN=123456789:AA...
AI_PROVIDER=gemini
GEMINI_API_KEY=AQ...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

Faqat ishlatayotgan provayderingizning kaliti bo'lsa ham yetadi.

Token to'g'riligini tekshirish:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getMe"
```

`.env` hech qachon Git'ga tushmaydi — u `.gitignore`da.

## 2. GitHub'ga chiqarish

```bash
git push -u origin main
```

## 3. Vercel

1. vercel.com → **Add New → Project** → shu repo'ni tanlang → **Deploy**.
2. **Settings → Environment Variables**: `TELEGRAM_BOT_TOKEN`, `AI_PROVIDER`,
   `GEMINI_API_KEY` (va kerak bo'lsa `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) qo'shing → **Redeploy**.
3. Tekshirish: brauzerda `https://<domain>/api/bot` oching → `Bot ishlayapti.`

Env var qo'shgandan keyin **albatta Redeploy qiling** — yangi qiymat faqat yangi
deploy'ga tushadi. Ro'yxatdagi "Needs Attention" yorlig'i aynan shuni eslatadi.

## 4. Webhook'ni ulash

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/bot"
```

Secret ishlatsangiz:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -H "Content-Type: application/json" -d '{"url":"https://<domain>/api/bot","secret_token":"<SECRET>"}'
```

Holatni ko'rish:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`last_error_message` bo'sh bo'lishi kerak. Xatolar Vercel → Project → **Logs** bo'limida.

## Nima qanday ishlaydi

- `GET /api/bot` → `Bot ishlayapti.` (tirikligini tekshirish uchun)
- `POST /api/bot` → Telegram update'i
- `/start`, `/tozala`, `/help` — tayyor javoblar, AI chaqirilmaydi
  (`/start` va `/tozala` suhbat xotirasini ham tozalaydi)
- Boshqa matn → AI javob beradi, uzun javob bo'laklarga bo'linadi (limit 4096 belgi)
- Rasm, stiker va boshqalar → "Hozircha faqat matnli xabarlarni tushunaman."
- Handler **har doim `200`** qaytaradi: xato bo'lsa ham. Aks holda Telegram
  o'sha xabarni qayta-qayta yuboraveradi.

## Xato matnlari

Har bir provayder fayli `errorMessage()` orqali API xatosini foydalanuvchi tushunadigan
matnga aylantiradi: noto'g'ri kalit, tugagan balans yoki limit, ko'p so'rov.
Texnik tafsilot foydalanuvchiga emas, Vercel logiga yoziladi — logda qaysi provayder
xato berganini ham ko'rasiz.

---

## Joriy holat

| | |
|---|---|
| Bot | [@myAIagent_25_bot](https://t.me/myAIagent_25_bot) |
| Repo | `xayrullayevazimjon8-design/myaiagent-bot` (public) |
| Vercel project | `myaiagent-bot` (team `azimjon4`) |
| Production | https://myaiagent-bot.vercel.app |
| Webhook | `https://myaiagent-bot.vercel.app/api/bot` |
| Ishlayotgan AI | Claude (`AI_PROVIDER=claude`) |

Claude hisobiga kredit qo'shilgan va bot shu asosda ishlaydi. Gemini zaxira sifatida
qoladi (bepul, lekin kuniga 20 so'rov). OpenAI'da kredit yo'q.
Provayderni almashtirish: Vercel'da `AI_PROVIDER` qiymatini o'zgartirib Redeploy.

`main`ga push qilinsa Vercel avtomatik deploy qiladi.

> **Eslatma:** commit muallifining email'i GitHub akkauntingizga bogʻlangan boʻlishi shart
> (`xayrullayevazimjon8@gmail.com`). Boshqa email bilan qilingan commit'da Vercel deploy'ni
> `COMMIT_AUTHOR_REQUIRED` sababi bilan bloklaydi.

## Kalit qo'yilmasa nima bo'ladi

`lib/config.js` har chaqiruvdan oldin kerakli env var borligini tekshiradi va
bo'lmasa darhol to'xtatadi: *"AI kaliti sozlanmagan (GEMINI_API_KEY)"*.

Bu tekshiruv bejiz emas. Kalitsiz `@google/genai` buni xato deb hisoblamaydi —
Google Cloud'ning standart credential'larini qidirib, `169.254.169.254` (GCP ichki
metadata manzili) ga so'rov yuboradi va oxirida `Could not load the default
credentials` deydi. Bu xatoda `status` ham, `code` ham bo'sh bo'ladi, shuning uchun
foydalanuvchi eng umumiy "xatolik bo'ldi" matnini ko'radi va asl sabab —
qo'yilmagan env var — loglarda ko'milib qoladi.

## Kalit nomlari

Har bir provayder avval o'z nomini qidiradi, topmasa umumiy `AI_API_KEY` ga qaraydi:

```
GEMINI_API_KEY → yo'q bo'lsa → AI_API_KEY
ANTHROPIC_API_KEY → yo'q bo'lsa → AI_API_KEY
OPENAI_API_KEY → yo'q bo'lsa → AI_API_KEY
```

Ya'ni bitta provayder ishlatsangiz `AI_API_KEY` yetarli, bir nechtasini yonma-yon
saqlamoqchi bo'lsangiz alohida nomlarni ishlating.

## Tezlik va chegaralar

| Nima | Qiymat | Nega |
|---|---|---|
| "Yozmoqda..." yangilanishi | 4 s | Telegram bu holatni ~5 soniyada o'chiradi |
| Ichki vaqt chegarasi | 45 s | Vercel 60 s da funksiyani **jimgina** o'ldiradi |
| Gemini fikrlash darajasi | `low` | Standart `medium`da oddiy savolga 414 token fikrlash ketgan |

45 soniyalik chegara muhim: Vercel limitiga urilsa funksiya xabarsiz to'xtaydi,
Telegram esa allaqachon `200` olgani uchun qayta urinmaydi — foydalanuvchiga hech
narsa kelmaydi va **logda ham xato qolmaydi**. Chegara shu holatning oldini oladi.

> **Gemini bepul limiti — kuniga 20 so'rov** (`gemini-3.8-flash`). Tugaganda API
> 429 qaytaradi va bot "kunlik limit tugagan" deb javob beradi. Bu kod xatosi emas.

## Model parametrlari har xil

`lib/claude.js` da model nomini almashtirish yetarli emas — Claude oilasidagi
modellar turli parametrlarni qabul qiladi:

| Model | Fikrlash | `output_config.effort` |
|---|---|---|
| `claude-haiku-4-5` | `budget_tokens` bilan yoqiladi; hozir o'chirilgan | **Xato beradi** |
| `claude-opus-5` | `{ type: 'adaptive' }` | Ishlaydi (`low`…`max`) |

Haiku'ga Opus parametrlarini yuborsangiz API xato qaytaradi va bot javob bermay
qoladi. Modelni almashtirganda `ask()` ichidagi parametrlarni ham tekshiring.

## Suhbat xotirasi

Bot oxirgi **10 juftlik** (savol + javob) ni eslab qoladi va har so'rovda AI'ga
qo'shib yuboradi. Shuning uchun "qaysi sohada ishlaysiz?" degan savoldan keyin
kelgan "qurilish" javobini tushunadi.

| Sozlama | Qiymat |
|---|---|
| Eslab qolinadigan juftliklar | 10 (ya'ni 20 xabar) |
| Xotira muddati | 30 daqiqa jimlikdan keyin tozalanadi |
| Bitta xabardan saqlanadigan qism | 2000 belgi |
| Tozalash | `/start` yoki `/tozala` |
| O'chirish | `XOTIRA=off` |

Xotira har chat uchun alohida: `chat_id` kalit bo'lib xizmat qiladi.

### Ikki saqlash usuli

**Funksiya xotirasi** (standart, hech narsa sozlash kerak emas) — tarix funksiya
nusxasining o'z xotirasida turadi. Sinov uchun yetarli, lekin **ishonchsiz**:
Vercel funksiya nusxasini istalgan payt o'chiradi va yangi nusxa bo'sh boshlaydi.
Suhbat o'rtasida bot oldingi gaplarni unutib qo'yishi mumkin.

**Redis** (tavsiya etiladi) — [Upstash](https://upstash.com) yoki Vercel KV.
Ikkita env var qo'ysangiz kod o'zi shunga o'tadi:

```
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

Vercel Marketplace → Upstash Redis qo'shsangiz bu ikki nom **avtomatik**
qo'shiladi. SDK kerak emas — kod Upstash'ning REST API'siga oddiy `fetch` bilan
boradi. Qaysi usul ishlayotgani Vercel logida ko'rinadi:
`suhbat xotirasi: redis`.

Xotira ishlamay qolsa bot to'xtamaydi: xato logga yoziladi, suhbat esa xotirasiz
davom etadi.

### Narxga ta'siri

Har juftlik keyingi so'rovlarga qo'shimcha token bo'lib qo'shiladi. To'la 10
juftlik bilan bitta so'rov taxminan **1500–2000 token** ko'proq yeydi — o'zbekcha
matn ingliz tilidagidan ~1.8 barobar ko'p token olishini unutmang. Xotira uzunligi
`lib/xotira.js` dagi `MAX_JUFTLIK` bilan boshqariladi.

## Botning xarakteri

Bot nima deyishi va nima demasligi [`xarakter.md`](xarakter.md) da yozilgan —
kodda emas. Uslubni o'zgartirish uchun shu faylni tahrirlab push qiling.

Fayl har so'rovda system prompt sifatida uzatiladi, uchala provayder ham
shundan o'qiydi (`lib/xarakter.js`). Ilgari har bir provayder faylida alohida
nusxasi bor edi — birini tahrirlab ikkinchisini unutish oson edi.

`vercel.json` dagi `includeFiles` muhim: Vercel funksiyaga faqat kerakli
fayllarni joylaydi, `.md` fayl o'z-o'zidan tushmaydi. Busiz bot lokalda
ishlaydi-yu, deploy'da zaxira promptga o'tib ketadi (logda ogohlantirish chiqadi).

## Bilim bazasi

[`bilim/`](bilim/) papkasidagi barcha `.md` fayllar har so'rovda AI'ga kontekst
sifatida uzatiladi. Bot biznes haqidagi faktlarni **faqat shu yerdan** oladi —
bazada yo'q narsani to'qimaydi, @azimjonAIagents ga yo'naltiradi.

```
bilim/xizmatlar.md     # qanday saytlar yasaladi
bilim/narxlar.md       # Start $200 / V.I.P $500 / Premium $1000
bilim/savol-javob.md   # ta'rifni aniqlash savollari va FAQ
bilim/ish-vaqti.md     # ish vaqti va tayyorlash muddatlari
```

Fayllar bir-biriga Obsidian uslubida havola qiladi: `[[narxlar]]`, `[[ish-vaqti]]`.
Papkani Obsidian'da ochsangiz bog'langan holda ko'rinadi.

Yangi fayl qo'shsangiz kodga tegish shart emas — `lib/bilim.js` papkadagi hamma
`.md` faylni o'zi topadi.

**Diqqat:** `bilim/` ichidagi ma'lumot bot uchun haqiqat hisoblanadi. Noto'g'ri
yozilgan narx yoki muddat — mijozga aytilgan noto'g'ri va'da. Fayllarda
`<!-- NAMUNA — to'ldiring -->` belgisi bor joylar hali to'ldirilmagan.
