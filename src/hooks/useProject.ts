import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export function useProject(projectId: string | undefined) {
  const parsedId = projectId ? parseInt(projectId, 10) : -1;

  const project = useLiveQuery(() => db.projects.get(parsedId), [parsedId]);
  const pages = useLiveQuery(() => db.pages.where('project_id').equals(parsedId).toArray(), [parsedId]);
  const weights = useLiveQuery(() => db.weights.where('project_id').equals(parsedId).toArray(), [parsedId]);
  const results = useLiveQuery(() => db.results.where('project_id').equals(parsedId).toArray(), [parsedId]);

  return {
    project,
    pages,
    weights,
    results,
    loading: (parsedId > 0) && (project === undefined || pages === undefined || weights === undefined || results === undefined)
  };
}
