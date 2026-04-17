"use client";

import { Calendar, ChevronDown, X } from "lucide-react";
import { usePeriodFilter, type PeriodFilter } from "@/hooks/use-period-filter";
import { useLanguage } from "@/contexts/language-context";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PeriodFilterDropdown() {
  const { t, language } = useLanguage();
  const { period, customRange, changePeriod, setCustomDateRange } = usePeriodFilter();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = {
    pt: ptBR,
    en: undefined,
    es: undefined
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obter label do período atual
  const getPeriodLabel = () => {
    if (period === 'custom' && customRange) {
      // Parse as local date to avoid timezone issues
      const [startYear, startMonth, startDay] = customRange.start.split('-').map(Number);
      const [endYear, endMonth, endDay] = customRange.end.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`;
    }
    switch (period) {
      case 'day': return t('header.period.day');
      case 'week': return t('header.period.week');
      case 'month': return t('header.period.month');
      case 'year': return t('header.period.year');
      default: return t('header.period.month');
    }
  };

  const handlePeriodSelect = (p: PeriodFilter) => {
    if (p === 'custom') {
      setShowCustomModal(true);
      setIsOpen(false);
    } else {
      changePeriod(p);
      setIsOpen(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
      setShowCustomModal(false);
      setStartDate("");
      setEndDate("");
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Botão Principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-[var(--bg-card-inner)] border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] min-w-[120px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="truncate">{getPeriodLabel()}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-lg shadow-xl z-50 py-1">
            {(['day', 'week', 'month', 'year'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodSelect(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {p === 'day' && t('header.period.day')}
                {p === 'week' && t('header.period.week')}
                {p === 'month' && t('header.period.month')}
                {p === 'year' && t('header.period.year')}
              </button>
            ))}
            
            <div className="border-t border-[var(--border-medium)] my-1" />
            
            <button
              onClick={() => handlePeriodSelect('custom')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                period === 'custom'
                  ? 'bg-primary text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t('header.period.custom')}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Data Customizada */}
      {showCustomModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50" 
            onClick={() => setShowCustomModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t('header.period.custom')}
                </h3>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t('reports.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {t('reports.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-primary"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleApplyCustomRange}
                    disabled={!startDate || !endDate}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('reports.apply')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
