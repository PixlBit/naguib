# دليل رفع الموقع على Cloudflare Pages + ربط الدومين

الموقع ده **static** (HTML/CSS/JS بس) — يعني أرخص وأسهل استضافة ليه هي **Cloudflare Pages**،
وهي **مجانية بالكامل**: bandwidth غير محدود، SSL مجاني، و CDN عالمي سريع.

الخطة كاملة مجانية ما عدا حاجة واحدة: **ثمن الدومين نفسه** (سنوي، حوالي ‎$8–$12).

---

## الجزء 1 — رفع الموقع على Cloudflare Pages (مجاني)

1. اعمل حساب على **https://dash.cloudflare.com** (مجاني).
2. من القايمة الجانبية: **Workers & Pages** ← **Create** ← تبويب **Pages** ← **Connect to Git**.
3. اربط حساب GitHub بتاعك واختار الريبو: **`PixlBit/naguib`**.
4. في إعدادات الـ Build حط الآتي بالظبط:
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: (سيبه فاضي)
   - **Build output directory**: `/`
5. اضغط **Save and Deploy**. بعد أقل من دقيقة الموقع هيبقى شغّال على رابط زي:
   `https://naguib.pages.dev`

> أي `git push` على فرع `main` بعد كده بيعمل deploy جديد أوتوماتيك.

---

## الجزء 2 — شراء الدومين (`naguib.art`)

**أوفر وأنضف طريقة: اشتريه من Cloudflare نفسها** — Cloudflare بتبيع الدومين **بسعر التكلفة بدون أرباح**
(at-cost) ومفيش رسوم مخفية ولا تجديد بسعر أغلى:

1. من الـ Dashboard: **Domain Registration** ← **Register Domains**.
2. اكتب `naguib` وشوف `.com` متاح ولا لأ، وكمّل الشراء بالكارت.
3. لو اشتريته من Cloudflare، الدومين بيتربط بحسابك تلقائيًا وتقدر تعدّي على **الجزء 3** على طول.

> لو `naguib.art` مش متاح، بدائل كويسة: `naguib.studio` أو `artofnaguib.com` أو `ahmednaguib.fr`.
> **لو غيّرت الدومين:** لازم تعمل find-and-replace لكلمة `naguib.art` في 4 ملفات فقط:
> `index.html` و `robots.txt` و `sitemap.xml` و `tools/build-project-pages.mjs`
> (السطر `const SITE`) — وبعدين شغّل `node tools/build-project-pages.mjs`.

### لو اشتريت الدومين من مكان تاني (GoDaddy / Namecheap...)
لسه تقدر تستخدم Cloudflare مجانًا:
1. في Cloudflare: **Add a site** ← اكتب الدومين ← اختار الخطة **Free**.
2. Cloudflare هتديك **2 nameservers** — روح عند مكان الشراء وغيّر الـ nameservers للاتنين دول.
3. استنى الـ DNS يتفعّل (من دقايق ل 24 ساعة).

---

## الجزء 3 — ربط الدومين بالموقع

1. ادخل مشروع الـ Pages بتاعك ← تبويب **Custom domains** ← **Set up a domain**.
2. اكتب `naguib.art` واضغط Continue، وبعدين `www.naguib.art` كمان (اختياري لكن مُستحسن).
3. Cloudflare هتضيف الـ DNS records وشهادة الـ SSL أوتوماتيك. خلال دقايق يبقى:
   **https://naguib.art** شغّال بشهادة أمان مجانية 🔒.

### توجيه www للدومين الرئيسي (اختياري)
عشان `www.naguib.art` يودّي على `naguib.art`:
**Rules** ← **Redirect Rules** ← اعمل redirect من `www.naguib.art/*` لـ `https://naguib.art/$1`.

---

## الجزء 4 — مهم جدًا قبل ما تعلن عن الموقع ⚠️

1. **الصور كلها محلّية**: مافيش أي فيديو ولا صورة بتيجي من موقع تاني — كل رندر
   متخزّن في الريبو نفسه تحت `assets/work/`. يعني مافيش صلاحيات ولا إعدادات
   خصوصية لازم تظبطها عند حد تاني، والـ CSP في `_headers` مقفول على `'self'`.
