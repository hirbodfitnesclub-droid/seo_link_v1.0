export interface Candidate {
  page_id: number;
  title: string;
  score: number;
}

export type CategoriesMap = Record<string, string | null>;

/**
 * محاسبه امتیاز شباهت بین دو صفحه
 */
export function computeScore(catA: CategoriesMap, catB: CategoriesMap, weights: Record<string, number>, mode: 'linear' | 'weighted'): number {
  let score = 0;
  
  Object.keys(catA).forEach((field) => {
    if (catA[field] !== null && catB[field] !== null && catA[field] === catB[field]) {
      if (mode === 'linear') {
        score += 1;
      } else if (mode === 'weighted') {
        score += weights[field] ?? 1;
      }
    }
  });

  return score;
}

export interface ParsedPage {
  id: number;
  title: string;
  parsedCategories: CategoriesMap;
}

/**
 * یافتن کاندیداهای برتر برای یک صفحه خاص
 */
export function findTopCandidates(sourceId: number, allPages: ParsedPage[], weights: Record<string, number>, mode: 'linear' | 'weighted', topN = 20): Candidate[] {
  const sourcePage = allPages.find((p) => p.id === sourceId);
  if (!sourcePage) return [];

  return allPages
    .filter((p) => p.id !== sourceId)
    .map((p) => ({
      page_id: p.id,
      title: p.title,
      score: computeScore(sourcePage.parsedCategories, p.parsedCategories, weights, mode),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

export interface RawPage {
  id?: number;
  title: string;
  categories: string;
}

/**
 * محاسبه تمامی کاندیداها برای تمام صفحات
 */
export function computeAllCandidates(pages: RawPage[], weights: Record<string, number>, mode: 'linear' | 'weighted'): Map<number, Candidate[]> {
  const parsedPages: ParsedPage[] = pages
    .filter((p) => p.id !== undefined)
    .map((p) => ({
      id: p.id as number,
      title: p.title,
      parsedCategories: JSON.parse(p.categories) as CategoriesMap,
    }));

  const map = new Map<number, Candidate[]>();

  parsedPages.forEach((page) => {
    map.set(page.id, findTopCandidates(page.id, parsedPages, weights, mode));
  });

  return map;
}
