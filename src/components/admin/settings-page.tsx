"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SuccessModal } from "./success-modal";
import { WhatsAppSettings } from "./whatsapp-settings";
import { AdminSettings } from "./admin-settings";
import { LogoSettings } from "./logo-settings";
import { WebhookSettings } from "./webhook-settings";
import { GoogleCalendarSettings } from "./google-calendar-settings";
import { TutorialAdminSection } from "@/components/dashboard/admin/tutorial-admin-section";

interface WhiteLabelSettings {
  app_name: string;
  app_logo_url: string;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  idioma_padrao_planos?: 'pt' | 'es' | 'en';
  moeda_padrao_planos?: 'BRL' | 'USD' | 'EUR' | 'PYG' | 'ARS';
  habilitar_toggle_periodo_planos?: boolean;
  percentual_desconto_anual?: number;
  habilitar_conciliacao_ofx?: boolean;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<WhiteLabelSettings>({
    app_name: "GranaZap",
    app_logo_url: "",
    primary_color: "#22C55E",
    secondary_color: "#0A0F1C",
    support_email: "suporte@granazap.com",
    idioma_padrao_planos: 'pt',
    moeda_padrao_planos: 'BRL',
    habilitar_toggle_periodo_planos: true,
    percentual_desconto_anual: 15,
    habilitar_conciliacao_ofx: true,
  });
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_settings');

      if (error) throw error;

      // A RPC pode retornar um array ou objeto direto
      const settingsData = Array.isArray(data) ? data[0] : data;

