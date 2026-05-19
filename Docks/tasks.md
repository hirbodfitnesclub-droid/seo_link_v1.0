# tasks.md — نقشه راه مرجع

> ترتیب تسک‌ها اجباری است. هر تسک روی خروجی تسک قبلی تکیه دارد.
> قبل از شروع هر تسک، فایل‌های CONTEXT_FILES را بخوان.

---

## تسک ۱ — راه‌اندازی پروژه + لایه دیتابیس

### هدف
پایه‌های پروژه را بچین: ساختار فایل، Tailwind، RTL، فونت، و اسکیمای کامل Dexie.

### راهنمای پیاده‌سازی فنی

1. پروژه Vite+React بساز. وابستگی‌ها را نصب کن:
   `dexie`, `react-router-dom`, `papaparse`, `tailwindcss`, `autoprefixer`, `postcss`

2. **`tailwind.config.js`**: content را به `./src/**/*.{js,jsx}` بده. هیچ پلاگین اضافی لازم نیست.

3. **`index.html`**: این دو تگ را در `<head>` اضافه کن:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
   ```
   و `dir="rtl"` را روی تگ `<html>` بگذار.

4. **`src/main.jsx`**: فقط `App` را رندر کن. هیچ منطقی اینجا نباشد.

5. **`src/constants/categories.js`**: یک آرایه export کن به نام `CATEGORIES` با این ۱۸ آیتم — هر آیتم یک آبجکت `{ name, defaultWeight }`:
   ```
   قاره_یا_منطقه (2), کشور_مقصد (4), جهت_در_منطقه (2),
   شهر_یا_جزیره_مقصد (5), شهر_یا_استان_مبدا (1), نوع_تور (3),
   فصل_برگزاری (3), ماه_تقویمی_برگزاری (3), تعطیلات_خاص_تقویمی (1),
   رویداد_یا_مناسبت_خاص (1), تم_یا_هدف_سفر (2), نوع_وسیله_نقلیه (1),
   نام_دقیق_هتل (1), تعداد_ستاره_هتل (1), برچسب_کلاسی_تور (1),
   پرسونای_مخاطب (1), وضعیت_ویزا (1), نوع_سفر (2)
   ```

6. **`src/db.js`**: اسکیمای Dexie را دقیقاً مطابق ARCHITECTURE.md بساز. چهار جدول: `projects`, `pages`, `weights`, `results`. فقط تعریف schema — هیچ منطق اضافی نباشد.

7. **`src/App.jsx`**: چهار route بساز با React Router:
   - `/` → `<Home />`
   - `/new` → `<NewProject />`
   - `/config/:projectId` → `<Config />`
   - `/results/:projectId` → `<Results />`
   هر page فعلاً یک `<div>` خالی با نام خودش باشد (placeholder).

8. **`src/components/ui/Button.jsx`**: یک کامپوننت ساده با prop‌های `variant` (primary/secondary/danger) و `loading` (نشان‌دهنده spinner). استایل فقط Tailwind.

9. **`src/components/ui/Spinner.jsx`**: یک دایره چرخان ساده با Tailwind.

### محدودیت‌های این تسک
- ✅ فقط ساختار و تنظیمات — هیچ منطق بیزینسی نباشد
- ✅ `db.js` فقط export یک instance از Dexie باشد
- ⛔ هیچ فراخوانی به Dexie (add/get) در این تسک نیست
- ⛔ هیچ API call نیست

`CONTEXT_FILES: ["docs/PROJECT.md", "docs/ARCHITECTURE.md"]`

---

## تسک ۲ — صفحه Home + مدیریت پروژه‌ها

### هدف
صفحه اصلی که لیست پروژه‌های ذخیره‌شده در Dexie را نشان می‌دهد و ورودی اصلی برنامه است.

### راهنمای پیاده‌سازی فنی

1. **`src/pages/Home.jsx`**:
   - با `useLiveQuery` از Dexie، لیست تمام `projects` را بخوان (مرتب‌شده بر اساس `created_at` نزولی).
   - اگر پروژه‌ای نیست: یک حالت خالی (empty state) نشان بده با دکمه «پروژه جدید».
   - اگر پروژه دارد: لیست کارت‌ها نشان بده. هر کارت: نام پروژه، تعداد صفحات، تاریخ ساخت، و سه دکمه:
     - «مشاهده نتایج» ← navigate به `/results/:id`
     - «تنظیمات» ← navigate به `/config/:id`
     - «حذف» ← با confirm dialog، project + pages + weights + results مربوط را از Dexie حذف کن (transaction)
   - دکمه «+ پروژه جدید» در بالا ← navigate به `/new`

2. **`src/hooks/useProject.js`**:
   یک custom hook بساز که `projectId` را می‌گیرد و این‌ها را برمی‌گرداند:
   ```js
   { project, pages, weights, results, loading, error }
   ```
   از `useLiveQuery` استفاده کن تا هر تغییری در Dexie خودکار re-render کند.

### محدودیت‌های این تسک
- ✅ تمام داده‌خوانی از Dexie با `useLiveQuery` باشد
- ✅ حذف پروژه باید transaction باشد (هم‌زمان ۴ جدول پاک شود)
- ⛔ هیچ state جداگانه‌ای برای data نباشد — Dexie single source of truth است
- ⛔ هنوز صفحه CSV آپلود ساخته نشده — لینک «پروژه جدید» فقط navigate کند

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/db.js", "src/App.jsx", "src/components/ui/Button.jsx"]`

