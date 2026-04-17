"use client";

import { useLanguage } from '@/contexts/language-context';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-3 text-sm text-[var(--text-tertiary)]">
      <button
        onClick={() => setLanguage('pt')}
        className={`hover:text-[var(--text-primary)] transition-colors ${language === 'pt' ? 'font-medium text-[var(--text-primary)]' : ''
          }`}
      >
        PT
      </button>
      <span className="w-px h-4 bg-[var(--border-medium)]" />
      <button
        onClick={() => setLanguage('es')}
        className={`hover:text-[var(--text-primary)] transition-colors ${language === 'es' ? 'font-medium text-[var(--text-primary)]' : ''
          }`}
      >
        ES
      </button>
      <span className="w-px h-4 bg-[var(--border-medium)]" />
      <button
        onClick={() => setLanguage('en')}
        className={`hover:text-[var(--text-primary)] transition-colors ${language === 'en' ? 'font-medium text-[var(--text-primary)]' : ''
          }`}
      >
        EN
      </button>
    </div>
  );
}
