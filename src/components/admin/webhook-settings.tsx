"use client";

import { useState, useEffect } from "react";
import { Webhook, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SuccessModal } from "@/components/admin/success-modal";

export function WebhookSettings() {
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadWebhookConfig();
  }, []);

  const loadWebhookConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('webhook_convite_membro')
        .eq('id', 1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setWebhookUrl(data.webhook_convite_membro || '');
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('configuracoes_sistema')
        .update({ webhook_convite_membro: webhookUrl })
        .eq('id', 1);

      if (error) throw error;

      setShowSuccessModal(true);
    } catch (err: any) {
      alert('❌ Erro ao salvar webhook: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Webhook className="w-6 h-6 text-blue-500" />
          Webhook N8N - Convites de Membros
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure o webhook do N8N para enviar convites via WhatsApp quando adicionar novos membros à equipe.
        </p>
      </div>

      {/* Card de Configurações */}
      <div className="bg-[var(--bg-card)]/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        {/* URL do Webhook */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            URL do Webhook N8N
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://seu-n8n.com/webhook/convite-membro"
            className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            Cole aqui a URL do webhook do seu N8N. Este webhook receberá os dados do convite quando você clicar em "Enviar convite WhatsApp".
          </p>
        </div>

        {/* Informações sobre os dados enviados */}
        <div className="bg-[var(--bg-base)] border border-zinc-800 rounded-lg p-4">
          <h3 className="text-[var(--text-primary)] font-medium mb-3 text-sm">📦 Dados Enviados ao Webhook</h3>
          <div className="space-y-2 text-xs text-[var(--text-secondary)] font-mono">
            <div className="bg-[var(--bg-card)] p-3 rounded border border-zinc-800">
              <pre className="whitespace-pre-wrap">{`{
  "admin": {
    "id": 123,
    "nome": "Nome do Admin",
    "email": "admin@email.com",
    "celular": "5511999999999"
  },
  "membro": {
    "id": 456,
    "nome": "Nome do Membro",
    "email": "membro@email.com",
    "telefone": "5511988888888"
  },
  "timestamp": "2026-01-05T18:30:00.000Z"
}`}</pre>
            </div>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">
            Use esses dados no N8N para personalizar a mensagem do WhatsApp e enviar o convite.
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Webhook'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Webhook Configurado!"
        message="A URL do webhook N8N foi salva com sucesso. Agora você pode enviar convites via WhatsApp."
      />
    </div>
  );
}
