import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ==============================================================================
// Edge Function: google-calendar-cron
// 1. Renova webhooks que expiram em < 2 dias
// 2. Roda sync incremental diário para todos os usuários ativos
// ==============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// Supabase URL for webhook registration (Edge Function)
const SUPABASE_FUNCTIONS_URL = Deno.env.get("SUPABASE_URL") || SUPABASE_URL;

interface Integration {
  id: number;
  usuario_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  calendar_id_pf: string;
  calendar_id_pj: string;
  sync_enabled_pf: boolean;
  sync_enabled_pj: boolean;
  sync_token_pf: string | null;
  sync_token_pj: string | null;
  webhook_channel_id_pf: string | null;
  webhook_resource_id_pf: string | null;
  webhook_expiration_pf: string | null;
  webhook_channel_id_pj: string | null;
  webhook_resource_id_pj: string | null;
  webhook_expiration_pj: string | null;
  webhook_token_pf: string | null;
  webhook_token_pj: string | null;
  enable_bidirectional_sync: boolean;
}

interface GoogleCredentials {
  client_id: string;
  client_secret: string;
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
  // Check if token is still valid (5 min buffer)
  const now = Date.now();
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : 0;

  if (expiresAt - 5 * 60 * 1000 > now) {
    return integration.access_token;
  }

  // Refresh token
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
      .eq("id", integration.id);

    return tokenData.access_token;
  } catch (err) {
    console.error(`❌ Token refresh error for user ${integration.usuario_id}:`, err);
    return null;
  }
}

// ============================================================================
// Webhook Renewal
// ============================================================================

async function renewWebhook(
  supabase: ReturnType<typeof createClient>,
  integration: Integration,
  calendarType: "pf" | "pj",
  accessToken: string
): Promise<boolean> {
  const calendarId =
    calendarType === "pj"
      ? integration.calendar_id_pj || "primary"
      : integration.calendar_id_pf || "primary";

  // Stop old channel first
  const oldChannelId =
    calendarType === "pj"
      ? integration.webhook_channel_id_pj
      : integration.webhook_channel_id_pf;
  const oldResourceId =
    calendarType === "pj"
      ? integration.webhook_resource_id_pj
      : integration.webhook_resource_id_pf;

  if (oldChannelId && oldResourceId) {
    try {
      await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: oldChannelId, resourceId: oldResourceId }),
      });
    } catch {
      // Ignore stop errors (channel may already be expired)
    }
  }

  // Create new channel
  const channelId = crypto.randomUUID();
  const channelToken = crypto.randomUUID();
  const expirationMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: `${SUPABASE_FUNCTIONS_URL}/functions/v1/google-calendar-webhook`,
          token: channelToken,
          expiration: expirationMs,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(
        `❌ Webhook renewal failed for user ${integration.usuario_id} (${calendarType}):`,
        err
      );
      return false;
    }

    const watchData = await response.json();

    // Update DB
    const fields =
      calendarType === "pj"
        ? {
            webhook_channel_id_pj: channelId,
            webhook_resource_id_pj: watchData.resourceId,
            webhook_expiration_pj: new Date(expirationMs).toISOString(),
            webhook_token_pj: channelToken,
          }
        : {
            webhook_channel_id_pf: channelId,
            webhook_resource_id_pf: watchData.resourceId,
            webhook_expiration_pf: new Date(expirationMs).toISOString(),
            webhook_token_pf: channelToken,
          };

    await supabase
      .from("google_calendar_integrations")
      .update(fields)
      .eq("id", integration.id);

    console.log(
      `✅ Webhook renewed for user ${integration.usuario_id} (${calendarType})`
    );
    return true;
  } catch (err) {
    console.error(`❌ Webhook renewal error:`, err);
    return false;
  }
}

// ============================================================================
// Incremental Sync (Google → App)
// ============================================================================

