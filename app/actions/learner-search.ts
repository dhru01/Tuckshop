'use server';

import { requireActorForInterface } from '@/lib/auth/require-actor';
import { formatLearnerGrade } from '@/lib/school/grade-display';
import { learnerSearchOrFilter, sanitiseLearnerSearchQuery } from '@/lib/school/learner-search';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LearnerSuggestion = {
  id: string;
  label: string;
  searchText: string;
};

export async function suggestLearnersAction(raw: string): Promise<LearnerSuggestion[]> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return [];

  const query = sanitiseLearnerSearchQuery(raw);
  if (!query) return [];

  const supabase = await createSupabaseServerClient();
  const filter = learnerSearchOrFilter(query);
  let dataQuery = supabase
    .from('learners')
    .select('id, first_name, last_name, grade')
    .eq('school_id', schoolId)
    .eq('status', 'active');

  if (filter) dataQuery = dataQuery.or(filter);

  const { data } = await dataQuery
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(8);

  return (data ?? []).map((l) => ({
    id: l.id,
    label: `${l.first_name} ${l.last_name} · ${formatLearnerGrade(l.grade)}`,
    searchText: `${l.first_name} ${l.last_name}`.trim(),
  }));
}
