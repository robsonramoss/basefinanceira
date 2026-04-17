"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Headphones } from "lucide-react";
import { useWhatsAppConfig } from "@/hooks/use-whatsapp-config";
import { updateWhatsAppConfig } from "@/actions/whatsapp-actions";
import { SuccessModal } from "@/components/admin/success-modal";

export function WhatsAppSettings() {
  const { data: config, refetch } = useWhatsAppConfig();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // IA WhatsApp
  const [habilitado, setHabilitado] = useState(false);
  const [urlWhatsApp, setUrlWhatsApp] = useState('');
  const [textoBotao, setTextoBotao] = useState('Utilizar IA WhatsApp');
  const [videoUrlInstalacao, setVideoUrlInstalacao] = useState('');

  // Suporte WhatsApp
  const [habilitadoSuporte, setHabilitadoSuporte] = useState(false);
  const [urlSuporte, setUrlSuporte] = useState('');
  const [textoSuporte, setTextoSuporte] = useState('Falar com Suporte');
  const [emailSuporte, setEmailSuporte] = useState('');

  useEffect(() => {
    if (config) {
      setHabilitado(config.whatsapp_enabled || false);
      setUrlWhatsApp(config.whatsapp_contact_url || '');
      setTextoBotao(config.whatsapp_contact_text || 'Utilizar IA WhatsApp');
      setVideoUrlInstalacao(config.video_url_instalacao || '');
      setHabilitadoSuporte(config.habilitar_suporte_whatsapp || false);
      setUrlSuporte(config.whatsapp_suporte_url || '');
      setTextoSuporte(config.suporte_whatsapp_text || 'Falar com Suporte');
      setEmailSuporte(config.support_email || '');
    }
  }, [config]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateWhatsAppConfig({
        whatsapp_enabled: habilitado,
        whatsapp_contact_url: urlWhatsApp,
        whatsapp_contact_text: textoBotao,
        video_url_instalacao: videoUrlInstalacao,
        habilitar_suporte_whatsapp: habilitadoSuporte,
        suporte_whatsapp_text: textoSuporte,
        whatsapp_suporte_url: urlSuporte,
        support_email: emailSuporte,
      });

      if (result.success) {
        setShowSuccessModal(true);
        refetch();
      } else {
        alert('❌ Erro ao salvar: ' + result.error);
      }
    } catch (err) {
      alert('❌ Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-green-500" />
          Configurações do WhatsApp
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure os botões de WhatsApp exibidos no menu lateral da aplicação.
        </p>
      </div>

      <div className="bg-[var(--bg-card)]/50 border border-zinc-800 rounded-xl p-6 space-y-8">

        {/* ── SEÇÃO 1: IA WhatsApp ─────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <MessageCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Botão IA WhatsApp
            </h3>
          </div>

          {/* Toggle Habilitar IA */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-primary)] font-medium">Habilitar Botão IA WhatsApp</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Exibe o botão do assistente IA no menu lateral
              </p>
            </div>
            <button
              onClick={() => setHabilitado(!habilitado)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${habilitado ? 'bg-green-600' : 'bg-[var(--bg-elevated)]'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${habilitado ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* URL do WhatsApp IA */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              URL do WhatsApp (IA)
            </label>
            <input
              type="url"
              value={urlWhatsApp}
              onChange={(e) => setUrlWhatsApp(e.target.value)}
              placeholder="https://api.whatsapp.com/send?phone=5511999999999"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Link do WhatsApp com o número do assistente IA
            </p>
          </div>

          {/* Texto do Botão IA */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Texto do Botão
            </label>
            <input
              type="text"
              value={textoBotao}
              onChange={(e) => setTextoBotao(e.target.value)}
              placeholder="Utilizar IA WhatsApp"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-green-500"
            />
          </div>

          {/* URL do Vídeo de Instalação */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              URL do Vídeo de Instalação (Embed)
            </label>
            <input
              type="url"
              value={videoUrlInstalacao}
              onChange={(e) => setVideoUrlInstalacao(e.target.value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              URL do vídeo de instalação PWA (formato embed)
            </p>
          </div>

          {/* Preview IA */}
          {habilitado && urlWhatsApp && (
            <div className="bg-[var(--bg-base)] border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">Preview:</p>
              <button className="flex items-center gap-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
                <MessageCircle className="w-4 h-4" />
                {textoBotao}
              </button>
            </div>
          )}
        </div>

        {/* ── SEÇÃO 2: Suporte WhatsApp ─────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Headphones className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Botão Suporte WhatsApp
            </h3>
          </div>

          {/* Toggle Habilitar Suporte */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-primary)] font-medium">Habilitar Botão de Suporte</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Exibe um botão de suporte humano no menu lateral
              </p>
            </div>
            <button
              onClick={() => setHabilitadoSuporte(!habilitadoSuporte)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${habilitadoSuporte ? 'bg-blue-600' : 'bg-[var(--bg-elevated)]'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${habilitadoSuporte ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* URL do WhatsApp Suporte */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Número do WhatsApp de Suporte
            </label>
            <input
              type="url"
              value={urlSuporte}
              onChange={(e) => setUrlSuporte(e.target.value)}
              placeholder="https://api.whatsapp.com/send?phone=5511999999999"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {urlSuporte
                ? 'Botão abrirá este WhatsApp para o usuário entrar em contato'
                : 'Se vazio, o botão abrirá o email de suporte configurado abaixo'}
            </p>
          </div>

          {/* Email de Suporte (fallback) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Email de Suporte
            </label>
            <input
              type="email"
              value={emailSuporte}
              onChange={(e) => setEmailSuporte(e.target.value)}
              placeholder="suporte@seudominio.com"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Usado como fallback quando o WhatsApp não está configurado. Exibido também nas páginas de Termos e Privacidade.
            </p>
          </div>

          {/* Texto do Botão Suporte */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Texto do Botão de Suporte
            </label>
            <input
              type="text"
              value={textoSuporte}
              onChange={(e) => setTextoSuporte(e.target.value)}
              placeholder="Falar com Suporte"
              className="w-full px-4 py-2 bg-[var(--bg-card)] border border-zinc-800 rounded-lg text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Preview Suporte */}
          {habilitadoSuporte && urlSuporte && (
            <div className="bg-[var(--bg-base)] border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">Preview:</p>
              <button className="flex items-center gap-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                <Headphones className="w-4 h-4" />
                {textoSuporte || 'Falar com Suporte'}
              </button>
            </div>
          )}
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações do WhatsApp foram atualizadas com sucesso."
      />
    </div>
  );
}
