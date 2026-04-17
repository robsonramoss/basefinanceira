import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ==============================================================================
// Edge Function: google-calendar-webhook
// Receives push notifications from Google Calendar when events change
// ==============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// Don't overwrite user edits made in the last 10 seconds
const CONFLICT_WINDOW_MS = 10_000;

interface GoogleCredentials {
  client_id: string;
  client_secret: string;
}

interface Integration {
  usuario_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  calendar_id_pf: string;
  calendar_id_pj: string;
  sync_token_pf: string | null;
  sync_token_pj: string | null;
  webhook_channel_id_pf: string | null;
  webhook_channel_id_pj: string | null;
  webhook_token_pf: string | null;
  webhook_token_pj: string | null;
  enable_bidirectional_sync: boolean;
}

// ============================================================================
// Token Management
// ============================================================================

async function getGoogleCredentials(
  supabase: ReturnType<typeof createClient>
): Promise<GoogleCredentials | null> {
  const { data, error } = await supabase
    .from("google_oauth_secrets")
    .select("client_id, client_secret")
    .eq("id", 1)
    .single();

  if (error || !data?.client_id || !data?.client_secret) return null;
  return { client_id: data.client_id, client_secret: data.client_secret };
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  integration: Integration,
  credentials: GoogleCredentials
): Promise<string | null> {
  const now = Date.now();
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : 0;

  if (expiresAt - 5 * 60 * 1000 > now) {
    return integration.access_token;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error(`❌ Token refresh failed for user ${integration.usuario_id}`);
      return null;
    }

    const tokenData = await response.json();
    const newExpiresAt = new Date(
      Date.now() + (tokenData.expires_in || 3600) * 1000
    ).toISOString();

    await supabase
      .from("google_calendar_integrations")
      .update({
        access_token: tokenData.access_token,
        expires_at: newExpiresAt,
        last_error: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("usuario_id", integration.usuario_id);

    return tokenData.access_token;
  } catch (err) {
    console.error(`❌ Token refresh error for user ${integration.usuario_id}:`, err);
    return null;
  }
}

// ============================================================================
// Sync Logic
// ============================================================================

interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
}

