import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCredentials } from '@/lib/google-calendar';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * GET /api/google-calendar/callback
 * Handles the OAuth callback from Google, exchanges code for tokens.
 * The user's auth cookies are sent by the browser during the redirect.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user.id (auth UUID)
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=denied', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=missing_params', request.url));
    }

    // Validate state matches authenticated user (prevent token association attacks)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || state !== user.id) {
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=invalid_state', request.url));
    }

    const credentials = await getGoogleCredentials(supabase);
    if (!credentials) {
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=not_configured', request.url));
    }

    // Build redirect_uri (same as the one used in auth)
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const redirectUri = `${origin}/api/google-calendar/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      console.error('Google token exchange failed:', errData);
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=token_exchange', request.url));
    }

    const tokenData = await tokenResponse.json();

    // Get user email from Google
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    let googleEmail = '';
    let googleUserId = '';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      googleEmail = userInfo.email || '';
      googleUserId = userInfo.id || '';
    }

    // Get usuario_id from usuarios using auth user_id (state)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', state)
      .single();

    if (!usuario) {
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=usuario_not_found', request.url));
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert integration (unique_usuario_google constraint on usuario_id)
    const { error: upsertError } = await supabase
      .from('google_calendar_integrations')
      .upsert({
        usuario_id: usuario.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || '',
        expires_at: expiresAt,
        google_email: googleEmail,
        google_user_id: googleUserId,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      }, { onConflict: 'usuario_id' });

    if (upsertError) {
      console.error('Error saving Google Calendar integration:', upsertError);
      return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=save_failed', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard/configuracoes?tab=integrations&gcal_connected=true', request.url));
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return NextResponse.redirect(new URL('/dashboard/lembretes?gcal_error=unknown', request.url));
  }
}
