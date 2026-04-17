"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Bell, MessageCircle, Mail, Clock, Calendar, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { SuccessNotificationModal } from "@/components/ui/success-notification-modal";

interface NotificationConfig {
  enabled: boolean;
  whatsapp: boolean;
  email: boolean;
  reminderTime: string;
}

interface WhatsappReminderConfig {
  antecedenciaMinutos: number;
  resumoDiarioAtivo: boolean;
  resumoDiarioHorario: string;
  resumoDiarioTipo: string;
  hasIntegration: boolean;
}

export function NotificationSettings() {
  const { t } = useLanguage();
  const { profile } = useUser();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaveSuccess, setWhatsappSaveSuccess] = useState(false);

  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappReminderConfig>({
    antecedenciaMinutos: 30,
    resumoDiarioAtivo: false,
    resumoDiarioHorario: '22:00',
    resumoDiarioTipo: 'AMANHA',
    hasIntegration: false,
  });

  const [settings, setSettings] = useState<NotificationConfig>({
    enabled: true,
    whatsapp: true,
    email: true,
    reminderTime: 'vencimento'
  });

  // Carregar configurações do banco de dados
  useEffect(() => {
    const loadPreferences = async () => {
      if (!profile?.id) return;

      try {
        const supabase = createClient();

        // Buscar preferências do usuário
        // RLS policy usa verificar_proprietario_por_auth() que retorna usuarios.id baseado em auth.uid()
        const { data, error } = await supabase
          .from('preferencias_notificacao')
          .select('*');

        if (error) {
          // Error handled by throw below
          throw error;
        }

        if (data && data.length > 0) {
          // Converter dados do banco para formato do componente
          const hasEmailGeral = data.find(p => p.tipo_notificacao === 'email_geral' && p.habilitado);
          const lembreteVencimento = data.find(p => p.tipo_notificacao === 'lembrete_vencimento');

          // Mapear dias_antecedencia para reminderTime
          const diasMap: Record<number, string> = {
            0: 'vencimento',
            1: '1dia',
            3: '3dias',
            7: '7dias'
          };

          setSettings({
            enabled: lembreteVencimento?.habilitado ?? false,
            email: hasEmailGeral ? true : false,
            whatsapp: hasEmailGeral ? true : false, // Usar email_geral para ambos (email e whatsapp)
            reminderTime: lembreteVencimento?.dias_antecedencia !== null
              ? (diasMap[lembreteVencimento.dias_antecedencia] || 'vencimento')
              : 'vencimento'
          });
        } else {
          // Se não há dados no banco, manter defaults ativos
          setSettings({
            enabled: true,
            whatsapp: true,
            email: true,
            reminderTime: 'vencimento'
          });
        }
      } catch (error) {
        // Silent fail - UI shows loading state
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [profile?.id]);

  // Carregar configurações de WhatsApp (independente do Google Agenda estar conectado)
  useEffect(() => {
    const loadWhatsappConfig = async () => {
      if (!profile?.id) return;
      try {
        const supabase = createClient();
        // Sem filtro is_active — carrega prefs mesmo sem GCal conectado
        const { data } = await supabase
          .from('google_calendar_integrations')
          .select('antecedencia_minutos, resumo_diario_ativo, resumo_diario_horario, resumo_diario_tipo')
          .eq('usuario_id', profile.id)
          .maybeSingle();

        if (data) {
          setWhatsappConfig({
            antecedenciaMinutos: data.antecedencia_minutos ?? 30,
            resumoDiarioAtivo: data.resumo_diario_ativo ?? false,
            resumoDiarioHorario: data.resumo_diario_horario ? data.resumo_diario_horario.substring(0, 5) : '22:00',
            resumoDiarioTipo: data.resumo_diario_tipo ?? 'AMANHA',
            hasIntegration: true,
          });
        } else {
          // Sem row ainda — mostrar defaults, hasIntegration = false apenas para controle interno
          setWhatsappConfig(prev => ({ ...prev, hasIntegration: false }));
        }
      } catch (error) {
        // Silent fail
      }
    };
    loadWhatsappConfig();
  }, [profile?.id]);

  const handleSaveWhatsapp = async () => {
    if (!profile?.id) return;
    setSavingWhatsapp(true);
    setWhatsappSaveSuccess(false);
    try {
      const supabase = createClient();

      // Verificar se já existe row para o usuário (independente de is_active)
      const { data: existing } = await supabase
        .from('google_calendar_integrations')
        .select('id')
        .eq('usuario_id', profile.id)
        .maybeSingle();

      if (existing) {
        // Row existe: atualizar só os campos de WhatsApp, preservar is_active e tokens do GCal
        const { error } = await supabase
          .from('google_calendar_integrations')
          .update({
            antecedencia_minutos: whatsappConfig.antecedenciaMinutos,
            resumo_diario_ativo: whatsappConfig.resumoDiarioAtivo,
            resumo_diario_horario: whatsappConfig.resumoDiarioHorario + ':00',
            resumo_diario_tipo: whatsappConfig.resumoDiarioTipo,
          })
          .eq('usuario_id', profile.id);
        if (error) throw error;
      } else {
        // Row não existe: inserir com is_active = false (GCal não conectado ainda)
        // Quando o usuário conectar o GCal, o callback faz upsert preservando esses campos
        const { error } = await supabase
          .from('google_calendar_integrations')
          .insert({
            usuario_id: profile.id,
            is_active: false,
            antecedencia_minutos: whatsappConfig.antecedenciaMinutos,
            resumo_diario_ativo: whatsappConfig.resumoDiarioAtivo,
            resumo_diario_horario: whatsappConfig.resumoDiarioHorario + ':00',
            resumo_diario_tipo: whatsappConfig.resumoDiarioTipo,
          });
        if (error) throw error;
        setWhatsappConfig(prev => ({ ...prev, hasIntegration: true }));
      }

      setWhatsappSaveSuccess(true);
      setTimeout(() => setWhatsappSaveSuccess(false), 3000);
    } catch (error: any) {
      alert(t('settings.saveError') + ': ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // 1. Deletar preferências antigas do usuário
      const { error: deleteError } = await supabase
        .from('preferencias_notificacao')
        .delete()
        .eq('usuario_id', profile.id);

      if (deleteError) throw deleteError;

      // 2. Preparar novas preferências
      const preferences = [];

      // Email geral (representa notificações por email e whatsapp)
      if (settings.enabled && (settings.email || settings.whatsapp)) {
        preferences.push({
          usuario_id: profile.id,
          tipo_notificacao: 'email_geral',
          habilitado: true,
          dias_antecedencia: null
        });
      }

      // Lembrete de vencimento (sempre salvar para manter configuração)
      const diasMap: Record<string, number> = {
        'vencimento': 0,
        '1dia': 1,
        '3dias': 3,
        '7dias': 7
      };

      preferences.push({
        usuario_id: profile.id,
        tipo_notificacao: 'lembrete_vencimento',
        habilitado: settings.enabled,
        dias_antecedencia: diasMap[settings.reminderTime] ?? 0
      });

      // 3. Inserir novas preferências
      if (preferences.length > 0) {
        const { error: insertError } = await supabase
          .from('preferencias_notificacao')
          .insert(preferences);

        if (insertError) throw insertError;
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      // Error shown via alert below
      alert(t('settings.saveError') + ': ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)]">{t('settings.notificationConfig')}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{t('settings.notificationDesc')}</p>
      </div>

      {/* ... Resto do componente igual ... */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 space-y-8">

        {/* Habilitar Geral */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-medium text-[var(--text-primary)]">{t('settings.enableNotifications')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.enabled}
              onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="font-medium text-[var(--text-primary)]">{t('settings.whatsapp')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.whatsapp}
              onChange={e => setSettings({ ...settings, whatsapp: e.target.checked })}
              disabled={!settings.enabled}
            />
            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-medium text-[var(--text-primary)]">{t('settings.email')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.email}
              onChange={e => setSettings({ ...settings, email: e.target.checked })}
              disabled={!settings.enabled}
            />
            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Quando Lembrar */}
        <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="font-medium text-[var(--text-primary)]">{t('settings.reminderTime')}</span>
          </div>
          <select
            value={settings.reminderTime}
            onChange={e => setSettings({ ...settings, reminderTime: e.target.value })}
            disabled={!settings.enabled}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] appearance-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="vencimento">{t('settings.onDueDate')}</option>
            <option value="1dia">{t('settings.oneDayBefore')}</option>
            <option value="3dias">{t('settings.threeDaysBefore')}</option>
            <option value="7dias">{t('settings.sevenDaysBefore')}</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('settings.save')}
        </button>
      </div>

      {/* Seção: Lembretes WhatsApp (Agenda) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center gap-3 border-b border-[var(--border-default)]">
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-medium">{t('integrations.whatsappReminders')}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{t('integrations.whatsappRemindersDesc')}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-6">
            {/* Antecedência do lembrete */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-400" />
                <span className="font-medium text-[var(--text-primary)] text-sm">{t('integrations.reminderBefore')}</span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{t('integrations.reminderBeforeDesc')}</p>
              <div className="relative">
                <select
                  value={whatsappConfig.antecedenciaMinutos}
                  onChange={e => setWhatsappConfig({ ...whatsappConfig, antecedenciaMinutos: Number(e.target.value) })}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] text-sm appearance-none focus:outline-none focus:border-green-500 transition-colors pr-10"
                >
                  <option value={15}>{t('integrations.minutes15')}</option>
                  <option value={30}>{t('integrations.minutes30')}</option>
                  <option value={60}>{t('integrations.minutes60')}</option>
                  <option value={120}>{t('integrations.minutes120')}</option>
                  <option value={1440}>{t('integrations.minutes1440')}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-[var(--border-default)]" />

            {/* Resumo Diário - Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="font-medium text-[var(--text-primary)] text-sm">{t('integrations.dailySummary')}</span>
                  <p className="text-xs text-[var(--text-tertiary)]">{t('integrations.dailySummaryDesc')}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={whatsappConfig.resumoDiarioAtivo}
                  onChange={e => setWhatsappConfig({ ...whatsappConfig, resumoDiarioAtivo: e.target.checked })}
                />
                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Configurações do resumo diário (só aparece se ativo) */}
            {whatsappConfig.resumoDiarioAtivo && (
              <div className="space-y-4 pl-2 border-l-2 border-green-500/20 ml-2">
                {/* Horário */}
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">{t('integrations.dailySummaryTime')}</span>
                  </div>
                  <input
                    type="time"
                    value={whatsappConfig.resumoDiarioHorario}
                    onChange={e => setWhatsappConfig({ ...whatsappConfig, resumoDiarioHorario: e.target.value })}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] text-sm focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                {/* Tipo: Hoje ou Amanhã */}
                <div className="space-y-2 pl-4">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{t('integrations.dailySummaryType')}</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWhatsappConfig({ ...whatsappConfig, resumoDiarioTipo: 'HOJE' })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        whatsappConfig.resumoDiarioTipo === 'HOJE'
                          ? "border-green-500 bg-green-500/10"
                          : "border-[var(--border-medium)] bg-[var(--input-bg)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium block",
                        whatsappConfig.resumoDiarioTipo === 'HOJE' ? "text-green-400" : "text-[var(--text-primary)]"
                      )}>
                        {t('integrations.dailySummaryToday')}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] mt-0.5 block">
                        {t('integrations.dailySummaryTodayDesc')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsappConfig({ ...whatsappConfig, resumoDiarioTipo: 'AMANHA' })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        whatsappConfig.resumoDiarioTipo === 'AMANHA'
                          ? "border-green-500 bg-green-500/10"
                          : "border-[var(--border-medium)] bg-[var(--input-bg)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium block",
                        whatsappConfig.resumoDiarioTipo === 'AMANHA' ? "text-green-400" : "text-[var(--text-primary)]"
                      )}>
                        {t('integrations.dailySummaryTomorrow')}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] mt-0.5 block">
                        {t('integrations.dailySummaryTomorrowDesc')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Salvar WhatsApp */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveWhatsapp}
                disabled={savingWhatsapp}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingWhatsapp && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingWhatsapp ? t('integrations.whatsappSaving') : t('integrations.saveWhatsapp')}
              </button>
              {whatsappSaveSuccess && (
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('integrations.whatsappSaved')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Sucesso */}
      <SuccessNotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('success.saved')}
        message={t('success.notificationsUpdated')}
      />
    </div>
  );
}
