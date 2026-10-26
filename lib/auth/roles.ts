import type { AppRole, InterfaceKey } from '@/lib/navigation';
import { INTERFACES } from '@/lib/navigation';

/** Roles that must complete MFA (AAL2) before using privileged interfaces. */
export const MFA_REQUIRED_ROLES: ReadonlySet<AppRole> = new Set(['super_admin', 'school_admin']);

export function interfaceAllowsRole(interfaceKey: InterfaceKey, role: AppRole): boolean {
  return INTERFACES[interfaceKey].roles.includes(role);
}

export function defaultDashboardPath(role: AppRole): string {
  switch (role) {
    case 'parent':
      return '/parent/dashboard';
    case 'cashier':
      return '/pos';
    case 'school_admin':
      return '/school/dashboard';
    case 'super_admin':
      return '/admin/dashboard';
    default:
      return '/';
  }
}

export function contextLabel(role: AppRole, schoolName?: string | null): string {
  switch (role) {
    case 'parent':
      return 'Parent account';
    case 'cashier':
      return schoolName ?? 'School workspace';
    case 'school_admin':
      return schoolName ?? 'School workspace';
    case 'super_admin':
      return 'Platform admin';
    default:
      return role;
  }
}
