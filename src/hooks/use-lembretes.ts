"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useAccountFilter } from "./use-account-filter";

export interface Lembrete {
  id: number;
  created_at: string;
  updated_at: string;
  usuario_id: number;
  titulo: string;
  descricao: string | null;
  data_lembrete: string;
  hora_lembrete: string | null;
  hora_fim: string | null;
  status: 'ativo' | 'executado' | 'cancelado';
  notificado: boolean;
  data_notificacao: string | null;
  recorrente: boolean;
  tipo_recorrencia: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null;
  data_ultima_alteracao: string;
  calendar_type: 'pf' | 'pj';
  google_event_id: string | null;
  last_updated_by: string;
  cor: string | null;
}

export interface LembreteInput {
  titulo: string;
  descricao?: string | null;
  data_lembrete: string;
  hora_lembrete?: string | null;
  hora_fim?: string | null;
  status?: 'ativo' | 'executado' | 'cancelado';
  recorrente?: boolean;
  tipo_recorrencia?: 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | null;
  cor?: string | null;
}

// Fire-and-forget Google Calendar sync (non-blocking)
async function syncWithGoogleCalendar(
  action: 'create' | 'update' | 'delete',
  lembreteId: number,
  data?: Record<string, any>,
  calendarType: 'pf' | 'pj' = 'pf'
) {
  try {
    const res = await fetch('/api/google-calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        lembrete_id: lembreteId,
        data: data || null,
        calendar_type: calendarType,
      }),
    });
    if (!res.ok) {
      await res.json().catch(() => ({}));
      // GCal sync failed silently - non-blocking
    }
  } catch (err) {
    // GCal sync network error - non-blocking
  }
}

// Read calendar type fresh from localStorage to avoid stale closures in mutations
function getCurrentCalendarType(): 'pf' | 'pj' {
  if (typeof window === 'undefined') return 'pf';
  const saved = localStorage.getItem('account_filter');
  return saved === 'pj' ? 'pj' : 'pf';
}

export function useLembretes() {
  const { profile } = useUser();
  useAccountFilter(); // keep subscription active for reactivity
  const queryClient = useQueryClient();
  const supabase = createClient();

  const queryKey = ['lembretes', profile?.id];

  const { data: lembretes = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('usuario_id', profile.id)
        .order('data_lembrete', { ascending: true });

      if (error) throw error;
      return (data || []) as Lembrete[];
    },
    enabled: !!profile?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: LembreteInput) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      const calType = getCurrentCalendarType();

      const { data, error } = await supabase
        .from('lembretes')
        .insert({
          usuario_id: profile.id,
          titulo: input.titulo,
          descricao: input.descricao || null,
          data_lembrete: input.data_lembrete,
          hora_lembrete: input.hora_lembrete || null,
          hora_fim: input.hora_fim || null,
          status: input.status || 'ativo',
          recorrente: input.recorrente || false,
          tipo_recorrencia: input.recorrente ? input.tipo_recorrencia : null,
          calendar_type: calType,
          last_updated_by: 'user',
        })
        .select()
        .single();

      if (error) throw error;

      // Sync with Google Calendar (fire-and-forget)
      if (data) {
        syncWithGoogleCalendar('create', data.id, {
          titulo: input.titulo,
          descricao: input.descricao,
          data_lembrete: input.data_lembrete,
          hora_lembrete: input.hora_lembrete,
          hora_fim: input.hora_fim,
          recorrente: input.recorrente,
          tipo_recorrencia: input.tipo_recorrencia,
        }, calType);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: LembreteInput & { id: number }) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      const updateData: Record<string, any> = {
        titulo: input.titulo,
        descricao: input.descricao || null,
        data_lembrete: input.data_lembrete,
        hora_lembrete: input.hora_lembrete || null,
        hora_fim: input.hora_fim || null,
        recorrente: input.recorrente || false,
        tipo_recorrencia: input.recorrente ? input.tipo_recorrencia : null,
        last_updated_by: 'user',
      };

      if (input.status) {
        updateData.status = input.status;
      }

      if (input.cor !== undefined) {
        updateData.cor = input.cor;
      }

      const { data, error } = await supabase
        .from('lembretes')
        .update(updateData)
        .eq('id', id)
        .eq('usuario_id', profile.id)
        .select()
        .single();

      if (error) throw error;

      // Sync with Google Calendar (fire-and-forget)
      if (data) {
        syncWithGoogleCalendar('update', id, {
          titulo: input.titulo,
          descricao: input.descricao,
          data_lembrete: input.data_lembrete,
          hora_lembrete: input.hora_lembrete,
          hora_fim: input.hora_fim,
          recorrente: input.recorrente,
          tipo_recorrencia: input.tipo_recorrencia,
        }, getCurrentCalendarType());
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      // Sync delete with Google Calendar BEFORE deleting from DB (must await)
      await syncWithGoogleCalendar('delete', id, undefined, getCurrentCalendarType());

      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id)
        .eq('usuario_id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'ativo' | 'executado' | 'cancelado' }) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('lembretes')
        .update({ status, last_updated_by: 'user' })
        .eq('id', id)
        .eq('usuario_id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    lembretes,
    loading: isLoading,
    error,
    createLembrete: createMutation.mutateAsync,
    updateLembrete: updateMutation.mutateAsync,
    deleteLembrete: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}
