'use client';
import { Suspense } from 'react';
import { AdminOrdersView } from '@/components/AdminOrdersView';

export default function AdminOrders() {
  return <Suspense><AdminOrdersView /></Suspense>;
}
