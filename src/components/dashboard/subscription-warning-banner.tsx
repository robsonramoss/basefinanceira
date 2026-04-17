'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { useUser } from '@/hooks/use-user';

export function SubscriptionWarningBanner() {
  const router = useRouter();
  const { daysUntilExpiration } = useSubscriptionStatus();
  const { profile } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);

  // Verificar se o banner foi dispensado recentemente (localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem('subscription_warning_dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const hoursSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);

      // Mostrar novamente após 24 horas
      if (hoursSinceDismissed < 24) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem('subscription_warning_dismissed');
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('subscription_warning_dismissed', new Date().toISOString());
  };

  const handleUpgrade = () => {
    router.push('/planos');
  };

  if (isDismissed) {
    return null;
  }

  const isDependente = profile?.is_dependente;

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-6 relative">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between gap-4 pr-8">
        <div className="flex-1">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {isDependente
              ? `O plano do usuário principal expira em ${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'dia' : 'dias'}!`
              : `Seu plano expira em ${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'dia' : 'dias'}!`
            }
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {isDependente
              ? 'Avise o administrador da conta para renovar e garantir o acesso contínuo.'
              : 'Renove agora e garanta acesso contínuo a todos os recursos da plataforma.'
            }
          </p>
        </div>
        {!isDependente && (
          <Button
            onClick={handleUpgrade}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Ver Planos
          </Button>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/20"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
