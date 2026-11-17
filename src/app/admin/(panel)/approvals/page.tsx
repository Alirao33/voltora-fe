'use client';
import { PricingApprovals } from '@/components/PricingApprovals';
import { PageHeader } from '@/components/ui';

export default function Approvals() {
  return (
    <>
      <PageHeader title="Approvals" desc="Review the pricing changes that station admins ask for, and see every decision." />
      <PricingApprovals />
    </>
  );
}