2. **روابط التواصل**: ArtStation `artofnaguib` و LinkedIn `in/artofnaguib`.
   لو أي واحد فيهم اتغيّر، عدّله في `index.html` (قسم CONTACT وقسم ABOUT)
   وفي بلوك الـ JSON-LD فوق.
3. **اختبار المشاركة**: بعد ما الدومين يشتغل، جرّب تحط الرابط في
   [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) للتأكد إن
   صورة المشاركة (`og.jpg`) بتظهر صح.

---

## الجزء 5 — التحليلات (Cloudflare Web Analytics) 📊

مجانية، بدون كوكيز، وما تحتاج أي تعديل في الكود — الـ CSP في `_headers`
جاهزة لها من الأصل (`static.cloudflareinsights.com` و`cloudflareinsights.com`
مسموحين).

1. من لوحة Cloudflare: **Analytics & Logs** ← **Web Analytics**.
2. اضغط **Add a site** واختر `naguib.art`.
3. لو الموقع على Pages، فعّل **Automatic Setup** — كلاودفلير تحقن سكربت
   القياس بنفسها على الحافة، وما تلمس الريبو.
4. أول أرقام تظهر خلال دقايق: الزوار، الصفحات الأكثر فتحًا، من وين جايين،
   وسرعة الموقع الحقيقية عند الناس (Core Web Vitals).

> ملاحظة: لو فعّلتها يدويًا بدل الأوتوماتيك، السكربت لازم يكون من
> `https://static.cloudflareinsights.com/beacon.min.js` بالضبط — أي دومين
> ثاني الـ CSP هترفضه.

---

## الجزء 6 — قفل لوحة التحكم 🔐

لوحة التحكم على `naguib.art/studio-admin.html`. **ما تشتغل لحد ما تحط
اليوزر والباسورد** — قبلها ترجع `404` للكل، حتى لك. هذا مقصود: لو نسيت
تضبطها، الباب يظل مقفول مو مفتوح.

### الخطوات (دقيقتين)
1. لوحة Cloudflare ← **Workers & Pages** ← مشروع `naguib` ← **Settings**.
2. **Variables and Secrets** ← **Add**.
3. ضيف اثنين، **واختر النوع Secret مو Plaintext**:

   | الاسم | القيمة |
   |-------|--------|
   | `ADMIN_USER` | اليوزرنيم اللي تبيه |
   | `ADMIN_PASS` | باسورد قوي — 16 حرف على الأقل، مو مستخدم بأي مكان ثاني |

4. اضغط **Save**، وبعدها **Deployments ← Retry deployment** عشان القيم توصل.
5. افتح `naguib.art/studio-admin.html` — المتصفح بيطلب منك يوزر وباسورد.

### ليش هذي الطريقة بالذات
الفحص يصير على **سيرفر كلاودفلير قبل ما يتبعث أي ملف**. يعني اللي ما عنده
الباسورد ما يستلم ولا بايت من صفحة اللوحة ولا من كودها — مو مجرد شاشة
تخفي المحتوى. أي "باسورد" مكتوب داخل صفحة ستاتيك يكون شكلي: أي واحد يفتح
كود الصفحة ويشوفه.

الباسورد **ما هو موجود في الريبو أبداً** — بس في إعدادات كلاودفلير. لو
تسرّب، غيّره من نفس المكان بدون أي تعديل بالكود.

> **طريقة أقوى لو حبيت:** Cloudflare **Zero Trust ← Access** — تحط سياسة على
> `naguib.art/studio-admin*` تسمح لإيميلك أنت فقط، وكلاودفلير ترسل لك كود
> تحقق على الإيميل كل مرة. مجانية لين 50 مستخدم، وما فيها باسورد مشترك
> ينسرق أصلاً. تقدر تشغّلها فوق الحماية الحالية أو بدالها.

### لو فتحت على `naguib.pages.dev` وما فتحت على `naguib.art`

نفس النسخة بالضبط تنخدم على العنوانين، فالفرق مو من الكود — الفرق إن
`naguib.art` يمرّ على إعدادات الدومين نفسه (WAF، Redirect Rules، Cache
Rules، Bot Fight Mode، Access)، و`pages.dev` يعديها كلها. **شوف إيش يطلع لك
بالضبط على `naguib.art/studio-admin`**، وكل حالة تودّيك لمكان واحد:

