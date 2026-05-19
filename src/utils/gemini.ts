import { Candidate, RawPage } from './scorer';

export function buildPrompt(pages: RawPage[], candidatesMap: Map<number, Candidate[]>, maxLinks: number): string {
  const pagesData = pages.map(p => ({
    id: p.id,
    title: p.title,
    categories: JSON.parse(p.categories)
  }));

  const candidatesData = Array.from(candidatesMap.entries()).map(([sourceId, candidates]) => ({
    source_page_id: sourceId,
    candidates: candidates.map(c => ({ page_id: c.page_id, title: c.title, score: c.score }))
  }));

  return `SYSTEM:
تو یک متخصص SEO هستی. وظیفه‌ات انتخاب بهترین لینک‌های داخلی است.

USER:
در زیر اطلاعات ${pages.length} صفحه سایت و کاندیداهای پیشنهادی برای
لینک‌سازی داخلی آورده شده. برای هر صفحه، از بین کاندیداهایش،
بهترین ${maxLinks} صفحه را برای لینک داخلی انتخاب کن.

معیار: شباهت معنایی، ارتباط موضوعی، و تکمیل‌کنندگی سفر کاربر.

خروجی را فقط به صورت JSON خالص بده (بدون \`\`\`):
[
  {
    "source_page_id": 1,
    "recommended_links": [
      { "page_id": 2, "title": "...", "score": 10, "reason": "..." }
    ]
  }
]

--- داده صفحات ---
${JSON.stringify(pagesData, null, 2)}

--- کاندیداها ---
${JSON.stringify(candidatesData, null, 2)}
`;
}

export async function callGemini(prompt: string, apiKey: string): Promise<any[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`خطا در ارتباط با Gemini API: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('پاسخ Gemini خالی بود.');
  }

  // Strip markdown code blocks if present
  let cleanText = text.trim();
  if (cleanText.startsWith('\`\`\`json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('\`\`\`')) {
    cleanText = cleanText.substring(3);
  }
  
  if (cleanText.endsWith('\`\`\`')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    throw new Error('پاسخ Gemini قابل پارس نبود. لطفاً مجدداً تلاش کنید.');
  }
}
