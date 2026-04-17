"use client";

import { useState, useEffect } from "react";
import { Calendar, Save, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SuccessModal } from "@/components/admin/success-modal";

export function GoogleCalendarSettings() {
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.rpc('get_google_calendar_credentials').single();
      const creds = data as any;

      if (error) throw error;

      if (creds) {
        setClientId(creds.client_id || '');
        setClientSecret(creds.client_secret || '');
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save to secure google_oauth_secrets table
      const { error: secretsError } = await supabase
        .from('google_oauth_secrets')
        .upsert({
          id: 1,
          client_id: clientId,
          client_secret: clientSecret,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (secretsError) throw secretsError;

      setShowSuccessModal(true);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" />
          Google Calendar - Integração
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure as credenciais OAuth do Google para permitir que os usuários sincronizem seus lembretes com o Google Agenda.
        </p>
      </div>

      {/* Card de Configurações */}
      <div className="bg-[var(--bg-card)]/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="123456789-abc.apps.googleusercontent.com"
            className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Obtido no Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
          </p>
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
              className="w-full px-4 py-2 pr-12 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Segredo do cliente OAuth. Nunca compartilhe este valor.
          </p>
        </div>

        {/* Instruções */}
        <div className="bg-[var(--bg-base)] border border-zinc-800 rounded-lg p-4">
          <h3 className="text-[var(--text-primary)] font-medium mb-3 text-sm">Como configurar</h3>
          <ol className="space-y-2 text-xs text-[var(--text-secondary)] list-decimal list-inside">
            <li>Acesse o <span className="text-blue-400">Google Cloud Console</span></li>
            <li>Crie um projeto ou selecione um existente</li>
            <li>Ative a <span className="text-blue-400">Google Calendar API</span></li>
            <li>Vá em <span className="text-blue-400">APIs & Services → Credentials</span></li>
            <li>Crie um <span className="text-blue-400">OAuth 2.0 Client ID</span> (tipo: Web Application)</li>
            <li>Adicione a URL de callback: <code className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-emerald-400">https://seu-dominio.com/api/google-calendar/callback</code></li>
            <li>Copie o Client ID e Client Secret para os campos acima</li>
          </ol>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Credenciais'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Credenciais Salvas!"
        message="As credenciais do Google Calendar foram salvas com sucesso. Os usuários agora podem conectar suas contas do Google Agenda."
      />
    </div>
  );
}
