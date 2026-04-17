'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CreditCard, MessageCircle, Shield, Clock, Database, Calendar, Sparkles } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useLanguage } from '@/contexts/language-context';
import { AccountFilterProvider } from '@/contexts/account-filter-context';
import { SidebarProvider } from '@/contexts/sidebar-context';
import dynamic from 'next/dynamic';

// Sidebar com SSR desabilitado
const DashboardSidebarDynamic = dynamic(
  () => import('@/components/dashboard/sidebar').then(m => ({
    default: m.DashboardSidebar
  })),
  {
    ssr: false,
    loading: () => (
      <div className="w-[260px] bg-[var(--bg-card)] border-r border-[var(--border-default)] animate-pulse flex-shrink-0" />
    )
  }
);

// Header com SSR desabilitado
const DashboardHeaderDynamic = dynamic(
  () => import('@/components/dashboard/header').then(m => ({
    default: m.DashboardHeader
  })),
  {
    ssr: false,
    loading: () => (
      <div className="h-16 bg-[var(--bg-base)] border-b border-[var(--border-default)] animate-pulse" />
    )
  }
);

// Bottom Navigation
const BottomNavDynamic = dynamic(
  () => import('@/components/dashboard/bottom-nav').then(m => ({
    default: m.BottomNav
  })),
  {
    ssr: false
  }
);

function BlockedPageContent() {
  const router = useRouter();
  const subscriptionStatus = useSubscriptionStatus();
  const systemSettings = useSystemSettings();
  const { t, language } = useLanguage();
  
  const { daysExpired, planName, blockingLevel, loading, neverUsed } = subscriptionStatus;
  const dataFinalPlano = subscriptionStatus.dataFinalPlano;

  // SEGURANÇA: Redirecionar se não deveria estar bloqueado
  useEffect(() => {
    if (!loading && blockingLevel !== 'hard-block') {
      router.replace('/dashboard');
    }
  }, [loading, blockingLevel, router]);

  const handleUpgrade = () => {
    router.push('/planos');
  };

  const handleSupport = () => {
    // Priorizar WhatsApp de suporte (não o de automação)
    if (systemSettings.whatsappSuporteUrl) {
      window.open(systemSettings.whatsappSuporteUrl, '_blank');
    } else if (systemSettings.supportEmail) {
      window.location.href = `mailto:${systemSettings.supportEmail}`;
    }
  };

  const localeMap = { pt: 'pt-BR', es: 'es-ES', en: 'en-US' };
  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(localeMap[language] || 'pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  if (loading || systemSettings.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header com ícone */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 ${neverUsed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {neverUsed ? (
              <Sparkles className="h-10 w-10 text-green-500" />
            ) : (
              <AlertCircle className="h-10 w-10 text-red-500" />
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {neverUsed 
              ? `${t('blocked.welcomeTitle')} ${systemSettings.companyName || ''}!`
              : t('blocked.accessBlocked')
            }
          </h1>
          <div className="space-y-1">
            <p className="text-lg text-zinc-400">
              {neverUsed 
                ? t('blocked.accountCreated')
                : <>{t('blocked.planExpired')} <span className="font-semibold text-red-400">{daysExpired} {t('blocked.planExpiredDays')}</span></>
              }
            </p>
            {!neverUsed && dataFinalPlano && (
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                <Calendar className="h-4 w-4" />
                <span>{t('blocked.expirationDate')}: {formatExpirationDate(dataFinalPlano)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card principal */}
        <Card className="border-[var(--border-medium)] bg-[var(--bg-card)]">
          <CardHeader className="text-center pb-4 border-b border-[var(--border-default)]">
            <CardTitle className="text-2xl text-white">
              {neverUsed ? t('blocked.choosePlan') : t('blocked.renewToContinue')}
            </CardTitle>
            <CardDescription className="text-base text-zinc-400">
              {neverUsed 
                ? t('blocked.hirePlanDesc')
                : t('blocked.renewDesc')
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Informações do plano anterior - só mostra para quem já usou */}
            {!neverUsed && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-zinc-400 mb-1">
                  {t('blocked.previousPlan')}:
                </p>
                <p className="text-lg font-semibold text-white">
                  {planName || 'Plano Free'}
                </p>
              </div>
            )}

            {/* Benefícios */}
            <div className="space-y-4">
              <p className="font-medium text-white text-lg">
                {neverUsed ? `${t('blocked.benefitsTitle')}:` : `${t('blocked.renewBenefitsTitle')}:`}
              </p>
              <div className="grid gap-4">
                {neverUsed ? (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="bg-blue-500/20 p-2 rounded-lg shrink-0">
                        <Database className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.financialControl')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.financialControlDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="bg-green-500/20 p-2 rounded-lg shrink-0">
                        <Shield className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.planResources')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.planResourcesDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="bg-purple-500/20 p-2 rounded-lg shrink-0">
                        <Clock className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.immediateAccess')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.immediateAccessDesc')}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="bg-blue-500/20 p-2 rounded-lg shrink-0">
                        <Database className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.dataAccess')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.dataAccessDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="bg-green-500/20 p-2 rounded-lg shrink-0">
                        <Shield className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.fullResources')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.fullResourcesDesc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
                        <Clock className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white">
                          {t('blocked.noHistoryLoss')}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {t('blocked.noHistoryLossDesc')}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleUpgrade}
                className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                size="lg"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {neverUsed ? t('blocked.viewPlansHire') : t('blocked.viewPlansRenew')}
              </Button>

              {(systemSettings.whatsappSuporteUrl || systemSettings.supportEmail) && (
                <Button 
                  onClick={handleSupport}
                  variant="outline"
                  className="w-full h-12 text-base border-white/10 hover:bg-white/5"
                  size="lg"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {t('blocked.talkToSupport')}
                </Button>
              )}
            </div>

            {/* Aviso de dados - só mostra para quem já usou */}
            {!neverUsed && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-amber-400 font-medium mb-1">
                  ⏰ {t('blocked.dataRetention')}
                </p>
                <p className="text-xs text-amber-300/80">
                  {t('blocked.dataRetentionDesc')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        {(systemSettings.whatsappSuporteUrl || systemSettings.supportEmail) && (
          <div className="text-center text-sm text-zinc-400">
            <p>
              {t('blocked.questionsFooter')}{' '}
              <button 
                onClick={handleSupport}
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                {t('blocked.contactUs')}
              </button>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BlockedPage() {
  return (
    <AccountFilterProvider>
      <SidebarProvider>
        <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
          {/* Sidebar - Visível e funcional (permite logout) - SEM wrapper para não cortar altura */}
          <DashboardSidebarDynamic />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header - Bloqueado para interação */}
            <div className="pointer-events-none opacity-50">
              <DashboardHeaderDynamic />
            </div>

            {/* Content */}
            <BlockedPageContent />
          </div>

          {/* Bottom Navigation - Bloqueado */}
          <div className="pointer-events-none opacity-50">
            <BottomNavDynamic />
          </div>
        </div>
      </SidebarProvider>
    </AccountFilterProvider>
  );
}
