# myAIagent — Telegram bot

Webhook orqali ishlaydigan Telegram bot. Vercel'da serverless funksiya sifatida turadi.

**Joriy bosqich: 13 — post konveyeri.** `/post` natijasi egasiga
**Chiqar / Qayta yoz / Bekor** tugmalari bilan keladi. "Chiqar" postni kanalga
chiqaradi, "Qayta yoz" egasining izohi bilan yozuvchini qayta ishlatadi.
Batafsil — quyidagi "Post konveyeri" bo'limida.

**12-bosqich — kover rasm.** `/post` rasm bilan chiqadi: rasm API
ishlasa undan, ishlamasa shablon koverdan.

**11-bosqich — ikki agent.** `/post` da yozuvchi post yozadi, muharrir
uni tekshiradi va kerak bo'lsa qaytaradi.

**10-bosqich — birinchi vosita.** Botda `qidiruv` vositasi bor: bilim
bazasidan va internetdan ma'lumot topadi, ishlatish-ishlatmaslikni model o'zi hal
qiladi. `/start`, `/tozala`, `/help` AI'siz javob beradi, `/post` esa vositani
sinash uchun.

## Uchta AI, bitta tugma

Bot **Gemini**, **Claude** va **OpenAI** bilan ishlay oladi. Qaysi biri ishlashini
`AI_PROVIDER` env var belgilaydi — kodni o'zgartirish shart emas:

| `AI_PROVIDER` | Model | Izoh |
|---|---|---|
| `gemini` (joriy) | `gemini-3.8-flash` | Bepul tarifda limit juda past |
| `claude` | `claude-opus-5-5` | Fikrlash doim yoqiq, effort `low` |
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
lib/vositalar.js       # vosita e'loni va bajarilishi
lib/qidiruv-bilim.js   # bilim/ papkasidan qidirish
lib/qidiruv-internet.js # Tavily orqali internet qidiruv
lib/kover.js           # kover vositasi: API, yiqilsa shablon
lib/kover-api.js       # rasm generatsiyasi (Gemini rasm modeli)
lib/kover-shablon.js   # PNG yasovchi — tashqi kutubxonasiz
lib/post.js     # /post oqimi: qidiruv, agentlar, natija
lib/konveyer.js # tugmalar: Chiqar / Qayta yoz / Bekor
lib/qoralama.js # qoralamalar holati — Redis yoki funksiya xotirasi
lib/redis.js    # Upstash REST — xotira va qoralama uchun umumiy
lib/telegram.js # Telegram Bot API chaqiruvlari
lib/jurnal.js   # agentlar jurnali — ofis sahifasi uchun
api/jurnal.js   # /jurnal.md
ofis.html       # pikselli agentlar ofisi — /ofis
test/           # sinovlar — npm test
agentlar/       # agentlar — har birining xarakteri va funksiyalari
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
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/bot&allowed_updates=%5B%22message%22,%22edited_message%22,%22callback_query%22%5D"
```

Secret ishlatsangiz:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -H "Content-Type: application/json" -d '{"url":"https://<domain>/api/bot","secret_token":"<SECRET>","allowed_updates":["message","edited_message","callback_query"]}'
```

`allowed_updates` da `callback_query` bo'lishi shart — busiz post konveyerining
tugmalari (Chiqar / Qayta yoz / Bekor) bosilganda Telegram botga hech narsa
yubormaydi va tugmalar "ishlamaydi".

Token'siz yo'l — bot o'zi qo'yadi va holatini ko'rsatadi:

```
https://myaiagent-bot.vercel.app/api/bot?webhook=tuzat
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
- `/post [mavzu]` — faqat kanal egasi (`EGA_ID`) uchun: material qidiradi,
  post yozadi va tugmalar bilan egasiga yuboradi (quyida "Post konveyeri")
- Boshqa matn → AI javob beradi, uzun javob bo'laklarga bo'linadi (limit 4096 belgi)
- Rasm, stiker va boshqalar → "Hozircha faqat matnli xabarlarni tushunaman."
- Handler **har doim `200`** qaytaradi: xato bo'lsa ham. Aks holda Telegram
  o'sha xabarni qayta-qayta yuboraveradi.

## Post konveyeri

```
/post mavzu → qidiruv → yozuvchi → muharrir → kover
           → egasiga: post + [✅ Chiqar] [✏️ Qayta yoz] [🎨 Yangi rasm] [❌ Bekor]
