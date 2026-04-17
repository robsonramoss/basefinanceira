"use client";

import { useState } from "react";
import { AdminDependent } from "@/hooks/use-admin-dependents";
import { Modal } from "@/components/ui/modal";
import { X, Key, Loader2, Eye, EyeOff } from "lucide-react";

interface DependentResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependent: AdminDependent;
  onConfirm: (dependentId: number, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export function DependentResetPasswordModal({
  isOpen,
  onClose,
  dependent,
  onConfirm,
}: DependentResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validações
    if (newPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setResetting(true);

    try {
      const result = await onConfirm(dependent.id, newPassword);

      if (result.success) {
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } else {
        setError(result.error || "Erro ao resetar senha");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao resetar senha");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Key className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Resetar Senha</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Defina uma nova senha para o dependente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={resetting}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <span className="text-red-400 text-xs font-bold">✕</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="bg-[var(--bg-hover)] rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Resetando senha para:</p>
          <div className="space-y-1">
            <p className="text-[var(--text-primary)] font-semibold">{dependent.nome}</p>
            <p className="text-sm text-[var(--text-secondary)]">{dependent.email || "Sem email"}</p>
            <p className="text-xs text-[var(--text-tertiary)]">ID: #{dependent.id}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Nova Senha */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Nova Senha <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 pr-12 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Mínimo de 6 caracteres</p>
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Confirmar Senha <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 pr-12 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors"
                placeholder="Digite a senha novamente"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ O dependente precisará usar esta nova senha no próximo login. Certifique-se de informá-lo sobre a alteração.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={resetting}
            className="px-6 py-3 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={resetting}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {resetting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Resetando...</span>
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                <span>Resetar Senha</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
