"use client";

import dynamic from 'next/dynamic';

// Importar com SSR desabilitado para evitar hydration mismatch
const TransactionPageDynamic = dynamic(
  () => import('@/components/dashboard/transaction-page').then(m => ({ default: m.TransactionPage })),
  {
    ssr: false,
    loading: () => (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--bg-active)] rounded" />
          <div className="h-4 w-32 bg-[var(--bg-active)] rounded" />
        </div>
      </div>
    )
  }
);

export default function DespesasPage() {
  return <TransactionPageDynamic type="despesa" title="Despesas" />;
}
