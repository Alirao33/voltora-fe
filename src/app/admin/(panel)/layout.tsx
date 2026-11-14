'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RequireAuth, isSuperAdmin, useAuth } from '@/components/AuthProvider';
import { Icons, PanelShell, type NavItem } from '@/components/PanelShell';

const SUPER_ONLY_PREFIXES = [
  '/admin/payments',
  '/admin/plans',
  '/admin/pricing',
  '/admin/fleet',
  '/admin/users',
  '/admin/audit',
];

const superAdminNav: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: Icons.chart, exact: true },
  { section: 'Network' },
  { href: '/admin/sites', label: 'Sites & lockers', icon: Icons.pin },
  { href: '/admin/batteries', label: 'Batteries', icon: Icons.battery },
  { href: '/admin/telemetry', label: 'Telemetry', icon: Icons.pulse },
  { href: '/admin/alerts', label: 'Alerts', icon: Icons.bell },
  { section: 'Commerce' },
  { href: '/admin/orders', label: 'Orders', icon: Icons.receipt },
  { href: '/admin/payments', label: 'Payments', icon: Icons.card },
  { href: '/admin/plans', label: 'Plans', icon: Icons.tag },
  { href: '/admin/pricing', label: 'Pricing engine', icon: Icons.sliders },
  { section: 'Operations' },
  { href: '/admin/fleet', label: 'Vans & routes', icon: Icons.truck },
  { href: '/admin/forecast', label: 'Forecasting', icon: Icons.brain },
  { href: '/admin/reports', label: 'Reports', icon: Icons.chart },
  { section: 'Admin' },
  { href: '/admin/users', label: 'Users', icon: Icons.users },
  { href: '/admin/audit', label: 'Audit log', icon: Icons.list },
];

const stationAdminNav: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: Icons.chart, exact: true },
  { section: 'Station Network' },
  { href: '/admin/sites', label: 'My station & lockers', icon: Icons.pin },
  { href: '/admin/batteries', label: 'Batteries', icon: Icons.battery },
  { href: '/admin/telemetry', label: 'Telemetry', icon: Icons.pulse },
  { href: '/admin/alerts', label: 'Alerts', icon: Icons.bell },
  { section: 'Operations' },
  { href: '/admin/orders', label: 'Orders', icon: Icons.receipt },
  { href: '/admin/forecast', label: 'Forecasting', icon: Icons.brain },
  { href: '/admin/reports', label: 'Reports', icon: Icons.chart },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const superAdmin = isSuperAdmin(user);

  const blocked =
    !!user &&
    !superAdmin &&
    SUPER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (blocked) router.replace('/admin');
  }, [blocked, router]);

  return (
    <RequireAuth roles={['ADMIN']} loginPath="/admin/login">
      <PanelShell
        nav={superAdmin ? superAdminNav : stationAdminNav}
        area={superAdmin ? 'Admin' : 'Station Admin'}
        logoutTo="/admin/login"
      >
        {blocked ? null : children}
      </PanelShell>
    </RequireAuth>
  );
}