/** Consistent grade label in UI (DB may store `5` or `Grade 5`). */
export function formatLearnerGrade(grade: string): string {
  const trimmed = grade.trim();
  if (!trimmed) return '';
  if (/^grade\s+/i.test(trimmed)) return trimmed;
  if (/^\d{1,2}$/.test(trimmed)) return `Grade ${trimmed}`;
  return trimmed;
}
