'use client';
import { RequireAuth } from '@/components/AuthProvider';
import { Icons, PanelShell, type NavItem } from '@/components/PanelShell';

const nav: NavItem[] = [
  { href: '/driver', label: 'My route', icon: Icons.route, exact: true },
  { href: '/driver/history', label: 'Order history', icon: Icons.list },
  { href: '/stations', label: 'Station map', icon: Icons.pin },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['DRIVER', 'ADMIN']}>
      <PanelShell nav={nav} area="Driver">{children}</PanelShell>
    </RequireAuth>
  );
}
