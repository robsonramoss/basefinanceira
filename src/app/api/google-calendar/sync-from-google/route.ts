import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCredentials, getUserTokens } from '@/lib/google-calendar';
import { syncEventsFromGoogle } from '@/lib/google-calendar-sync';

/**
 * POST /api/google-calendar/sync-from-google
 * Triggers an incremental sync FROM Google Calendar INTO lembretes.
 * 
 * Body: { calendar_type?: 'pf' | 'pj' }
 * 
 * This is a safe, additive operation:
 * - Creates new lembretes for events found only in Google
 * - Updates lembretes whose Google events changed (with conflict protection)
 * - Deletes lembretes whose Google events were cancelled (only if synced_from_google)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get usuario_id
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Validate Google Calendar is configured
    const credentials = await getGoogleCredentials(supabase);
    if (!credentials) {
      return NextResponse.json({ error: 'Google Calendar não configurado pelo admin' }, { status: 400 });
    }

    const tokens = await getUserTokens(supabase, usuario.id);
    if (!tokens) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 });
    }

    // Check if bidirectional sync is enabled for this user
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('enable_bidirectional_sync')
      .eq('usuario_id', usuario.id)
      .single();

    if (!integration?.enable_bidirectional_sync) {
      return NextResponse.json({ error: 'Sincronização bidirecional não está habilitada' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const calendarType: 'pf' | 'pj' = body.calendar_type === 'pj' ? 'pj' : 'pf';

    // Check if sync is enabled for this calendar type
    const syncEnabled = calendarType === 'pj' ? tokens.sync_enabled_pj : tokens.sync_enabled_pf;
    if (!syncEnabled) {
      return NextResponse.json({ error: `Sync ${calendarType.toUpperCase()} não está habilitado` }, { status: 400 });
    }

    // Execute sync
    const result = await syncEventsFromGoogle(supabase, usuario.id, calendarType);

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    });

  } catch (error: any) {
    console.error('Sync from Google error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
