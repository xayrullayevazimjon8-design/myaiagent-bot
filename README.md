# myAIagent — Telegram bot

Webhook orqali ishlaydigan Telegram bot. Vercel'da serverless funksiya sifatida turadi.

**Joriy bosqich: 1 — echo.** AI hali ulanmagan: bot kelgan matnni qaytaradi.
Javob matni [`api/bot.js`](api/bot.js) ichidagi `buildReply()` funksiyasida — keyingi
bosqichda AI aynan shu joyga ulanadi.

| | |
|---|---|
| Bot | [@myAIagent_25_bot](https://t.me/myAIagent_25_bot) |
| Kirish nuqtasi | `api/bot.js` |
| Webhook manzili | `https://<domain>/api/bot` |
| Kutubxonalar | yo'q — Node'ning o'z `fetch`i yetarli |

## Fayllar

```
api/bot.js      # webhook handler — yagona kirish nuqtasi
package.json    # dependency yo'q, ESM, Node >= 20
.env.example    # kerakli kalitlar ro'yxati
```

Vercel `api/` papkasidagi fayllarni avtomatik funksiyaga aylantiradi —
shuning uchun fayl ildizda emas, `api/` ichida turadi.

## 1. Lokal sozlash

`.env.example`dan nusxa olib `.env` yarating va tokenni qo'ying:

```
TELEGRAM_BOT_TOKEN=123456789:AA...
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
2. **Settings → Environment Variables**: `TELEGRAM_BOT_TOKEN` qo'shing
   (va agar ishlatsangiz `TELEGRAM_WEBHOOK_SECRET`) → **Redeploy**.
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
- `POST /api/bot` → Telegram update'i; matn bo'lsa javob yuboriladi
- `/start`, `/help` — tayyor javoblar
- Rasm, stiker va boshqalar → "Hozircha faqat matnli xabarlarni tushunaman."
- Handler **har doim `200`** qaytaradi: xato bo'lsa ham. Aks holda Telegram
  o'sha xabarni qayta-qayta yuboraveradi.