```

| Tugma | Nima bo'ladi |
|---|---|
| ✅ Chiqar | Tugmalar olinadi, post `KANAL_ID` ga nusxalanadi (`copyMessage`) — egasi ko'rgan narsaning aynan o'zi chiqadi |
| ✏️ Qayta yoz | Bot izoh so'raydi. Egasining keyingi xabari izoh bo'ladi: yozuvchi shuni bajaradi, muharrir bir marta tekshiradi (fikrini aytadi, qaytarmaydi), yangi variant yana tugmalar bilan keladi. Izohda "rasm", "kover", "surat" yoki "muqova" bo'lsa kover ham izoh bilan qayta chiziladi, aks holda o'sha qoladi |
| 🎨 Yangi rasm | Matn o'sha, kover qayta chiziladi. Rasm API ishlamasa bot aytadi — shablon kover har safar bir xil chiqadi |
| ❌ Bekor | Qoralama o'chiriladi |

- `/post` va tugmalar faqat `EGA_ID` ga ishlaydi. `EGA_ID` qo'yilmagan bo'lsa
  `/post` o'chiq turadi va yozgan odamga uning ID sini aytadi.
- Izoh kutilayotganda istalgan buyruq (`/help` va h.k.) kutishni bekor qiladi.
- Har qoralama bir marta yakunlanadi: tugma ikki marta bosilsa ham post kanalga
  ikki marta chiqmaydi.
- Kanalga chiqmasa (bot admin emas, `KANAL_ID` noto'g'ri) sababi egasiga
  yoziladi va tugmalar qaytadi.
- Qoralama 24 soat saqlanadi (Redis). Redis yo'q yoki qoralama yo'qolgan bo'lsa
  ham tugmalar ishlaydi — post Telegram xabarining o'zidan olinadi, faqat
  "Qayta yoz" qidiruv materialisiz ishlaydi.

**Sozlash:**
1. Botni kanalga admin qiling ("xabar yuborish" huquqi bilan).
2. Vercel'ga `KANAL_ID` (`@kanal_nomi` yoki `-100...`) va `EGA_ID` (Telegram
   ID'ingiz — botga `/post` yozsangiz o'zi aytadi) qo'shing → Redeploy.
3. Redis ulang (quyida).

## Agentlar ofisi

`https://myaiagent-bot.vercel.app/ofis` — pikselli 2D ofis: olti xona (qabulxona,
kutubxona, majlis xonasi, tahririyat, studiya, dam olish), besh agent. Har agent
holatiga qarab yurib boradi:

| Holat | Qayerda |
|---|---|
| kutmoqda | Majlis xonasida navbat kutadi |
| ishlayapti | O'z stolida — monitori yonadi, pufakchada nima qilayotgani |
| tugatdi | Stolida ✓ bilan turadi, 45 soniyadan keyin dam olish xonasiga ketadi |

| Agent | Joyi | Nima qiladi |
|---|---|---|
| Jarvis | Qabulxona | Chatda mijozga javob beradi |
| Qidiruvchi | Kutubxona | `/post` uchun material qidiradi |
| Yozuvchi | Tahririyat | Post yozadi |
| Muharrir | Tahririyat | Postni tekshiradi |
| Rassom | Studiya | Kover chizadi |

