import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  tipoRecorrenciaToRRule,
  getGoogleCredentials,
  getUserTokens,
} from '@/lib/google-calendar';

/**
 * POST /api/google-calendar/sync
 * Sync a lembrete action (create/update/delete) with Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get usuario_id from usuarios
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Check if Google Calendar is configured
    const credentials = await getGoogleCredentials(supabase);
    if (!credentials) {
      return NextResponse.json({ error: 'Google Calendar não configurado pelo admin' }, { status: 400 });
    }

    const tokens = await getUserTokens(supabase, usuario.id);
    if (!tokens) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 });
    }

    const body = await request.json();
    const { action, lembrete_id, data: lembreteData, calendar_type: calType } = body;
    const calendarType: 'pf' | 'pj' = calType === 'pj' ? 'pj' : 'pf';
    if (!action) {
      return NextResponse.json({ error: 'Action é obrigatório' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        if (!lembreteData || !lembrete_id) {
          return NextResponse.json({ error: 'Dados do lembrete são obrigatórios' }, { status: 400 });
        }

        const rrule = tipoRecorrenciaToRRule(lembreteData.tipo_recorrencia, lembreteData.recorrente);

        const googleEventId = await createGoogleEvent(supabase, usuario.id, {
          summary: lembreteData.titulo,
          description: lembreteData.descricao || '',
          start_date: lembreteData.data_lembrete,
          start_time: lembreteData.hora_lembrete || null,
          end_time: lembreteData.hora_fim || null,
          recurrence_rule: rrule,
        }, calendarType);

        if (googleEventId) {
          // Save google_event_id and calendar_type back to lembrete
          await supabase
            .from('lembretes')
            .update({ google_event_id: googleEventId, calendar_type: calendarType, last_updated_by: 'google_sync' })
            .eq('id', lembrete_id)
            .eq('usuario_id', usuario.id);

          // Update last_sync_at
          await supabase
            .from('google_calendar_integrations')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', tokens.id);

          return NextResponse.json({ success: true, google_event_id: googleEventId });
        }

        return NextResponse.json({ error: 'Falha ao criar evento no Google Calendar' }, { status: 500 });
      }

      case 'update': {
        if (!lembreteData || !lembrete_id) {
          return NextResponse.json({ error: 'Dados do lembrete são obrigatórios' }, { status: 400 });
        }

        // Get current google_event_id
        const { data: lembrete } = await supabase
          .from('lembretes')
          .select('google_event_id, calendar_type')
          .eq('id', lembrete_id)
          .eq('usuario_id', usuario.id)
          .single();

        if (!lembrete?.google_event_id) {
          // No google event yet, create one
          const rrule = tipoRecorrenciaToRRule(lembreteData.tipo_recorrencia, lembreteData.recorrente);
          const googleEventId = await createGoogleEvent(supabase, usuario.id, {
            summary: lembreteData.titulo,
            description: lembreteData.descricao || '',
            start_date: lembreteData.data_lembrete,
            start_time: lembreteData.hora_lembrete || null,
            end_time: lembreteData.hora_fim || null,
            recurrence_rule: rrule,
          }, calendarType);

          if (googleEventId) {
            await supabase
              .from('lembretes')
              .update({ google_event_id: googleEventId, calendar_type: calendarType, last_updated_by: 'google_sync' })
              .eq('id', lembrete_id)
              .eq('usuario_id', usuario.id);
          }

          return NextResponse.json({ success: true, google_event_id: googleEventId });
        }

        // Use the calendar_type stored on the lembrete (where it was originally created)
        const storedCalType = (lembrete as any).calendar_type === 'pj' ? 'pj' : 'pf' as 'pf' | 'pj';
        const rrule = tipoRecorrenciaToRRule(lembreteData.tipo_recorrencia, lembreteData.recorrente);

        const success = await updateGoogleEvent(supabase, usuario.id, lembrete.google_event_id, {
          summary: lembreteData.titulo,
          description: lembreteData.descricao || '',
          start_date: lembreteData.data_lembrete,
          start_time: lembreteData.hora_lembrete || null,
          end_time: lembreteData.hora_fim || null,
          recurrence_rule: rrule,
        }, storedCalType);

        if (success) {
          await supabase
            .from('google_calendar_integrations')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', tokens.id);
        }

        return NextResponse.json({ success });
      }

      case 'delete': {
        if (!lembrete_id) {
          return NextResponse.json({ error: 'lembrete_id é obrigatório' }, { status: 400 });
        }

        // Get google_event_id before deletion
        const { data: lembreteToDelete } = await supabase
          .from('lembretes')
          .select('google_event_id, calendar_type')
          .eq('id', lembrete_id)
          .eq('usuario_id', usuario.id)
          .single();

        if (lembreteToDelete?.google_event_id) {
          const deleteCalType = ((lembreteToDelete as any)?.calendar_type === 'pj' ? 'pj' : 'pf') as 'pf' | 'pj';
          await deleteGoogleEvent(supabase, usuario.id, lembreteToDelete.google_event_id, deleteCalType);

          await supabase
            .from('google_calendar_integrations')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', tokens.id);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Action '${action}' não suportada` }, { status: 400 });
    }
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
