"use client";

import { useState } from "react";
import { GraduationCap, Play, CheckCircle2, Clock, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useTutorials, TutorialModulo } from "@/hooks/use-tutorials";
import { useLanguage } from "@/contexts/language-context";
import { TutorialCard } from "@/components/dashboard/tutoriais/tutorial-card";
import { TutorialPlayerModal } from "@/components/dashboard/tutoriais/tutorial-player-modal";
import { WelcomeTourModal } from "@/components/dashboard/welcome-tour-modal";

const MODULES: { key: TutorialModulo; labelKey: string }[] = [
  { key: 'primeiros_passos', labelKey: 'tutorials.modules.primeiros_passos' },
  { key: 'dashboard', labelKey: 'tutorials.modules.dashboard' },
  { key: 'receitas', labelKey: 'tutorials.modules.receitas' },
  { key: 'despesas', labelKey: 'tutorials.modules.despesas' },
  { key: 'transacoes', labelKey: 'tutorials.modules.transacoes' },
  { key: 'cartao', labelKey: 'tutorials.modules.cartao' },
  { key: 'contas', labelKey: 'tutorials.modules.contas' },
  { key: 'investimentos', labelKey: 'tutorials.modules.investimentos' },
  { key: 'categorias', labelKey: 'tutorials.modules.categorias' },
  { key: 'programados', labelKey: 'tutorials.modules.programados' },
  { key: 'metas', labelKey: 'tutorials.modules.metas' },
  { key: 'relatorios', labelKey: 'tutorials.modules.relatorios' },
  { key: 'tutoriais', labelKey: 'tutorials.modules.tutoriais' },
  { key: 'configuracoes', labelKey: 'tutorials.modules.configuracoes' },
  { key: 'ia_whats', labelKey: 'tutorials.modules.ia_whats' },
  { key: 'instalar_app', labelKey: 'tutorials.modules.instalar_app' },
  { key: 'compromissos', labelKey: 'tutorials.modules.compromissos' },
  { key: 'plano_casal', labelKey: 'tutorials.modules.plano_casal' },
];

export default function TutoriaisPage() {
  const { t } = useLanguage();
  const { profile } = useUser();
  const {
    tutorialsByModule,
    loading,
    unwatchedCount,
    markAsWatched,
    getProgressStats,
  } = useTutorials();

  const [activeModule, setActiveModule] = useState<TutorialModulo>('primeiros_passos');
  const [selectedTutorial, setSelectedTutorial] = useState<string | null>(null);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);

  const stats = getProgressStats();
  const moduleTutorials = tutorialsByModule[activeModule] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('tutorials.title')}</h1>
              <p className="text-muted-foreground">{t('tutorials.subtitle')}</p>
            </div>
          </div>

          {/* Botão discreto para reabrir Welcome Tour */}
          <button
            onClick={() => setShowWelcomeTour(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors border border-transparent hover:border-primary/20 whitespace-nowrap"
            title="Ver tour de boas-vindas"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tour</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('common.total'), val: stats.total, icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: t('tutorials.badge.watched'), val: stats.watched, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: t('common.pending'), val: stats.unwatched, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: t('common.progress'), val: `${stats.percentage}%`, icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {MODULES.map((module) => {
            const count = tutorialsByModule[module.key]?.length || 0;
            if (count === 0) return null;

            return (
              <button
                key={module.key}
                onClick={() => setActiveModule(module.key)}
                className={cn(
                  "px-4 py-3 font-medium text-sm transition-colors relative whitespace-nowrap",
                  activeModule === module.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(module.labelKey)}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tutorials Grid */}
      {moduleTutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('tutorials.empty')}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Nenhum tutorial disponível neste módulo ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleTutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              onPlay={() => setSelectedTutorial(tutorial.id)}
              onToggleWatched={async () => {
                await markAsWatched(tutorial.id, !tutorial.assistido);
              }}
            />
          ))}
        </div>
      )}

      {/* Player Modal */}
      {selectedTutorial && (
        <TutorialPlayerModal
          tutorialId={selectedTutorial}
          tutorials={moduleTutorials}
          onClose={() => setSelectedTutorial(null)}
          onNavigate={(id) => setSelectedTutorial(id)}
        />
      )}

      {/* Welcome Tour Modal - Manual */}
      {showWelcomeTour && (
        <WelcomeTourModal
          forceOpen={true}
          onForceClose={() => setShowWelcomeTour(false)}
        />
      )}
    </div>
  );
}
