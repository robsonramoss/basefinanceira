import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

const CACHE_KEY = 'plan_permissions_cache';

interface PlanPermissionsCache {
  plano_id: number;
  permite_modo_pj: boolean;
  permite_investimentos_plano: boolean;
}

function loadCache(planoId: number): PlanPermissionsCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: PlanPermissionsCache = JSON.parse(raw);
    // Cache só é válido se for do mesmo plano_id
    if (parsed.plano_id !== planoId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: PlanPermissionsCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { }
}

export function useUserPlan() {
  const { profile } = useUser();

  // Inicializar do cache para evitar flash na sidebar
  const getCachedInitial = (field: 'permite_modo_pj' | 'permite_investimentos_plano', defaultValue: boolean) => {
    if (!profile?.plano_id) return defaultValue;
    const cached = loadCache(profile.plano_id);
    return cached ? cached[field] : defaultValue;
  };

  const [permiteModoPJ, setPermiteModoPJ] = useState(() =>
    getCachedInitial('permite_modo_pj', true)
  );
  const [permiteInvestimentosPlano, setPermiteInvestimentosPlano] = useState(() =>
    getCachedInitial('permite_investimentos_plano', false)
  );
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlanPermissions = async () => {
      if (!profile?.plano_id) {
        setPermiteModoPJ(true);
        setPermiteInvestimentosPlano(false);
        setLoading(false);
        return;
      }

      // Verificar cache antes de buscar do banco
      const cached = loadCache(profile.plano_id);
      if (cached) {
        setPermiteModoPJ(cached.permite_modo_pj);
        setPermiteInvestimentosPlano(cached.permite_investimentos_plano);
        setLoading(false);
        return; // Cache hit — sem chamada ao banco
      }

      try {
        const { data, error } = await supabase
          .from("planos_sistema")
          .select("permite_modo_pj, permite_investimentos")
          .eq("id", profile.plano_id)
          .single();

        if (error) {
          setPermiteModoPJ(true);
          setPermiteInvestimentosPlano(false);
        } else {
          const pj = data?.permite_modo_pj !== false;
          const inv = data?.permite_investimentos === true;

          setPermiteModoPJ(pj);
          setPermiteInvestimentosPlano(inv);

          // Salvar no cache para próximos refreshes
          saveCache({
            plano_id: profile.plano_id,
            permite_modo_pj: pj,
            permite_investimentos_plano: inv,
          });
        }
      } catch (err) {
        setPermiteModoPJ(true);
        setPermiteInvestimentosPlano(false);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanPermissions();
  }, [profile?.plano_id]);

  // Combina permissão do plano com permissão individual do dependente
  // Plano deve permitir E permissão individual também (default: true)
  const dependentePermiteInvestimentos = profile?.is_dependente
    ? profile?.permite_investimentos_dependente !== false
    : true;

  const permiteInvestimentos = permiteInvestimentosPlano && dependentePermiteInvestimentos;

  return { permiteModoPJ, permiteInvestimentos, loading };
}
