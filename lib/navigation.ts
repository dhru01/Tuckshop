import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  Gauge,
  GraduationCap,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Timer,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single source of truth for the four interfaces and their routes.
 * `phase` is the implementation phase in which the page becomes functional
 * (docs/IMPLEMENTATION_PLAN.md). Pages not yet built render an explicit placeholder.
 */

export type InterfaceKey = 'parent' | 'pos' | 'school' | 'admin';
export type AppRole = 'parent' | 'cashier' | 'school_admin' | 'super_admin';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  phase: number;
}

export interface InterfaceConfig {
  key: InterfaceKey;
  label: string;
  basePath: string;
  /** Roles permitted to enter this interface (still verified server-side + in the DB). */
  roles: readonly AppRole[];
  nav: readonly NavItem[];
}

export const INTERFACES: Record<InterfaceKey, InterfaceConfig> = {
  parent: {
    key: 'parent',
    label: 'Parent Portal',
    basePath: '/parent',
    roles: ['parent'],
    nav: [
      {
        href: '/parent/dashboard',
        label: 'Dashboard',
        description: 'Balances, children and recent activity',
        icon: LayoutDashboard,
        phase: 4,
      },
      {
        href: '/parent/children',
        label: 'Children',
        description: 'Linked learners and cards',
        icon: GraduationCap,
        phase: 4,
      },
      {
        href: '/parent/wallet',
        label: 'Wallet',
        description: 'Wallet balances',
        icon: Wallet,
        phase: 4,
      },
      {
        href: '/parent/top-up',
        label: 'Top up',
        description: 'Add money to a wallet',
        icon: CreditCard,
        phase: 9,
      },
      {
        href: '/parent/transactions',
        label: 'Transactions',
        description: 'Purchases and top-ups',
        icon: History,
        phase: 4,
      },
      {
        href: '/parent/spending-controls',
        label: 'Spending controls',
        description: 'Daily and weekly limits',
        icon: SlidersHorizontal,
        phase: 4,
      },
      {
        href: '/parent/notifications',
        label: 'Notifications',
        description: 'Alerts and preferences',
        icon: Bell,
        phase: 11,
      },
      {
        href: '/parent/settings',
        label: 'Settings',
        description: 'Profile and security',
        icon: Settings,
        phase: 4,
      },
    ],
  },
  pos: {
    key: 'pos',
    label: 'Tuck Shop POS',
    basePath: '/pos',
    roles: ['cashier', 'school_admin'],
    nav: [
      { href: '/pos', label: 'Sell', description: 'Point of sale', icon: ShoppingBasket, phase: 7 },
      {
        href: '/pos/transactions',
        label: 'Transactions',
        description: 'Your recent sales',
        icon: Receipt,
        phase: 7,
      },
      {
        href: '/pos/refunds',
        label: 'Refunds',
        description: 'Request and review refunds',
        icon: RotateCcw,
        phase: 7,
      },
      {
        href: '/pos/shift',
        label: 'Shift',
        description: 'Open and close your shift',
        icon: Timer,
        phase: 7,
      },
      {
        href: '/pos/settings',
        label: 'Settings',
        description: 'Device and reader',
        icon: Settings,
        phase: 7,
      },
    ],
  },
  school: {
    key: 'school',
    label: 'School Administration',
    basePath: '/school',
    roles: ['school_admin'],
    nav: [
      {
        href: '/school/dashboard',
        label: 'Dashboard',
        description: 'Sales and wallet overview',
        icon: LayoutDashboard,
        phase: 10,
      },
      {
        href: '/school/learners',
        label: 'Learners',
        description: 'Learners and guardians',
        icon: GraduationCap,
        phase: 3,
      },
      {
        href: '/school/parents',
        label: 'Parents',
        description: 'Guardians and invitations',
        icon: Users,
        phase: 3,
      },
      {
        href: '/school/cards',
        label: 'NFC cards',
        description: 'Issue, freeze and replace cards',
        icon: CreditCard,
        phase: 8,
      },
      {
        href: '/school/products',
        label: 'Products',
        description: 'Catalogue and pricing',
        icon: Package,
        phase: 6,
      },
      {
        href: '/school/inventory',
        label: 'Inventory',
        description: 'Stock and movements',
        icon: Boxes,
        phase: 6,
      },
      {
        href: '/school/transactions',
        label: 'Transactions',
        description: 'All sales and refunds',
        icon: Receipt,
        phase: 10,
      },
      {
        href: '/school/reports',
        label: 'Reports',
        description: 'Reports and CSV export',
        icon: BarChart3,
        phase: 10,
      },
      {
        href: '/school/staff',
        label: 'Staff',
        description: 'Cashiers and administrators',
        icon: UserCog,
        phase: 3,
      },
      {
        href: '/school/settings',
        label: 'Settings',
        description: 'School configuration',
        icon: Settings,
        phase: 3,
      },
    ],
  },
  admin: {
    key: 'admin',
    label: 'Platform Admin',
    basePath: '/admin',
    roles: ['super_admin'],
    nav: [
      {
        href: '/admin/dashboard',
        label: 'Dashboard',
        description: 'Platform overview',
        icon: Gauge,
        phase: 10,
      },
      {
        href: '/admin/schools',
        label: 'Schools',
        description: 'Onboarding and status',
        icon: Building2,
        phase: 3,
      },
      {
        href: '/admin/users',
        label: 'Users',
        description: 'Platform users',
        icon: Users,
        phase: 10,
      },
      {
        href: '/admin/transactions',
        label: 'Transactions',
        description: 'Platform transaction metrics',
        icon: Receipt,
        phase: 10,
      },
      {
        href: '/admin/payments',
        label: 'Payments',
        description: 'Payment health and failures',
        icon: CreditCard,
        phase: 10,
      },
      {
        href: '/admin/analytics',
        label: 'Analytics',
        description: 'Growth and usage',
        icon: BarChart3,
        phase: 10,
      },
      {
        href: '/admin/subscriptions',
        label: 'Subscriptions',
        description: 'Plans and billing',
        icon: ClipboardList,
        phase: 10,
      },
      {
        href: '/admin/audit-logs',
        label: 'Audit logs',
        description: 'Sensitive action history',
        icon: ScrollText,
        phase: 10,
      },
      {
        href: '/admin/settings',
        label: 'Settings',
        description: 'Platform configuration',
        icon: ShieldCheck,
        phase: 10,
      },
    ],
  },
};

export const INTERFACE_ICONS: Record<InterfaceKey, LucideIcon> = {
  parent: Wallet,
  pos: ShoppingBasket,
  school: Building2,
  admin: ShieldCheck,
};

/** Public + auth routes required by the brief (§2). `select-context` is added for multi-role users. */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;
export const AUTH_EXTRA_ROUTES = ['/select-context'] as const;

export const PROTECTED_PREFIXES = Object.values(INTERFACES).map((i) => i.basePath);

export function allInterfaceRoutes(): string[] {
  return Object.values(INTERFACES).flatMap((i) => i.nav.map((n) => n.href));
}

export function findNavItem(
  pathname: string,
): { iface: InterfaceConfig; item: NavItem } | undefined {
  for (const iface of Object.values(INTERFACES)) {
    const item = iface.nav.find((n) => n.href === pathname);
    if (item) return { iface, item };
  }
  return undefined;
}
