"use client";

import Link from "next/link";
import { Shield, Users, TrendingUp } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useLanguage } from "@/contexts/language-context";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ForgotPasswordContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const features = [
    {
      icon: Shield,
      title: t('security.fast'),
      subtitle: t('security.fastDesc'),
    },
    {
      icon: Users,
      title: t('security.protected'),
      subtitle: t('security.protectedDesc'),
    },
    {
      icon: TrendingUp,
      title: t('security.immediate'),
      subtitle: t('security.immediateDesc'),
    },
  ];

  return (
    <AuthLayout
      title={t('security.recover')}
      subtitle={t('security.recoverDesc')}
      features={features}
      tagline={t('security.tagline')}
    >
      {/* Header */}
      <div className="text-center lg:text-left space-y-2 mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          {t('forgot.title')}
        </h2>
        <p className="text-[var(--text-secondary)] text-base">{t('forgot.subtitle')}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
              <span className="text-red-400 text-xs font-bold">✕</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium leading-relaxed">
                {error === 'link_expirado' 
                  ? 'O link de recuperação expirou. Os links são válidos por 1 hora. Por favor, solicite um novo link.'
                  : error === 'link_invalido'
                  ? 'O link de recuperação é inválido. Por favor, solicite um novo link.'
                  : error === 'sessao_invalida'
                  ? 'Sessão inválida ou expirada. Por favor, solicite um novo link de recuperação.'
                  : error === 'callback_error'
                  ? 'Ocorreu um erro ao processar o link. Tente novamente.'
                  : 'Ocorreu um erro. Tente novamente.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Form */}
      <div className="space-y-6">
        <ForgotPasswordForm />
        
        {/* Back to Login */}
        <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {t('forgot.remembered')}{" "}
          <Link href="/" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            {t('forgot.backToLogin')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
