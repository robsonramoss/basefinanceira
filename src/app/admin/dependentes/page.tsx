"use client";

import { useState } from "react";
import { useAdminDependents, AdminDependent } from "@/hooks/use-admin-dependents";
import { Search, Users, UserCheck, Clock, Shield, Eye, Edit, Trash2, Key, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { DependentDetailsModal } from "@/components/admin/dependent-details-modal";
import { DependentEditModal } from "@/components/admin/dependent-edit-modal";
import { DependentDeleteModal } from "@/components/admin/dependent-delete-modal";
import { DependentResetPasswordModal } from "@/components/admin/dependent-reset-password-modal";
import { SuccessModal } from "@/components/admin/success-modal";

export default function DependentesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedDependent, setSelectedDependent] = useState<AdminDependent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { dependents, stats, loading, updateDependent, deleteDependent, resetPassword, refreshDependents } = useAdminDependents(
    searchTerm,
    currentPage,
    itemsPerPage,
    {}
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const handleViewDetails = (dependent: AdminDependent) => {
    setSelectedDependent(dependent);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (dependent: AdminDependent) => {
    setSelectedDependent(dependent);
    setIsEditModalOpen(true);
  };

  const handleDelete = (dependent: AdminDependent) => {
    setSelectedDependent(dependent);
    setIsDeleteModalOpen(true);
  };

  const handleResetPassword = (dependent: AdminDependent) => {
    setSelectedDependent(dependent);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveEdit = async (dependentId: number, updates: any) => {
    const result = await updateDependent(dependentId, updates);
    if (result.success) {
      setSuccessMessage("Dependente atualizado com sucesso!");
      setShowSuccessModal(true);
      setIsEditModalOpen(false);
      setSelectedDependent(null);
    }
    return result;
  };

  const handleConfirmDelete = async (dependentId: number, deleteAuth: boolean) => {
    const result = await deleteDependent(dependentId, deleteAuth);
    if (result.success) {
      setSuccessMessage("Dependente excluído com sucesso!");
      setShowSuccessModal(true);
      setIsDeleteModalOpen(false);
      setSelectedDependent(null);
    }
    return result;
  };

  const handleConfirmResetPassword = async (dependentId: number, newPassword: string) => {
    const result = await resetPassword(dependentId, newPassword);
    if (result.success) {
      setSuccessMessage("Senha resetada com sucesso!");
      setShowSuccessModal(true);
      setIsResetPasswordModalOpen(false);
      setSelectedDependent(null);
    }
    return result;
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <Link 
          href="/admin/users"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar para Usuários</span>
        </Link>
        <div className="flex items-center gap-2 lg:gap-3 mb-2">
          <Users className="w-6 h-6 lg:w-8 lg:h-8 text-[#22C55E]" />
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Gestão de Dependentes</h1>
        </div>
        <p className="text-sm lg:text-base text-[var(--text-secondary)]">Visualize e gerencie todos os usuários dependentes da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-400">TOTAL</div>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.total_dependentes || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Dependentes</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-green-400">ATIVOS</div>
            <UserCheck className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.dependentes_ativos || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Com acesso</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-yellow-400">PENDENTES</div>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.convites_pendentes || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Convites</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-purple-400">COM LOGIN</div>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.com_login || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Autenticados</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar dependentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs lg:text-sm text-[var(--text-secondary)]">
              Total: <span className="text-[var(--text-primary)] font-semibold">{dependents.length}</span>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 lg:px-4 py-2 lg:py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-[var(--border-default)]">
          <h2 className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">Lista de Dependentes</h2>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1">
            Página {currentPage} ({stats?.total_dependentes || 0} total)
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">Carregando...</div>
        ) : dependents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Nenhum dependente encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-[var(--border-default)]">
              {dependents.map((dependent) => (
                <div key={dependent.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                  {/* Dependent Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {getInitials(dependent.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-primary)] font-medium truncate">{dependent.nome}</div>
                      <div className="text-xs text-[var(--text-secondary)]">ID: #{dependent.id}</div>
                      <div className="text-sm text-[var(--text-secondary)] truncate mt-1">{dependent.email || "Sem email"}</div>
                      {dependent.telefone && (
                        <div className="text-xs text-[var(--text-secondary)]">{dependent.telefone}</div>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)] mb-1">Principal</div>
                      <div className="text-sm text-[var(--text-primary)] font-medium">{dependent.principal_nome}</div>
                      <div className="text-xs text-[var(--text-secondary)]">ID: #{dependent.usuario_principal_id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-tertiary)] mb-1">Plano</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        dependent.principal_plano?.toLowerCase() === 'free' || !dependent.principal_plano
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        {dependent.principal_plano || 'Free'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2 mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      dependent.status === 'ativo'
                        ? 'bg-green-500/20 text-green-600'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {dependent.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      dependent.convite_status === 'aceito'
                        ? 'bg-green-500/20 text-green-600'
                        : 'bg-yellow-500/20 text-yellow-600'
                    }`}>
                      {dependent.convite_status}
                    </span>
                    {dependent.auth_user_id && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-600">
                        ✓ Login
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(dependent)}
                      className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver</span>
                    </button>
                    <button
                      onClick={() => handleEdit(dependent)}
                      className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                    {dependent.auth_user_id && (
                      <button
                        onClick={() => handleResetPassword(dependent)}
                        className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors"
                        title="Resetar senha"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(dependent)}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-hover)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Dependente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Usuário Principal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Convite
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Login
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {dependents.map((dependent) => (
                    <tr key={dependent.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(dependent.nome)}
                          </div>
                          <div>
                            <div className="text-[var(--text-primary)] font-medium">{dependent.nome}</div>
                            <div className="text-sm text-[var(--text-secondary)]">{dependent.email || "Sem email"}</div>
                            {dependent.telefone && (
                              <div className="text-xs text-[var(--text-tertiary)]">{dependent.telefone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[var(--text-primary)] font-medium">{dependent.principal_nome}</div>
                        <div className="text-sm text-[var(--text-secondary)]">ID: #{dependent.usuario_principal_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          dependent.principal_plano?.toLowerCase() === 'free' || !dependent.principal_plano
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            : 'bg-yellow-500/20 text-yellow-600'
                        }`}>
                          {dependent.principal_plano || 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          dependent.status === 'ativo'
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {dependent.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          dependent.convite_status === 'aceito'
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-yellow-500/20 text-yellow-600'
                        }`}>
                          {dependent.convite_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {dependent.auth_user_id ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {formatDate(dependent.data_criacao)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(dependent)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-blue-400"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(dependent)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-blue-400"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {dependent.auth_user_id && (
                            <button
                              onClick={() => handleResetPassword(dependent)}
                              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-orange-400"
                              title="Resetar senha"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(dependent)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-red-400"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {selectedDependent && (
        <>
          <DependentDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedDependent(null);
            }}
            dependent={selectedDependent}
          />

          <DependentEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedDependent(null);
            }}
            dependent={selectedDependent}
            onSave={handleSaveEdit}
          />

          <DependentDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedDependent(null);
            }}
            dependent={selectedDependent}
            onConfirm={handleConfirmDelete}
          />

          <DependentResetPasswordModal
            isOpen={isResetPasswordModalOpen}
            onClose={() => {
              setIsResetPasswordModalOpen(false);
              setSelectedDependent(null);
            }}
            dependent={selectedDependent}
            onConfirm={handleConfirmResetPassword}
          />
        </>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sucesso!"
        message={successMessage}
      />
    </div>
  );
}
