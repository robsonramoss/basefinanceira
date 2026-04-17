"use client";

import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createRecoveryClient } from "@/lib/supabase/client-recovery";
import { useLanguage } from "@/contexts/language-context";

type ForgotPasswordFormValues = {
  email: string;
};

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Schema for validation with translations
  const forgotPasswordSchema = z.object({
    email: z.string().email({ message: t('error.invalidEmail') }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setErrorMessage(""); // Limpar erro anterior
      const supabase = createClient();

      // VALIDAÇÃO: Verificar se o usuário existe usando RPC (bypass RLS)
      const { data: emailExists, error: rpcError } = await supabase
        .rpc('check_email_exists', { email_input: data.email });

      // Se houve erro na RPC ou email não existe
      if (rpcError || !emailExists) {
        setErrorMessage('Email não encontrado no sistema. Verifique se digitou corretamente ou entre em contato com o suporte.');
        return;
      }

      // Construir URL de redirecionamento correta
      const getURL = () => {
        let url =
          process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
          process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
          window.location.origin;
        // Make sure to include `https://` when not localhost.
        url = url.startsWith('http') ? url : `https://${url}`;
        // Make sure to include a trailing `/`.
        url = url.endsWith('/') ? url : `${url}/`;
        return url;
      };

      // Usuário existe! Enviar email de recuperação
      // Usa recovery client (implicit flow) para gerar token_hash ao invés de PKCE
      // A página /redefinir-senha captura os tokens do hash fragment da URL
      const recoveryClient = createRecoveryClient();
      const { error } = await recoveryClient.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${getURL()}redefinir-senha`,
      });

      if (error) {
        setErrorMessage('Erro ao enviar email de recuperação. Tente novamente em alguns instantes.');
        return;
      }

      // Sucesso! Mostrar mensagem
      setUserEmail(data.email);
      setEmailSent(true);
      setErrorMessage(""); // Limpar erro

    } catch (error: any) {
      setErrorMessage('Erro inesperado. Por favor, tente novamente.');
    }
  };

  // Se email foi enviado, mostrar mensagem de sucesso
  if (emailSent) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {t('forgot.emailSent')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {t('forgot.emailSentTo')}
              </p>
              <p className="text-sm font-semibold text-primary mb-4">
                {userEmail}
              </p>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>• {t('forgot.checkInbox')}</p>
                <p>• {t('forgot.linkExpires')}</p>
                <p>• {t('forgot.checkSpam')}</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setEmailSent(false)}
          variant="outline"
          className="w-full"
        >
          {t('forgot.sendToAnother')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
              <span className="text-red-400 text-xs font-bold">✕</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Input */}
      <div className="flex flex-col w-full space-y-2">
        <label className="text-sm font-medium leading-none text-[var(--text-primary)]" htmlFor="email">
          {t('forgot.email')}
        </label>
        <Input
          {...register("email")}
          id="email"
          placeholder="seu@email.com"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          startIcon={<Mail className="h-5 w-5" />}
        />
        {errors.email && (
          <p className="text-xs text-red-400 ml-2">{errors.email.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full"
      >
        {isSubmitting ? t('forgot.buttonLoading') : t('forgot.button')}
      </Button>
    </form>
  );
}
