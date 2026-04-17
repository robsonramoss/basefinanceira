"use client";

/**
 * Hook para tema dos gráficos Recharts.
 * Lê os CSS custom properties definidos no globals.css
 * e retorna os valores corretos para o tema atual.
 * 
 * Uso:
 * const ct = useChartTheme();
 * <CartesianGrid stroke={ct.grid} />
 * <XAxis tick={{ fill: ct.axis }} />
 * <Tooltip contentStyle={{ backgroundColor: ct.tooltipBg, borderColor: ct.tooltipBorder, color: ct.tooltipText }} />
 */
export function useChartTheme() {
    // Fallback para SSR (quando document não existe)
    if (typeof document === "undefined") {
        return {
            grid: "rgba(255,255,255,0.05)",
            axis: "#71717A",
            tooltipBg: "#1F2937",
            tooltipBorder: "rgba(255,255,255,0.10)",
            tooltipText: "#D4D4D8",
            cursor: "rgba(255,255,255,0.05)",
        };
    }

    const s = getComputedStyle(document.documentElement);

    return {
        grid: s.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.05)",
        axis: s.getPropertyValue("--chart-axis").trim() || "#71717A",
        tooltipBg: s.getPropertyValue("--chart-tooltip-bg").trim() || "#1F2937",
        tooltipBorder: s.getPropertyValue("--chart-tooltip-bd").trim() || "rgba(255,255,255,0.10)",
        tooltipText: s.getPropertyValue("--chart-tooltip-tx").trim() || "#D4D4D8",
        cursor: s.getPropertyValue("--chart-cursor").trim() || "rgba(255,255,255,0.05)",
    };
}
