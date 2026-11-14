'use client';
import { RequireAuth } from '@/components/AuthProvider';
import { Icons, PanelShell, type NavItem } from '@/components/PanelShell';

const nav: NavItem[] = [
  { href: '/rider', label: 'Home', icon: Icons.home, exact: true },
  { href: '/rider/swap', label: 'New swap', icon: Icons.bolt },
  { href: '/rider/orders', label: 'My orders', icon: Icons.receipt },
  { href: '/rider/bookings', label: 'Locker bookings', icon: Icons.lock },
  { href: '/rider/plans', label: 'Plans', icon: Icons.tag },
  { section: 'More' },
  { href: '/stations', label: 'Station map', icon: Icons.pin },
  { href: '/rider/profile', label: 'Profile', icon: Icons.user },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PanelShell nav={nav} area="Rider">{children}</PanelShell>
    </RequireAuth>
  );
}
