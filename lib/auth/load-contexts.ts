import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProfileRow, RoleContext, SchoolStatus } from '@/lib/auth/context-types';
import type { AppRole } from '@/lib/navigation';

type AssignmentRow = {
  role: AppRole;
  school_id: string | null;
  status: string;
  schools: { name: string; status: SchoolStatus } | { name: string; status: SchoolStatus }[] | null;
};

function schoolRow(
  schools: AssignmentRow['schools'],
): { name: string; status: SchoolStatus } | null {
  if (!schools) return null;
  return Array.isArray(schools) ? (schools[0] ?? null) : schools;
}

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, status')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function loadRoleContexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoleContext[]> {
  const { data, error } = await supabase
    .from('role_assignments')
    .select('role, school_id, status, schools ( name, status )')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) return [];

  const contexts: RoleContext[] = [];
  for (const row of data as unknown as AssignmentRow[]) {
    if (row.role === 'cashier' || row.role === 'school_admin') {
      const school = schoolRow(row.schools);
      if (!row.school_id || !school) continue;
      if (school.status === 'deactivated') continue;
      contexts.push({
        role: row.role,
        schoolId: row.school_id,
        schoolName: school.name,
        schoolStatus: school.status,
      });
    } else if (row.role === 'parent' || row.role === 'super_admin') {
      contexts.push({
        role: row.role,
        schoolId: null,
        schoolName: null,
        schoolStatus: null,
      });
    }
  }

  return dedupeContexts(contexts);
}

function dedupeContexts(contexts: RoleContext[]): RoleContext[] {
  const seen = new Set<string>();
  const out: RoleContext[] = [];
  for (const c of contexts) {
    const key = `${c.role}:${c.schoolId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function contextsForInterface(
  contexts: RoleContext[],
  roles: readonly AppRole[],
): RoleContext[] {
  return contexts.filter((c) => roles.includes(c.role));
}

export function matchesContext(a: RoleContext, b: RoleContext): boolean {
  return a.role === b.role && a.schoolId === b.schoolId;
}
