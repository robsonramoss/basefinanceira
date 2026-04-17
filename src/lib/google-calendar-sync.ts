/**
 * Google Calendar Bidirectional Sync
 * Handles syncing events FROM Google Calendar TO the lembretes table.
 * 
 * Uses Google's incremental sync (syncToken) for efficiency:
 * - First call: full sync of recent events, returns syncToken
 * - Subsequent calls: only changed events since last syncToken
 * 
 * Anti-conflict: skips lembretes recently edited by user (< 10s)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getValidAccessToken, getUserTokens } from './google-calendar';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Don't overwrite user edits made in the last 10 seconds
const CONFLICT_WINDOW_MS = 10_000;

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
  newSyncToken: string | null;
}

/**
 * Sync events from Google Calendar into the lembretes table.
 * Uses incremental sync (syncToken) when available.
 */
export async function syncEventsFromGoogle(
  supabase: SupabaseClient,
  usuarioId: number,
  calendarType: 'pf' | 'pj'
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors: [],
    newSyncToken: null,
  };

  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) {
    result.errors.push('Token de acesso inválido ou expirado');
    return result;
  }

  const tokens = await getUserTokens(supabase, usuarioId);
  if (!tokens) {
    result.errors.push('Integração Google Calendar não encontrada');
    return result;
  }

  const calendarId = (calendarType === 'pj' ? tokens.calendar_id_pj : tokens.calendar_id_pf) || 'primary';
  const syncToken = calendarType === 'pj'
    ? tokens.sync_token_pj
    : tokens.sync_token_pf;

  try {
    const events = await fetchChangedEvents(accessToken, calendarId, syncToken, result);
    if (events === null) return result; // Error already recorded

    for (const event of events) {
      try {
        await processGoogleEvent(supabase, usuarioId, event, calendarType, result);
      } catch (err: any) {
        result.errors.push(`Evento ${event.id}: ${err.message}`);
      }
    }

    // Save new syncToken
    if (result.newSyncToken) {
      const field = calendarType === 'pj' ? 'sync_token_pj' : 'sync_token_pf';
      await supabase
        .from('google_calendar_integrations')
        .update({
          [field]: result.newSyncToken,
          last_incoming_sync_at: new Date().toISOString(),
        })
        .eq('usuario_id', usuarioId);
    }
  } catch (err: any) {
    result.errors.push(`Sync error: ${err.message}`);
  }

  return result;
}

/**
 * Fetch changed events from Google Calendar using incremental sync.
 * If syncToken is invalid (410 Gone), clears it and does a full sync.
 */
async function fetchChangedEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
  result: SyncResult
): Promise<any[] | null> {
  const allEvents: any[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({ maxResults: '250' });

    if (syncToken) {
      params.set('syncToken', syncToken);
    } else {
      // Full sync: last 90 days, expand recurring events
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 90);
      params.set('timeMin', timeMin.toISOString());
      params.set('singleEvents', 'true');
      params.set('orderBy', 'startTime');
    }

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (response.status === 410) {
      // syncToken expired/invalid — must do full sync
      console.log('[GCal Sync] syncToken invalidated (410), doing full sync');
      return fetchChangedEvents(accessToken, calendarId, null, result);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      result.errors.push(`Google API ${response.status}: ${JSON.stringify(err)}`);
      return null;
    }

    const data = await response.json();
    allEvents.push(...(data.items || []));

    pageToken = data.nextPageToken || null;

    // Save syncToken from last page
    if (data.nextSyncToken) {
      result.newSyncToken = data.nextSyncToken;
    }
  } while (pageToken);

  return allEvents;
}

/**
 * Process a single Google Calendar event:
 * - Cancelled → delete from lembretes
 * - Existing → update (with conflict check)
 * - New → create
 */