async function incrementalSync(
  supabase: ReturnType<typeof createClient>,
  integration: Integration,
  calendarType: "pf" | "pj",
  accessToken: string
): Promise<{ created: number; updated: number; deleted: number }> {
  const stats = { created: 0, updated: 0, deleted: 0 };

  const calendarId =
    calendarType === "pj"
      ? integration.calendar_id_pj || "primary"
      : integration.calendar_id_pf || "primary";
  const syncToken =
    calendarType === "pj" ? integration.sync_token_pj : integration.sync_token_pf;

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

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (response.status === 410) {
      // syncToken invalid, clear it and retry without
      const field = calendarType === "pj" ? "sync_token_pj" : "sync_token_pf";
      await supabase
        .from("google_calendar_integrations")
        .update({ [field]: null })
        .eq("id", integration.id);
      integration[field === "sync_token_pj" ? "sync_token_pj" : "sync_token_pf"] = null;
      return incrementalSync(supabase, integration, calendarType, accessToken);
    }

    if (!response.ok) {
      console.error(`❌ Sync API error for user ${integration.usuario_id}: ${response.status}`);
      return stats;
    }

    const data = await response.json();
    const events = data.items || [];

    for (const event of events) {
      if (!event.id) continue;

      if (event.status === "cancelled") {
        // Delete only if synced_from_google
        const { data: existing } = await supabase
          .from("lembretes")
          .select("id, synced_from_google")
          .eq("google_event_id", event.id)
          .eq("usuario_id", integration.usuario_id)
          .maybeSingle();

        if (existing?.synced_from_google) {
          await supabase.from("lembretes").delete().eq("id", existing.id);
          stats.deleted++;
        } else if (existing) {
          await supabase
            .from("lembretes")
            .update({ google_event_id: null, last_updated_by: "google_sync" })
            .eq("id", existing.id);
        }
        continue;
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
        continue;
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
        last_updated_by: "google_sync" as const,
      };

      const { data: existing } = await supabase
        .from("lembretes")
        .select("id, updated_at, last_updated_by")
        .eq("google_event_id", event.id)
        .eq("usuario_id", integration.usuario_id)
        .maybeSingle();

      if (existing) {
        // Skip if user edited recently (< 30s for cron, more lenient)
        const timeSince = Date.now() - new Date(existing.updated_at).getTime();
        if (existing.last_updated_by === "user" && timeSince < 30_000) continue;

        await supabase.from("lembretes").update(lembreteData).eq("id", existing.id);
        stats.updated++;
      } else {
        await supabase.from("lembretes").insert({
          ...lembreteData,
          usuario_id: integration.usuario_id,
          status: "ativo",
          notificado: false,
          synced_from_google: true,
        });
        stats.created++;
      }
    }

    // Save new syncToken
    if (data.nextSyncToken) {
      const field = calendarType === "pj" ? "sync_token_pj" : "sync_token_pf";
      await supabase
        .from("google_calendar_integrations")
        .update({
          [field]: data.nextSyncToken,
          last_incoming_sync_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    }
  } catch (err) {
    console.error(`❌ Sync error for user ${integration.usuario_id}:`, err);
  }

  return stats;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const credentials = await getGoogleCredentials(supabase);

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: "Google OAuth não configurado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all active integrations with bidirectional sync
    const { data: integrations, error } = await supabase
      .from("google_calendar_integrations")
      .select("*")
      .eq("is_active", true)
      .eq("enable_bidirectional_sync", true);

    if (error || !integrations?.length) {
      return new Response(
        JSON.stringify({ message: "Nenhuma integração ativa", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 Processing ${integrations.length} integrations...`);

    const results = [];
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    for (const integration of integrations as Integration[]) {
      const accessToken = await getValidAccessToken(supabase, integration, credentials);
      if (!accessToken) {
        results.push({
          usuario_id: integration.usuario_id,
          error: "Token inválido",
        });
        continue;
      }

      const result: Record<string, unknown> = { usuario_id: integration.usuario_id };

      // Renew PF webhook if expiring soon
      if (
        integration.sync_enabled_pf &&
        integration.webhook_channel_id_pf
      ) {
        const expPf = integration.webhook_expiration_pf
          ? new Date(integration.webhook_expiration_pf)
          : new Date(0);

        if (expPf < twoDaysFromNow) {
          result.renewed_pf = await renewWebhook(supabase, integration, "pf", accessToken);
        }
      }

      // Renew PJ webhook if expiring soon
      if (
        integration.sync_enabled_pj &&
        integration.webhook_channel_id_pj
      ) {
        const expPj = integration.webhook_expiration_pj
          ? new Date(integration.webhook_expiration_pj)
          : new Date(0);

        if (expPj < twoDaysFromNow) {
          result.renewed_pj = await renewWebhook(supabase, integration, "pj", accessToken);
        }
      }

      // Incremental sync for PF
      if (integration.sync_enabled_pf) {
        result.sync_pf = await incrementalSync(supabase, integration, "pf", accessToken);
      }

      // Incremental sync for PJ
      if (integration.sync_enabled_pj) {
        result.sync_pj = await incrementalSync(supabase, integration, "pj", accessToken);
      }

      results.push(result);
    }

    console.log(`✅ Cron completed. Processed ${results.length} integrations.`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Cron error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
