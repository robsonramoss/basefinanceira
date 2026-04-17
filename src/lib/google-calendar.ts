/**
 * Google Calendar API Service
 * Handles token refresh and CRUD operations with Google Calendar API
 * 
 * All functions receive a Supabase client from the caller (API routes).
 * This avoids the need for SUPABASE_SERVICE_ROLE_KEY since RLS policies
 * on google_calendar_integrations and configuracoes_sistema allow access.
 */

import { SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

interface GoogleCalendarCredentials {
  client_id: string;
  client_secret: string;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start_date: string;
  start_time?: string | null;
  end_time?: string | null;
  recurrence_rule?: string | null;
}

/**
 * Fetch Google Calendar credentials via secure RPC (secrets stored in google_oauth_secrets table)
 */
export async function getGoogleCredentials(supabase: SupabaseClient): Promise<GoogleCalendarCredentials | null> {
  const { data, error } = await supabase.rpc('get_google_calendar_credentials').single();
  const creds = data as any;

  if (error || !creds?.client_id || !creds?.client_secret) {
    return null;
  }

  return {
    client_id: creds.client_id,
    client_secret: creds.client_secret,
  };
}

/**
 * Get user's Google Calendar integration tokens
 */
export async function getUserTokens(supabase: SupabaseClient, usuarioId: number): Promise<(GoogleTokens & { id: number; calendar_id_pf: string; calendar_id_pj: string; sync_enabled_pf: boolean; sync_enabled_pj: boolean; sync_token_pf: string | null; sync_token_pj: string | null }) | null> {
  const { data, error } = await supabase
    .from('google_calendar_integrations')
    .select('id, access_token, refresh_token, expires_at, calendar_id_pf, calendar_id_pj, sync_enabled_pf, sync_enabled_pj, sync_token_pf, sync_token_pj')
    .eq('usuario_id', usuarioId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data?.access_token || !data?.refresh_token) {
    return null;
  }

  return data;
}

/**
 * Check if access_token is expired and refresh if needed
 */
export async function getValidAccessToken(supabase: SupabaseClient, usuarioId: number): Promise<string | null> {
  const tokens = await getUserTokens(supabase, usuarioId);
  if (!tokens) return null;

  const credentials = await getGoogleCredentials(supabase);
  if (!credentials) return null;

  // Check if token is expired (with 5 min buffer)
  const now = new Date();
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : new Date(0);
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return tokens.access_token;
  }

  // Token expired, refresh it
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google token refresh failed:', errorData);

      await supabase
        .from('google_calendar_integrations')
        .update({
          last_error: `Token refresh failed: ${errorData.error || 'unknown'}`,
          last_error_at: new Date().toISOString(),
        })
        .eq('id', tokens.id);

      return null;
    }

    const tokenData = await response.json();
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    await supabase
      .from('google_calendar_integrations')
      .update({
        access_token: tokenData.access_token,
        expires_at: newExpiresAt,
        last_error: null,
        last_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokens.id);

    return tokenData.access_token;
  } catch (err) {
    console.error('Error refreshing Google token:', err);
    return null;
  }
}

/**
 * Build Google Calendar event body from lembrete data
 */