---

## تسک ۳ — صفحه NewProject: آپلود و پارس CSV

### هدف
کاربر CSV را آپلود می‌کند، پیش‌نمایش می‌بیند، و پروژه در Dexie ذخیره می‌شود.

### راهنمای پیاده‌سازی فنی

1. **`src/utils/csvParser.js`**:
   یک تابع `parseCSV(file)` بساز که:
   - با Papa Parse فایل را می‌خواند (`header: true`, `skipEmptyLines: true`)
   - اعتبارسنجی می‌کند: ستون `عنوان_H1` باید وجود داشته باشد. اگر نبود، error برگردان.
   - هر ردیف را به این فرمت تبدیل کن:
     ```js
     { title: row['عنوان_H1'], categories: JSON.stringify({ /* ۱۸ فیلد */ }) }
     ```
     مقادیر خالی (`""`, `undefined`) را `null` کن.
   - برگردان: `{ rows: [...], totalCount: N, errors: [...] }`

2. **`src/pages/NewProject.jsx`**:
   - **مرحله A — آپلود**: یک ناحیه drag & drop بساز. فایل input مخفی باشد. کلیک روی ناحیه، input را trigger کند.
   - **مرحله B — پیش‌نمایش**: بعد از parse، اولین ۵ ردیف را در یک جدول ساده نشان بده. تعداد کل ردیف‌ها را نمایش بده.
   - **فیلد نام پروژه**: یک input با placeholder «مثلاً: نهال‌گشت آذر ۱۴۰۵».
   - **دکمه «ذخیره پروژه»**: 
     - یک `project` در Dexie ذخیره کن (`scoring_mode: 'linear'`, `max_links: 10` پیش‌فرض).
     - تمام `pages` را با `db.pages.bulkAdd()` در یک عملیات ذخیره کن.
     - بعد از موفقیت: navigate به `/config/:newProjectId`.

### محدودیت‌های این تسک
- ✅ `bulkAdd` برای صفحات — هیچ‌گاه loop تک‌تک نباشد
- ✅ اعتبارسنجی ستون `عنوان_H1` الزامی است
- ⛔ drag & drop با خود HTML File API پیاده شود — هیچ کتابخانه دیگری نیاز نیست
- ⛔ هنوز تحلیل AI انجام نشود

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/db.js", "src/constants/categories.js", "src/utils/csvParser.js", "src/components/ui/Button.jsx"]`

---

## تسک ۴ — صفحه Config: تنظیمات امتیازدهی

### هدف
کاربر روش امتیازدهی و وزن دسته‌بندی‌ها را تنظیم می‌کند. این تنظیمات در Dexie ذخیره می‌شوند.

### راهنمای پیاده‌سازی فنی

1. **`src/pages/Config.jsx`**:
   - با `useProject(projectId)` داده پروژه را بخوان.
   - بخش ۱ — **روش امتیازدهی**: دو دکمه toggle: «خطی» / «ضریب‌دار». هر بار کلیک، `projects.update(id, { scoring_mode })` صدا بزن.
   - بخش ۲ — **وزن‌ها** (فقط در حالت «ضریب‌دار» نمایان):
     - برای هر یک از ۱۸ دسته‌بندی (از `CATEGORIES` constant) یک ردیف بساز:
       - نام دسته‌بندی (فارسی)
       - یک slider از ۱ تا ۵
       - نمایش عدد وزن کنار slider
     - مقدار اولیه slider: اگر `weights` در Dexie برای این project وجود دارد از آن بخوان، وگرنه `defaultWeight` از constant.
   - بخش ۳ — **حداکثر لینک**: یک select با گزینه‌های ۵ / ۱۰ / ۱۵. مقدار در `projects.max_links` ذخیره شود.
   - بخش ۴ — **API Key Gemini**: یک input با type=password. مقدار از `localStorage.getItem('LINKMESH_API_KEY')` بخوان. هر تغییر، `localStorage.setItem` صدا بزن. هرگز در Dexie نباشد.
   - دکمه **«شروع تحلیل»**: 
     - اعتبارسنجی: API Key خالی نباشد.
     - تمام وزن‌ها را با `db.weights.bulkPut()` در Dexie ذخیره کن.
     - Navigate به `/results/:projectId?analyze=true`.

