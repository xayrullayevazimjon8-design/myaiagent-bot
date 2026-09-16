# myAIagent — loyiha yilnomasi

Telegram bot: webhook orqali kelgan xabarni AI'ga yuboradi va javobni qaytaradi.
Vercel'da serverless funksiya sifatida ishlaydi.

Botning nomi **Jarvis** — Prestigious (sayt yaratish) biznesining assistenti.
Mijozdan sohasini so'rab, bir necha savol berib, mos ta'rifni taklif qiladi.
Biznes haqidagi faktlarni faqat `bilim/` papkasidan oladi.

**Sana:** 2026-09-15
**Bot:** [@myAIagent_25_bot](https://t.me/myAIagent_25_bot)
**Repo:** `xayrullayevazimjon8-design/myaiagent-bot` (public)
**Production:** https://myaiagent-bot.vercel.app/api/bot

---

## 1. Hozirgi holat

| | |
|---|---|
| Ishlayotgan model | `gemini-3.8-flash` |
| System prompt hajmi | ~15 000 belgi (~5700 token) + vosita e'loni |
| Javob tezligi | 4–6 s (o'rtacha 4.8 s) |
| Kirish nuqtasi | `api/bot.js` |
| Deploy | `main` ga push → Vercel avtomatik |
| Xato darajasi | 0% |
| Xarakter | `xarakter.md` — Jarvis |
| Bilim bazasi | `bilim/` — 4 fayl, ~5000 belgi |
| Provayderlar | Gemini (joriy), Claude, OpenAI — `AI_PROVIDER` bilan almashtiriladi |
| Suhbat xotirasi | Oxirgi 10 juftlik, 30 daqiqa — `lib/xotira.js` |
| Vositalar | `qidiruv` — bilim bazasi + internet (Tavily) |

### Fayl tuzilishi

```
api/bot.js      # webhook handler — yagona kirish nuqtasi
xarakter.md     # botning shaxsi (Jarvis)
bilim/          # bilim bazasi — 4 ta .md fayl
lib/xarakter.js # xarakter + bilim bazasini jamlaydi
lib/bilim.js    # bilim/ papkasini o'qiydi
lib/xotira.js   # suhbat tarixi — Redis yoki funksiya xotirasi
lib/vositalar.js        # vosita e'loni va bajarilishi
lib/qidiruv-bilim.js    # bilim/ dan qidirish
lib/qidiruv-internet.js # Tavily orqali internet qidiruv
lib/post.js     # /post uchun material va so'rov matni
lib/ai.js       # qaysi AI ishlashini tanlaydi, vaqt chegarasi, xabarni bo'laklash
lib/claude.js   # Claude chaqiruvi
lib/gemini.js   # Gemini chaqiruvi
lib/openai.js   # OpenAI chaqiruvi
lib/config.js   # kalitlarni tekshirish
vercel.json     # maxDuration: 60
```

Provayder fayllari bir xil interfeysga ega: `ask(matn, tarix)` va `errorMessage(xato)`.
Yangi provayder qo'shish uchun shu ikki funksiyani yozib, `lib/ai.js` dagi
`PROVIDERS` ro'yxatiga qo'shish yetarli.

### Env o'zgaruvchilar

| Nom | Vazifasi |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather bergan token |
| `AI_PROVIDER` | `claude` (standart), `gemini` yoki `openai` |
| `ANTHROPIC_API_KEY` | Claude kaliti |
| `GEMINI_API_KEY` | Gemini kaliti |
| `OPENAI_API_KEY` | OpenAI kaliti (hali qo'shilmagan) |
| `AI_API_KEY` | Umumiy zaxira nom — provayderning o'z nomi topilmasa shunga qaraladi |
| `KV_REST_API_URL` | Upstash/Vercel KV manzili — suhbat xotirasi uchun (ixtiyoriy) |
| `KV_REST_API_TOKEN` | O'sha Redis'ning tokeni |
| `XOTIRA` | `off` bo'lsa suhbat xotirasi ishlamaydi |
| `TAVILY_API_KEY` | Internet qidiruv kaliti — yo'q bo'lsa vosita faqat bilim bazasidan qidiradi |
| `VOSITA` | `off` bo'lsa vositalar umuman e'lon qilinmaydi |
| `TELEGRAM_WEBHOOK_SECRET` | Ixtiyoriy himoya |

---

## 2. Bosqichlar

### 1-bosqich — echo bot

Eski `myagent` loyihasi va uning git tarixi butunlay o'chirildi, hammasi noldan
qurildi. Bot kelgan matnni qaytaradigan holatda yozildi, dependency ishlatilmadi —
Node 20+ ning o'z `fetch`i yetarli bo'ldi. Yangi public repo yaratildi, Vercel'ga
deploy qilindi, webhook ulandi va jonli tekshirildi.

### 2-bosqich — AI javoblar

Claude API ulandi. Telegram webhook'dan 60 soniyada javob kutgani va kutmasa
xabarni qayta yuborgani uchun bot darhol `200 OK` qaytaradi, AI chaqiruvi esa
`waitUntil` bilan fonda bajariladi.

### 3-bosqich — uchta provayder

Gemini va OpenAI qo'shildi. `AI_PROVIDER` env var qaysi birini ishlatishni
belgilaydi — kod o'zgartirilmaydi, Vercel'da bitta qiymat almashtiriladi.

### 4-bosqich — ishonchlilik va tezlik

"Yozmoqda..." holati takrorlanadigan qilindi, ichki vaqt chegarasi qo'yildi,
kalitlarni oldindan tekshirish qo'shildi.

### 5-bosqich — Claude, keyin Haiku 4.5

Anthropic hisobiga kredit qo'shilgach bot Claude'ga o'tkazildi (`claude-opus-5`,
2.2 s), keyin arzonroq va tezroq `claude-haiku-4-5` ga tushirildi (1.0–1.6 s).

Haiku'ga o'tish bir qatorlik ish bo'lmadi: u adaptiv fikrlashni ham,
`output_config.effort` ni ham qabul qilmaydi — ikkalasi olib tashlandi.

### 6-bosqich — xarakter

Bot Jarvis nomini oldi: Prestigious (sayt yaratish) biznesining assistenti.
Shaxsi `xarakter.md` da, kodda emas. Chegaralar sinovdan o'tkazildi: aniq narx
aytmaydi, shartnoma masalasida @azimjonAIagents ga yo'naltiradi, shaxsiy maslahat
bermaydi, bilmagan narsani to'qimaydi.

### 7-bosqich — bilim bazasi

`bilim/` papkasi qo'shildi: xizmatlar, narxlar (Start $200 / V.I.P $500 /
Premium $1000), savol-javob, ish vaqti. Fayllar o'zaro Obsidian havolalari bilan
bog'langan. Har so'rovda to'liq baza kontekst sifatida uzatiladi va bot faqat
shunga tayanib javob beradi.

Xarakterdagi "aniq narx aytmaysan" qoidasi bazaga zid bo'lgani uchun qayta
yozildi: endi ta'rif narxlarini aytadi, lekin yangi raqam o'ylab topmaydi va
aniq hisob-kitobda egaga yo'naltiradi. Bot avval mijozning sohasini so'rab,
bir-ikki savol berib, mos ta'rifni taklif qiladi.

### 8-bosqich — Gemini'ga qaytish

Haiku 4.5 ning o'zbekcha grammatikasi qoniqarsiz chiqdi: "Prestigious's Telegram
assistentiman", "kelishaadi", "tushinib" kabi xatolar. Xarakter fayliga til qoidasi
qo'shildi va yaxshilandi, lekin prompt model darajasidagi kamchilikni to'liq yopa
olmaydi.

Google Cloud loyihasiga billing ulangach Gemini'ning limiti ochildi va bot
`gemini-3.8-flash` ga qaytarildi. O'zbekchasi sezilarli yaxshi, tezligi 4.8 s.

### 9-bosqich — suhbat xotirasi

Shu paytgacha bot har xabarni alohida ko'rardi: "qaysi sohada ishlaysiz?" deb
so'rab, kelgan "qurilish" javobini nima haqida ekanini bilmasdi. Ta'rif tanlash
esa aynan ketma-ket savol-javobga qurilgan — xotirasiz asosiy vazifa ishlamas edi.

`lib/xotira.js` qo'shildi: har chat uchun oxirgi 10 juftlik saqlanadi va keyingi
so'rovda AI'ga qo'shib yuboriladi. 30 daqiqa jimlikdan keyin tarix tozalanadi,
`/tozala` va `/start` esa uni darhol o'chiradi.

Saqlash ikki xil bo'lishi mumkin: `KV_REST_API_URL` va `KV_REST_API_TOKEN`
qo'yilgan bo'lsa Redis (Upstash REST, SDK'siz — oddiy `fetch`), bo'lmasa
funksiyaning o'z xotirasi. Ikkinchisi sinov uchun ishlaydi, lekin Vercel funksiya
nusxasini o'chirganda tarix yo'qoladi.

Uchala provayder ham tarixni qabul qiladigan qilindi. Xotira ularning formatiga
bog'liq emas — u `{ role: 'user' | 'bot', text }` ko'rinishida saqlanadi va har
provayder fayli o'zi o'giradi, ya'ni `AI_PROVIDER` ni almashtirsangiz suhbat
tarixi o'sha holicha qolaveradi.

**Suhbat oqimi qayta yozildi.** Xotirasiz bot "qaysi sohada xizmat ko'rsatasiz?"
degan savolni har xabarda qaytarardi. Xotira o'zi yetarli emas — prompt ham
tartibni aniq aytishi kerak edi. `xarakter.md` uch bosqichga bo'lindi: soha
(faqat **bir marta** so'raladi), o'sha sohaga oid 2-3 ta savol, keyin taklif.
Mijoz rozilik bildirsa yoki buyurtma bermoqchi bo'lsa — savol berish to'xtaydi va
@azimjonAIagents ga yo'naltiriladi.

`bilim/savol-javob.md` ga sohalar jadvali qo'shildi: kafe, qurilish, do'kon, o'quv
markaz, klinika, turizm — har biriga tayyor savollar. Bot endi umumiy emas, aynan
o'sha sohaga tegishli savol beradi. System prompt ~8600 dan ~12 100 belgiga o'sdi.

### 10-bosqich — birinchi vosita: qidiruv

Botga vosita (tool) qo'shildi. Muhim jihati: vosita AI'ga **tavsif bilan** e'lon
qilinadi — nima qilishi, qachon kerak, qachon kerak emas. Chaqirish-chaqirmaslikni
model o'zi hal qiladi, kod majburlamaydi.

Ikki manba. Birinchisi — `bilim/` papkasi: fayllar `##` sarlavhalari bo'yicha
bo'laklarga bo'linadi, so'rov so'zlariga ball beriladi. O'zbekcha qo'shimchalar
uchun so'z o'zagi solishtiriladi ("narx" → "narxlar", "narxi"), apostrofning uch
shakli tenglashtiriladi. Ikkinchisi — internet, Tavily orqali: kalit qo'yilmasa
bu manba jimgina o'chadi va vosita faqat baza bilan ishlaydi.

Vosita e'loni neytral JSON Schema shaklida turadi, har provayder o'z formatiga
o'giradi — suhbat tarixidagi yondashuvning o'zi. Uchalasi ham qo'llab-quvvatlaydi.

`/post [mavzu]` — sinov buyrug'i: avval qidiruv ishlaydi va topilgan xom material
ko'rsatiladi, keyin shu material asosida post yoziladi. Post uzunligi xarakter
faylidagi "2-4 qator" qoidasiga zid bo'lgani uchun `xarakter.md` ga alohida
"Post yozish" bo'limi qo'shildi — ziddiyat qolmasin.

`VOSITA=off` — vositalarni kodni qaytarmasdan o'chirish yo'li.

**Bot endi umumiy savollarga ham javob beradi** (egasining qarori): valyuta kursi,
ob-havo, yangilik. Javob o'zgarib turadigan bo'lsa xotiradagi raqamni aytmaydi,
qidiradi. Ikki istisno saqlanib qoldi: Prestigious faktlari faqat bilim bazasidan
olinadi (internetdagi narx Prestigious narxi emas) va shaxsiy maslahat berilmaydi —
kursning qanchaligini aytish ma'lumot, pulni qayerga qo'yishni aytish maslahat.

Buning uchun uch joy bir vaqtda o'zgartirildi: `xarakter.md` dagi rad qoidasi,
`lib/xarakter.js` dagi bilim bazasi qoidasi (u "bazada yo'q faktni aytma" deb
hamma savolga taalluqli edi) va vosita tavsifi. Uchtasidan biri eski holida
qolsa, bot yana ziddiyatga tushardi.

---

## 3. O'lchovlar

### Javob tezligi (bir xil savol)

| Model | Vaqt |
|---|---|
| Gemini 3.8 Flash — fikrlash standart (`medium`) | 32.1 s *(production logi)* |
| **Gemini 3.8 Flash — `thinking_level: low`** | **4.8 s** *(joriy)* |
| Claude Opus 5 | 2.2 s |
| Claude Haiku 4.5 | 1.0–1.6 s |

`thinking_level: low` javobni **6-7 barobar** tezlashtirdi. Bu sozlama ancha oldin
qo'shilgan edi, lekin bepul limit tugagani sababli uzoq vaqt o'lchab bo'lmadi.

### O'zbekcha matn tokenlari

| Matn | Belgi | Token | Belgi/token |
|---|---|---|---|
| Javob — o'zbekcha | 190 | 67 | 2.8 |
| Xuddi shu javob — inglizcha | 165 | 36 | 4.6 |

**Bir xil ma'nodagi matn o'zbekchada ~1.8 barobar ko'p token yeydi.**
Tokenizatorlar asosan ingliz tilida o'qitilgani uchun o'zbekcha so'zlar mayda
bo'laklarga parchalanadi. Ingliz tilidagi har qanday token hisobini o'zbekcha
uchun ikkiga ko'paytirib chamalash kerak.

### 10 000 token nima degani

| O'lchov | O'zbekcha | Inglizcha |
|---|---|---|
| Sof matn | ~26 000 belgi | ~46 000 belgi |
| So'z | ~3 700 | ~7 500 |
| A4 sahifa | ~11 | ~20 |

### Narx (1M token uchun)

| Model | Kirish | Chiqish | 1000 muloqot |
|---|---|---|---|
| Gemini 3.8 Flash | $0.75 | $3.75 | ~$1.90 |
| **Claude Haiku 4.5** | **$1.00** | **$5.00** | **~$0.50** |
| Claude Opus 5 | $5.00 | $25.00 | ~$12.80 |
| GPT-6-astra | $10.00 | $50.00 | ~$25.70 |

Haiku'da fikrlash o'chirilgani uchun chiqish tokenlari kam — shuning uchun umumiy
narxi Gemini'nikidan past chiqdi, garchi 1M token narxi yuqoriroq bo'lsa ham.

> **Gemini narxi 2027-yil 1-yanvardan ikki barobar oshadi** ($1.50 / $7.50).

---

## 4. Muhim topilmalar

Bular sinov paytida aniqlangan, oldindan bilinmagan narsalar.

### Fikrlash tokenlari xarajatning asosiy qismi

Gemini'ga oddiy savol berilganda haqiqiy hisob:

| Nima | Token |
|---|---|
| Kirish | 160 |
| **Fikrlash** | **414** |
| Javob | 67 |

Xarajatning 65% foydalanuvchi ko'rmaydigan ichki fikrlashga ketgan. Shuning uchun
Gemini'da `thinking_level: low`, Haiku'da fikrlash butunlay o'chirilgan.

### Gemini bepul limiti juda past

```
Quota exceeded: generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash
```

Sinov paytida limit tugadi va bir necha soatdan keyin ham tiklanmadi.
**Limit 20, lekin oynasi (daqiqami, kunmi) noma'lum** — xato xabarida ko'rsatilmagan,
rasmiy hujjat ham aniq raqam bermaydi, AI Studio paneliga yo'naltiradi.
Xatodagi "retry in Xs" maslahati o'zgaruvchan (7s dan 58s gacha) va ishonchli emas.

Yechim — Google Cloud loyihasiga **billing ulash**: shunda loyiha Tier 1 ga o'tadi
va bu chegara yo'qoladi.

### Kalit yo'q bo'lsa SDK chalg'ituvchi xato beradi

`GEMINI_API_KEY` qo'yilmaganda `@google/genai` buni xato deb hisoblamaydi — Google
Cloud'ning standart credential'larini qidirib, `169.254.169.254` (GCP ichki metadata
manzili) ga so'rov yuboradi va `Could not load the default credentials` deydi.

O'sha xatoda `status` ham, `code` ham bo'sh bo'ladi. Natijada foydalanuvchi eng
umumiy "xatolik bo'ldi" matnini ko'radi, asl sabab esa loglarda ko'milib qoladi.

**Yechim:** `lib/config.js` har chaqiruvdan oldin kalit borligini tekshiradi va
qaysi env var yo'qligini aniq aytadi.

### OpenAI balans xatosi kutilgan kodda emas

Balans tugaganda OpenAI `429` va `credit_balance_exhausted` qaytaradi (odatdagi
`insufficient_quota` emas). Bu aniqlanmaganda foydalanuvchi "so'rovlar ko'p,
birozdan keyin urining" degan noto'g'ri maslahatni ko'rardi — aslida hisobda pul
yo'q edi.

### Vercel 60 soniyada funksiyani jimgina o'ldiradi

Telegram allaqachon `200` olgani uchun xabarni qayta yubormaydi. Natijada
foydalanuvchiga hech narsa kelmaydi **va logda ham xato qolmaydi** — izsiz
nosozlik. Shuning uchun 45 soniyalik ichki chegara qo'yildi.

### Telegram "yozmoqda..." holati 5 soniyada o'chadi

Javob 32 soniya tayyorlanganda foydalanuvchi 5 soniya "yozmoqda..." ko'rib, keyin
27 soniya jimlikka qolardi va bot ishlamayapti deb o'ylardi. Endi har 4 soniyada
yangilanadi.

### Vaqt chegarasi egasiz rad javobi qoldirardi

Chegara ishlaganda AI so'rovi fonda davom etar va uning keyingi rad javobi egasiz
qolardi — Node buni "unhandled rejection" deb jarayonni yiqitishi mumkin edi. Ya'ni
tuzatish o'rniga yangi nosozlik qo'shilgan bo'lardi. Endi u ushlanib logga yoziladi.

### Modellar bir xil parametrlarni qabul qilmaydi

| Parametr | Opus 5 | Haiku 4.5 |
|---|---|---|
| `thinking: { type: 'adaptive' }` | Ishlaydi | Qo'llab-quvvatlanmaydi |
| `output_config: { effort }` | Ishlaydi | **Xato beradi** |

Model nomini almashtirish yetarli emas — `ask()` ichidagi parametrlarni ham
tekshirish kerak.

### Vercel'da Key maydoniga .env tashlash mumkin emas

Vercel Key maydoniga qo'yilgan matnni `.env` fayl deb o'qib, bir nechta qatorga
ajratadi. Mavjud nomlar takrorlansa Save bloklanadi, xato esa dialogning eng
pastida, ko'rinmaydigan joyda chiqadi — tugma sababsiz ishlamayotgandek tuyuladi.
Kalitni **Value** maydoniga qo'yish kerak.

### Haiku 4.5 ning o'zbekchasi zaif

Bir xil promptda Haiku 4.5 shunday xatolar berdi: "Prestigious's Telegram
assistentiman" (ingliz egalik shakli), "kelishaadi", "tushinib". Gemini 3.8 Flash
xuddi shu vazifada toza yozdi.

Xarakter fayliga "to'g'ri o'zbek tilida yoz, ingliz shakllarini aralashtirma" qoidasi
qo'shilgach yaxshilandi, lekin **prompt model darajasidagi til kamchiligini to'liq
yopa olmaydi.** O'zbek tilida ishlaydigan bot uchun model tanlashda til sifati
tezlik va narxdan muhimroq bo'lishi mumkin.

### Billing ulanganda API kalit o'zgarmaydi

Gemini'da limitni ochish uchun Google Cloud loyihasiga billing ulanadi. Kalit
loyihaga tegishli bo'lgani uchun **eskisi ishlayveradi** — yangi kalit olish,
Vercel'dagi qiymatni yangilash shart emas. Sinovda tasdiqlandi.

### Vercel .md fayllarni funksiyaga o'z-o'zidan joylamaydi

`xarakter.md` va `bilim/` papkasi kodda emas, matn fayllarda. Vercel esa funksiyaga
faqat kod bog'liqliklarini joylaydi. `vercel.json` dagi `includeFiles` bo'lmasa bot
lokalda ishlaydi-yu, deploy'da xarakterini ham, bilimini ham yo'qotadi:

```json
"includeFiles": "{xarakter.md,bilim/**}"
```

Ikkalasi ham topilmasa bot to'xtamaydi — zaxira promptga o'tadi va logga
ogohlantirish yozadi.

### Prompt ichidagi ziddiyat javoblarni tasodifiy qiladi

`xarakter.md` da "aniq narx aytmaysan, taxminiy raqam ham aytma" degan qoida bor
edi. Bilim bazasiga narxlar qo'shilgach ikkalasi bir-biriga zid bo'lib qoldi.

Model bunday holatda qaysi biriga bo'ysunishni o'zi tanlaydi va javoblari oldindan
aytib bo'lmaydigan bo'lib qoladi. Xarakter va bilim bazasi bir-biriga zid
bo'lmasligini har o'zgarishda tekshirish kerak.

### Serverless funksiyada "xotira" degan narsa yo'q

Oddiy `Map` da saqlangan suhbat tarixi lokalda benuqson ishlaydi va Vercel'da ham
ishlagandek ko'rinadi — bir necha xabar ketma-ket yozilsa, ko'pincha bitta nusxa
ularning hammasini qabul qiladi. Lekin Vercel nusxani istalgan payt o'chiradi va
keyingi xabar bo'sh xotirali yangi nusxaga tushadi.

Eng yomoni — bu **nosozlik ko'rinishida chiqmaydi**: xato ham, log ham yo'q, bot
shunchaki oldingi gapni unutgan bo'ladi. Ishonchli xotira funksiyadan tashqarida
turishi kerak (Redis). Kod ikkalasini ham qo'llab-quvvatlaydi va qaysi biri
ishlayotganini bir marta logga yozadi.

### Gemini'ga fikrlash qadamini qaytarmasang, vosita halqasi yiqiladi

Vosita production'da birinchi marta ishlaganda log shunday chiqdi:

```
qidiruv: "O'zbekiston Markaziy banki dollar kursi bugun" (internet) → bilim 0, internet ok 5
AI xato (gemini): BadRequestError: 400 Request contains an invalid argument.
    at async Module.ask (file:///var/task/lib/gemini.js:57:25)
```

Ya'ni model qidiruvni chaqirgan, Tavily 5 ta natija qaytargan — va shundan keyin
**ikkinchi so'rov** yiqilgan. Foydalanuvchi esa oddiy "xatolik bo'ldi" matnini
ko'rgan: tashqaridan qaraganda internet qidiruv umuman ishlamayotgandek.

Sababi: modelning javobidan `function_call` va `model_output` qadamlarini olib,
`thought` qadamlarini tashlab yuborgandim — ular kerakmasdek tuyulgandi. Aslida
`ThoughtStep` da `signature` maydoni bor: *"A signature hash for backend
validation"*. Imzo qaytarilmasa backend chaqiruvni haqiqiy deb hisoblamaydi.

**Qoida: modelning chiqishini o'zgartirmasdan, butunligicha qaytarish kerak.**
Qaysi qadam "keraksiz" ko'rinishidan qat'i nazar.

### Xato matni loglarni ikki barobar ko'rsatardi

O'sha loglarda bitta nosozlik ikkita bo'lib ko'rinardi: "AI xato" va yonida
"Chegaradan keyin kelgan AI xatosi". Ikkinchisi vaqt chegarasi ishlaganini
bildirishi kerak edi, lekin `call.catch()` har qanday xatoda yozayotgan edi —
chegara umuman ishlamagan bo'lsa ham. Endi faqat chegara haqiqatan g'olib
chiqqanda yoziladi.

### Halqaning tugashi model xulqiga bog'liq bo'lmasligi kerak

Vosita halqasining birinchi varianti shunday edi: "model vosita chaqirmaguncha
davom et, oxirgi qadamda vositalarni berma — chaqirmaydi, demak tugaydi".
Mantiqan to'g'ri va amalda ham ishlaydi.

Sinov buni yiqitdi: qo'ndirma model vositalar berilmaganda ham chaqiruv qaytardi
va halqa **100 ta so'rov** qilib ketdi. Haqiqiy API bunday qilmaydi, lekin
mantiqning o'zi noto'g'ri edi — cheksiz halqadan himoya tashqi xizmatning
xulq-atvoriga tayanib turgan edi.

Endi halqa qadamlar soni bilan chegaralangan (`MAX_VOSITA = 3`) va oxirida
to'plangan matn qaytariladi. Tashqi tizim nima qilishidan qat'i nazar tugaydi.

### SDK'lar `globalThis.fetch` ni klient yaratilganda ushlab qoladi

Sinovda fetch qo'ndirmasini almashtirish ishlamadi: Anthropic SDK klient
yaratilgan paytdagi `fetch` ni eslab qolgan va keyingi almashtirishlarni
ko'rmagan. Natijada ikkinchi sinov birinchisining qo'ndirmasi bilan ishlab,
tushunarsiz natija bergan.

Yechim — bitta qo'ndirma qo'yib, uning **sozlamasini** o'zgartirish. Bu faqat
sinovga tegishli emas: agar kodda klient bir marta yaratilib keshlansa (bizda
shunday), u ushlab qolgan barcha narsa ham keshlangan bo'ladi.

### Kalit so'z qidiruvida eng uzun bo'lak deyarli har doim yutadi

`bilim/` dagi eng uzun bo'lak — botning o'z ko'rsatmalari — beshta sinov
so'rovidan beshtasida birinchi chiqdi. Sababi mazmun emas, hajm: uzun matnda
har qanday so'z uchrash ehtimoli yuqori.

Matn ballarini bo'lak uzunligiga bo'lgach ranjirovka beshala so'rovda ham
tuzaldi. Kalit so'z qidiruvi qurganda uzunlikni hisobga olish shart.

### Takrorlanayotgan savol — xotira yo'qligining birinchi belgisi

Bot "qaysi sohada xizmat ko'rsatasiz?" degan savolni qayta-qayta berardi. Tashqi
ko'rinishi prompt xatosiga o'xshaydi, aslida sababi boshqa: bot oldingi xabarni
umuman ko'rmagan, ya'ni har safar suhbatni noldan boshlagan.

Bunday holatda promptni tahrirlash vaqtni behuda sarflash bo'ladi — model
ko'rmagan ma'lumotiga tayana olmaydi. **Avval xotira bor-yo'qligini tekshirish
kerak**, keyin prompt ustida ishlash.

Teskarisi ham to'g'ri: xotira o'zi ham yetarli emas. Tarix ko'rinib tursa ham
prompt "avval sohani so'ra" deb turaversa, model savolni takrorlashi mumkin.
Shuning uchun ikkalasi birga tuzatildi — xotira va suhbat tartibi.

### Har provayder suhbat tarixini o'z formatida kutadi

Bitta "tarix" tushunchasi uchun uchta har xil shakl:

| Provayder | Shakli |
|---|---|
| Claude | `messages: [{ role: 'user' \| 'assistant', content }]` |
| OpenAI | `input: [{ role: 'user' \| 'assistant', content }]` |
| Gemini | `input: [{ type: 'user_input' \| 'model_output', content: [{ type: 'text', text }] }]` |

Gemini'da oddiy matn o'rniga qadamlar ro'yxati kerak bo'ladi va bot javobi
`assistant` emas, `model_output` deb belgilanadi. Shuning uchun xotira neytral
shaklda (`role: 'user' | 'bot'`) saqlanadi — aks holda provayderni almashtirganda
eski tarix yaroqsiz bo'lib qolardi.

### Xato javobi tarixga tushmasligi kerak

"Javob tayyorlashda xatolik bo'ldi" degan matn ham botning gapi — tarixga yozilsa,
model uni suhbatning bir qismi deb qabul qiladi va keyingi javoblarida o'shanga
tayanadi. Shuning uchun tarix faqat muvaffaqiyatli javobdan keyin yangilanadi.

### Bilim bazasi har so'rovda qayta yuboriladi

System prompt 160 tokendan ~3300 tokenga o'sdi — butun baza har savolda uzatiladi.
1000 muloqot narxi ~$1.90 dan ~$3.00 ga ko'tarildi.

Baza o'sgani sari bu raqam ham o'sadi. Kerak bo'lganda prompt keshlash yoqiladi:
o'zgarmas qism ancha arzon hisoblanadi.

---

## 5. Amaliy qo'llanma

### Modelni almashtirish

Vercel → Settings → Environment Variables → `AI_PROVIDER` qiymatini o'zgartiring
(`claude` / `gemini` / `openai`) → **Redeploy**.

Env var faqat yangi deploy'ga tushadi. "Needs Attention" yorlig'i aynan shuni
eslatadi, u xato emas.

### Bilim bazasini tahrirlash

`bilim/` papkasidagi `.md` faylni o'zgartiring va push qiling — Vercel o'zi deploy
qiladi. Kodga tegish shart emas, yangi fayl qo'shsangiz ham `lib/bilim.js` o'zi
topadi.

Xuddi shu tarzda `xarakter.md` botning gapirish uslubini boshqaradi.

**Diqqat:** bazadagi ma'lumot bot uchun haqiqat. Noto'g'ri narx yoki muddat —
mijozga aytilgan noto'g'ri va'da.

### Webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://myaiagent-bot.vercel.app/api/bot"
```

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

`last_error_message` bo'sh bo'lishi kerak.

### Xatolarni ko'rish

Vercel → Project → **Logs**. Har bir so'rovni ochib, bajarilish vaqtini va
chaqirilgan tashqi API'larni ko'rish mumkin — nosozlik qidirishda eng foydali joy.

---

## 6. Ochiq masalalar

| Masala | Holat |
|---|---|
| Kalitlar chatda yozilgan | Telegram, Gemini, OpenAI va Anthropic kalitlari suhbat tarixida qoldi — almashtirish tavsiya etiladi |
| OpenAI | Hisobda kredit yo'q, kalit Vercel'ga qo'shilmagan. Kod tayyor |
| Bilim bazasi to'ldirilmagan | `bilim/` fayllarida `<!-- NAMUNA — to'ldiring -->` belgilari bor. Narxlar haqiqiy ($200/$500/$1000), qolgani namuna — bot ularni ishonch bilan aytadi |
| Ta'rif tafsilotlari | Har bir ta'rifga nima kirishi aniqlanmagan, egasi keyinroq beradi |
| Suhbat xotirasi | Bor (9-bosqich), lekin Redis ulanmagan — hozir funksiya xotirasida, ya'ni suhbat o'rtasida yo'qolishi mumkin |
| ~~`TAVILY_API_KEY`~~ | Qo'yildi va ishlayapti — production logida `internet ok 5` |
| Bilim bazasi promptda ham, vositada ham | Baza har so'rovda promptga to'liq qo'shiladi (~3300 token). Qidiruv vositasi bo'lgach bu ortiqcha — bazani promptdan olib tashlash mumkin |
| `TELEGRAM_WEBHOOK_SECRET` | Kod tayyor, yoqilmagan |
