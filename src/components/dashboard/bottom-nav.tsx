"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navigation = [
    {
      name: t('sidebar.dashboard'),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: t('sidebar.transactions'),
      href: "/dashboard/transacoes",
      icon: Receipt,
    },
    {
      name: t('sidebar.reports'),
      href: "/dashboard/relatorios",
      icon: BarChart3,
    },
    {
      name: t('sidebar.accounts'),
      href: "/dashboard/contas",
      icon: Wallet,
    },
    {
      name: t('sidebar.settings'),
      href: "/dashboard/configuracoes",
      icon: Settings,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-card)] border-t border-[var(--border-default)] safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium truncate max-w-full">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
