"use client";

import { usePlans } from "@/hooks/use-plans";
import { Check, Shield, Star, Zap, Crown, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useBranding } from "@/contexts/branding-context";
import { useLanguage } from "@/contexts/language-context";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function PlansPage() {
  const { plans, loading } = usePlans();
  const { settings } = useBranding();
  const { language, setLanguage, t } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'mensal' | 'anual'>('mensal');

  // Carregar idioma e moeda das configurações do sistema ao iniciar
  useEffect(() => {
    if (settings.idioma_padrao_planos) {
      // Verifica se já tem preferência salva do usuário
      const savedLang = localStorage.getItem('plans_user_language');
      if (savedLang && ['pt', 'es', 'en'].includes(savedLang)) {
        setLanguage(savedLang as any);
      } else {
        // Usa o padrão do sistema
        setLanguage(settings.idioma_padrao_planos);
      }
    }
  }, [settings.idioma_padrao_planos]);

  const handleLanguageChange = (lang: 'pt' | 'es' | 'en') => {
    setLanguage(lang);
    // Salva a preferência do usuário
    localStorage.setItem('plans_user_language', lang);
    setShowLanguageMenu(false);
  };

  // Função para formatar valor com a moeda padrão do sistema
  const formatPlanValue = (plan: any) => {
    const moeda = settings.moeda_padrao_planos || 'BRL';
    const localeMap: Record<string, string> = {
      'BRL': 'pt-BR',
      'USD': 'en-US',
      'EUR': 'de-DE',
      'PYG': 'es-PY',
      'ARS': 'es-AR'
    };
    const locale = localeMap[moeda] || 'pt-BR';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moeda,
    }).format(plan.valor);
  };

  // Função para obter o período traduzido
  const getPeriodLabel = (tipo: string) => {
    const periodMap: Record<string, string> = {
      'mensal': t('plans.perMonth'),
      'trimestral': t('plans.perQuarter'),
      'semestral': t('plans.perSemester'),
      'anual': t('plans.perYear'),
      'free': t('plans.perFree'),
    };
    return periodMap[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--text-secondary)] text-sm">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col relative overflow-hidden">
      
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 flex-1 flex flex-col justify-center">
        
        {/* Header */}
        <div className="text-center space-y-6 max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              <Crown className="w-4 h-4" />
              <span>{t('plans.premiumSubscription')}</span>
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle compact />

            {/* Seletor de Idioma */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-full hover:bg-[var(--bg-active)] transition-colors text-sm"
                title={t('plans.selectLanguage')}
              >
                <Globe className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-[var(--text-primary)] uppercase font-medium">{language}</span>
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-lg shadow-xl z-50 overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => handleLanguageChange('pt')}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">🇧🇷</span>
                    <span className="text-[var(--text-primary)] text-sm">Português</span>
                  </button>
                  <button
                    onClick={() => handleLanguageChange('es')}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">🇪🇸</span>
                    <span className="text-[var(--text-primary)] text-sm">Español</span>
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">🇺🇸</span>
                    <span className="text-[var(--text-primary)] text-sm">English</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
            {t('plans.title')} <br/>
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(to right, ${settings.primaryColor || '#22C55E'}, #10B981)`
              }}
            >
              {t('plans.subtitle')}
            </span>
          </h1>
        </div>

        {/* Toggle Mensal/Anual - Só aparece se habilitado no admin */}
        {settings.habilitar_toggle_periodo_planos && (
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-full p-1.5">
              <button
                onClick={() => setBillingPeriod('mensal')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  billingPeriod === 'mensal'
                    ? 'text-white shadow-lg'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={billingPeriod === 'mensal' ? {
                  backgroundColor: settings.primaryColor || '#22C55E'
                } : {}}
              >
                {t('plans.monthly') || 'Mensal'}
              </button>
              <button
                onClick={() => setBillingPeriod('anual')}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  billingPeriod === 'anual'
                    ? 'text-white shadow-lg'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={billingPeriod === 'anual' ? {
                  backgroundColor: settings.primaryColor || '#22C55E'
                } : {}}
              >
                {t('plans.annual') || 'Anual'}
                {settings.percentual_desconto_anual && settings.percentual_desconto_anual > 0 && (
                  <span 
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: billingPeriod === 'anual' ? 'rgba(255,255,255,0.2)' : `${settings.primaryColor || '#22C55E'}20`,
                      color: billingPeriod === 'anual' ? 'white' : settings.primaryColor || '#22C55E'
                    }}
                  >
                    -{settings.percentual_desconto_anual}%
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {plans
            .filter(plan => {
              // Se toggle habilitado, filtra por período selecionado
              if (settings.habilitar_toggle_periodo_planos) {
                return plan.tipo_periodo === billingPeriod;
              }
              // Se toggle desabilitado, mostra todos os planos
              return true;
            })
            .sort((a, b) => {
              // Primeiro ordena por ordem_exibicao
              const ordemA = a.ordem_exibicao || 0;
              const ordemB = b.ordem_exibicao || 0;
              return ordemA - ordemB;
            })
            .map((plan, index) => {
            if (!plan.ativo) return null;
            const recursos = typeof plan.recursos === 'string' 
              ? JSON.parse(plan.recursos) 
              : plan.recursos || [];

            const isPopular = plan.destaque;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={plan.id}
                className={`
                  relative rounded-2xl p-8 border transition-all duration-300 group
                  ${isPopular 
                    ? 'bg-[var(--bg-card)] border-blue-500/50 shadow-2xl shadow-blue-900/20 scale-100 md:scale-105 z-10' 
                    : 'bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--border-medium)]'}
                `}
              >
                {isPopular && (
                  <div 
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5"
                    style={{
                      background: `linear-gradient(to right, ${settings.primaryColor || '#22C55E'}, ${settings.secondaryColor || '#0A0F1C'})`
                    }}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {t('plans.mostChosen')}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{plan.nome}</h3>
                  <p className="text-sm text-[var(--text-secondary)] h-10">{plan.descricao}</p>
                  
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                      {formatPlanValue(plan)}
                    </span>
                    <span className="text-sm text-[var(--text-muted)] ml-1">
                      /{getPeriodLabel(plan.tipo_periodo)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {recursos.map((recurso: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div 
                        className="mt-0.5 rounded-full p-1"
                        style={isPopular ? {
                          backgroundColor: `${settings.primaryColor || '#22C55E'}20`,
                          color: settings.primaryColor || '#22C55E'
                        } : {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgb(161, 161, 170)'
                        }}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">{recurso}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full h-12 text-base font-medium rounded-xl transition-all duration-300"
                  style={{
                    backgroundColor: settings.primaryColor || '#22C55E',
                    color: 'white',
                    boxShadow: isPopular 
                      ? `0 10px 15px -3px ${settings.primaryColor || '#22C55E'}40`
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                    if (isPopular) {
                      e.currentTarget.style.boxShadow = `0 20px 25px -5px ${settings.primaryColor || '#22C55E'}60`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    if (isPopular) {
                      e.currentTarget.style.boxShadow = `0 10px 15px -3px ${settings.primaryColor || '#22C55E'}40`;
                    }
                  }}
                  onClick={() => window.location.href = plan.link_checkout || '#'}
                >
                  {t('plans.subscribeNow')}
                  <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>

              </motion.div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-20 text-center border-t border-[var(--border-default)] pt-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('plans.securePayment')}
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {t('plans.immediateAccess')}
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {t('plans.guarantee')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
