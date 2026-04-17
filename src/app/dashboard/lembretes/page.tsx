"use client";

import dynamic from "next/dynamic";

const RemindersPage = dynamic(
  () => import("@/components/dashboard/reminders-page").then(mod => mod.RemindersPage),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    ),
  }
);

export default function LembretesPage() {
  return <RemindersPage />;
}
