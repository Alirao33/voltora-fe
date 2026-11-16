'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor, RequireAuth, useAuth } from '@/components/AuthProvider';
import { Icons, PanelShell, type NavItem } from '@/components/PanelShell';

const nav: NavItem[] = [
  { href: '/rider', label: 'Home', icon: Icons.home, exact: true },
  { href: '/rider/swap', label: 'New swap', icon: Icons.bolt },
  { href: '/rider/orders', label: 'My orders', icon: Icons.receipt },
  { href: '/rider/bookings', label: 'My locker', icon: Icons.lock },
  { href: '/rider/plans', label: 'Plans', icon: Icons.tag },
  { href: '/rider/delivery', label: 'Home delivery', icon: Icons.truck },
  { section: 'More' },
  { href: '/stations', label: 'Station map', icon: Icons.pin },
  { href: '/rider/profile', label: 'Profile', icon: Icons.user },
];

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const wrongArea = !!user && user.role !== 'RIDER';

  // Delivery men and admins never see rider pages: send them to their own area.
  useEffect(() => {
    if (wrongArea && user) router.replace(homeFor(user));
  }, [wrongArea, user, router]);

  return (
    <RequireAuth>
      {wrongArea ? null : <PanelShell nav={nav} area="Rider">{children}</PanelShell>}
    </RequireAuth>
  );
}