async function syncEventsFromGoogle(
  supabase: ReturnType<typeof createClient>,
  integration: Integration,
  calendarType: "pf" | "pj",
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

  const calendarId =
    calendarType === "pj"
      ? integration.calendar_id_pj || "primary"
      : integration.calendar_id_pf || "primary";
  const syncToken =
    calendarType === "pj" ? integration.sync_token_pj : integration.sync_token_pf;

  try {
    const events = await fetchChangedEvents(
      supabase,
      integration,
      accessToken,
      calendarId,
      syncToken,
      calendarType
    );

    for (const event of events) {
      try {
        await processGoogleEvent(
          supabase,
          integration.usuario_id,
          event,
          calendarType,
          result
        );
      } catch (err) {
        result.errors.push(`Event ${event.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    result.errors.push(`Sync error: ${(err as Error).message}`);
  }

  return result;
}

async function fetchChangedEvents(
  supabase: ReturnType<typeof createClient>,
  integration: Integration,
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
  calendarType: "pf" | "pj"
): Promise<any[]> {
  const allEvents: any[] = [];
  let pageToken: string | null = null;
  let newSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ maxResults: "250" });

    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 90);
      params.set("timeMin", timeMin.toISOString());
      params.set("singleEvents", "true");
      params.set("orderBy", "startTime");
    }

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (response.status === 410) {
      // syncToken invalid, clear and retry
      const field = calendarType === "pj" ? "sync_token_pj" : "sync_token_pf";
      await supabase
        .from("google_calendar_integrations")
        .update({ [field]: null })
        .eq("usuario_id", integration.usuario_id);
      return fetchChangedEvents(supabase, integration, accessToken, calendarId, null, calendarType);
    }

    if (!response.ok) {
      throw new Error(`Google API ${response.status}`);
    }

    const data = await response.json();
    allEvents.push(...(data.items || []));
    pageToken = data.nextPageToken || null;

    if (data.nextSyncToken) {
      newSyncToken = data.nextSyncToken;
    }
  } while (pageToken);

  // Save new syncToken
  if (newSyncToken) {
    const field = calendarType === "pj" ? "sync_token_pj" : "sync_token_pf";
    await supabase
      .from("google_calendar_integrations")
      .update({
        [field]: newSyncToken,
        last_incoming_sync_at: new Date().toISOString(),
      })
      .eq("usuario_id", integration.usuario_id);
  }

  return allEvents;
}

async function processGoogleEvent(
  supabase: ReturnType<typeof createClient>,
  usuarioId: number,
  event: any,
  calendarType: "pf" | "pj",
  result: SyncResult
) {
  if (!event.id) return;

  // Handle cancelled events
  if (event.status === "cancelled") {
    const { data: existing } = await supabase
      .from("lembretes")
      .select("id, synced_from_google")
      .eq("google_event_id", event.id)
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (existing?.synced_from_google) {
      await supabase.from("lembretes").delete().eq("id", existing.id);
      result.deleted++;
    } else if (existing) {
      await supabase
        .from("lembretes")
        .update({ google_event_id: null, last_updated_by: "google_webhook" })
        .eq("id", existing.id);
      result.updated++;
    }
    return;
  }

  // Parse event
  const isAllDay = !!event.start?.date;
  let dataLembrete: string;
  let horaLembrete: string | null = null;
  let horaFim: string | null = null;

  if (isAllDay) {
    dataLembrete = event.start.date;
  } else if (event.start?.dateTime) {
    // Extract date from original string to preserve timezone (avoid UTC conversion)
    const dateMatch = event.start.dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
    dataLembrete = dateMatch ? dateMatch[1] : event.start.dateTime.split("T")[0];
    
    const timeMatch = event.start.dateTime.match(/T(\d{2}:\d{2}:\d{2})/);
    horaLembrete = timeMatch ? timeMatch[1] : null;
  } else {
    result.skipped++;
    return;
  }

  if (!isAllDay && event.end?.dateTime) {
    const timeMatch = event.end.dateTime.match(/T(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) horaFim = timeMatch[1];
  }

  // Parse attendees/participants
  const participantes = event.attendees?.map((attendee: any) => ({
    email: attendee.email,
    displayName: attendee.displayName || attendee.email,
    responseStatus: attendee.responseStatus || "needsAction",
    organizer: attendee.organizer || false,
  })) || [];

  const lembreteData = {
    titulo: event.summary || "Sem título",
    descricao: event.description || null,
    data_lembrete: dataLembrete,
    hora_lembrete: horaLembrete,
    hora_fim: horaFim,
    participantes: participantes,
    google_event_id: event.id,
    calendar_type: calendarType,
  };

  const { data: existing } = await supabase
    .from("lembretes")
    .select("id, updated_at, last_updated_by")
    .eq("google_event_id", event.id)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (existing) {
    // Anti-conflict: don't overwrite recent user edits
    const timeSince = Date.now() - new Date(existing.updated_at).getTime();
    if (existing.last_updated_by === "user" && timeSince < CONFLICT_WINDOW_MS) {
      result.skipped++;
      return;
    }

    await supabase
      .from("lembretes")
      .update({ ...lembreteData, last_updated_by: "google_webhook" })
      .eq("id", existing.id);
    result.updated++;
  } else {
    await supabase.from("lembretes").insert({
      ...lembreteData,
      usuario_id: usuarioId,
      status: "ativo",
      notificado: false,
      synced_from_google: true,
      last_updated_by: "google_webhook",
    });
    result.created++;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuração inválida" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract Google webhook headers
    const channelId = req.headers.get("X-Goog-Channel-ID");
    const resourceState = req.headers.get("X-Goog-Resource-State");
    const channelToken = req.headers.get("X-Goog-Channel-Token");

    if (!channelId || !resourceState) {
      return new Response(
        JSON.stringify({ error: "Missing required headers" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 'sync' is initial notification — just acknowledge
    if (resourceState === "sync") {
      console.log(`[Webhook] Channel sync notification: ${channelId}`);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const credentials = await getGoogleCredentials(supabase);

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: "Google OAuth não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find integration by channel_id
    const { data: integration } = await supabase
      .from("google_calendar_integrations")
      .select("*")
      .or(`webhook_channel_id_pf.eq.${channelId},webhook_channel_id_pj.eq.${channelId}`)
      .eq("is_active", true)
      .maybeSingle();

    if (!integration) {
      console.warn(`[Webhook] Unknown channel: ${channelId}`);
      return new Response(
        JSON.stringify({ error: "Channel not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if bidirectional sync is enabled
    if (!integration.enable_bidirectional_sync) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "bidirectional sync disabled" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine calendar type and verify token
    const isPf = integration.webhook_channel_id_pf === channelId;
    const calendarType: "pf" | "pj" = isPf ? "pf" : "pj";
    const expectedToken = isPf
      ? integration.webhook_token_pf
      : integration.webhook_token_pj;

    if (expectedToken && channelToken !== expectedToken) {
      console.warn(`[Webhook] Token mismatch for channel: ${channelId}`);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, integration as Integration, credentials);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ ok: true, error: "Token inválido" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Sync events
    const result = await syncEventsFromGoogle(
      supabase,
      integration as Integration,
      calendarType,
      accessToken
    );

    console.log(
      `[Webhook] Sync complete for user ${integration.usuario_id} (${calendarType}):`,
      {
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        skipped: result.skipped,
        errors: result.errors.length,
      }
    );

    // Always return 200 to prevent Google from disabling the channel
    return new Response(
      JSON.stringify({ ok: true, ...result }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Webhook] Error:", err);
    // Still return 200 to prevent Google from disabling the channel
    return new Response(
      JSON.stringify({ ok: true, error: (err as Error).message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
