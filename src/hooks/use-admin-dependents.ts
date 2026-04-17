import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AdminDependent {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  usuario_principal_id: number;
  status: string;
  convite_status: string;
  auth_user_id: string | null;
  data_criacao: string;
  data_ultima_modificacao: string;
  observacoes: string | null;
  permissoes: any;
  avatar_url: string | null;
  convite_enviado_em: string;
  principal_nome: string;
  principal_email: string;
  principal_plano: string | null;
  principal_plano_id: number | null;
}

export interface DependentFilters {
  status?: string[];
  conviteStatus?: string[];
  hasLogin?: boolean;
  usuarioPrincipalId?: number;
}

export interface DependentStats {
  total_dependentes: number;
  dependentes_ativos: number;
  dependentes_inativos: number;
  convites_pendentes: number;
  convites_aceitos: number;
  com_login: number;
  sem_login: number;
}

export function useAdminDependents(
  searchTerm: string,
  page: number,
  limit: number,
  filters?: DependentFilters
) {
  const [dependents, setDependents] = useState<AdminDependent[]>([]);
  const [stats, setStats] = useState<DependentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_dependentes_stats');
      if (error) {
        // Error handled - early return
        return;
      }
      setStats(data);
    } catch (error: any) {
      // Error handled silently
    }
  };

  const fetchDependents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_dependentes', {
        p_search: searchTerm || null,
        p_status: filters?.status || null,
        p_convite_status: filters?.conviteStatus || null,
        p_has_login: filters?.hasLogin ?? null,
        p_usuario_principal_id: filters?.usuarioPrincipalId || null,
        p_limit: limit,
        p_offset: (page - 1) * limit,
      });

      if (error) {
        // Error handled - early return
        return;
      }

      setDependents(data || []);
    } catch (error: any) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const updateDependent = async (
    dependentId: number,
    updates: {
      nome?: string;
      email?: string;
      telefone?: string;
      status?: string;
      permissoes?: any;
      observacoes?: string;
    }
  ) => {
    try {
      const { error } = await supabase.rpc('admin_update_dependente', {
        p_dependente_id: dependentId,
        p_nome: updates.nome,
        p_email: updates.email,
        p_telefone: updates.telefone,
        p_status: updates.status,
        p_permissoes: updates.permissoes,
        p_observacoes: updates.observacoes,
      });

      if (error) throw error;

      await fetchDependents();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const deleteDependent = async (
    dependentId: number,
    deleteAuth: boolean = false
  ) => {
    try {
      const { error } = await supabase.rpc('admin_delete_dependente', {
        p_dependente_id: dependentId,
        p_delete_auth: deleteAuth,
      });

      if (error) throw error;

      await fetchDependents();
      await fetchStats();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (dependentId: number, newPassword: string) => {
    try {
      const { error } = await supabase.rpc('admin_reset_dependente_password', {
        p_dependente_id: dependentId,
        p_new_password: newPassword,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDependents();
  }, [searchTerm, page, limit, filters]);

  return {
    dependents,
    stats,
    loading,
    updateDependent,
    deleteDependent,
    resetPassword,
    refreshDependents: fetchDependents,
  };
}
