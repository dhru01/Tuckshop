export const LEARNERS_PAGE_SIZE = 25;

/** Safe fragment for PostgREST `ilike` patterns (no wildcards injected by the user). */
export function sanitiseLearnerSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_*,()]/g, '').slice(0, 80);
}

export function parseLearnersPage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** PostgREST `or` filter for learner name / grade search. */
export function learnerSearchOrFilter(query: string): string | null {
  const q = sanitiseLearnerSearchQuery(query);
  if (!q) return null;
  const pattern = `%${q}%`;
  return `first_name.ilike.${pattern},last_name.ilike.${pattern},grade.ilike.${pattern}`;
}

export function learnersListHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/school/learners?${qs}` : '/school/learners';
}
