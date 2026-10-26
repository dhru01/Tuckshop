import type { User } from '@supabase/supabase-js';

import type { AppRole } from '@/lib/navigation';

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'disabled' | 'pending_deletion';
};

export type SchoolStatus = 'pending' | 'active' | 'suspended' | 'deactivated';

export type RoleContext = {
  role: AppRole;
  schoolId: string | null;
  schoolName: string | null;
  schoolStatus: SchoolStatus | null;
};

export type AuthenticatedAccess = {
  kind: 'authenticated';
  user: User;
  profile: ProfileRow;
  /** Context chosen for this request (validated against DB + cookie preference). */
  active: RoleContext;
  /** All contexts the user may switch to. */
  contexts: RoleContext[];
};
