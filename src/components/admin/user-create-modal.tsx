"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { usePlans } from "@/hooks/use-plans";
import { Eye, EyeOff } from "lucide-react";
import { SuccessModal } from "./success-modal";

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: {
    nome: string;
    email: string;
    celular?: string;
    plano?: string;
    plano_id?: number;
    data_final_plano?: string;
    is_admin?: boolean;
    criar_login?: boolean;
    senha?: string;
  }) => Promise<void>;
}

export function UserCreateModal({
  isOpen,
  onClose,
  onSave,
}: UserCreateModalProps) {
  const { plans, loading: loadingPlans } = usePlans();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    celular: '',
    plano_id: '',
    data_final_plano: '',
    is_admin: false,
    criar_login: false,
    senha: '',
    confirmar_senha: '',
  });
  const [saving, setSaving] = useState(false);

  const calcDataFinal = (plan: { tipo_periodo: string }): string => {
    const now = new Date();
    switch (plan.tipo_periodo) {
      case 'mensal':     now.setMonth(now.getMonth() + 1); break;
      case 'trimestral': now.setMonth(now.getMonth() + 3); break;
      case 'semestral':  now.setMonth(now.getMonth() + 6); break;
      case 'anual':      now.setFullYear(now.getFullYear() + 1); break;
    }
    return now.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOpen && !loadingPlans && plans.length > 0) {
      setFormData(prev => {
        if (prev.plano_id) return prev; // já tem plano selecionado, não sobrescreve
        const first = plans[0];
        return { ...prev, plano_id: String(first.id), data_final_plano: calcDataFinal(first) };
      });
    }
  }, [isOpen, plans, loadingPlans]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(""); // Limpar erro anterior
    
    // Validar senhas se criar_login estiver marcado
    if (formData.criar_login) {
      if (!formData.senha || formData.senha.length < 6) {
        setErrorMessage('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formData.senha !== formData.confirmar_senha) {
        setErrorMessage('As senhas não coincidem');
        return;
      }
    }
    
    setSaving(true);
    try {
      const planoId = formData.plano_id ? Number(formData.plano_id) : undefined;
      const selectedPlan = plans.find(p => p.id === planoId);

      await onSave({
        nome: formData.nome,
        email: formData.email,
        celular: formData.celular || undefined,
        plano: selectedPlan?.tipo_periodo || 'free',
        plano_id: planoId,
        data_final_plano: formData.data_final_plano || undefined,
        is_admin: formData.is_admin,
        criar_login: formData.criar_login,
        senha: formData.criar_login ? formData.senha : undefined,
      });
      
      // Mostrar modal de sucesso
      setShowSuccessModal(true);
      
      // Reset form
      const firstPlan = plans.length > 0 ? plans[0] : null;
      setFormData({
        nome: '',
        email: '',
        celular: '',
        plano_id: firstPlan ? String(firstPlan.id) : '',
        data_final_plano: firstPlan ? calcDataFinal(firstPlan) : '',
        is_admin: false,
        criar_login: false,
        senha: '',
        confirmar_senha: '',
      });
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Usuário">
      <p className="text-[var(--text-secondary)] mb-6">Preencha os dados para criar um novo usuário</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Nome *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E]"
            placeholder="Nome do usuário"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E]"
            placeholder="email@exemplo.com"
            required
          />
        </div>

        {/* Celular */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Celular
          </label>
          <input
            type="text"
            value={formData.celular}
            onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E]"
            placeholder="5511999999999"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Digite com DDI. Ex: 5511999999999</p>
        </div>

        {/* Plano */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Plano *
          </label>
          <select
            value={formData.plano_id}
            onChange={(e) => {
              const plan = plans.find(p => String(p.id) === e.target.value);
              setFormData({
                ...formData,
                plano_id: e.target.value,
                data_final_plano: plan ? calcDataFinal(plan) : formData.data_final_plano,
              });
            }}
            disabled={loadingPlans}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#22C55E] disabled:opacity-50"
          >
            {loadingPlans ? (
              <option>Carregando planos...</option>
            ) : (
              plans.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>
                  {plan.nome} - R$ {Number(plan.valor).toFixed(2)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Data Final do Plano */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Data Final do Plano
          </label>
          <input
            type="date"
            value={formData.data_final_plano}
            onChange={(e) => setFormData({ ...formData, data_final_plano: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#22C55E]"
          />
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Preenchido automaticamente pelo plano. Pode ser ajustado manualmente.</p>
        </div>

        {/* Criar Conta de Autenticação */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer mb-3">
            <div>
              <div className="text-orange-400 font-medium">🔒 Criar Conta de Login</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Permitir que o usuário faça login no sistema</div>
            </div>
            <input
              type="checkbox"
              checked={formData.criar_login}
              onChange={(e) => setFormData({ ...formData, criar_login: e.target.checked })}
              className="w-5 h-5 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-orange-500 focus:ring-orange-500"
            />
          </label>

          {/* Campos de Senha (aparecem quando checkbox marcado) */}
          {formData.criar_login && (
            <div className="space-y-4 mt-4 pt-4 border-t border-[var(--border-medium)]">
              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required={formData.criar_login}
                    minLength={6}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 pr-12 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmar_senha}
                    onChange={(e) => setFormData({ ...formData, confirmar_senha: e.target.value })}
                    placeholder="Digite a senha novamente"
                    required={formData.criar_login}
                    minLength={6}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-3 pr-12 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Administrador */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-[var(--text-primary)] font-medium">Administrador</div>
              <div className="text-sm text-[var(--text-secondary)]">Usuário terá acesso ao painel administrativo</div>
            </div>
            <input
              type="checkbox"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="w-5 h-5 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-[#22C55E] focus:ring-[#22C55E]"
            />
          </label>
        </div>

        {/* Status */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
          <div className="text-sm text-[var(--text-secondary)] mb-1">Status *</div>
          <div className="text-[var(--text-primary)] font-medium">Ativo</div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">O usuário será criado com status ativo</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>

      {/* Modal de Sucesso */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        title="Usuário Criado!"
        message={formData.criar_login ? "Usuário criado com sucesso e conta de login ativada!" : "Usuário criado com sucesso!"}
      />
    </Modal>
  );
}
