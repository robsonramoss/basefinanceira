"use client";

import { useState, useEffect } from "react";
import { Image, Eye, EyeOff, FileImage, Info, ExternalLink, FolderOpen, Github, CheckCircle } from "lucide-react";
import { useBranding } from "@/contexts/branding-context";
import { updateLogoSettings } from "@/actions/admin-settings-actions";
import { SuccessModal } from "@/components/admin/success-modal";

export function LogoSettings() {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [showSidebarLogo, setShowSidebarLogo] = useState(false);
  const [showSidebarName, setShowSidebarName] = useState(true);
  const [showLoginLogo, setShowLoginLogo] = useState(false);
  const [showLoginName, setShowLoginName] = useState(true);

  // Carregar dados quando settings mudar
  useEffect(() => {
    if (settings) {
      setShowSidebarLogo(settings.show_sidebar_logo || false);
      setShowSidebarName(settings.show_sidebar_name !== false);
      setShowLoginLogo(settings.show_login_logo || false);
      setShowLoginName(settings.show_login_name !== false);
    }
  }, [settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateLogoSettings({
        show_sidebar_logo: showSidebarLogo,
        show_sidebar_name: showSidebarName,
        show_login_logo: showLoginLogo,
        show_login_name: showLoginName,
        logo_url_sidebar: '', // Não usado mais
        logo_url_login: '', // Não usado mais
        favicon_url: '', // Não usado mais
        pwa_icon_192_url: '', // Não usado mais
        pwa_icon_512_url: '', // Não usado mais
        apple_touch_icon_url: '' // Não usado mais
      });

      if (result.success) {
        setShowSuccessModal(true);
        setTimeout(() => window.location.reload(), 1500);
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
          <Image className="w-6 h-6 text-purple-500" />
          Gerenciamento de Logos e Ícones
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Controle a visibilidade dos logos e aprenda como gerenciar os arquivos estáticos
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-blue-200 font-medium">
              📁 Logos gerenciados via arquivos estáticos
            </p>
            <p className="text-xs text-blue-300/80">
              Os logos agora são gerenciados através de arquivos na pasta <code className="bg-blue-900/30 px-1.5 py-0.5 rounded">public/</code>. 
              Isso garante carregamento instantâneo, sem falhas e sem refresh. Veja o guia completo abaixo.
            </p>
          </div>
        </div>
      </div>

      {/* Card de Configurações */}
      <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-xl p-6 space-y-6">
        
        {/* Sidebar */}
        <div className="space-y-4">
          <h3 className="text-[var(--text-primary)] font-medium text-lg border-b border-[var(--border-medium)] pb-2">
            Sidebar (Menu Lateral)
          </h3>
          
          {/* Mostrar Logo Sidebar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)] text-sm">Mostrar Logo na Sidebar</span>
            </div>
            <button
              onClick={() => setShowSidebarLogo(!showSidebarLogo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showSidebarLogo ? 'bg-purple-600' : 'bg-[var(--bg-elevated)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showSidebarLogo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Mostrar Nome Sidebar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showSidebarName ? (
                <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <EyeOff className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
              <span className="text-[var(--text-primary)] text-sm">Mostrar Nome na Sidebar</span>
            </div>
            <button
              onClick={() => setShowSidebarName(!showSidebarName)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showSidebarName ? 'bg-purple-600' : 'bg-[var(--bg-elevated)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showSidebarName ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--border-medium)]"></div>

        {/* Login */}
        <div className="space-y-4">
          <h3 className="text-[var(--text-primary)] font-medium text-lg border-b border-[var(--border-medium)] pb-2">
            Tela de Login
          </h3>
          
          {/* Mostrar Logo Login */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-[var(--text-primary)] text-sm">Mostrar Logo no Login</span>
            </div>
            <button
              onClick={() => setShowLoginLogo(!showLoginLogo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showLoginLogo ? 'bg-purple-600' : 'bg-[var(--bg-elevated)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showLoginLogo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Mostrar Nome Login */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showLoginName ? (
                <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <EyeOff className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
              <span className="text-[var(--text-primary)] text-sm">Mostrar Nome no Login</span>
            </div>
            <button
              onClick={() => setShowLoginName(!showLoginName)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showLoginName ? 'bg-purple-600' : 'bg-[var(--bg-elevated)]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showLoginName ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4 border-t border-[var(--border-medium)]">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações de logo e nome foram atualizadas com sucesso."
      />

      {/* Guia Completo de Gerenciamento */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileImage className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            📖 Guia: Como Gerenciar Logos e Ícones
          </h3>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-4">
          <p className="text-[var(--text-secondary)]">
            Os logos agora são gerenciados através de <strong>arquivos estáticos</strong> na pasta <code className="bg-purple-900/30 px-2 py-1 rounded text-purple-300">public/</code>. 
            Isso garante carregamento instantâneo, sem falhas e sem refresh.
          </p>

          {/* Arquivos Necessários */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-lg p-4 space-y-3">
            <h4 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" />
              Arquivos Necessários
            </h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">favicon.ico</code>
                  <span className="text-[var(--text-secondary)]"> - Ícone da aba do navegador (32x32px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">favicon-96x96.png</code>
                  <span className="text-[var(--text-secondary)]"> - Safari alta resolução (96x96px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">apple-touch-icon.png</code>
                  <span className="text-[var(--text-secondary)]"> - Ícone iOS/Safari (180x180px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">web-app-manifest-192x192.png</code>
                  <span className="text-[var(--text-secondary)]"> - PWA Android (192x192px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">web-app-manifest-512x512.png</code>
                  <span className="text-[var(--text-secondary)]"> - PWA alta resolução (512x512px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">logo-login.png</code>
                  <span className="text-[var(--text-secondary)]"> - Logo da tela de login (200x60px)</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <code className="text-purple-300">logo-sidebar.png</code>
                  <span className="text-[var(--text-secondary)]"> - Logo do menu lateral (180x40px)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Como Criar */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-lg p-4 space-y-3">
            <h4 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-purple-400" />
              Como Criar os Ícones
            </h4>
            <p className="text-[var(--text-secondary)] text-sm">
              Use o <strong>RealFaviconGenerator</strong> para gerar todos os ícones automaticamente:
            </p>
            <a 
              href="https://realfavicongenerator.net/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir RealFaviconGenerator
            </a>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)] ml-2">
              <li>Faça upload do seu logo (PNG ou SVG de alta qualidade)</li>
              <li>Configure as opções para iOS, Android, Windows e Safari</li>
              <li>Gere o pacote e baixe os arquivos</li>
              <li>Renomeie os arquivos conforme a lista acima</li>
            </ol>
          </div>

          {/* Como Substituir */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-lg p-4 space-y-3">
            <h4 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" />
              Como Substituir os Arquivos
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)] ml-2">
              <li>Localize a pasta: <code className="bg-[var(--bg-elevated)] px-2 py-1 rounded text-purple-300">GranaZap_V5_NEW → granazap → public</code></li>
              <li>Copie seus novos arquivos para esta pasta</li>
              <li>Substitua os arquivos existentes (mesmos nomes)</li>
              <li>⚠️ <strong>Importante:</strong> Os nomes devem ser EXATAMENTE como listado acima</li>
            </ol>
          </div>

          {/* Deploy */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-lg p-4 space-y-3">
            <h4 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
              <Github className="w-4 h-4 text-purple-400" />
              Fazer Deploy das Mudanças
            </h4>
            <p className="text-[var(--text-secondary)] text-sm">
              Após substituir os arquivos, peça à IA no chat:
            </p>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 font-mono text-sm text-purple-300">
              "Acabei de substituir os arquivos de logos na pasta public/. Por favor, faça o commit e push para o GitHub."
            </div>
            <p className="text-[var(--text-secondary)] text-xs">
              A IA vai executar <code>git add</code>, <code>git commit</code> e <code>git push</code> automaticamente.
            </p>
          </div>

          {/* Verificar Deploy */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-medium)] rounded-lg p-4 space-y-3">
            <h4 className="text-[var(--text-primary)] font-medium">✅ Verificar Deploy na Vercel</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)] ml-2">
              <li>Acesse <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">vercel.com</a></li>
              <li>Vá em: Seu Projeto → <strong>Deployments</strong></li>
              <li>Aguarde o deploy automático (1-3 minutos)</li>
              <li>Verifique se o status está <span className="text-green-400 font-medium">Ready</span></li>
              <li>Teste o site em diferentes navegadores e dispositivos</li>
            </ol>
          </div>

          {/* Por Que Esta Abordagem */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h4 className="text-green-300 font-medium mb-2">✅ Por Que Esta é a Melhor Opção?</h4>
            <ul className="space-y-1 text-sm text-green-200/80">
              <li>• <strong>100% confiável</strong> - Arquivos sempre disponíveis</li>
              <li>• <strong>Carregamento instantâneo</strong> - Sem latência de rede</li>
              <li>• <strong>Sem flash</strong> - Logos aparecem imediatamente</li>
              <li>• <strong>Mais simples</strong> - Sem lógica complexa de fallbacks</li>
              <li>• <strong>Mais profissional</strong> - Consistência visual garantida</li>
              <li>• <strong>Sem riscos</strong> - Não depende de URLs externas que podem falhar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
