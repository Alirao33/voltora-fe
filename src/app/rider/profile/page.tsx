'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Badge, Button, Card, PageHeader } from '@/components/ui';

export default function Profile() {
  const { user, signOut, refresh } = useAuth();
  const router = useRouter();
  if (!user) return null;
  const rows: [string, React.ReactNode][] = [
    ['Name', user.full_name || '—'],
    ['Username', user.username || '—'],
    ['Phone', user.phone || '—'],
    ['Role', <Badge key="r" value={user.role} />],
    ['Account', <Badge key="a" value={user.is_active ? 'ACTIVE' : 'DISABLED'} />],
    ['VIP', user.is_vip ? 'Yes — VIP slots unlocked' : 'No'],
    ['Points', user.points],
    ['User ID', user.id],
  ];
  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" actions={<Button variant="secondary" onClick={refresh}>Refresh</Button>} />
      <Card>
        <dl className="divide-y divide-ink-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-3 text-sm">
              <dt className="text-ink-500">{k}</dt>
              <dd className="font-medium text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        <Button className="mt-6" variant="danger" onClick={() => { signOut(); router.replace('/login'); }}>Sign out</Button>
      </Card>
    </div>
  );
}
