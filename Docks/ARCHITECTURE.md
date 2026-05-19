# ARCHITECTURE.md — لنگرگاه سیستمی

---

## اسکیمای دیتابیس (Dexie.js / IndexedDB)

```js
// src/db.js
db.version(1).stores({
  projects : '++id, name, created_at',
  pages    : '++id, project_id, title',
  weights  : '++id, project_id, category_name',
  results  : '++id, project_id, source_page_id'
})
```

### جدول `projects`
| فیلد | نوع | توضیح |
|---|---|---|
| id | auto int PK | |
| name | string | نام پروژه — مثلاً «نهال‌گشت ۱۴۰۵» |
| created_at | ISO string | تاریخ ساخت |
| scoring_mode | `'linear'` یا `'weighted'` | روش امتیازدهی |
| max_links | int (5/10/15) | حداکثر لینک پیشنهادی هر صفحه |

### جدول `pages`
| فیلد | نوع | توضیح |
|---|---|---|
| id | auto int PK | |
| project_id | int FK → projects.id | |
| title | string | مقدار ستون `عنوان_H1` از CSV |
| categories | JSON string | آبجکت حاوی ۱۸ فیلد دسته‌بندی |

**ساختار `categories` (JSON.stringify شده):**
```json
{
  "قاره_یا_منطقه": "اوراسیا",
  "کشور_مقصد": "ترکیه",
  "جهت_در_منطقه": "مدیترانه",
  "شهر_یا_جزیره_مقصد": "کوش آداسی",
  "شهر_یا_استان_مبدا": null,
  "نوع_تور": "تک مقصد",
  "فصل_برگزاری": "تابستان",
  "ماه_تقویمی_برگزاری": "تیر",
  "تعطیلات_خاص_تقویمی": null,
  "رویداد_یا_مناسبت_خاص": null,
  "تم_یا_هدف_سفر": null,
  "نوع_وسیله_نقلیه": "هوایی",
  "نام_دقیق_هتل": null,
  "تعداد_ستاره_هتل": null,
  "برچسب_کلاسی_تور": null,
  "پرسونای_مخاطب": null,
  "وضعیت_ویزا": "بدون ویزا",
  "نوع_سفر": "تفریحی، استراحت و ریلکسیشن"
}
```

### جدول `weights`
| فیلد | نوع | توضیح |
|---|---|---|
| id | auto int PK | |
| project_id | int FK → projects.id | |
| category_name | string | نام ستون دسته‌بندی |
| weight_value | float (1-5) | وزن اختصاص‌داده‌شده |

**وزن‌های پیش‌فرض:**
```js
{
  'شهر_یا_جزیره_مقصد'   : 5,
  'کشور_مقصد'           : 4,
  'نوع_تور'             : 3,
  'ماه_تقویمی_برگزاری'  : 3,
  'فصل_برگزاری'         : 3,
  'قاره_یا_منطقه'       : 2,
  'جهت_در_منطقه'        : 2,
  'تم_یا_هدف_سفر'       : 2,
  'نوع_سفر'             : 2,
  'شهر_یا_استان_مبدا'   : 1,
  'تعطیلات_خاص_تقویمی'  : 1,
  'رویداد_یا_مناسبت_خاص': 1,
  'نوع_وسیله_نقلیه'     : 1,
  'نام_دقیق_هتل'        : 1,
  'تعداد_ستاره_هتل'     : 1,
  'برچسب_کلاسی_تور'     : 1,
  'پرسونای_مخاطب'       : 1,
  'وضعیت_ویزا'          : 1,
}
```

### جدول `results`
| فیلد | نوع | توضیح |
|---|---|---|
| id | auto int PK | |
| project_id | int FK → projects.id | |
| source_page_id | int FK → pages.id | صفحه‌ای که لینک‌ها برایش پیشنهاد شده |
| recommended_links | JSON string | آرایه لینک‌های پیشنهادی |
| generated_at | ISO string | زمان تولید |

**ساختار `recommended_links`:**
```json
[
  {
    "page_id": 42,
    "title": "تور مارماریس تابستان ۱۴۰۵",
    "score": 11,
    "reason": "هر دو تور ترکیه مدیترانه تابستانه هستند"
  }
]
```

---

## جریان داده (Data Flow)

