# myAIagent — Telegram bot

Webhook orqali ishlaydigan Telegram bot. Vercel'da serverless funksiya sifatida turadi.

**Joriy bosqich: 2 — AI javoblar.** Kelgan matn Claude API'ga yuboriladi.
`/start` va `/help` AI'siz, lokal javob beradi.

**Model:** `claude-opus-5`, adaptiv fikrlash, `effort: low` (chat uchun tez javob —
chuqurroq tahlil kerak bo'lsa [`lib/claude.js`](lib/claude.js) ichida `high` qiling).

**Oqim:** Telegram webhook'dan 60 soniyada javob kutadi va kutmasa xabarni qayta
yuboradi. Shuning uchun bot darhol `200 OK` qaytaradi, Claude chaqiruvi esa
`waitUntil` bilan fonda bajariladi. Foydalanuvchi shu payt "yozmoqda..." holatini ko'radi.

| | |
|---|---|
| Bot | [@myAIagent_25_bot](https://t.me/myAIagent_25_bot) |
| Kirish nuqtasi | `api/bot.js` |
| Webhook manzili | `https://<domain>/api/bot` |
| Kutubxonalar | `@anthropic-ai/sdk`, `@vercel/functions` |

## Fayllar

```
api/bot.js      # webhook handler — yagona kirish nuqtasi
lib/claude.js   # Claude chaqiruvi, javobni bo'laklarga bo'lish (Telegram limiti 4096)
vercel.json     # funksiya uchun maxDuration: 60
package.json    # ESM, Node >= 20
.env.example    # kerakli kalitlar ro'yxati
```

Vercel `api/` papkasidagi fayllarni avtomatik funksiyaga aylantiradi —
shuning uchun fayl ildizda emas, `api/` ichida turadi.

## 1. Lokal sozlash

`.env.example`dan nusxa olib `.env` yarating va kalitlarni qo'ying:

```
TELEGRAM_BOT_TOKEN=123456789:AA...
ANTHROPIC_API_KEY=sk-ant-...
```

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
2. **Settings → Environment Variables**: `TELEGRAM_BOT_TOKEN` va `ANTHROPIC_API_KEY`
   qo'shing → **Redeploy**.
3. Tekshirish: brauzerda `https://<domain>/api/bot` oching → `Bot ishlayapti.`

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
- Boshqa matn → Claude javob beradi, uzun javob bo'laklarga bo'linadi
- Rasm, stiker va boshqalar → "Hozircha faqat matnli xabarlarni tushunaman."
- Handler **har doim `200`** qaytaradi: xato bo'lsa ham. Aks holda Telegram
  o'sha xabarni qayta-qayta yuboraveradi.

## Xato matnlari

`lib/claude.js` dagi `errorMessage()` API xatosini foydalanuvchi tushunadigan matnga
aylantiradi: noto'g'ri kalit, **tugagan kredit balansi**, ko'p so'rov (rate limit).
Texnik tafsilot foydalanuvchiga emas, Vercel logiga yoziladi.

---

## Joriy holat

| | |
|---|---|
| Bot | [@myAIagent_25_bot](https://t.me/myAIagent_25_bot) |
| Repo | `xayrullayevazimjon8-design/myaiagent-bot` (public) |
| Vercel project | `myaiagent-bot` (team `azimjon4`) |
| Production | https://myaiagent-bot.vercel.app |
| Webhook | `https://myaiagent-bot.vercel.app/api/bot` |

`main`ga push qilinsa Vercel avtomatik deploy qiladi.
Vercel env var'lari: `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY` (Production + Preview).

> **Eslatma:** commit muallifining email'i GitHub akkauntingizga bogʻlangan boʻlishi shart
> (`xayrullayevazimjon8@gmail.com`). Boshqa email bilan qilingan commit'da Vercel deploy'ni
> `COMMIT_AUTHOR_REQUIRED` sababi bilan bloklaydi.
