"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useLanguage } from "@/contexts/language-context";
import { useBranding } from "@/contexts/branding-context";

export type TutorialModulo =
  | 'primeiros_passos'
  | 'dashboard'
  | 'receitas'
  | 'despesas'
  | 'transacoes'
  | 'cartao'
  | 'contas'
  | 'investimentos'
  | 'categorias'
  | 'programados'
  | 'metas'
  | 'relatorios'
  | 'tutoriais'
  | 'configuracoes'
  | 'ia_whats'
  | 'instalar_app'
  | 'compromissos'
  | 'plano_casal';
export type TutorialNivel = 'basico' | 'intermediario' | 'avancado';

export interface Tutorial {
  id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  thumbnail_url: string | null;
  modulo: TutorialModulo;
  ordem: number;
  ativo: boolean;
  duracao_seg: number | null;
  nivel: TutorialNivel;
  idioma: 'pt' | 'es' | 'en';
  is_new: boolean;
  created_at: string;
  updated_at: string;
  // Dados de progresso do usuário
  assistido?: boolean;
  percentual?: number;
}

export interface TutorialsByModule {
  [key: string]: Tutorial[];
}

export function useTutorials() {
  const { profile } = useUser();
  const { language } = useLanguage();
  const { settings } = useBranding();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [tutorialsByModule, setTutorialsByModule] = useState<TutorialsByModule>({});
  const [loading, setLoading] = useState(true);
  const [unwatchedCount, setUnwatchedCount] = useState(0);

  const fetchTutorials = useCallback(async () => {
    if (!profile || !settings.habilitar_modulo_tutoriais) {
      setTutorials([]);
      setTutorialsByModule({});
      setUnwatchedCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Buscar tutoriais ativos no idioma do usuário
      const { data: tutoriaisData, error: tutoriaisError } = await supabase
        .from('tutoriais')
        .select('*')
        .eq('ativo', true)
        .eq('idioma', language)
        .order('modulo', { ascending: true })
        .order('ordem', { ascending: true });

      if (tutoriaisError) throw tutoriaisError;

      if (!tutoriaisData || tutoriaisData.length === 0) {
        setTutorials([]);
        setTutorialsByModule({});
        setUnwatchedCount(0);
        return;
      }

      // 2. Buscar progresso do usuário
      const { data: progressoData, error: progressoError } = await supabase
        .from('tutoriais_progresso')
        .select('*')
        .eq('usuario_id', profile.id);

      if (progressoError) {
        console.error('Erro ao buscar progresso:', progressoError);
      }

      // 3. Combinar dados de tutoriais com progresso
      const tutoriaisWithProgress = tutoriaisData.map((tutorial) => {
        const progresso = progressoData?.find(
          (p) => p.tutorial_id === tutorial.id
        );

        return {
          ...tutorial,
          assistido: progresso?.assistido || false,
          percentual: progresso?.percentual || 0,
        };
      });

      // 4. Agrupar por módulo
      const grouped: TutorialsByModule = {};
      tutoriaisWithProgress.forEach((tutorial) => {
        if (!grouped[tutorial.modulo]) {
          grouped[tutorial.modulo] = [];
        }
        grouped[tutorial.modulo].push(tutorial);
      });

      // 5. Contar não assistidos
      const unwatched = tutoriaisWithProgress.filter((t) => !t.assistido).length;

      setTutorials(tutoriaisWithProgress);
      setTutorialsByModule(grouped);
      setUnwatchedCount(unwatched);
    } catch (error) {
      console.error('Erro ao buscar tutoriais:', error);
      setTutorials([]);
      setTutorialsByModule({});
      setUnwatchedCount(0);
    } finally {
      setLoading(false);
    }
  }, [profile, language, settings.habilitar_modulo_tutoriais]);

  useEffect(() => {
    fetchTutorials();

    const handleUpdate = () => {
      fetchTutorials();
    };
    
    // Escutar eventos de atualização para manter sincronia entre componentes (ex: Sidebar atualizando a badge)
    window.addEventListener('tutorialsChanged', handleUpdate);
    return () => window.removeEventListener('tutorialsChanged', handleUpdate);
  }, [fetchTutorials]);

  // Marcar tutorial como assistido
  const markAsWatched = async (tutorialId: string, watched: boolean = true) => {
    if (!profile) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('tutoriais_progresso')
        .upsert(
          {
            usuario_id: profile.id,
            tutorial_id: tutorialId,
            assistido: watched,
            percentual: watched ? 100 : 0,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'usuario_id,tutorial_id',
          }
        );

      if (error) throw error;

      // Atualizar estado local
      setTutorials((prev) =>
        prev.map((t) =>
          t.id === tutorialId
            ? { ...t, assistido: watched, percentual: watched ? 100 : 0 }
            : t
        )
      );

      setTutorialsByModule((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((modulo) => {
          updated[modulo] = updated[modulo].map((t) =>
            t.id === tutorialId
              ? { ...t, assistido: watched, percentual: watched ? 100 : 0 }
              : t
          );
        });
        return updated;
      });

      // Atualizar contador
      setUnwatchedCount((prev) => (watched ? Math.max(0, prev - 1) : prev + 1));
      // Disparar evento global para outros componentes (como sidebar) se atualizarem
      window.dispatchEvent(new CustomEvent('tutorialsChanged'));
    } catch (error) {
      console.error('Erro ao marcar tutorial:', error);
      throw error;
    }
  };

  // Atualizar percentual de visualização (para tracking futuro)
  const updateProgress = async (tutorialId: string, percentual: number) => {
    if (!profile) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('tutoriais_progresso')
        .upsert(
          {
            usuario_id: profile.id,
            tutorial_id: tutorialId,
            assistido: percentual >= 90, // Auto-marcar como assistido se >90%
            percentual: Math.min(100, Math.max(0, percentual)),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'usuario_id,tutorial_id',
          }
        );

      if (error) throw error;

      // Atualizar estado local
      const isWatched = percentual >= 90;
      setTutorials((prev) =>
        prev.map((t) =>
          t.id === tutorialId
            ? { ...t, assistido: isWatched, percentual }
            : t
        )
      );
      // Disparar evento global para outros componentes (como sidebar) se atualizarem
      window.dispatchEvent(new CustomEvent('tutorialsChanged'));
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  };

  // Obter tutoriais de um módulo específico
  const getTutorialsByModule = (modulo: TutorialModulo): Tutorial[] => {
    return tutorialsByModule[modulo] || [];
  };

  // Obter estatísticas de progresso
  const getProgressStats = () => {
    const total = tutorials.length;
    const watched = tutorials.filter((t) => t.assistido).length;
    const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;

    return {
      total,
      watched,
      unwatched: total - watched,
      percentage,
    };
  };

  return {
    tutorials,
    tutorialsByModule,
    loading,
    unwatchedCount,
    markAsWatched,
    updateProgress,
    getTutorialsByModule,
    getProgressStats,
    refresh: fetchTutorials,
  };
}
