# myAIagent — Telegram bot

Webhook orqali ishlaydigan Telegram bot. Vercel'da serverless funksiya sifatida turadi.

**Joriy bosqich: 2 — AI javoblar.** Kelgan matn AI'ga yuboriladi.
`/start` va `/help` AI'siz, lokal javob beradi.

## Ikkita AI, bitta tugma

Bot **Gemini** va **Claude** bilan ishlay oladi. Qaysi biri ishlashini `AI_PROVIDER`
env var belgilaydi — kodni o'zgartirish shart emas:

| `AI_PROVIDER` | Model | Izoh |
|---|---|---|
| `gemini` (standart) | `gemini-3.8-flash` | Bepul limiti bor |
| `claude` | `claude-opus-5` | Adaptiv fikrlash, `effort: low` |

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
| Kutubxonalar | `@google/genai`, `@anthropic-ai/sdk`, `@vercel/functions` |

## Fayllar

```
api/bot.js      # webhook handler — yagona kirish nuqtasi
lib/ai.js       # qaysi AI ishlashini tanlaydi + javobni bo'laklarga bo'lish
lib/gemini.js   # Gemini chaqiruvi
lib/claude.js   # Claude chaqiruvi
vercel.json     # funksiya uchun maxDuration: 60
```

`lib/gemini.js` va `lib/claude.js` bir xil interfeysga ega: `ask(matn)` va
`errorMessage(xato)`. Yangi provayder qo'shish uchun shu ikki funksiyani yozib,
`lib/ai.js` dagi `PROVIDERS` ro'yxatiga qo'shish yetarli.

Vercel `api/` papkasidagi fayllarni avtomatik funksiyaga aylantiradi —
shuning uchun handler ildizda emas, `api/` ichida turadi.

## 1. Lokal sozlash

`.env.example`dan nusxa olib `.env` yarating va kalitlarni qo'ying:

```
TELEGRAM_BOT_TOKEN=123456789:AA...
AI_PROVIDER=gemini
GEMINI_API_KEY=AQ...
ANTHROPIC_API_KEY=sk-ant-...
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
   `GEMINI_API_KEY` (va kerak bo'lsa `ANTHROPIC_API_KEY`) qo'shing → **Redeploy**.
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
- `/start`, `/help` — tayyor javoblar, AI chaqirilmaydi
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
| Ishlayotgan AI | Gemini (`AI_PROVIDER=gemini`) |

Claude'da hozir kredit yo'q — kredit qo'shilgach `AI_PROVIDER=claude` qilib almashtirasiz.

`main`ga push qilinsa Vercel avtomatik deploy qiladi.

> **Eslatma:** commit muallifining email'i GitHub akkauntingizga bogʻlangan boʻlishi shart
> (`xayrullayevazimjon8@gmail.com`). Boshqa email bilan qilingan commit'da Vercel deploy'ni
> `COMMIT_AUTHOR_REQUIRED` sababi bilan bloklaydi.