async function processGoogleEvent(
  supabase: SupabaseClient,
  usuarioId: number,
  event: any,
  calendarType: 'pf' | 'pj',
  result: SyncResult
) {
  const googleEventId = event.id;
  if (!googleEventId) return;

  // Handle deleted/cancelled events
  if (event.status === 'cancelled') {
    const { data: existing } = await supabase
      .from('lembretes')
      .select('id, synced_from_google')
      .eq('google_event_id', googleEventId)
      .eq('usuario_id', usuarioId)
      .maybeSingle();

    if (existing) {
      // Only auto-delete if it was originally synced from Google
      // If user created it in the app, just unlink the google_event_id
      if (existing.synced_from_google) {
        await supabase
          .from('lembretes')
          .delete()
          .eq('id', existing.id)
          .eq('usuario_id', usuarioId);
        result.deleted++;
      } else {
        await supabase
          .from('lembretes')
          .update({ google_event_id: null, last_updated_by: 'google_webhook' })
          .eq('id', existing.id);
        result.updated++;
      }
    }
    return;
  }

  // Extract event data
  const lembreteData = googleEventToLembrete(event, calendarType);
  if (!lembreteData) {
    result.skipped++;
    return;
  }

  // Check if lembrete already exists for this google event
  const { data: existing } = await supabase
    .from('lembretes')
    .select('id, updated_at, last_updated_by')
    .eq('google_event_id', googleEventId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (existing) {
    // Anti-conflict: don't overwrite recent user edits
    const timeSinceUpdate = Date.now() - new Date(existing.updated_at).getTime();
    if (existing.last_updated_by === 'user' && timeSinceUpdate < CONFLICT_WINDOW_MS) {
      result.skipped++;
      return;
    }

    // Update existing lembrete
    const { error } = await supabase
      .from('lembretes')
      .update({
        ...lembreteData,
        last_updated_by: 'google_webhook',
      })
      .eq('id', existing.id)
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    result.updated++;
  } else {
    // Create new lembrete from Google event
    const { error } = await supabase
      .from('lembretes')
      .insert({
        ...lembreteData,
        usuario_id: usuarioId,
        status: 'ativo',
        notificado: false,
        synced_from_google: true,
        last_updated_by: 'google_webhook',
      });

    if (error) throw error;
    result.created++;
  }
}

/**
 * Convert a Google Calendar event to lembrete fields.
 * Returns null if event can't be mapped (e.g. missing required data).
 */
function googleEventToLembrete(
  event: any,
  calendarType: 'pf' | 'pj'
): Record<string, any> | null {
  const titulo = event.summary || 'Sem título';
  const descricao = event.description || null;

  // Parse start date/time
  const isAllDay = !!event.start?.date;
  let dataLembrete: string;
  let horaLembrete: string | null = null;
  let horaFim: string | null = null;

  if (isAllDay) {
    dataLembrete = event.start.date; // YYYY-MM-DD
  } else if (event.start?.dateTime) {
    // dateTime format: 2026-03-06T10:00:00-03:00
    const dt = new Date(event.start.dateTime);
    dataLembrete = dt.toISOString().split('T')[0];
    // Extract local time from the original string to preserve timezone
    const timeMatch = event.start.dateTime.match(/T(\d{2}:\d{2}:\d{2})/);
    horaLembrete = timeMatch ? timeMatch[1] : `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:00`;
  } else {
    return null; // Can't determine date
  }

  if (!isAllDay && event.end?.dateTime) {
    const timeMatch = event.end.dateTime.match(/T(\d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      horaFim = timeMatch[1];
    }
  }

  // Parse recurrence (only from master events, not expanded instances)
  let recorrente = false;
  let tipoRecorrencia: string | null = null;

  if (event.recurrence && Array.isArray(event.recurrence)) {
    const rrule = event.recurrence.find((r: string) => r.startsWith('RRULE:')) || '';
    recorrente = true;

    if (rrule.includes('FREQ=DAILY')) tipoRecorrencia = 'diario';
    else if (rrule.includes('FREQ=WEEKLY')) tipoRecorrencia = 'semanal';
    else if (rrule.includes('FREQ=MONTHLY')) tipoRecorrencia = 'mensal';
    else if (rrule.includes('FREQ=YEARLY')) tipoRecorrencia = 'anual';
    else recorrente = false; // Unsupported recurrence
  }

  return {
    titulo,
    descricao,
    data_lembrete: dataLembrete,
    hora_lembrete: horaLembrete,
    hora_fim: horaFim,
    recorrente,
    tipo_recorrencia: tipoRecorrencia,
    google_event_id: event.id,
    calendar_type: calendarType,
  };
}
