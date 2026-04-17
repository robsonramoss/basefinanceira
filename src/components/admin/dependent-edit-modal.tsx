"use client";

import { useState } from "react";
import { AdminDependent } from "@/hooks/use-admin-dependents";
import { Modal } from "@/components/ui/modal";
import { X, Save, Loader2 } from "lucide-react";

interface DependentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependent: AdminDependent;
  onSave: (dependentId: number, updates: any) => Promise<{ success: boolean; error?: string }>;
}

export function DependentEditModal({
  isOpen,
  onClose,
  dependent,
  onSave,
}: DependentEditModalProps) {
  const [nome, setNome] = useState(dependent.nome);
  const [email, setEmail] = useState(dependent.email || "");
  const [telefone, setTelefone] = useState(dependent.telefone || "");
  const [status, setStatus] = useState(dependent.status);
  const [observacoes, setObservacoes] = useState(dependent.observacoes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const result = await onSave(dependent.id, {
        nome,
        email: email || null,
        telefone: telefone || null,
        status,
        observacoes: observacoes || null,
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Erro ao atualizar dependente");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar dependente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Editar Dependente</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Atualize as informações do usuário</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors"
              placeholder="Nome completo"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Status <span className="text-red-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#22C55E] transition-colors"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E] transition-colors resize-none"
              placeholder="Observações sobre o dependente..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
