import Dexie, { type Table } from 'dexie';

export interface Project {
  id?: number;
  name: string;
  created_at: string;
  scoring_mode: 'linear' | 'weighted';
  max_links: number;
}

export interface Page {
  id?: number;
  project_id: number;
  title: string;
  categories: string; // JSON string
}

export interface Weight {
  id?: number;
  project_id: number;
  category_name: string;
  weight_value: number; // 1-5
}

export interface Result {
  id?: number;
  project_id: number;
  source_page_id: number;
  recommended_links: string; // JSON string of [{ page_id, title, score, reason }]
  generated_at: string;
}

export class LinkMeshDB extends Dexie {
  projects!: Table<Project>;
  pages!: Table<Page>;
  weights!: Table<Weight>;
  results!: Table<Result>;

  constructor() {
    super('LinkMeshDB');
    this.version(1).stores({
      projects: '++id, name, created_at',
      pages: '++id, project_id, title',
      weights: '++id, project_id, category_name',
      results: '++id, project_id, source_page_id'
    });
  }
}

export const db = new LinkMeshDB();
