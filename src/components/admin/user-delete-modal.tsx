"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AdminUser } from "@/hooks/use-admin-users";
import { Trash2, AlertTriangle } from "lucide-react";
import { SuccessModal } from "./success-modal";

interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser;
  onConfirm: (deleteAuth: boolean, deleteTransactions: boolean) => Promise<void>;
}

export function UserDeleteModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: UserDeleteModalProps) {
  const [deleteAuth, setDeleteAuth] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      // Sempre passa true para deleteTransactions para garantir limpeza completa
      await onConfirm(deleteAuth, true);
      setShowSuccessModal(true);
    } catch (error: any) {
      alert('Erro ao excluir usuário: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Confirmar Exclusão</h2>
            <p className="text-sm text-[var(--text-secondary)]">Esta ação é irreversível. Todos os dados serão removidos.</p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-[var(--text-primary)] font-semibold text-sm">
              {user.nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-[var(--text-primary)] font-medium">{user.nome}</div>
              <div className="text-sm text-[var(--text-secondary)]">{user.email} • ID: #{user.id}</div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Excluir da Autenticação */}
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAuth}
                onChange={(e) => setDeleteAuth(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-red-500 focus:ring-red-500"
              />
              <div className="flex-1">
                <div className="text-[var(--text-primary)] font-medium mb-1">Excluir da Autenticação (auth.users)</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Remove o login do usuário permanentemente.
                  {user.has_password
                    ? ' Este usuário possui conta de login ativa.'
                    : ' Este usuário não possui conta de login.'}
                </div>
              </div>
            </label>
          </div>

          {/* Itens que sempre serão removidos */}
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 w-5 h-5 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-green-500"
              />
              <div className="flex-1">
                <div className="text-[var(--text-primary)] font-medium mb-1">Remover todos os dados financeiros</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  Transações, lançamentos futuros, categorias, contas bancárias, cartões, investimentos e metas
                </div>
              </div>
            </label>
          </div>

          {/* Limpar Histórico do Chat */}
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-1 w-5 h-5 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-green-500"
              />
              <div className="flex-1">
                <div className="text-[var(--text-primary)] font-medium mb-1">Limpar Histórico do Chat</div>
                <div className="text-sm text-[var(--text-secondary)]">Remove conversas do WhatsApp/N8N</div>
              </div>
            </label>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
            <div>
              <div className="text-orange-400 font-medium mb-1">⚠️ Esta ação irá:</div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Remover o usuário da tabela de usuários</li>
                <li>• Excluir TODAS as transações e lançamentos (incluindo pagos)</li>
                <li>• Remover categorias, metas, contas bancárias e cartões</li>
                <li>• Excluir investimentos e proventos vinculados</li>
                {deleteAuth && <li>• Remover acesso de login permanentemente (auth.users)</li>}
                <li>• Apagar histórico de conversas no WhatsApp</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cannot Undo */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-red-400 font-semibold mb-1">🚫 Não é possível desfazer esta ação!</div>
          <div className="text-sm text-[var(--text-secondary)]">Todos os dados serão perdidos permanentemente</div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </div>

      {/* Modal de Sucesso */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        title="Usuário excluído com sucesso!"
        message="Todas as informações do usuário foram removidas do sistema."
      />
    </Modal>
  );
}