| اللي تشوفه | معناه | وين تصلحه |
|-----------|-------|-----------|
| صندوق يوزر وباسورد | القفل شغّال — الباسورد بس غلط | جرّب نسخ/لصق، أو غيّر `ADMIN_PASS` |
| سطر أبيض مكتوب فيه `Not found` | القفل شغّال بس ما شاف المتغيّرات | Settings ← Variables and Secrets: لازم يكونون على **Production** مو Preview، وبعدها **Retry deployment** |
| صفحة الـ 404 الملوّنة حقّت الموقع، أو الصفحة الرئيسية | الفنكشن ما اشتغلت أصلاً — الطلب ما وصل للمشروع | Workers & Pages ← `naguib` ← **Custom domains**: لازم `naguib.art` مضاف هنا وحالته Active، و DNS الدومين يكون CNAME مربوط على `naguib.pages.dev` و**البرتقالة مفعّلة** (Proxied) |
| شاشة تحقق من كلاودفلير أو `403` | WAF أو Bot Fight Mode ماسك الطلب | Security ← Events: دوّر على الطلب وشوف أي قاعدة مسكته |
| صفحة تسجيل دخول بإيميل | Zero Trust Access شغّال على المسار | Zero Trust ← Access ← Applications |

لو ما زبطت بعد هذا، افتح الرابط بنافذة خاصة (Private / Incognito) مرة وحدة —
يمكن متصفحك حافظ نسخة قديمة من قبل ما تضبط المتغيّرات.

---

## الجزء 7 — خلي السيف بضغطة وحدة 🚀

بعد ما تربط مفتاح GitHub مرة وحدة، أي تعديل باللوحة يروح للموقع بضغطة زر
واحدة: تضغط **PUBLISH TO SITE** واللوحة تكتب `studio.js` في الريبو مباشرة،
وكلاودفلير تبني الموقع لحالها، وصفحات المشاريع والـ sitemap تتولّد لحالها
كمان. خلاص ما فيه تحميل ملف ولا نسخ ولا أوامر.

### الخطوات (مرة وحدة بس)
1. افتح [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Repository access** ← *Only select repositories* ← اختر `naguib` **لحاله**.
3. **Permissions** ← *Repository permissions* ← **Contents** ← اختر
   **Read and write**. لا تزيد ولا صلاحية ثانية.
4. **Expiration** — حط تاريخ انتهاء (٩٠ يوم مثلاً). لما ينتهي، سوّ واحد جديد.
5. اضغط **Generate token** وانسخه.
6. افتح اللوحة ← عدّل أي شي ← **SAVE CHANGES** ← تحت في **ONE-TIME SETUP**
   الصق المفتاح ← **CONNECT**.

من بعدها الزر يصير **REVIEW & PUBLISH**: يوريك بالضبط إيش تغيّر بالكلام، وأنت
تضغط **PUBLISH TO SITE**.

### الأمان
- المفتاح محفوظ **بمتصفحك أنت بس** (`localStorage`) — أبداً مو بالريبو ولا
  بأي ملف يتنشر على الموقع.
- محدود بريبو واحد وصلاحية وحدة، فأقصى شي يقدر يسويه هو نفس الشي اللي
  انعمل عشانه.
- **DISCONNECT** يمسحه من المتصفح فوراً. ولو ضاع منك جهاز، احذف المفتاح من
  صفحة GitHub نفسها.
- قبل ما تكتب، اللوحة تقرأ `studio.js` من GitHub وتقارنه باللي فتحته. لو أحد
  ثاني حفظ بينهم، ترفض بدل ما تمسح شغله.
- اللوحة نفسها ورا اليوزر والباسورد من الجزء 6، فما حد يوصل لها أصلاً.

> ما ودك بالمفتاح؟ زر **DOWNLOAD INSTEAD** موجود زي ما هو — ينزّل لك
> `studio.js` وتحطه بالريبو بنفسك.

---

## ملخّص سريع
| الحاجة | التكلفة |
|--------|---------|
| استضافة Cloudflare Pages | **مجاني** (bandwidth غير محدود) |
| شهادة SSL / HTTPS | **مجاني** |
| CDN عالمي | **مجاني** |
| الدومين `naguib.art` | **~$10 سنويًا** (السعر الوحيد المدفوع) |

كده الموقع بيبقى شغّال على `https://naguib.art` باستضافة احترافية سريعة وبأقل تكلفة ممكنة.