Agentni bossangiz — kartochka (to'liq harakat, qachon). 📋 — jurnal paneli,
pastda — hamma agentning holati. `?demo=1` — soxta jurnal bilan namoyish.

- `ofis.html` — bitta fayl, kutubxonasiz; hamma narsa canvas'da chiziladi
- `lib/jurnal.js` — agentlar har qadamni yozadi (Redis ro'yxati, oxirgi 200 qator)
- `api/jurnal.js` — jurnalni markdown qilib beradi (`/jurnal.md`), sahifa uni har 3 soniyada o'qiydi

Jurnal qatori: `- <vaqt> | <agent> | <holat> | <harakat>`, eng yangisi birinchi.
Mijozning savoli, egasining izohi va postning to'liq matni jurnalga tushmaydi — sahifa ochiq.

## Redis ulash

Suhbat xotirasi ham, post qoralamalari ham Redis'da turadi. Ulanmasa funksiya
xotirasida — Vercel nusxani almashtirsa yo'qoladi.

Vercel → Project → **Storage** → **Create Database** → **Upstash for Redis**
(Marketplace, bepul tarif yetadi) → loyihaga ulang. Vercel `KV_REST_API_URL` va
`KV_REST_API_TOKEN` ni o'zi qo'shadi → **Redeploy**. Kod o'zgartirish kerak emas.

Tekshirish: Vercel Logs'da birinchi xabardan keyin `suhbat xotirasi: redis`.

## Sinovlar

```bash
npm install
npm test
```

Telegram va AI soxtalashtiriladi — kalit ham, tarmoq ham kerak emas.

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
| Ishlayotgan AI | Claude Opus 5.5 (`AI_PROVIDER=claude`) |
| Post kanali | `KANAL_ID=-1004466207258`, egasi `EGA_ID` |
| Redis | Upstash — suhbat xotirasi va post qoralamalari |

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
| `claude-opus-5-5` (joriy) | Doim yoqiq — `disabled` va `budget_tokens` **xato beradi** | Ishlaydi, standart `medium`; botda `low` |

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

## Qidiruv vositasi

Bot AI'ga bitta vosita e'lon qiladi — **qidiruv**. E'londa nima qilishi va qachon
ishlatilishi yozilgan, qaror modelniki: kod uni chaqirishga majburlamaydi.

```
qidiruv(sorov, manba?)
  manba: bilim | internet | hammasi   (standart: hammasi)
```

**Manba 1 — `bilim/` papkasi.** Fayllar `##` sarlavhalari bo'yicha bo'laklarga
bo'linadi, so'rov so'zlariga ball beriladi, eng mos 3 bo'lak qaytariladi.
O'zbekcha qo'shimchalar so'z o'zagi bo'yicha solishtiriladi ("narx" → "narxlar",
"narxi"), apostrofning uch shakli (`'`, `ʻ`, `‘`) tenglashtiriladi. Uzun bo'laklar
ballari kamaytiriladi — aks holda eng uzun bo'lak deyarli har so'rovda birinchi
chiqadi.

**Manba 2 — internet ([Tavily](https://tavily.com)).** `TAVILY_API_KEY` qo'yilmasa
bu manba **butunlay o'chadi** va vosita faqat bilim bazasi bilan ishlaydi. Qidiruv
xato bersa ham bot to'xtamaydi — natijada shunday deb yoziladi.

**Halqa:** model vosita chaqiradi → kod bajaradi → natija qaytariladi → model
javob yozadi. Bitta javobda ko'pi bilan **3 marta**; oxirgi so'rovda vositalar
umuman berilmaydi, ya'ni halqaning tugashi model xulqiga emas, kodga bog'liq.

Uchala provayder ham vositani qo'llab-quvvatlaydi, formatlari boshqa:

| Provayder | E'lon | Chaqiruv | Natija |
|---|---|---|---|
| Claude | `tools[].input_schema` | `tool_use` bloki | `tool_result` xabari |
| Gemini | `tools[].parameters` | `function_call` qadami | `function_result` qadami |
| OpenAI | `tools[].parameters` | `function_call` elementi | `function_call_output` |

**O'chirish:** `VOSITA=off` → vositalar umuman e'lon qilinmaydi. Biror model
e'lon formatini qabul qilmay qolsa, kodni qaytarmasdan shu bilan qutulasiz.

## Kover vositasi

Ikkinchi vosita — `kover`. Post uchun rasm yasaydi.

```
kover(mavzu, tavsif?, sarlavha?)
```

**Asosiy yo'l — rasm modeli.** `gemini-3.1-flash-image` (o'zgartirish: `RASM_MODEL`),
kalit `RASM_API_KEY` yoki o'sha `GEMINI_API_KEY`. Vaqt chegarasi 15 s.

Promptda "matnsiz rasm" deb yoziladi: rasm modellari harflarni buzib chizadi,
o'zbekchani ayniqsa. Sarlavha rasmda emas, post matnida qoladi.

**Zaxira yo'l — shablon kover.** Kalit yo'q, limit tugagan, API yiqilgan yoki
kechikkan — farqi yo'q, hammasi shu yo'lga olib keladi va **hech qachon xato
tashlamaydi**.

Vercel funksiyasida rasm chizadigan hech narsa yo'q (`canvas`, `sharp` — native
kutubxonalar), shuning uchun PNG `lib/kover-shablon.js` da qo'lda yig'iladi:
`node:zlib` ustida IHDR/IDAT/IEND va CRC32, matn uchun ichki 5×7 nuqtali shrift.
Natija: 1280×720, fon rangi mavzudan hisoblanadi (bir xil mavzu — bir xil rang),
sarlavha va pastda "Prestigious".

**Rasm modelga emas, foydalanuvchiga boradi.** Qidiruv natijasi matn edi —
modelga bemalol beriladi. Rasmni esa berib bo'lmaydi, shuning uchun u *ilovalar*
ro'yxatiga tushadi va javob bilan birga Telegramga yuboriladi. Modelga faqat
qisqa xabar boradi: "Kover tayyor (usul: api)".

Post 1024 belgidan qisqa bo'lsa rasm izohi sifatida ketadi — bitta xabar bo'ladi.
Rasm yuborilmay qolsa matn baribir yetib boradi.

**O'chirish:** `KOVER=off`.

### `/post [mavzu]`

Qidiruv va ikkala agent birga ishlaydigan buyruq. Telegram'ga uchta xabar boradi:

1. **Topilgan material** — qaysi bo'lak, qaysi havola
2. **Muharrir tekshiruvi** — har rauddagi hukm va sabab, kover qaysi yo'l bilan yasalgani
3. **Kover rasm va post** — post qisqa bo'lsa rasm izohida

Kover agentlar byudjetidan tashqarida, o'z chegarasi bilan: rasm kechiksa ham
post yetib boradi.

## Agentlar

Jarvis mijoz bilan gaplashadi, agentlar ichki ish bajaradi. Har bir agentning
**hammasi bitta joyda** — `agentlar/` papkasida:

```
agentlar/
  agent.js       # umumiy qism: xarakter faylini o'qish va ishga tushirish
  yozuvchi.md    # yozuvchining xarakteri — ohang, uzunlik, tuzilishi
  yozuvchi.js    # yozuvchining funksiyalari — yoz(), qaytaYoz()
  muharrir.md    # muharrirning xarakteri va tekshirish mezonlari
  muharrir.js    # muharrirning funksiyalari — tekshir(), hukmniOqi()
```

Ohangni yoki mezonlarni o'zgartirish uchun `.md` faylni tahrirlab push qiling —
kodga tegish shart emas, xuddi `xarakter.md` kabi.

`lib/post.js` faqat oqimni boshqaradi: qachon kim chaqirilishini biladi, lekin
agentlar ichida nima borligini bilmaydi.

### Yangi agent qo'shish

Ikki fayl yetarli:

1. `agentlar/<nom>.md` — agentning xarakteri. `lib/agent.js` uni o'zi topadi.
2. `agentlar/<nom>.js` — funksiyalari. Ichida `ishlat('<nom>', topshiriq)`
   chaqiriladi, javob qaytariladi.

Keyin `lib/post.js` (yoki boshqa oqim fayli) o'sha funksiyani chaqiradi.
Fayl topilmasa bot to'xtamaydi — zaxira promptga o'tadi va logga ogohlantirish
yozadi.

**Oqim:** yozuvchi qoralama yozadi → muharrir tekshiradi → "qayta yoz" bo'lsa
yozuvchi sababni hisobga olib tuzatadi. Ko'pi bilan **2 marta** qaytariladi,
keyin natija baribir ko'rsatiladi: cheksiz tuzatishdan ko'ra, egasi qaror
qilgani yaxshi.

**Muharrir hukmi** javobning birinchi qatorida: `O'TDI` yoki `QAYTA YOZ`, keyin
sabab. Kod uni bag'rikenglik bilan o'qiydi (katta-kichik harf, apostrofning uch
shakli, "Hukm: ..." ko'rinishi). Hukm umuman tanilmasa post o'tgan hisoblanadi
va xabarda shu belgilanadi — muharrirning noaniq javobi tayyor postni
bloklamasligi kerak.

**Agentlar vositasiz ishlaydi:** yozuvchiga material allaqachon berilgan,
muharrirga tekshiriladigan matn berilgan — qidiruv ikkalasiga ham kerak emas.

**Vaqt byudjeti — 35 soniya.** Eng yomon holatda `/post` 6 ta AI chaqiruvi
qiladi (qidiruv + 3 qoralama + 2 tekshiruv). Vercel esa 60 soniyada funksiyani
jimgina o'ldiradi, shuning uchun byudjet tugasa halqa to'xtaydi va bor qoralama
ko'rsatiladi.

`vercel.json` dagi `includeFiles` ga `agentlar/**` qo'shilgan — busiz agent
fayllari deploy'ga tushmaydi va bot zaxira promptga o'tib ketadi.

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