      if (settingsData) {
        const newSettings = {
          app_name: settingsData.company_name || settingsData.app_name || "GranaZap",
          app_logo_url: settingsData.app_logo_url || "",
          primary_color: settingsData.primary_color || "#22C55E",
          secondary_color: settingsData.secondary_color || "#0A0F1C",
          support_email: settingsData.support_email || "suporte@granazap.com",
          idioma_padrao_planos: settingsData.idioma_padrao_planos || 'pt',
          moeda_padrao_planos: settingsData.moeda_padrao_planos || 'BRL',
          habilitar_toggle_periodo_planos: settingsData.habilitar_toggle_periodo_planos !== false,
          percentual_desconto_anual: settingsData.percentual_desconto_anual || 15,
          habilitar_conciliacao_ofx: settingsData.habilitar_conciliacao_ofx !== false,
        };
        setSettings(newSettings);
      }
    } catch (error) {
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {

      const result = await supabase.rpc('update_system_settings', {
        p_app_name: settings.app_name,
        p_app_logo_url: settings.app_logo_url,
        p_primary_color: settings.primary_color,
        p_secondary_color: settings.secondary_color,
        p_support_email: settings.support_email,
        p_idioma_padrao_planos: settings.idioma_padrao_planos,
        p_moeda_padrao_planos: settings.moeda_padrao_planos,
        p_habilitar_toggle_periodo_planos: settings.habilitar_toggle_periodo_planos,
        p_percentual_desconto_anual: settings.percentual_desconto_anual,
        p_habilitar_conciliacao_ofx: settings.habilitar_conciliacao_ofx,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Erro ao salvar configurações');
      }

      // A função retorna um array com um objeto {success, message}
      const response = Array.isArray(result.data) ? result.data[0] : result.data;

      if (response && !response.success) {
        throw new Error(response.message || 'Erro ao salvar configurações');
      }

      setShowSuccessModal(true);
      // Recarregar a página para aplicar as mudanças globais
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      alert(`Erro ao salvar configurações: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    {
      name: "GranaZap Original",
      primary: "#22C55E",
      secondary: "#0A0F1C",
      preview: "bg-[#22C55E]"
    },
    {
      name: "Nubank Style",
      primary: "#8A05BE",
      secondary: "#0A0F1C",
      preview: "bg-[#8A05BE]"
    },
    {
      name: "Inter Style",
      primary: "#FF7A00",
      secondary: "#111827",
      preview: "bg-[#FF7A00]"
    },
    {
      name: "Neon Blue",
      primary: "#3B82F6",
      secondary: "#0F172A",
      preview: "bg-[#3B82F6]"
    },
    {
      name: "Hot Pink",
      primary: "#EC4899",
      secondary: "#000000",
      preview: "bg-[#EC4899]"
    }
  ];

  const applyTheme = (theme: typeof themes[0]) => {
    setSettings({
      ...settings,
      primary_color: theme.primary,
      secondary_color: theme.secondary
    });
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-2">
          <Settings className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Configurações da Plataforma</h1>
        </div>
        <p className="text-sm lg:text-base text-[var(--text-secondary)]">Personalize a aparência da plataforma</p>
      </div>

      {/* Admin Settings */}
      <div className="mb-6 lg:mb-8">
        <AdminSettings />
      </div>

      {/* Tutorial Admin Settings */}
      <div className="mb-6 lg:mb-8">
        <TutorialAdminSection />
      </div>

      {/* WhatsApp Settings */}
      <div className="mb-6 lg:mb-8">
        <WhatsAppSettings />
      </div>

      {/* Webhook Settings */}
      <div className="mb-6 lg:mb-8">
        <WebhookSettings />
      </div>

      {/* Google Calendar Settings */}
      <div className="mb-6 lg:mb-8">
        <GoogleCalendarSettings />
      </div>

      {/* Logo Settings */}
      <div className="mb-6 lg:mb-8">
        <LogoSettings />
      </div>

      {/* Identidade Visual */}
      <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Identidade Visual</h2>
        </div>

        {/* Temas Pré-definidos */}
        <div className="mb-6 lg:mb-8">
          <label className="block text-xs lg:text-sm font-medium text-[var(--text-secondary)] mb-3">
            Temas Pré-definidos
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className="group relative flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <div className={`w-4 h-4 rounded-full ${theme.preview}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Nome do App */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Nome da Aplicação
            </label>
            <input
              type="text"
              value={settings.app_name}
              onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary"
            />
          </div>

          {/* Email de Suporte */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Email de Suporte
            </label>
            <input
              type="email"
              value={settings.support_email}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              placeholder="suporte@seudominio.com"
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Email exibido nas páginas de Termos, Política de Privacidade e suporte geral
            </p>
          </div>

          {/* WhatsApp de Suporte - gerenciado na seção WhatsApp Settings */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg">
            <span className="text-sm text-[var(--text-tertiary)]">
              💬 O número do <strong className="text-[var(--text-secondary)]">WhatsApp de Suporte</strong> é configurado na seção <strong className="text-[var(--text-secondary)]">Configurações do WhatsApp</strong> acima.
            </span>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              URL do Logo
            </label>
            <input
              type="text"
              value={settings.app_logo_url}
              onChange={(e) => setSettings({ ...settings, app_logo_url: e.target.value })}
              placeholder="https://..."
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-primary"
            />
          </div>

          {/* Cor Primária */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Cor Primária
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-16 h-12 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          {/* Cor Secundária */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Cor Secundária
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-16 h-12 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>
        </div>

        {/* Configurações da Página de Planos */}
        <div className="mt-8 pt-8 border-t border-[var(--border-medium)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Página de Planos Pública</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Configure o idioma e moeda padrão que aparecem inicialmente na página de planos. Os visitantes podem alterar conforme preferência.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Idioma Padrão */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Idioma Padrão Inicial
              </label>
              <select
                value={settings.idioma_padrao_planos}
                onChange={(e) => setSettings({ ...settings, idioma_padrao_planos: e.target.value as any })}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary"
              >
                <option value="pt">🇧🇷 Português</option>
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Idioma que aparece selecionado quando o visitante acessa a página de planos
              </p>
            </div>

            {/* Moeda Padrão */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Moeda Padrão dos Valores
              </label>
              <select
                value={settings.moeda_padrao_planos}
                onChange={(e) => setSettings({ ...settings, moeda_padrao_planos: e.target.value as any })}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary"
              >
                <option value="BRL">R$ Real Brasileiro (BRL)</option>
                <option value="USD">$ Dólar Americano (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="PYG">₲ Guaraní Paraguaio (PYG)</option>
                <option value="ARS">$ Peso Argentino (ARS)</option>
              </select>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Moeda usada para exibir os valores dos planos na página pública
              </p>
            </div>
          </div>

          {/* Toggle de Período */}
          <div className="mt-6 pt-6 border-t border-[var(--border-medium)]">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Habilitar Toggle Mensal/Anual
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Se habilitado, exibe toggle moderno (Mensal ↔ Anual) na página de planos.<br />
                  Se desabilitado, mostra todos os períodos (mensal, trimestral, semestral, anual).
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.habilitar_toggle_periodo_planos}
                  onChange={(e) => setSettings({ ...settings, habilitar_toggle_periodo_planos: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>

          {/* Percentual de Desconto Anual */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Percentual de Desconto Anual (%)
            </label>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              Desconto exibido no badge do toggle "Anual" (ex: 15 para mostrar -15%).<br />
              Use 0 para não exibir badge de desconto.
            </p>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.percentual_desconto_anual || 0}
              onChange={(e) => setSettings({ ...settings, percentual_desconto_anual: parseInt(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary"
              placeholder="15"
            />
          </div>

          {/* Conciliação OFX */}
          <div className="mt-6 pt-6 border-t border-[var(--border-medium)]">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Habilitar Conciliação de Extrato OFX
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Exibe botão "Conciliar Extrato" na fatura do cartão de crédito.<br />
                  Permite importar arquivo OFX do banco para conciliar lançamentos automaticamente.
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.habilitar_conciliacao_ofx !== false}
                  onChange={(e) => setSettings({ ...settings, habilitar_conciliacao_ofx: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end mt-4 lg:mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações da plataforma foram atualizadas com sucesso."
      />
    </div>
  );
}
