"use client";

import { useState, useEffect, useCallback } from "react";
import { Plug, Calendar, CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw, ChevronDown, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useLanguage } from "@/contexts/language-context";
import { createClient } from "@/lib/supabase/client";

interface GoogleIntegration {
  id: number;
  google_email: string | null;
  is_active: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_incoming_sync_at: string | null;
  calendar_id_pf: string;
  calendar_name_pf: string | null;
  calendar_id_pj: string;
  calendar_name_pj: string | null;
  sync_enabled_pf: boolean;
  sync_enabled_pj: boolean;
  enable_bidirectional_sync: boolean;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

export function IntegrationsSettings() {
  const { t } = useLanguage();
  const { profile } = useUser();
  const supabase = createClient();

  const [integration, setIntegration] = useState<GoogleIntegration | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendarIdPf, setCalendarIdPf] = useState('primary');
  const [calendarIdPj, setCalendarIdPj] = useState('primary');
  const [syncEnabledPf, setSyncEnabledPf] = useState(true);
  const [syncEnabledPj, setSyncEnabledPj] = useState(true);
  const [useSameCalendar, setUseSameCalendar] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showConnectedToast, setShowConnectedToast] = useState(false);
  const [bidirectionalSync, setBidirectionalSync] = useState(false);
  const [togglingBiSync, setTogglingBiSync] = useState(false);
  const [biSyncError, setBiSyncError] = useState<string | null>(null);

  // Check if we just connected (redirected from callback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected') === 'true') {
      setShowConnectedToast(true);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('gcal_connected');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const fetchIntegration = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('id, google_email, is_active, connected_at, last_sync_at, last_incoming_sync_at, calendar_id_pf, calendar_name_pf, calendar_id_pj, calendar_name_pj, sync_enabled_pf, sync_enabled_pj, enable_bidirectional_sync')
        .eq('usuario_id', profile.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setIntegration(data);
        setCalendarIdPf(data.calendar_id_pf || 'primary');
        setCalendarIdPj(data.calendar_id_pj || 'primary');
        setSyncEnabledPf(data.sync_enabled_pf ?? true);
        setSyncEnabledPj(data.sync_enabled_pj ?? true);
        setUseSameCalendar(data.calendar_id_pf === data.calendar_id_pj);
        setBidirectionalSync(data.enable_bidirectional_sync ?? false);
      } else {
        setIntegration(null);
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const fetchCalendars = useCallback(async () => {
    if (!integration) return;
    setLoadingCalendars(true);
    try {
      const res = await fetch('/api/google-calendar/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setLoadingCalendars(false);
    }
  }, [integration]);

  useEffect(() => {
    if (integration) {
      fetchCalendars();
    }
  }, [integration, fetchCalendars]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/google-calendar/auth?origin=${encodeURIComponent(origin)}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao iniciar autenticação');
        setConnecting(false);
      }
    } catch {
      alert('Erro ao conectar com Google Agenda');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectModal(false);
    setDisconnecting(true);
    try {
      const res = await fetch('/api/google-calendar/disconnect', { method: 'POST' });
      if (res.ok) {
        setIntegration(null);
        setCalendars([]);
      } else {
        alert('Erro ao desconectar');
      }
    } catch {
      alert('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveCalendars = async () => {
    setSavingCalendars(true);
    setSaveSuccess(false);
    try {
      const pfCalendar = calendars.find(c => c.id === calendarIdPf);
      const pjCalendarId = useSameCalendar ? calendarIdPf : calendarIdPj;
      const pjCalendar = calendars.find(c => c.id === pjCalendarId);

      const res = await fetch('/api/google-calendar/calendars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id_pf: calendarIdPf,
          calendar_name_pf: pfCalendar?.summary || null,
          calendar_id_pj: pjCalendarId,
          calendar_name_pj: pjCalendar?.summary || null,
          sync_enabled_pf: syncEnabledPf,
          sync_enabled_pj: useSameCalendar ? syncEnabledPf : syncEnabledPj,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchIntegration();
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch {
      alert('Erro ao salvar configurações');
    } finally {
      setSavingCalendars(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          {t('integrations.title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('integrations.subtitle')}
        </p>
      </div>

      {/* Google Agenda Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl overflow-hidden">
        {/* Card Header */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-medium">{t('integrations.googleAgenda')}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t('integrations.googleSync')}</p>
            </div>
          </div>

          {integration ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">{t('integrations.connected')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">{t('integrations.disconnected')}</span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5">
          {!integration ? (
            /* Not Connected State */
            <div className="text-center py-6">
              <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm mb-1">
                {t('integrations.connectPrompt')}
              </p>
              <p className="text-[var(--text-tertiary)] text-xs mb-5">
                {t('integrations.connectDesc')}
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {connecting ? t('integrations.connecting') : t('integrations.connectGoogle')}
              </button>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-5">
              {/* Connection Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card-inner)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('integrations.connectedAccount')}</p>
                  <p className="text-sm text-[var(--text-primary)] truncate">{integration.google_email || '—'}</p>
                </div>
                <div className="bg-[var(--bg-card-inner)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('integrations.connectedAt')}</p>
                  <p className="text-sm text-[var(--text-primary)]">{formatDate(integration.connected_at)}</p>
                </div>
                <div className="bg-[var(--bg-card-inner)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('integrations.lastSync')}</p>
                  <p className="text-sm text-[var(--text-primary)]">{formatDate(integration.last_sync_at)}</p>
                </div>
              </div>

              {/* Calendar Configuration */}
              <div className="border-t border-[var(--border-default)] pt-5">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  {t('integrations.calendarConfig')}
                </h4>

                {loadingCalendars ? (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('integrations.loadingCalendars')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Use same calendar toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-[var(--text-secondary)]">
                        {t('integrations.useSameCalendar')}
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={useSameCalendar}
                          onChange={(e) => setUseSameCalendar(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* PF Calendar */}
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                        {useSameCalendar ? t('integrations.calendarBoth') : t('integrations.calendarPF')}
                      </label>
                      <div className="relative">
                        <select
                          value={calendarIdPf}
                          onChange={(e) => {
                            setCalendarIdPf(e.target.value);
                            if (useSameCalendar) setCalendarIdPj(e.target.value);
                          }}
                          className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--input-text)] appearance-none focus:outline-none focus:border-primary transition-colors pr-10"
                        >
                          {calendars.map((cal) => (
                            <option key={cal.id} value={cal.id}>
                              {cal.summary} {cal.primary ? `(${t('integrations.primary')})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sync PF toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-[var(--text-secondary)]">
                        {useSameCalendar ? t('integrations.syncActive') : t('integrations.syncPFActive')}
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={syncEnabledPf}
                          onChange={(e) => setSyncEnabledPf(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* PJ Calendar (only if not same) */}
                    {!useSameCalendar && (
                      <>
                        <div className="border-t border-[var(--border-default)] pt-4">
                          <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
                            {t('integrations.calendarPJ')}
                          </label>
                          <div className="relative">
                            <select
                              value={calendarIdPj}
                              onChange={(e) => setCalendarIdPj(e.target.value)}
                              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--input-text)] appearance-none focus:outline-none focus:border-primary transition-colors pr-10"
                            >
                              {calendars.map((cal) => (
                                <option key={cal.id} value={cal.id}>
                                  {cal.summary} {cal.primary ? `(${t('integrations.primary')})` : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm text-[var(--text-secondary)]">
                            {t('integrations.syncPJActive')}
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={syncEnabledPj}
                              onChange={(e) => setSyncEnabledPj(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </>
                    )}

                    {/* Save Button */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSaveCalendars}
                        disabled={savingCalendars}
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingCalendars ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {savingCalendars ? t('integrations.saving') : t('integrations.saveConfig')}
                      </button>
                      {saveSuccess && (
                        <span className="text-sm text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('integrations.savedSuccess')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bidirectional Sync */}
              <div className="border-t border-[var(--border-default)] pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Sincronização Bidirecional</h4>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Quando ativada, eventos criados ou editados diretamente no Google Agenda serão automaticamente sincronizados para seus compromissos no app.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      {bidirectionalSync ? 'Ativa' : 'Desativada'}
                    </label>
                    {bidirectionalSync && integration.last_incoming_sync_at && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        (Último sync: {formatDate(integration.last_incoming_sync_at)})
                      </span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={bidirectionalSync}
                      disabled={togglingBiSync}
                      onChange={async (e) => {
                        const enable = e.target.checked;
                        setTogglingBiSync(true);
                        setBiSyncError(null);
                        try {
                          if (enable) {
                            // Register webhook for PF
                            const resPf = await fetch('/api/google-calendar/watch', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ calendar_type: 'pf' }),
                            });
                            if (!resPf.ok) {
                              const err = await resPf.json().catch(() => ({}));
                              throw new Error(err.error || err.details || 'Falha ao ativar sync PF');
                            }
                            // Register webhook for PJ if different calendar
                            if (!useSameCalendar && syncEnabledPj) {
                              const resPj = await fetch('/api/google-calendar/watch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ calendar_type: 'pj' }),
                              });
                              if (!resPj.ok) {
                                const err = await resPj.json().catch(() => ({}));
                                throw new Error(err.error || err.details || 'Falha ao ativar sync PJ');
                              }
                            }
                          } else {
                            // Stop webhooks
                            await fetch('/api/google-calendar/watch', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ calendar_type: 'pf' }),
                            });
                            if (!useSameCalendar) {
                              await fetch('/api/google-calendar/watch', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ calendar_type: 'pj' }),
                              });
                            }
                          }
                          setBidirectionalSync(enable);
                          fetchIntegration();
                        } catch (err: any) {
                          setBiSyncError(err.message || 'Erro ao alterar sincronização');
                          // Revert toggle
                          setBidirectionalSync(!enable);
                        } finally {
                          setTogglingBiSync(false);
                        }
                      }}
                    />
                    <div className={cn(
                      "w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                      togglingBiSync ? 'opacity-50 cursor-wait' : '',
                      bidirectionalSync ? 'bg-blue-500 after:translate-x-full' : 'bg-[var(--bg-elevated)]'
                    )}></div>
                  </label>
                </div>
                {biSyncError && (
                  <p className="text-xs text-red-400 mt-2">{biSyncError}</p>
                )}
                {togglingBiSync && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {bidirectionalSync ? 'Desativando...' : 'Ativando e sincronizando eventos...'}
                  </div>
                )}
              </div>

              {/* Disconnect */}
              <div className="border-t border-[var(--border-default)] pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{t('integrations.disconnectTitle')}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{t('integrations.disconnectKeep')}</p>
                  </div>
                  <button
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={disconnecting}
                    className="px-4 py-2 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {disconnecting ? t('integrations.disconnecting') : t('integrations.disconnect')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDisconnectModal(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('integrations.disconnectTitle')}</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {t('integrations.disconnectConfirm')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium transition-colors"
              >
                {t('reminders.modal.cancel')}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('integrations.disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Success Modal */}
      {showConnectedToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConnectedToast(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t('integrations.connectedSuccess')}</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-[var(--text-primary)]">
                {t('integrations.connectedSuccessDesc')}
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-sm text-amber-300 font-medium mb-1">
                  {t('integrations.important')}
                </p>
                <p className="text-xs text-amber-300/80">
                  {t('integrations.importantDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectedToast(false)}
              className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t('integrations.understood')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
