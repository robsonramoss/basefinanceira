"use client";

import dynamic from 'next/dynamic';

const ReportsPageDynamic = dynamic(
  () => import('@/components/dashboard/reports-page').then(m => ({ default: m.ReportsPage })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 h-64 animate-pulse" />
        ))}
      </div>
    )
  }
);

export default function RelatoriosPage() {
  return <ReportsPageDynamic />;
}