function buildEventBody(input: CalendarEventInput) {
  const event: Record<string, any> = {
    summary: input.summary,
    description: input.description || '',
  };

  if (input.start_time) {
    // Normalize time: ensure HH:MM:SS format (DB may send HH:MM:SS, client may send HH:MM)
    const normalizeTime = (t: string) => {
      const parts = t.split(':');
      if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
      return `${parts[0]}:${parts[1]}:00`;
    };

    const startTime = normalizeTime(input.start_time);
    const startDateTime = `${input.start_date}T${startTime}`;
    event.start = {
      dateTime: startDateTime,
      timeZone: 'America/Sao_Paulo',
    };

    if (input.end_time) {
      const endTime = normalizeTime(input.end_time);
      const endDateTime = `${input.start_date}T${endTime}`;
      event.end = {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    } else {
      // Default: start + 1 hour
      const startDate = new Date(`${startDateTime}-03:00`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      event.end = {
        dateTime: endDate.toISOString().replace('Z', '').split('.')[0],
        timeZone: 'America/Sao_Paulo',
      };
    }
  } else {
    // All-day event
    event.start = { date: input.start_date };
    // End = next day for all-day events
    const nextDay = new Date(input.start_date);
    nextDay.setDate(nextDay.getDate() + 1);
    const y = nextDay.getFullYear();
    const m = String(nextDay.getMonth() + 1).padStart(2, '0');
    const d = String(nextDay.getDate()).padStart(2, '0');
    event.end = { date: `${y}-${m}-${d}` };
  }

  // Recurrence
  if (input.recurrence_rule) {
    event.recurrence = [input.recurrence_rule];
  }

  return event;
}

/**
 * Convert tipo_recorrencia to RRULE
 */
export function tipoRecorrenciaToRRule(tipo: string | null, recorrente: boolean): string | null {
  if (!recorrente || !tipo) return null;

  switch (tipo) {
    case 'diario':
      return 'RRULE:FREQ=DAILY';
    case 'semanal':
      return 'RRULE:FREQ=WEEKLY';
    case 'mensal':
      return 'RRULE:FREQ=MONTHLY';
    case 'anual':
      return 'RRULE:FREQ=YEARLY';
    default:
      return null;
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create event in Google Calendar
 */
export async function createGoogleEvent(
  supabase: SupabaseClient,
  usuarioId: number,
  input: CalendarEventInput,
  calendarType: 'pf' | 'pj' = 'pf'
): Promise<string | null> {
  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) return null;

  const tokens = await getUserTokens(supabase, usuarioId);
  const calendarId = (calendarType === 'pj' ? tokens?.calendar_id_pj : tokens?.calendar_id_pf) || 'primary';

  try {
    const eventBody = buildEventBody(input);

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Google Calendar create event failed:', err);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    return null;
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateGoogleEvent(
  supabase: SupabaseClient,
  usuarioId: number,
  googleEventId: string,
  input: CalendarEventInput,
  calendarType: 'pf' | 'pj' = 'pf'
): Promise<boolean> {
  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) return false;

  const tokens = await getUserTokens(supabase, usuarioId);
  const calendarId = (calendarType === 'pj' ? tokens?.calendar_id_pj : tokens?.calendar_id_pf) || 'primary';

  try {
    const eventBody = buildEventBody(input);
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('[GCal] Update event failed:', response.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[GCal] Error updating event:', err);
    return false;
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleEvent(
  supabase: SupabaseClient,
  usuarioId: number,
  googleEventId: string,
  calendarType: 'pf' | 'pj' = 'pf'
): Promise<boolean> {
  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) return false;

  const tokens = await getUserTokens(supabase, usuarioId);
  const calendarId = (calendarType === 'pj' ? tokens?.calendar_id_pj : tokens?.calendar_id_pf) || 'primary';

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 204 = success, 410 = already deleted (both are fine)
    if (!response.ok && response.status !== 410) {
      console.error('Google Calendar delete event failed:', response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
    return false;
  }
}

/**
 * List available calendars from user's Google account
 */
export async function listGoogleCalendars(
  supabase: SupabaseClient,
  usuarioId: number
): Promise<{ id: string; summary: string; primary: boolean }[] | null> {
  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/users/me/calendarList`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Google Calendar list calendars failed:', response.status);
      return null;
    }

    const data = await response.json();
    return (data.items || []).map((cal: any) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      primary: cal.primary || false,
    }));
  } catch (err) {
    console.error('Error listing Google calendars:', err);
    return null;
  }
}

/**
 * List events from Google Calendar (for displaying on calendar)
 */
export async function listGoogleEvents(
  supabase: SupabaseClient,
  usuarioId: number,
  timeMin: string,
  timeMax: string
): Promise<any[] | null> {
  const accessToken = await getValidAccessToken(supabase, usuarioId);
  if (!accessToken) return null;

  const tokens = await getUserTokens(supabase, usuarioId);
  const calendarId = tokens?.calendar_id_pf || 'primary';

  try {
    const params = new URLSearchParams({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Google Calendar list events failed:', err);
      return null;
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error('Error listing Google Calendar events:', err);
    return null;
  }
}
