"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useEffect, useState } from "react";

/**
 * Toggle para alternar entre tema escuro e claro.
 * 
 * Variantes:
 * - compact: só ícone (para header/mobile)
 * - default: botão completo com label (para sidebar)
 * 
 * Usa `mounted` para evitar hydration mismatch com SSR.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { resolvedTheme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Placeholder enquanto não monta (evita flash de conteúdo errado)
    if (!mounted) {
        return <div className={compact ? "w-9 h-9" : "w-full h-11"} />;
    }

    const isDark = resolvedTheme === "dark";

    if (compact) {
        return (
            <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
                {isDark ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                    <Moon className="w-5 h-5 text-blue-400" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full
                 bg-[var(--bg-card-inner)] border border-[var(--border-medium)]
                 hover:border-primary/30 transition-all"
            aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
            <div
                className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? "bg-zinc-700" : "bg-green-500/20"
                    }`}
            >
                <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${isDark ? "left-0.5 bg-zinc-400" : "left-5 bg-green-500"
                        }`}
                />
            </div>
            {isDark ? (
                <>
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-[var(--text-secondary)]">
                        Modo Escuro
                    </span>
                </>
            ) : (
                <>
                    <Sun className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-[var(--text-secondary)]">
                        Modo Claro
                    </span>
                </>
            )}
        </button>
    );
}
