"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { createClient } from "@/lib/supabase/client";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function EmailConfirmationModal({ isOpen, onClose, email }: EmailConfirmationModalProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        alert('Erro ao reenviar email. Tente novamente.');
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (error) {
      alert('Erro ao reenviar email. Tente novamente.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-medium)] shadow-2xl overflow-hidden"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-[#22C55E]/10 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-8 h-8 text-[#22C55E]" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                  Confirme seu email
                </h2>

                {/* Description */}
                <p className="text-[var(--text-secondary)] mb-2">
                  Enviamos um email de confirmação para:
                </p>
                
                <p className="text-[#22C55E] font-semibold mb-6">
                  {email}
                </p>

                {/* Instructions */}
                <div className="bg-[var(--bg-card-inner)] rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      Clique no link de confirmação que enviamos para ativar sua conta
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      Verifique sua caixa de spam se não encontrar o email
                    </p>
                  </div>
                </div>

                {/* Note */}
                <p className="text-xs text-[var(--text-tertiary)] mb-6">
                  O link de confirmação expira em 24 horas
                </p>

                {/* Success Message */}
                {resendSuccess && (
                  <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-lg mb-4">
                    <p className="text-sm text-[#22C55E] text-center">
                      ✓ Email reenviado com sucesso!
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={onClose}
                    className="w-full"
                  >
                    Entendi
                  </Button>
                  
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="w-full text-sm text-[var(--text-secondary)] hover:text-[#22C55E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      'Não recebeu o email? Reenviar'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
