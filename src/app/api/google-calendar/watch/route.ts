import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, getUserTokens, getGoogleCredentials } from '@/lib/google-calendar';
import { syncEventsFromGoogle } from '@/lib/google-calendar-sync';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * POST /api/google-calendar/watch
 * Registers a webhook channel to receive push notifications from Google Calendar.
 * Also performs an initial sync to populate the syncToken.
 * 
 * Body: { calendar_type?: 'pf' | 'pj' }
 */
export async function POST(request: NextRequest) {
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

    const credentials = await getGoogleCredentials(supabase);
    if (!credentials) {
      return NextResponse.json({ error: 'Google Calendar não configurado pelo admin' }, { status: 400 });
    }

    const tokens = await getUserTokens(supabase, usuario.id);
    if (!tokens) {
      return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(supabase, usuario.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso inválido' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const calendarType: 'pf' | 'pj' = body.calendar_type === 'pj' ? 'pj' : 'pf';
    const calendarId = (calendarType === 'pj' ? tokens.calendar_id_pj : tokens.calendar_id_pf) || 'primary';

    // Generate unique channel ID and verification token
    const channelId = crypto.randomUUID();
    const channelToken = crypto.randomUUID();

    // Webhook URL — use configured app URL or derive from the current request
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const webhookUrl = `${appUrl}/api/google-calendar/webhook`;

    // Expiration: 7 days from now (Google max is ~30 days)
    const expirationMs = Date.now() + (7 * 24 * 60 * 60 * 1000);

    // Register webhook with Google
    const watchResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: channelToken,
          expiration: expirationMs,
        }),
      }
    );

    if (!watchResponse.ok) {
      const err = await watchResponse.json().catch(() => ({}));
      const googleError = err.error?.message || JSON.stringify(err);
      console.error('[GCal Watch] Registration failed:', { webhookUrl, status: watchResponse.status, error: googleError });
      return NextResponse.json({
        error: 'Falha ao registrar webhook',
        details: googleError,
        webhook_url: webhookUrl,
        google_status: watchResponse.status,
      }, { status: 500 });
    }

    const watchData = await watchResponse.json();

    // Save webhook info to DB
    const channelIdField = calendarType === 'pj' ? 'webhook_channel_id_pj' : 'webhook_channel_id_pf';
    const resourceIdField = calendarType === 'pj' ? 'webhook_resource_id_pj' : 'webhook_resource_id_pf';
    const expirationField = calendarType === 'pj' ? 'webhook_expiration_pj' : 'webhook_expiration_pf';
    const tokenField = calendarType === 'pj' ? 'webhook_token_pj' : 'webhook_token_pf';

    await supabase
      .from('google_calendar_integrations')
      .update({
        [channelIdField]: channelId,
        [resourceIdField]: watchData.resourceId,
        [expirationField]: new Date(expirationMs).toISOString(),
        [tokenField]: channelToken,
        enable_bidirectional_sync: true,
      })
      .eq('usuario_id', usuario.id);

    // Perform initial sync to populate syncToken
    const syncResult = await syncEventsFromGoogle(supabase, usuario.id, calendarType);

    return NextResponse.json({
      success: true,
      channel_id: channelId,
      expiration: new Date(expirationMs).toISOString(),
      initial_sync: {
        created: syncResult.created,
        updated: syncResult.updated,
        deleted: syncResult.deleted,
      },
    });

  } catch (error: any) {
    console.error('[GCal Watch] Error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * DELETE /api/google-calendar/watch
 * Stops a webhook channel (unsubscribes from notifications).
 * 
 * Body: { calendar_type?: 'pf' | 'pj' }
 */
export async function DELETE(request: NextRequest) {
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

    const accessToken = await getValidAccessToken(supabase, usuario.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso inválido' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const calendarType: 'pf' | 'pj' = body.calendar_type === 'pj' ? 'pj' : 'pf';

    // Get current webhook info
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('webhook_channel_id_pf, webhook_resource_id_pf, webhook_channel_id_pj, webhook_resource_id_pj')
      .eq('usuario_id', usuario.id)
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    const channelId = calendarType === 'pj' ? integration.webhook_channel_id_pj : integration.webhook_channel_id_pf;
    const resourceId = calendarType === 'pj' ? integration.webhook_resource_id_pj : integration.webhook_resource_id_pf;

    if (channelId && resourceId) {
      // Stop the channel with Google
      await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          resourceId: resourceId,
        }),
      });
    }

    // Clear webhook info in DB
    const clearFields = calendarType === 'pj'
      ? {
          webhook_channel_id_pj: null,
          webhook_resource_id_pj: null,
          webhook_expiration_pj: null,
          webhook_token_pj: null,
          sync_token_pj: null,
        }
      : {
          webhook_channel_id_pf: null,
          webhook_resource_id_pf: null,
          webhook_expiration_pf: null,
          webhook_token_pf: null,
          sync_token_pf: null,
        };

    // Check if the other calendar type still has a webhook
    const otherChannelField = calendarType === 'pj' ? 'webhook_channel_id_pf' : 'webhook_channel_id_pj';
    const otherHasWebhook = integration[otherChannelField as keyof typeof integration];

    await supabase
      .from('google_calendar_integrations')
      .update({
        ...clearFields,
        // Only disable bidirectional sync if no webhooks remain
        ...(otherHasWebhook ? {} : { enable_bidirectional_sync: false }),
      })
      .eq('usuario_id', usuario.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[GCal Watch] Delete error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
