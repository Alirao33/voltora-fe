'use client';
import { Suspense } from 'react';
import { AdminOrdersView } from '@/components/AdminOrdersView';

export default function AdminHomeDelivery() {
  return <Suspense><AdminOrdersView homeOnly /></Suspense>;
}
