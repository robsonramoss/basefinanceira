"use client";

import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLanguage } from "@/contexts/language-context";
import { Users, UserPlus, Trash2, Mail, Clock, Settings, Edit, Power, PowerOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddUserModal } from "./add-user-modal";
import { EditMemberModal } from "./edit-member-modal";
import { EditMemberInfoModal } from "./edit-member-info-modal";
import { ConfirmDeactivateModal } from "@/components/ui/confirm-deactivate-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useTeamMembers } from "@/hooks/use-team-members";
import { removeMember, updateMemberPermissions, updateMemberInfo, toggleMemberStatus } from "@/actions/team-actions";
import { sendWebhookInvite } from "@/actions/webhook-actions";
import type { TeamMember } from "@/hooks/use-team-members";
import { Toast, useToast } from "@/components/ui/toast";
import { InfoCard } from "@/components/ui/info-card";
import { EmptyStateEducational } from "@/components/ui/empty-state-educational";

export function SharedManagement() {
  const { profile } = useUser();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingMemberInfo, setEditingMemberInfo] = useState<TeamMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<TeamMember | null>(null);
  const { data: members, refetch } = useTeamMembers();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [removingConfirmId, setRemovingConfirmId] = useState<number | null>(null);
  const { toasts, success, error, removeToast } = useToast();

  // Bloquear acesso para dependentes
  const isDependente = profile?.is_dependente === true;

  // Verificar se tem plano pago: plano_id > 1 (1 = free) OU plano legado (pro/vitalicio)
  const isPro = (profile?.plano_id && profile.plano_id > 1) ||
    profile?.plano === 'pro' ||
    profile?.plano === 'vitalicio';

  // Limites baseados no plano real do usuário (busca do banco)
  const maxDependentes = profile?.max_usuarios_dependentes || 0;
  const permiteCompartilhamento = profile?.permite_compartilhamento || false;
  const userLimit = maxDependentes;
  const currentUsers = members?.length || 0;

  const handleAddUser = () => {
    if (!permiteCompartilhamento || maxDependentes === 0) {
      alert("Seu plano não permite compartilhamento. Faça upgrade para adicionar colaboradores!");
      return;
    }
    if (currentUsers >= userLimit) {
      alert("Você atingiu o limite de colaboradores do seu plano. Faça upgrade para adicionar mais!");
      return;
    }
    setIsModalOpen(true);
  };

  const handleRemoveMember = (id: number) => {
    setRemovingConfirmId(id);
  };

  const confirmRemoveMember = async () => {
    if (!removingConfirmId) return;
    const id = removingConfirmId;
    setRemovingConfirmId(null);
    setRemovingId(id);
    try {
      const result = await removeMember(id);
      if (result.success) {
        refetch();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("Erro ao remover membro");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSavePermissions = async (memberId: number, permissoes: any) => {
    const result = await updateMemberPermissions(memberId, permissoes);
    if (result.success) {
      success(t('success.permissionsUpdated'));
      refetch();
    } else {
      error('Erro ao salvar permissões: ' + result.error);
      throw new Error(result.error);
    }
  };

  const handleSaveMemberInfo = async (memberId: number, data: { nome: string; email: string; telefone: string }) => {
    const result = await updateMemberInfo(memberId, data);
    if (result.success) {
      success(t('success.profileUpdated'));
      refetch();
    } else {
      error('Erro ao atualizar cadastro: ' + result.error);
      throw new Error(result.error);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    setDeactivatingMember(member);
  };

  const confirmToggleStatus = async () => {
    if (!deactivatingMember) return;

    setTogglingId(deactivatingMember.id);
    try {
      const result = await toggleMemberStatus(deactivatingMember.id, deactivatingMember.status);
      if (result.success) {
        success(t('success.memberStatusChanged').replace('{status}', result.newStatus === 'ativo' ? 'ativado' : 'inativado'));
        refetch();
        setDeactivatingMember(null);
      } else {
        error('Erro ao alterar status: ' + result.error);
      }
    } catch (err) {
      error('Erro ao alterar status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleResendInvite = async (member: TeamMember) => {
    setResendingId(member.id);
    try {
      const result = await sendWebhookInvite({
        memberId: member.id,
        memberName: member.nome,
        memberEmail: member.email || '',
        memberPhone: member.telefone || '',
      });

      if (result.success) {
        success('Convite reenviado via WhatsApp com sucesso!');
        refetch();
      } else {
        error('Erro ao reenviar convite: ' + result.error);
      }
    } catch (err) {
      error('Erro ao reenviar convite');
    } finally {
      setResendingId(null);
    }
  };

  // Se for dependente, mostrar mensagem de bloqueio
  if (isDependente) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{t('settings.teamAccess')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('settings.teamAccessDesc')}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-500 mb-1">
                Acesso Restrito
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Apenas o administrador da conta pode gerenciar membros da equipe.
                Entre em contato com o administrador para adicionar ou remover membros.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)]">{t('settings.teamAccess')}</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('settings.teamAccessDesc')}<br />
          {t('settings.planAllows')} {userLimit} {t('settings.collaborators')}.
        </p>
      </div>

      {/* Info Card Educativo */}
      <InfoCard
        title={t('settings.shareInfoCardTitle')}
        description={t('settings.shareInfoCardDescription')}
        tips={[
          t('settings.shareInfoCardTip1'),
          t('settings.shareInfoCardTip2'),
          t('settings.shareInfoCardTip3'),
          "O membro precisa criar uma conta usando o email cadastrado aqui"
        ]}
        storageKey="shared-management-tip"
      />

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        {/* Header da Lista */}
        <div className="p-4 md:p-6 border-b border-[var(--border-default)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{currentUsers} de {userLimit} compartilhamentos em uso</span>
          </div>

          <button
            onClick={handleAddUser}
            disabled={currentUsers >= userLimit}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            {t('settings.inviteMember')}
          </button>
        </div>

        {/* Lista de Usuários */}
        <div className="divide-y divide-[var(--border-default)]">
          {/* Empty State quando não há membros */}
          {(!members || members.length === 0) && (
            <div className="p-8">
              <EmptyStateEducational
                icon={UserPlus}
                title="Nenhum Membro Adicionado"
                description="Convide pessoas para acessar e gerenciar seus dados financeiros com você!"
                whatIs="O compartilhamento permite que outras pessoas (funcionários, sócio, cônjuge) tenham acesso aos seus dados financeiros. Você define o nível de permissão de cada um: apenas visualizar, criar transações, ou ter acesso total."
                howToUse={[
                  { step: 1, text: 'Clique em "Convidar Membro" no canto superior direito' },
                  { step: 2, text: 'Digite o nome e email da pessoa' },
                  { step: 3, text: 'Compartilhe o email cadastrado com a pessoa' },
                  { step: 4, text: 'A pessoa deve criar uma conta usando EXATAMENTE este email' },
                  { step: 5, text: 'Após criar a conta, ela terá acesso automático aos dados compartilhados' }
                ]}
                example='Exemplo PJ: Você é dono de uma empresa e quer que seu contador registre despesas. Convide ele com permissão "Básico" para criar transações, mas sem poder deletar ou ver relatórios completos. Exemplo Casal: Você e seu cônjuge querem gerenciar as finanças juntos. Convide com acesso "Avançado" para ambos terem controle total.'
                actionButton={{
                  label: '+ Convidar Primeiro Membro',
                  onClick: handleAddUser
                }}
              />
            </div>
          )}

          {/* Eu (Proprietário) */}
          <div className="p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-900/20">
                {profile?.nome?.[0] || 'E'}
              </div>
              <div>
                <p className="text-[var(--text-primary)] font-medium text-sm">{profile?.nome || 'Eu'}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{profile?.email}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {t('settings.owner')}
            </span>
          </div>

          {/* Membros Convidados */}
          {members?.map((member) => (
            <div key={member.id} className="p-4 flex items-center justify-between gap-2 hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {member.nome?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-[var(--text-primary)] font-medium text-sm truncate">{member.nome}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[160px] md:max-w-none">{member.email}</span>
                    {member.convite_status === 'pendente' && (
                      <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-1.5 rounded text-xs whitespace-nowrap">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {/* Badge de Status */}
                {member.status === 'inativo' && (
                  <span className="hidden sm:inline-flex px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                    Inativo
                  </span>
                )}

                {/* Reenviar Convite WhatsApp */}
                <button
                  onClick={() => handleResendInvite(member)}
                  disabled={resendingId === member.id}
                  className="p-1.5 md:p-2 text-[var(--text-tertiary)] hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Reenviar convite via WhatsApp"
                >
                  {resendingId === member.id ? (
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>

                {/* Editar Cadastro */}
                <button
                  onClick={() => setEditingMemberInfo(member)}
                  className="p-1.5 md:p-2 text-[var(--text-tertiary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Editar cadastro"
                >
                  <Edit className="w-4 h-4" />
                </button>

                {/* Editar Permissões */}
                <button
                  onClick={() => setEditingMember(member)}
                  className="p-1.5 md:p-2 text-[var(--text-tertiary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Editar permissões"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Ativar/Inativar */}
                <button
                  onClick={() => handleToggleStatus(member)}
                  disabled={togglingId === member.id}
                  className={`p-1.5 md:p-2 rounded-lg transition-colors ${member.status === 'ativo'
                      ? 'text-[var(--text-tertiary)] hover:text-orange-400 hover:bg-orange-500/10'
                      : 'text-[var(--text-tertiary)] hover:text-green-400 hover:bg-green-500/10'
                    }`}
                  title={member.status === 'ativo' ? 'Inativar' : 'Ativar'}
                >
                  {togglingId === member.id ? (
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : member.status === 'ativo' ? (
                    <PowerOff className="w-4 h-4" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </button>

                {/* Remover */}
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removingId === member.id}
                  className="p-1.5 md:p-2 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remover acesso"
                >
                  {removingId === member.id ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card de Upgrade para Usuários Free */}
      {!permiteCompartilhamento && !isPro && (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 justify-center md:justify-start">
              <span className="p-1 bg-purple-500 rounded-md">
                <Users className="w-4 h-4 text-white" />
              </span>
              {t('settings.workAsTeam')}
            </h4>
            <p className="text-[var(--text-secondary)] text-sm max-w-md">
              {t('settings.workAsTeamDesc')}
            </p>
          </div>

          <button className="whitespace-nowrap px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-purple-500/20">
            {t('settings.upgradeProButton')}
          </button>
        </div>
      )}

      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      <EditMemberModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onSave={handleSavePermissions}
      />

      <EditMemberInfoModal
        isOpen={!!editingMemberInfo}
        onClose={() => setEditingMemberInfo(null)}
        member={editingMemberInfo}
        onSave={handleSaveMemberInfo}
      />

      <ConfirmDeactivateModal
        isOpen={!!deactivatingMember}
        onClose={() => setDeactivatingMember(null)}
        onConfirm={confirmToggleStatus}
        memberName={deactivatingMember?.nome || ''}
        isActivating={deactivatingMember?.status === 'inativo'}
      />

      <ConfirmModal
        isOpen={!!removingConfirmId}
        onClose={() => setRemovingConfirmId(null)}
        onConfirm={confirmRemoveMember}
        title="Remover membro"
        message={t('confirm.removeMember')}
        confirmLabel="Remover"
        loading={removingId === removingConfirmId}
        variant="danger"
      />

      {/* Toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
