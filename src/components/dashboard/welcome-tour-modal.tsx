"use client";

import { useEffect, useRef, useState } from "react";
import { X, GraduationCap, Play, ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useLanguage } from "@/contexts/language-context";
import { useBranding } from "@/contexts/branding-context";
import { useTutorials } from "@/hooks/use-tutorials";

interface WelcomeTourModalProps {
  forceOpen?: boolean;
  onForceClose?: () => void;
}

export function WelcomeTourModal({ forceOpen = false, onForceClose }: WelcomeTourModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile, updateProfile } = useUser();
  const { settings } = useBranding();
  const { tutorials, tutorialsByModule, loading, getProgressStats } = useTutorials();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Ref para garantir que a abertura automática ocorra apenas uma vez por montagem
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Se forceOpen estiver true, abrir imediatamente
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Verificar condições para mostrar o modal automaticamente
    if (loading) return;

    // Evitar múltiplas execuções: se já verificou e decidiu (não abrir), não verificar novamente
    if (hasCheckedRef.current) return;

    // Condição 1: Módulo de tutoriais deve estar habilitado
    if (!settings.habilitar_modulo_tutoriais) {
      hasCheckedRef.current = true;
      return;
    }

    // Condição 2: Usuário deve existir
    if (!profile) return;

    // Condição 3: Não pode ser dependente (apenas usuário principal)
    if (profile.is_dependente) {
      hasCheckedRef.current = true;
      return;
    }

    // Condição 4: Deve ter plano ativo (não free expirado)
    const hasActivePlan = profile.plano && profile.plano !== "Free" &&
                          (!profile.data_final_plano || new Date(profile.data_final_plano) > new Date());
    if (!hasActivePlan) {
      hasCheckedRef.current = true;
      return;
    }

    // Condição 4.5: Preferência salva no banco de dados do usuário (Cross-device)
    if (profile.exibir_modal_boas_vindas === false) {
      hasCheckedRef.current = true;
      return;
    }

    // Condição 5: Não ter dismissado antes (chave específica por usuário)
    const storageKey = `welcome_tour_dismissed_${profile.id}`;
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed) {
      hasCheckedRef.current = true;
      return;
    }

    // Condição 6: Ter tutoriais disponíveis
    if (tutorials.length === 0) return;

    // Condição 7: Usuário não assistiu NENHUM tutorial ainda
    const stats = getProgressStats();
    if (stats.watched > 0) {
      // Já assistiu — salvar dismissed automaticamente para não perguntar mais
      localStorage.setItem(storageKey, "true");
      hasCheckedRef.current = true;
      return;
    }

    // Marcar que já verificou para não disparar novamente
    hasCheckedRef.current = true;

    // Todas as condições atendidas - mostrar modal com delay de 3 segundos
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading, settings.habilitar_modulo_tutoriais, profile, tutorials, forceOpen]);

  const handleDismiss = async () => {
    // Marcar como dismissed APENAS se o usuário explicitamente pediu (checkbox)
    if (profile && dontShowAgain) {
      const storageKey = `welcome_tour_dismissed_${profile.id}`;
      localStorage.setItem(storageKey, "true");
      
      // Salva a preferência no banco de dados para sincronizar em outros dispositivos
      await updateProfile({ exibir_modal_boas_vindas: false });
    }
    setIsOpen(false);
    if (onForceClose) onForceClose();

    // Disparar evento para Product Tour saber que fechou
    if (!forceOpen) {
      window.dispatchEvent(new CustomEvent('welcomeTourClosed'));
    }
  };

  const handleExploreTutorials = async () => {
    // Se o usuário clicou em explorar, nós assumimos que ele já demonstrou engajamento,
    // então automaticamente marcamos para não interrompê-lo novamente no futuro.
    if (profile) {
      const storageKey = `welcome_tour_dismissed_${profile.id}`;
      localStorage.setItem(storageKey, "true");
      
      // Salva a preferência no banco de dados para sincronizar em outros dispositivos
      await updateProfile({ exibir_modal_boas_vindas: false });
    }
    setIsOpen(false);
    if (onForceClose) onForceClose();

    // Disparar evento para Product Tour saber que fechou
    if (!forceOpen) {
      window.dispatchEvent(new CustomEvent('welcomeTourClosed'));
    }

    router.push("/dashboard/tutoriais");
  };

  // Pegar tutoriais de "Primeiros Passos" para exibir
  const featuredTutorials = (tutorialsByModule.primeiros_passos || []).slice(0, 3);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    return `${mins} ${t('tutorials.duration')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-2xl bg-background rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 border-b">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-background/80 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary rounded-xl">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1 pr-8">
              <h2 className="text-2xl font-bold mb-2">
                {t('tutorials.welcome.title').replace('{appName}', settings.appName)}
              </h2>
              <p className="text-muted-foreground">
                {t('tutorials.welcome.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {featuredTutorials.length > 0 ? (
            <div className="space-y-3">
              {featuredTutorials.map((tutorial) => {
                const duration = formatDuration(tutorial.duracao_seg);

                return (
                  <button
                    key={tutorial.id}
                    onClick={() => {
                      handleDismiss();
                      router.push("/dashboard/tutoriais");
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors group text-left"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {tutorial.titulo}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {tutorial.descricao}
                      </p>
                    </div>
                    {duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {duration}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('tutorials.empty')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/30 border-t space-y-4">
          {/* Checkbox "Não mostrar novamente" */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-2 focus:ring-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {t('tutorials.welcome.dontShowAgain')}
            </span>
          </label>

          {/* Botões */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('tutorials.welcome.skip')}
            </button>
            <button
              onClick={handleExploreTutorials}
              className={cn(
                "px-6 py-2.5 bg-primary text-primary-foreground rounded-lg",
                "text-sm font-semibold hover:bg-primary/90 transition-colors",
                "flex items-center gap-2 shadow-lg shadow-primary/20"
              )}
            >
              {t('tutorials.welcome.explore')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
