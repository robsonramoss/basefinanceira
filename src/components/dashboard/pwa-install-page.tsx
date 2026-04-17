"use client";

import { useState, useEffect } from "react";
import { 
  Download,
  Smartphone,
  Zap,
  CheckCircle2,
  Lightbulb,
  Play
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useBranding } from "@/contexts/branding-context";
import { useWhatsAppConfig } from "@/hooks/use-whatsapp-config";

export function PWAInstallPage() {
  const { t } = useLanguage();
  const { settings } = useBranding();
  const { data: whatsappConfig } = useWhatsAppConfig();
  const appName = settings.appName || 'Gestão Financeira';
  
  // URL do vídeo tutorial puxada do painel admin
  const videoUrl = whatsappConfig?.video_url_instalacao || '';
  
  // Get hostname only on client side to avoid hydration mismatch
  const [hostname, setHostname] = useState('seu-dominio.com');
  
  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const steps = [
    {
      number: 1,
      title: `Acesse o ${appName} pelo navegador`,
      description: `Abra o navegador (Chrome, Safari) e acesse ${hostname}`,
      icon: Smartphone
    },
    {
      number: 2,
      title: "Adicione à tela inicial",
      description: (
        <>
          <strong className="text-[var(--text-primary)]">iPhone:</strong> Toque em "Compartilhar" → "Adicionar à Tela de Início"
          <br />
          <strong className="text-[var(--text-primary)]">Android:</strong> Toque nos 3 pontinhos → "Adicionar à tela inicial"
        </>
      ),
      icon: Download
    },
    {
      number: 3,
      title: "Pronto! Use como um app",
      description: `O ícone do ${appName} aparecerá na sua tela inicial como um app normal`,
      icon: CheckCircle2
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Acesso rápido",
      description: "Direto da tela inicial do celular"
    },
    {
      icon: Zap,
      title: "Carrega mais rápido",
      description: "Com recursos em cache"
    },
    {
      icon: Smartphone,
      title: "Experiência nativa",
      description: "Sem ocupar espaço de armazenamento"
    },
    {
      icon: CheckCircle2,
      title: "Notificações",
      description: "Receba lembretes e alertas"
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-xl">
            <Download className="w-6 h-6 text-orange-500" />
          </div>
          Instalação
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-2">
          Aprenda a instalar o {appName} no seu celular
        </p>
      </div>

      {/* Video Tutorial Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Play className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              🎬 Como Instalar o {appName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Assista o vídeo tutorial completo para instalar o app no seu celular
            </p>
          </div>
        </div>

        {/* Video Embed - Phone Mockup Style */}
        {videoUrl ? (
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* Phone Frame */}
              <div className="relative bg-zinc-950 rounded-[3rem] p-3 shadow-2xl border-8 border-zinc-900">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-950 rounded-b-3xl z-10" />
                
                {/* Screen */}
                <div className="relative bg-zinc-900 rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
                  <iframe
                    className="w-full h-full"
                    src={videoUrl}
                    title={`Tutorial de Instalação ${appName}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-xl p-8 text-center">
            <p className="text-[var(--text-secondary)]">
              Vídeo de instalação não configurado. Configure a URL do vídeo no painel admin.
            </p>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              📋 Passos para Instalação
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Resumo rápido dos passos mostrados no vídeo
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-xl p-5 hover:border-[var(--border-medium)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-500">{step.number}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="p-2 bg-[var(--bg-hover)] rounded-lg">
                    <step.icon className="w-5 h-5 text-[var(--text-tertiary)]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Lightbulb className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              💡 Benefícios de Instalar o App
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-3 bg-[var(--bg-card-inner)] border border-orange-500/10 rounded-lg p-4"
            >
              <div className="p-2 bg-orange-500/10 rounded-lg flex-shrink-0">
                <benefit.icon className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">{benefit.title}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-400 mb-2">Dica Importante</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Após instalar, você pode usar o {appName} como um aplicativo normal, mesmo sem conexão com a internet para visualizar dados já carregados. 
              A instalação não ocupa espaço significativo no seu celular!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