```
CSV آپلود
    │
    ▼
Papa Parse → آرایه ردیف‌ها
    │
    ▼
Dexie: projects.add() + pages.bulkAdd()
    │
    ▼
Config Screen: scoring_mode + weights → Dexie: weights.bulkAdd()
    │
    ├──► [scorer.js] computeAllCandidates(pages, weights, mode)
    │         └─► برای هر صفحه: top 20 کاندید بر اساس امتیاز
    │
    └──► [gemini.js] buildPrompt(pages, candidates) → fetch Gemini API
              └─► پارس JSON پاسخ → Dexie: results.bulkAdd()
                        │
                        ▼
                  Results Screen: خواندن از Dexie + نمایش + export
```

---

## درخت فایل (کامل)

```
linkmesh/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
│
├── docs/
│   ├── PROJECT.md          ← این فایل + برادرانش
│   ├── ARCHITECTURE.md
│   └── tasks.md
│
└── src/
    ├── main.jsx             ← entry point، RTL و فونت اینجا set می‌شوند
    ├── App.jsx              ← React Router routes
    │
    ├── db.js                ← تعریف کامل Dexie schema
    │
    ├── constants/
    │   └── categories.js    ← آرایه ۱۸ نام ستون + وزن‌های پیش‌فرض
    │
    ├── utils/
    │   ├── csvParser.js     ← Papa Parse wrapper: CSV → آرایه آبجکت
    │   ├── scorer.js        ← الگوریتم امتیازدهی (خطی/ضریب‌دار)
    │   └── gemini.js        ← ساخت prompt + فراخوانی API + پارس پاسخ
    │
    ├── hooks/
    │   └── useProject.js    ← hook برای خواندن project فعال از Dexie
    │
    ├── components/
    │   └── ui/
    │       ├── Button.jsx
    │       ├── Spinner.jsx
    │       └── Badge.jsx
    │
    └── pages/
        ├── Home.jsx         ← لیست پروژه‌ها
        ├── NewProject.jsx   ← آپلود CSV
        ├── Config.jsx       ← تنظیمات امتیازدهی
        ├── Analysis.jsx     ← نوار پیشرفت پردازش
        └── Results.jsx      ← جدول نتایج + export
```

---

## منطق الگوریتم امتیازدهی (`scorer.js`)

```
تابع: computeScore(pageA, pageB, weights, mode)

برای هر یک از ۱۸ فیلد دسته‌بندی:
  اگر مقدار pageA[field] و pageB[field] هر دو غیر null باشند
  و با هم برابر باشند:
    اگر mode === 'linear':
      score += 1
    اگر mode === 'weighted':
      score += weights[field]  (پیش‌فرض ۱ اگر weight تعریف نشده)

بازگشت: score
```

```
تابع: computeAllCandidates(pages, weights, mode)

برای هر صفحه (source):
  محاسبه score با تمام صفحات دیگر
  مرتب‌سازی نزولی
  نگه‌داشتن top 20

بازگشت: Map<page_id, CandidateList[]>
```

---

## ساختار Prompt برای Gemini

```
SYSTEM:
تو یک متخصص SEO هستی. وظیفه‌ات انتخاب بهترین لینک‌های داخلی است.

USER:
در زیر اطلاعات [N] صفحه سایت نهال‌گشت و کاندیداهای پیشنهادی برای
لینک‌سازی داخلی آورده شده. برای هر صفحه، از بین کاندیداهایش،
بهترین [max_links] صفحه را برای لینک داخلی انتخاب کن.

معیار: شباهت معنایی، ارتباط موضوعی، و تکمیل‌کنندگی سفر کاربر.

خروجی را فقط به صورت JSON خالص بده (بدون ```):
[
  {
    "source_title": "...",
    "links": [
      { "title": "...", "reason": "..." }
    ]
  }
]

--- داده صفحات ---
[لیست کامل صفحات با categories]

--- کاندیداها ---
[Map کاندیداها]
```

---

## نکات امنیتی

- کلید Gemini API **فقط** در `localStorage` با کلید `LINKMESH_API_KEY` ذخیره می‌شود
- هیچ‌گاه API Key به Dexie یا state برنامه نوشته نمی‌شود
- هنگام export، API Key در CSV وارد نمی‌شود
