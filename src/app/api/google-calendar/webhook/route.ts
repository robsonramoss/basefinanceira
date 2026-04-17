import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { syncEventsFromGoogle } from '@/lib/google-calendar-sync';

/**
 * POST /api/google-calendar/webhook
 * Receives push notifications from Google Calendar when events change.
 * This endpoint must be publicly accessible (no auth) and use the app's
 * own domain (verified in Google Cloud Console → Domain Verification).
 */
export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const resourceState = request.headers.get('X-Goog-Resource-State');
    const channelToken = request.headers.get('X-Goog-Channel-Token');

    if (!channelId || !resourceState) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }

    // Google sends a 'sync' notification when the channel is first registered
    if (resourceState === 'sync') {
      console.log(`[GCal Webhook] Channel registered: ${channelId}`);
      return NextResponse.json({ ok: true });
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the integration by channel ID (PF or PJ)
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('usuario_id, enable_bidirectional_sync, webhook_channel_id_pf, webhook_channel_id_pj, webhook_token_pf, webhook_token_pj')
      .or(`webhook_channel_id_pf.eq.${channelId},webhook_channel_id_pj.eq.${channelId}`)
      .eq('is_active', true)
      .maybeSingle();

    if (!integration) {
      console.warn(`[GCal Webhook] Unknown channel: ${channelId}`);
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (!integration.enable_bidirectional_sync) {
      return NextResponse.json({ ok: true, skipped: 'bidirectional sync disabled' });
    }

    // Verify channel token
    const isPf = integration.webhook_channel_id_pf === channelId;
    const calendarType: 'pf' | 'pj' = isPf ? 'pf' : 'pj';
    const expectedToken = isPf ? integration.webhook_token_pf : integration.webhook_token_pj;

    if (expectedToken && channelToken !== expectedToken) {
      console.warn(`[GCal Webhook] Token mismatch for channel: ${channelId}`);
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const result = await syncEventsFromGoogle(supabase, integration.usuario_id, calendarType);

    console.log(`[GCal Webhook] Sync complete for user ${integration.usuario_id} (${calendarType}):`, {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[GCal Webhook] Error:', err);
    // Always return 200 to prevent Google from disabling the channel
    return NextResponse.json({ ok: true, error: err.message });
  }
}
