"use client";

import { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

/**
 * Hook para acessar o tema atual e alternar entre dark/light.
 * Usa next-themes internamente.
 */
export function useTheme() {
    const { resolvedTheme, setTheme, theme } = useNextTheme();
    const isDark = resolvedTheme === "dark";

    return {
        theme,
        resolvedTheme,
        isDark,
        isLight: !isDark,
        setTheme,
        toggleTheme: () => setTheme(isDark ? "light" : "dark"),
    };
}

/**
 * Provider de tema para o app.
 * Deve envolver toda a aplicação no layout.tsx.
 * - attribute="class": aplica classe .dark ou .light no <html>
 * - defaultTheme="dark": mantém comportamento atual
 * - storageKey: persiste preferência no localStorage
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            storageKey="granazap-theme"
            disableTransitionOnChange={false}
        >
            {children}
        </NextThemesProvider>
    );
}
