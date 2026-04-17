"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AdminUser, useAdminUsers } from "@/hooks/use-admin-users";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, Shield, Trash2, Eraser, Key } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ResetPasswordModal } from "./reset-password-modal";
import { SuccessModal } from "./success-modal";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser;
  onEdit: () => void;
  onRefresh: () => void;
}

export function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onEdit,
  onRefresh,
}: UserDetailsModalProps) {
  const [clearing, setClearing] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const supabase = createClient();

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleClearMemory = async () => {
    if (!confirm('Limpar histórico de chat deste usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    setClearing(true);
    try {
      const { error } = await supabase.rpc('admin_clear_chat_history', {
        p_user_id: user.id,
      });

      if (error) throw error;
      alert('Histórico de chat limpo com sucesso!');
      onRefresh();
    } catch (error: any) {
      alert('Erro ao limpar histórico: ' + error.message);
    } finally {
      setClearing(false);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: user.id,
        p_new_password: newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao resetar senha');
      }
      
      // Mostrar modal de sucesso
      setShowSuccessModal(true);
      onRefresh();
      return true;
    } catch (error: any) {
      // Deixar o modal de reset mostrar o erro
      throw error;
    }
  };

  const daysRemaining = getDaysRemaining(user.data_final_plano);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes Completos do Usuário">
      <div className="space-y-6">
        {/* Informações Pessoais */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span>👤</span> Informações Pessoais
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">ID:</div>
              <div className="text-[var(--text-primary)] font-medium">#{user.id}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Nome:</div>
              <div className="text-[var(--text-primary)] font-medium">{user.nome}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Email:</div>
              <div className="text-[var(--text-primary)] font-medium">{user.email}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Celular:</div>
              <div className="text-[var(--text-primary)] font-medium">{user.celular || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Status:</div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.status === 'ativo'
                    ? 'bg-green-500/20 text-green-700'
                    : 'bg-red-500/20 text-red-600'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Login:</div>
              <div>
                {user.has_password ? (
                  <span className="text-green-400">✓ Conta ativa</span>
                ) : (
                  <span className="text-orange-400">🔒 Sem conta de login</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Plano e Permissões */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span>👑</span> Plano e Permissões
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Plano:</div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.plano?.toLowerCase() === 'free' || !user.plano
                    ? 'bg-[var(--bg-elevated)]/20 text-[var(--text-secondary)]'
                    : 'bg-yellow-500/20 text-yellow-700'
                }`}>
                  {user.plano}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Tipo:</div>
              <div>
                {user.is_admin ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-700">
                    Administrador
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--bg-elevated)]/20 text-[var(--text-secondary)]">
                    Usuário
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Validade:</div>
              <div className="text-[var(--text-primary)] font-medium">
                {daysRemaining !== null ? `${daysRemaining} dias` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Datas */}
        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span>📅</span> Histórico de Datas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Cadastro:</div>
              <div className="text-[var(--text-primary)] font-medium">{formatDate(user.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Compra do Plano:</div>
              <div className="text-[var(--text-primary)] font-medium">{formatDate(user.data_compra)}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Fim do Plano:</div>
              <div className="text-[var(--text-primary)] font-medium">{formatDate(user.data_final_plano)}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Último Acesso:</div>
              <div className="text-green-400 font-medium">{formatDateTime(user.data_ultimo_acesso)}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Edit className="w-5 h-5" />
            Editar
          </button>
          <button
            onClick={() => setShowResetPasswordModal(true)}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Key className="w-5 h-5" />
            Resetar Senha
          </button>
          <button
            onClick={handleClearMemory}
            disabled={clearing}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Eraser className="w-5 h-5" />
            {clearing ? 'Limpando...' : 'Limpar Chat'}
          </button>
        </div>
      </div>

      {/* Modal de Resetar Senha */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        userName={user.nome}
        onReset={handleResetPassword}
      />

      {/* Modal de Sucesso */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Senha Resetada!"
        message="A senha do usuário foi alterada com sucesso."
      />
    </Modal>
  );
}