### محدودیت‌های این تسک
- ✅ ذخیره وزن‌ها فقط با `bulkPut` (upsert) — نه delete+insert
- ✅ بخش وزن‌ها فقط با toggle «ضریب‌دار» نمایان شود
- ⛔ API Key به Dexie نرود — فقط localStorage
- ⛔ هنوز هیچ فراخوانی به Gemini نشود

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/db.js", "src/constants/categories.js", "src/hooks/useProject.js", "src/components/ui/Button.jsx"]`

---

## تسک ۵ — موتور امتیازدهی الگوریتمی

### هدف
یک ماژول خالص (pure function) که بدون هیچ API call، شباهت صفحات را محاسبه می‌کند و برای هر صفحه top 20 کاندید برمی‌گرداند.

### راهنمای پیاده‌سازی فنی

1. **`src/utils/scorer.js`** — سه تابع export کن:

   **تابع ۱: `computeScore(catA, catB, weights, mode)`**
   ```
   ورودی:
     catA, catB: آبجکت‌های categories (parse شده از JSON)
     weights: آبجکت { نام_فیلد: عدد }
     mode: 'linear' | 'weighted'
   
   منطق:
     برای هر فیلد در catA:
       اگر catA[field] !== null
       AND catB[field] !== null
       AND catA[field] === catB[field]:
         اگر linear: score += 1
         اگر weighted: score += (weights[field] ?? 1)
   
   خروجی: عدد score
   ```

   **تابع ۲: `findTopCandidates(sourceId, allPages, weights, mode, topN = 20)`**
   ```
   - تمام صفحات به جز sourceId را score بزن
   - مرتب‌سازی نزولی بر اساس score
   - برگردان top N آیتم: [{ page_id, title, score }]
   ```

   **تابع ۳: `computeAllCandidates(pages, weights, mode)`**
   ```
   - برای هر صفحه: findTopCandidates را صدا بزن
   - برگردان: Map که کلیدش page_id و مقدارش آرایه کاندیداهاست
   - categories در هر page قبلاً JSON.parse شده باشد
   ```

2. این ماژول هیچ import از React یا Dexie ندارد. فقط محاسبات ریاضی خالص.

### محدودیت‌های این تسک
- ✅ هر سه تابع باید `export` باشند (برای تست‌پذیری)
- ✅ مقادیر `null` در هر دو طرف → آن فیلد نادیده گرفته می‌شود
- ⛔ هیچ side effect — نه Dexie، نه localStorage، نه console.log در production
- ⛔ از `.map().filter().sort()` استفاده کن — از for loop تودرتو اجتناب کن

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/constants/categories.js"]`

---

## تسک ۶ — Gemini Integration + صفحه Analysis

### هدف
ساخت ماژول فراخوانی Gemini و صفحه‌ای که روند تحلیل را به کاربر نشان می‌دهد.

### راهنمای پیاده‌سازی فنی

