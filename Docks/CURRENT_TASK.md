# CURRENT_TASK.md — وضعیت فعلی

## تسک جاری: تسک ۱ — به‌روزرسانی اسکیمای دیتابیس

### وضعیت: آماده شروع

---

## ۱. درخت تمرکز (Focus Tree)
```
CONTEXT_FILES: ["Docks/ARCHITECTURE.md", "src/db.ts"]
```

---

## ۲. جزئیات کامل تسک فعلی

### هدف
اضافه کردن دو جدول جدید به Dexie: `candidates` (برای ذخیره ۲۰ کاندیدای هر صفحه) و `analysisQueue` (برای مدیریت صف پردازش AI).

### راهنمای پیاده‌سازی فنی

1. **`src/db.ts`**: نسخه دیتابیس را از 1 به 2 تغییر بده و دو جدول جدید اضافه کن:

   ```ts
   // جدول candidates — ۲۰ کاندیدای هر صفحه (قبل از AI)
   export interface Candidate {
     id?: number;
     project_id: number;
     source_page_id: number;
     candidate_list: string; // JSON آرایه: [{ page_id, title, score, matched_tags }]
     computed_at: string;
   }

   // جدول analysisQueue — صف پردازش AI
   export interface AnalysisQueue {
     id?: number;
     project_id: number;
     status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
     current_page_index: number;
     total_pages: number;
     error_message: string | null;
     started_at: string;
     updated_at: string;
   }
   ```

2. اسکیمای Dexie را آپدیت کن:
   ```ts
   this.version(2).stores({
     projects: '++id, name, created_at',
     pages: '++id, project_id, title',
     weights: '++id, project_id, category_name',
     candidates: '++id, project_id, source_page_id',
     results: '++id, project_id, source_page_id',
     analysisQueue: '++id, project_id'
   });
   ```

3. فیلد `is_manual_edit` را به interface `Result` اضافه کن.

### محدودیت‌های این تسک
- ✅ فقط تغییرات schema — هیچ منطق بیزینسی جدید
- ✅ از `upgrade()` برای migration استفاده نکن؛ این یک fresh install است
- ⛔ هیچ کامپوننت UI تغییر نکند

---

## ۳. وضعیت تسک‌ها

| # | تسک | وضعیت |
|---|---|---|
| ۱ | به‌روزرسانی اسکیمای دیتابیس | 🔄 جاری |
| ۲ | آپدیت موتور امتیازدهی (matched_tags) | ⏳ در انتظار |
| ۳ | ساخت تابع ذخیره کاندیداها + Route جدید | ⏳ در انتظار |
| ۴ | صفحه لیست صفحات پروژه (ProjectPages) | ⏳ در انتظار |
| ۵ | صفحه جزئیات صفحه (PageDetail) | ⏳ در انتظار |
| ۶ | پردازش AI تکی (یک صفحه) | ⏳ در انتظار |
| ۷ | سیستم صف پردازش AI (تحلیل کلی) | ⏳ در انتظار |
| ۸ | اتصال UI به سیستم صف | ⏳ در انتظار |
| ۹ | آپدیت صفحات Home و Results | ⏳ در انتظار |
| ۱۰ | تست نهایی و رفع باگ | ⏳ در انتظار |

---

## ۴. رله کانتکست (Context Relay)

### تغییرات اساسی سیستم جدید:
سیستم قبلی همه صفحات را یکجا به AI می‌فرستاد. سیستم جدید:

1. **مرحله اول (بدون AI):** امتیازدهی الگوریتمی برای پیدا کردن ۲۰ کاندیدای هر صفحه بر اساس تگ‌های مشترک
2. **مرحله دوم (با AI):** بررسی دانه‌به‌دانه — هر صفحه جداگانه به AI فرستاده می‌شود
3. **ذخیره فوری:** بعد از هر پاسخ AI، نتیجه همان لحظه ذخیره می‌شود
4. **قابلیت resume:** اگر وسط کار قطع شد، از همان جا ادامه می‌دهد
5. **صفحه جزئیات:** هر صفحه صفحه مخصوص خودش را دارد با قابلیت ویرایش دستی

### فایل‌های جدیدی که ساخته می‌شوند:
- `src/pages/ProjectPages.tsx` — لیست صفحات + دکمه تحلیل کلی
- `src/pages/PageDetail.tsx` — جزئیات صفحه + ویرایش دستی
- `src/utils/candidateStorage.ts` — ذخیره کاندیداها
- `src/utils/queueProcessor.ts` — پردازش صف AI
- `src/hooks/useAnalysisQueue.ts` — مدیریت صف
- `src/components/QueueProgress.tsx` — نمایش پیشرفت

### فایل‌هایی که ویرایش می‌شوند:
- `src/db.ts` — اسکیمای جدید
- `src/utils/scorer.ts` — اضافه کردن matched_tags
- `src/utils/gemini.ts` — تابع جدید برای یک صفحه
- `src/App.tsx` — route‌های جدید
- `src/pages/Home.tsx` — لینک‌های جدید
- `src/pages/Results.tsx` — حذف منطق analyze
- `src/pages/Config.tsx` — تغییر مسیر
