import 'server-only';

import type { InterfaceAccess } from '@/lib/auth/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { InterfaceKey } from '@/lib/navigation';

export type ShellWorkspace = {
  name: string;
  hint: string;
  /** Single letter or two letters for the avatar badge. */
  initial: string;
  manageHref?: string;
  switchHref?: string;
};

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
}

async function loadParentSchoolNames(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('parent_learner_relationships')
    .select('schools ( name )')
    .eq('parent_id', userId)
    .eq('status', 'active');

  const names = new Set<string>();
  for (const row of data ?? []) {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    if (school?.name) names.add(school.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function resolveShellWorkspace(
  access: InterfaceAccess,
  interfaceKey: InterfaceKey,
): Promise<ShellWorkspace> {
  const switchHref =
    access.kind === 'authenticated' && access.contexts.length > 1 ? '/select-context' : undefined;

  if (access.kind === 'preview') {
    return {
      name: interfaceKey === 'parent' ? 'Your school' : 'School workspace',
      hint: 'Preview',
      initial: 'T',
    };
  }

  if (interfaceKey === 'school' && access.kind === 'authenticated') {
    const name = access.active.schoolName ?? 'School workspace';
    return {
      name,
      hint: 'School',
      initial: initials(name),
      manageHref: '/school/settings',
      switchHref,
    };
  }

  if (interfaceKey === 'admin') {
    return {
      name: 'Platform',
      hint: 'Administration',
      initial: 'T',
      switchHref,
    };
  }

  if (interfaceKey === 'parent') {
    const schoolNames = await loadParentSchoolNames(access.user.id);
    if (schoolNames.length === 0) {
      return {
        name: 'No school linked',
        hint: 'Accept a school invite',
        initial: '?',
        switchHref,
      };
    }
    const primary = schoolNames[0] ?? 'School';
    return {
      name: primary,
      hint: schoolNames.length > 1 ? `${schoolNames.length} schools` : 'School',
      initial: initials(primary),
      switchHref,
    };
  }

  return { name: 'Tuckshop', hint: '', initial: 'T', switchHref };
}
