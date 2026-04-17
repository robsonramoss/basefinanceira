import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listGoogleCalendars, getUserTokens } from '@/lib/google-calendar';

/**
 * GET /api/google-calendar/calendars
 * List available Google Calendars for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const tokens = await getUserTokens(supabase, usuario.id);
    if (!tokens) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 });
    }

    const calendars = await listGoogleCalendars(supabase, usuario.id);

    return NextResponse.json({
      calendars: calendars || [],
      current: {
        calendar_id_pf: tokens.calendar_id_pf || 'primary',
        calendar_id_pj: (tokens as any).calendar_id_pj || 'primary',
        sync_enabled_pf: (tokens as any).sync_enabled_pf ?? true,
        sync_enabled_pj: (tokens as any).sync_enabled_pj ?? true,
      },
    });
  } catch (error) {
    console.error('Google Calendar calendars error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * PUT /api/google-calendar/calendars
 * Update calendar PF/PJ settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { calendar_id_pf, calendar_name_pf, calendar_id_pj, calendar_name_pj, sync_enabled_pf, sync_enabled_pj } = body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (calendar_id_pf !== undefined) updateData.calendar_id_pf = calendar_id_pf;
    if (calendar_name_pf !== undefined) updateData.calendar_name_pf = calendar_name_pf;
    if (calendar_id_pj !== undefined) updateData.calendar_id_pj = calendar_id_pj;
    if (calendar_name_pj !== undefined) updateData.calendar_name_pj = calendar_name_pj;
    if (sync_enabled_pf !== undefined) updateData.sync_enabled_pf = sync_enabled_pf;
    if (sync_enabled_pj !== undefined) updateData.sync_enabled_pj = sync_enabled_pj;

    const { error } = await supabase
      .from('google_calendar_integrations')
      .update(updateData)
      .eq('usuario_id', usuario.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error updating calendar settings:', error);
      return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Calendar calendars PUT error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
