import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  id: number;
  created_at?: string;
  nome: string;
  email: string;
  celular?: string;
  auth_user: string;
  plano?: string;
  plano_id?: number;
  status?: string;
  idioma?: 'pt' | 'es' | 'en';
  moeda?: 'BRL' | 'USD' | 'EUR' | 'PYG' | 'ARS';
  data_fim_plano?: string;
  exibir_modal_boas_vindas?: boolean; // Controla se o modal de boas vindas deve ser exibido
  is_dependente?: boolean; // Indica se é usuário dependente
  usuario_principal_id?: number; // ID do usuário principal (se for dependente)
  dependente_id?: number; // ID na tabela usuarios_dependentes (se for dependente)
  tipos_conta_permitidos?: string[]; // Tipos de conta que dependente pode acessar (pessoal, pj)
  permite_investimentos_dependente?: boolean; // Permissão individual de investimentos do dependente (default true)
  permissoes?: { // Objeto completo de permissoes do dependente (null para principais)
    pode_ver_dados_admin?: boolean;
    pode_ver_outros_membros?: boolean;
    pode_criar_transacoes?: boolean;
    pode_editar_transacoes?: boolean;
    pode_deletar_transacoes?: boolean;
    pode_ver_relatorios?: boolean;
    pode_gerenciar_contas?: boolean;
    pode_gerenciar_cartoes?: boolean;
    pode_convidar_membros?: boolean;
    permite_investimentos?: boolean;
    nivel_acesso?: string;
    tipos_conta_permitidos?: string[];
  };
  max_usuarios_dependentes?: number; // Limite de dependentes do plano
  permite_compartilhamento?: boolean; // Se o plano permite compartilhamento
  plano_recursos?: string[]; // Lista de recursos/benefícios do plano
  [key: string]: any; // Permitir outras colunas do banco
}

export function useUser() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      // 1. Buscar usuário da autenticação
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authUser) return { user: null, profile: null };

      // 2. Tentar buscar como usuário principal
      const { data: profileData, error: profileError } = await supabase
        .from('usuarios')
        .select(`
          *,
          planos_sistema!plano_id (
            nome,
            recursos,
            max_usuarios_dependentes,
            permite_compartilhamento
          )
        `)
        .eq('auth_user', authUser.id)
        .single();

      // Se encontrou como usuário principal, retornar
      if (profileData) {
        // Supabase retorna planos_sistema como objeto quando há apenas 1 resultado
        const planosData = Array.isArray(profileData.planos_sistema)
          ? profileData.planos_sistema[0]
          : profileData.planos_sistema;

        const finalProfile = {
          user: authUser,
          profile: {
            ...profileData,
            is_dependente: false,
            plano_nome: planosData?.nome || null,
            plano_recursos: planosData?.recursos || [],
            max_usuarios_dependentes: planosData?.max_usuarios_dependentes || 0,
            permite_compartilhamento: planosData?.permite_compartilhamento || false
          } as UserProfile
        };

        // Salvar no localStorage para evitar flash no refresh
        try {
          localStorage.setItem('user_profile_cache', JSON.stringify(finalProfile));
        } catch (e) {
        }

        return finalProfile;
      }

      // 3. Se não encontrou, verificar se é usuário dependente
      const { data: dependenteData, error: dependenteError } = await supabase
        .from('usuarios_dependentes')
        .select('id, nome, email, telefone, usuario_principal_id, status, permissoes')
        .eq('auth_user_id', authUser.id)
        .eq('status', 'ativo')
        .single();

      if (dependenteData) {
        // Buscar dados do plano via RPC SECURITY DEFINER
        // Necessário para evitar recursão infinita com as policies de RLS da tabela usuarios
        // Mesmo padrão de obter_uuid_proprietario()
        const { data: planoData } = await supabase
          .rpc('obter_dados_plano_usuario');

        const principalPlano = planoData?.[0] || null;

        const tiposContaPermitidos = (dependenteData.permissoes as any)?.tipos_conta_permitidos || ['pessoal', 'pj'];

        // permite_investimentos do dependente: lido do permissoes individual
        // Default: true (herda do plano). O principal pode restringir para false.
        const permiteInvestimentosDependente = (dependenteData.permissoes as any)?.permite_investimentos !== false;

        const finalProfile = {
          user: authUser,
          profile: {
            id: dependenteData.usuario_principal_id, // Usar ID do principal para queries
            nome: dependenteData.nome,
            email: dependenteData.email,
            celular: dependenteData.telefone,
            auth_user: authUser.id,
            idioma: principalPlano?.idioma || 'pt',
            moeda: principalPlano?.moeda || 'BRL',
            plano: principalPlano?.plano,
            plano_id: principalPlano?.plano_id,
            plano_nome: principalPlano?.plano_nome || null,
            plano_recursos: principalPlano?.recursos || [],
            is_dependente: true,
            usuario_principal_id: dependenteData.usuario_principal_id,
            dependente_id: dependenteData.id,
            tipos_conta_permitidos: tiposContaPermitidos,
            permite_investimentos_dependente: permiteInvestimentosDependente,
            permissoes: dependenteData.permissoes || null, // Objeto completo para verificação de permissões
            max_usuarios_dependentes: principalPlano?.max_usuarios_dependentes || 0,
            permite_compartilhamento: principalPlano?.permite_compartilhamento || false
          } as UserProfile
        };


        // Salvar no localStorage para evitar flash no refresh
        try {
          localStorage.setItem('user_profile_cache', JSON.stringify(finalProfile));
        } catch (e) {
        }

        return finalProfile;
      }

      // Se não encontrou nem como principal nem como dependente
      return { user: authUser, profile: null };
    },
    initialData: () => {
      // Tentar restaurar do localStorage antes de buscar do Supabase
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('user_profile_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            // Invalidar cache de dependentes desatualizado:
            // 1. Sem plano_id (versão bloqueada por RLS)
            // 2. Sem o campo permite_investimentos_dependente (versão pré-fix)
            // 3. Sem o campo permissoes (versão pré-fix de permissões detalhadas)
            if (parsed?.profile?.is_dependente && (
              !parsed?.profile?.plano_id ||
              parsed?.profile?.permite_investimentos_dependente === undefined ||
              parsed?.profile?.permissoes === undefined
            )) {
              localStorage.removeItem('user_profile_cache');
              return undefined;
            }
            return parsed;
          }
        } catch (e) {
        }
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache (reduzido para atualizar permissões mais rápido)
    gcTime: 1000 * 60 * 30, // 30 minutos em cache
    retry: 1,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!data?.user) throw new Error('Usuário não logado');

      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('auth_user', data.user.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: (updates) => {
      // Atualizar cache otimisticamente
      queryClient.setQueryData(['user-profile'], (old: any) => ({
        ...old,
        profile: { ...old.profile, ...updates }
      }));
    }
  });

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    updateProfile: async (updates: Partial<UserProfile>) => {
      try {
        await updateProfileMutation.mutateAsync(updates);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] })
  };
}
