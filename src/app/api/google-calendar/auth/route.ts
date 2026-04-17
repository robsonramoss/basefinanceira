import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCredentials } from '@/lib/google-calendar';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * GET /api/google-calendar/auth
 * Redirects user to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const credentials = await getGoogleCredentials(supabase);
    if (!credentials) {
      return NextResponse.json(
        { error: 'Google Calendar não configurado. O administrador precisa configurar o Client ID e Client Secret.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin') || request.headers.get('origin') || '';
    const redirectUri = `${origin}/api/google-calendar/callback`;

    const params = new URLSearchParams({
      client_id: credentials.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: user.id,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
