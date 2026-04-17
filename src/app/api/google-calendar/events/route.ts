import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listGoogleEvents, getUserTokens } from '@/lib/google-calendar';

/**
 * GET /api/google-calendar/events?timeMin=...&timeMax=...
 * Fetch Google Calendar events for the authenticated user
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
      return NextResponse.json({ events: [], connected: false });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const events = await listGoogleEvents(supabase, usuario.id, timeMin, timeMax);

    return NextResponse.json({
      events: events || [],
      connected: true,
    });
  } catch (error) {
    console.error('Google Calendar events error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
