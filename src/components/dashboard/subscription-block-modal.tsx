'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, MessageCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';

export function SubscriptionBlockModal() {
  const router = useRouter();
  const { daysExpired, planName } = useSubscriptionStatus();
  const { profile } = useUser();

  const handleUpgrade = () => {
    router.push('/planos');
  };

  const handleSupport = () => {
    window.open('https://wa.me/5511999999999', '_blank');
  };

  const isDependente = profile?.is_dependente;

  return (
    <Dialog open={true} onOpenChange={() => { }}>
      <DialogContent
        className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden dark:bg-[#0A0F1C] dark:border-white/10"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">Acesso Suspenso</h2>
          </div>
          <p className="text-white/90 text-sm">
            {isDependente
              ? `O plano do usuário principal expirou há ${daysExpired} ${daysExpired === 1 ? 'dia' : 'dias'}`
              : `Seu plano expirou há ${daysExpired} ${daysExpired === 1 ? 'dia' : 'dias'}`}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground dark:text-zinc-400">
              {isDependente
                ? 'Para continuar aproveitando todos os recursos da plataforma, o administrador da conta precisa renovar o plano.'
                : 'Para continuar aproveitando todos os recursos da plataforma, renove seu plano ou escolha um novo.'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-2 border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {isDependente ? 'O Plano Anterior' : 'Seu Plano Anterior'}
              </h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {planName || 'Plano Free'}
            </p>
          </div>

          <div className="space-y-3">
            {!isDependente && (
              <Button
                onClick={handleUpgrade}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Ver Planos e Renovar
              </Button>
            )}

            <Button
              onClick={handleSupport}
              variant={isDependente ? "default" : "outline"}
              className={isDependente ? "w-full h-12 text-base bg-blue-600 hover:bg-blue-700" : "w-full h-12 text-base dark:border-white/10 dark:hover:bg-white/5"}
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com Suporte
            </Button>
          </div>

          <div className="bg-muted/50 dark:bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground dark:text-zinc-500">
              Seus dados estão seguros e serão mantidos por 30 dias.
              <br />
              {isDependente
                ? 'Peça para o titular da conta renovar agora.'
                : 'Renove agora para não perder o acesso.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