1. **`src/utils/gemini.js`** — دو تابع export کن:

   **تابع ۱: `buildPrompt(pages, candidatesMap, maxLinks)`**
   ```
   - یک string ساختار‌یافته بساز که شامل:
     * توضیح وظیفه به فارسی (ر. ARCHITECTURE.md بخش Prompt)
     * لیست تمام صفحات با categories‌شان (به شکل خوانا)
     * لیست کاندیداهای هر صفحه
     * دستور خروجی JSON
   - برگردان: string prompt
   ```

   **تابع ۲: `callGemini(prompt, apiKey)`**
   ```
   - endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={apiKey}
   - method: POST, Content-Type: application/json
   - body: { contents: [{ parts: [{ text: prompt }] }] }
   - پاسخ را دریافت کن، text را استخراج کن
   - JSON.parse کن (اگر با ``` شروع شد، آن را strip کن)
   - اگر parse شکست خورد: error بنداز با پیام «پاسخ Gemini قابل پارس نبود»
   - برگردان: آرایه پارس‌شده
   ```

2. **`src/pages/Results.jsx`** — این صفحه هم analysis را مدیریت می‌کند:
   - اگر query param `?analyze=true` بود، تحلیل را شروع کن:
     - مرحله ۱: داده‌ها را از Dexie بخوان (pages, weights)
     - مرحله ۲: `computeAllCandidates` را اجرا کن (نمایش: «در حال امتیازدهی...»)
     - مرحله ۳: `buildPrompt` بساز
     - مرحله ۴: `callGemini` صدا بزن (نمایش: «در حال تحلیل با هوش مصنوعی...»)
     - مرحله ۵: نتایج را به `results` در Dexie با `bulkAdd` بنویس
     - مرحله ۶: پارامتر `?analyze=true` را از URL حذف کن (بدون navigate)
   - اگر analyze نبود: مستقیم نتایج موجود را از Dexie بخوان و نشان بده.
   - **نمایش خطا**: اگر API Key نبود یا Gemini خطا داد، یک banner قرمز نشان بده با دکمه «رفتن به تنظیمات».

### محدودیت‌های این تسک
- ✅ فقط یک call به Gemini — نه loop، نه retry خودکار
- ✅ نتایج با `bulkAdd` یک‌جا نوشته شوند
- ⛔ هیچ‌گاه API Key وارد body prompt نشود
- ⛔ اگر `results` از قبل در Dexie برای این project وجود دارد، قبل از bulkAdd آن‌ها را پاک کن (`db.results.where('project_id').equals(id).delete()`)

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/db.js", "src/utils/scorer.js", "src/hooks/useProject.js", "src/components/ui/Spinner.jsx", "src/components/ui/Button.jsx"]`

---

## تسک ۷ — صفحه Results: نمایش + Export

### هدف
نمایش خروجی نهایی به صورت جدولی جستجوپذیر با قابلیت export.

### راهنمای پیاده‌سازی فنی

1. **`src/pages/Results.jsx`** (تکمیل بخش نمایش):
   - داده را از Dexie بخوان: `results` join شده با `pages` (با page_id).
   - **بخش بالا — آمار**: سه کارت: «تعداد صفحات تحلیل‌شده»، «میانگین لینک پیشنهادی»، «تاریخ آخرین تحلیل».
   - **جستجو**: یک input که `results` را بر اساس `source_title` فیلتر کند (client-side، بدون API).
   - **جدول نتایج**: هر ردیف شامل:
     - عنوان صفحه منبع
     - تعداد لینک پیشنهادی
     - دکمه «نمایش» که ردیف را expand کند
     - در expand: لیست لینک‌ها با عنوان + دلیل (reason از AI)
   - **دکمه «دانلود CSV»**:
     ```
     هر ردیف CSV: source_title | link_title | reason
     ```
     با `Blob` و `URL.createObjectURL` دانلود کن.
   - **دکمه «تحلیل مجدد»**: navigate به `/config/:projectId`.
   - **دکمه «بازگشت به خانه»**: navigate به `/`.

2. **`src/components/ui/Badge.jsx`**: یک pill کوچک برای نشان دادن تعداد لینک‌ها.

### محدودیت‌های این تسک
- ✅ جستجو client-side باشد (روی داده از Dexie، نه query جدید)
- ✅ expand/collapse با React state ساده (نه کتابخانه accordion)
- ⛔ هیچ API call در این تسک
- ⛔ هیچ کتابخانه export اضافه نشود — فقط Blob native

`CONTEXT_FILES: ["docs/ARCHITECTURE.md", "src/db.js", "src/hooks/useProject.js", "src/components/ui/Button.jsx", "src/components/ui/Badge.jsx", "src/components/ui/Spinner.jsx"]`

---

## چک‌لیست نهایی (بعد از تمام تسک‌ها)

- [ ] تمام متن‌های UI فارسی هستند
- [ ] `dir="rtl"` روی `<html>` فعال است
- [ ] هیچ API Key در Dexie ذخیره نشده
- [ ] هیچ `console.log` در کد production نیست
- [ ] همه bulk operations از `bulkAdd`/`bulkPut` استفاده کرده‌اند
- [ ] صفحه Results با `?analyze=true` تحلیل را شروع می‌کند، بدون آن نتایج را نشان می‌دهد
- [ ] مدل Gemini دقیقاً `gemini-3.1-flash-lite` است
