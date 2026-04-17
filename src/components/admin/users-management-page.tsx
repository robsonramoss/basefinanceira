"use client";

import { useState } from "react";
import { Search, Plus, Edit, Eye, Shield, Trash2, Filter, X } from "lucide-react";
import { useAdminUsers, type AdminUser, type UserFilters } from "@/hooks/use-admin-users";
import { useAdminPlans } from "@/hooks/use-admin-plans";
import { UserDetailsModal } from "./user-details-modal";
import { UserEditModal } from "./user-edit-modal";
import { UserCreateModal } from "./user-create-modal";
import { UserDeleteModal } from "./user-delete-modal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function UsersManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Estados dos filtros
  const [selectedPlanos, setSelectedPlanos] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [filterAdmin, setFilterAdmin] = useState<boolean | undefined>(undefined);
  const [filterHasPassword, setFilterHasPassword] = useState<boolean | undefined>(undefined);
  const [filterPlanoValido, setFilterPlanoValido] = useState<boolean | undefined>(undefined);
  const [filterUltimoAcesso, setFilterUltimoAcesso] = useState<number | undefined>(undefined);

  // Construir objeto de filtros
  const filters: UserFilters | undefined =
    selectedPlanos.length > 0 ||
      selectedStatus.length > 0 ||
      filterAdmin !== undefined ||
      filterHasPassword !== undefined ||
      filterPlanoValido !== undefined ||
      filterUltimoAcesso !== undefined
      ? {
        planoIds: selectedPlanos.length > 0 ? selectedPlanos : undefined,
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
        isAdmin: filterAdmin,
        hasPassword: filterHasPassword,
        planoValido: filterPlanoValido,
        ultimoAcessoDias: filterUltimoAcesso,
      }
      : undefined;

  // Buscar planos dinamicamente
  const { plans: availablePlans, loading: loadingPlans } = useAdminPlans();

  const { users, stats, loading, updateUser, createUser, deleteUser, refreshUsers } = useAdminUsers(
    searchTerm,
    currentPage,
    itemsPerPage,
    filters
  );

  const getInitials = (nome: string) => {
    const parts = nome.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updates: Partial<AdminUser>) => {
    if (!selectedUser) return;
    const result = await updateUser(selectedUser.id, updates);
    if (result.success) {
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } else {
      alert('Erro ao atualizar usuário: ' + result.error);
    }
  };

  const handleCreateUser = async (userData: any) => {
    const result = await createUser(userData);
    if (result.success) {
      // Nao fechar o modal aqui — o SuccessModal dentro do UserCreateModal
      // ja cuida do fechamento via onClose apos o usuario clicar OK
    } else {
      // Lançar erro para o modal capturar e exibir
      throw new Error(result.error);
    }
  };

  const handleDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (deleteAuth: boolean, deleteTransactions: boolean) => {
    if (!selectedUser) return;
    const result = await deleteUser(selectedUser.id, deleteAuth, deleteTransactions);
    if (result.success) {
      // Sucesso tratado pelo SuccessModal dentro do UserDeleteModal
      // Após fechar o SuccessModal, o onClose do modal fará cleanup
    } else {
      // Lançar erro para o modal capturar e NÃO exibir SuccessModal
      throw new Error(result.error || 'Erro desconhecido ao excluir usuário');
    }
  };

  const handleClearFilters = () => {
    setSelectedPlanos([]);
    setSelectedStatus([]);
    setFilterAdmin(undefined);
    setFilterHasPassword(undefined);
    setFilterPlanoValido(undefined);
    setFilterUltimoAcesso(undefined);
    setCurrentPage(1);
  };

  const togglePlano = (planoId: number) => {
    setSelectedPlanos(prev =>
      prev.includes(planoId)
        ? prev.filter(id => id !== planoId)
        : [...prev, planoId]
    );
    setCurrentPage(1);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const activeFiltersCount =
    selectedPlanos.length +
    selectedStatus.length +
    (filterAdmin !== undefined ? 1 : 0) +
    (filterHasPassword !== undefined ? 1 : 0) +
    (filterPlanoValido !== undefined ? 1 : 0) +
    (filterUltimoAcesso !== undefined ? 1 : 0);

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 lg:gap-3 mb-2">
          <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-[#22C55E]" />
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Gestão de Usuários</h1>
        </div>
        <p className="text-sm lg:text-base text-[var(--text-secondary)]">Visualize e gerencie todos os usuários da plataforma</p>
      </div>

      {/* Stats Cards - Melhorados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4 lg:p-5 hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-400">TOTAL</div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.total_usuarios || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Usuários</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 lg:p-5 hover:border-green-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-green-400">ATIVOS</div>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.usuarios_ativos || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Online</div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-4 lg:p-5 hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-red-400">INATIVOS</div>
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.usuarios_inativos || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Offline</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 lg:p-5 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-purple-400">ADMINS</div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.administradores || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Gestores</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4 lg:p-5 hover:border-yellow-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-yellow-400">PREMIUM</div>
            <div className="text-xs bg-yellow-500/20 px-2 py-1 rounded text-yellow-400">PRO</div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.usuarios_premium || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Pagantes</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4 lg:p-5 hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-orange-400">NOVOS</div>
            <div className="text-xs bg-orange-500/20 px-2 py-1 rounded text-orange-400">30d</div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.novos_30_dias || 0}</div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Este mês</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 lg:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-[#22C55E]" />
            <h3 className="text-[var(--text-primary)] font-semibold">Filtros Avançados</h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-medium rounded-full">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] rounded-lg transition-colors text-sm"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-default)]">
            {/* Filtro por Plano - Dinâmico */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Plano</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {loadingPlans ? (
                  <div className="text-sm text-[var(--text-tertiary)]">Carregando planos...</div>
                ) : availablePlans.length === 0 ? (
                  <div className="text-sm text-[var(--text-tertiary)]">Nenhum plano disponível</div>
                ) : (
                  availablePlans
                    .sort((a, b) => a.ordem_exibicao - b.ordem_exibicao)
                    .map((plano) => (
                      <label key={plano.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlanos.includes(plano.id)}
                          onChange={() => togglePlano(plano.id)}
                          className="w-4 h-4 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-[#22C55E] focus:ring-[#22C55E] focus:ring-offset-0"
                        />
                        <span className="text-sm text-[var(--text-primary)]">{plano.nome}</span>
                        {!plano.ativo && (
                          <span className="text-xs text-[var(--text-tertiary)]">(Inativo)</span>
                        )}
                      </label>
                    ))
                )}
              </div>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Status</label>
              <div className="space-y-2">
                {['ativo', 'inativo', 'bloqueado'].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatus.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="w-4 h-4 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-[#22C55E] focus:ring-[#22C55E] focus:ring-offset-0"
                    />
                    <span className="text-sm text-[var(--text-primary)] capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro por Tipo de Usuário */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipo de Usuário</label>
              <select
                value={filterAdmin === undefined ? '' : filterAdmin ? 'admin' : 'user'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterAdmin(value === '' ? undefined : value === 'admin');
                  setCurrentPage(1);
                }}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
              >
                <option value="">Todos</option>
                <option value="admin">Apenas Admins</option>
                <option value="user">Apenas Usuários</option>
              </select>
            </div>

            {/* Filtro por Login */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Conta de Login</label>
              <select
                value={filterHasPassword === undefined ? '' : filterHasPassword ? 'yes' : 'no'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterHasPassword(value === '' ? undefined : value === 'yes');
                  setCurrentPage(1);
                }}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
              >
                <option value="">Todos</option>
                <option value="yes">Com Login</option>
                <option value="no">Sem Login</option>
              </select>
            </div>

            {/* Filtro por Validade do Plano */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Validade do Plano</label>
              <select
                value={filterPlanoValido === undefined ? '' : filterPlanoValido ? 'valid' : 'expired'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterPlanoValido(value === '' ? undefined : value === 'valid');
                  setCurrentPage(1);
                }}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
              >
                <option value="">Todos</option>
                <option value="valid">Plano Válido</option>
                <option value="expired">Plano Vencido</option>
              </select>
            </div>

            {/* Filtro por Último Acesso */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Último Acesso</label>
              <select
                value={filterUltimoAcesso || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterUltimoAcesso(value === '' ? undefined : Number(value));
                  setCurrentPage(1);
                }}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
              >
                <option value="">Todos</option>
                <option value="1">Hoje</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 lg:p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg pl-10 pr-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          {/* Mobile: Second Row */}
          <div className="flex items-center gap-3">
            {/* Total Count */}
            <div className="text-xs lg:text-sm text-[var(--text-secondary)] flex-1 lg:flex-initial">
              Total: <span className="text-[var(--text-primary)] font-semibold">{users.length}</span>
            </div>

            {/* Items Per Page */}
            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-3 lg:px-4 py-2 lg:py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#22C55E]"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[var(--text-secondary)] text-xs lg:text-sm hidden sm:inline">por página</span>
            </div>

            {/* Add User Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-[var(--text-primary)] px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-colors text-sm lg:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden sm:inline">Adicionar</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-[var(--border-default)]">
          <h2 className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">Lista de Usuários</h2>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1">
            Página {currentPage} de {Math.ceil((stats?.total_usuarios || 0) / itemsPerPage)} ({stats?.total_usuarios || 0} total)
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">Nenhum usuário encontrado</div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-[var(--border-default)]">
              {users.map((user) => {
                const daysRemaining = getDaysRemaining(user.data_final_plano);

                return (
                  <div key={user.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                    {/* User Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[var(--text-primary)] font-semibold flex-shrink-0">
                        {getInitials(user.nome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[var(--text-primary)] font-medium truncate">{user.nome}</div>
                        <div className="text-xs text-[var(--text-secondary)]">ID: #{user.id}</div>
                        <div className="text-sm text-[var(--text-secondary)] truncate mt-1">{user.email}</div>
                        {user.celular && (
                          <div className="text-xs text-[var(--text-secondary)]">{user.celular}</div>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)] mb-1">Plano</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.plano?.toLowerCase() === 'free' || !user.plano
                          ? 'bg-[var(--bg-elevated)]/20 text-[var(--text-secondary)]'
                          : 'bg-yellow-500/20 text-yellow-700'
                          }`}>
                          {user.plano}
                        </div>
                        {daysRemaining !== null && (
                          <div className="text-xs text-[var(--text-secondary)] mt-1">
                            {daysRemaining}d restantes
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-tertiary)] mb-1">Status</div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${daysRemaining !== null && daysRemaining < 0
                          ? 'bg-red-500/20 text-red-600'
                          : user.status === 'ativo'
                            ? 'bg-green-500/20 text-green-700'
                            : 'bg-red-500/20 text-red-600'
                          }`}>
                          {daysRemaining !== null && daysRemaining < 0 ? 'Vencido' : user.status}
                        </span>
                      </div>
                    </div>

                    {/* Login Status */}
                    <div className="mb-3">
                      {daysRemaining !== null && daysRemaining < 0 ? (
                        <span className="text-xs text-red-400">⚠️ Plano vencido há {Math.abs(daysRemaining)} dias</span>
                      ) : user.has_password ? (
                        <span className="text-xs text-green-400">✓ Conta ativa</span>
                      ) : (
                        <span className="text-xs text-orange-400">🔒 Sem conta de login</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-base)] border-b border-[var(--border-default)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">Nome</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">Plano</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">Admin</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-secondary)]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {users.map((user) => {
                    const daysRemaining = getDaysRemaining(user.data_final_plano);

                    return (
                      <tr key={user.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[var(--text-primary)] font-semibold text-sm">
                              {getInitials(user.nome)}
                            </div>
                            <div>
                              <div className="text-[var(--text-primary)] font-medium">{user.nome}</div>
                              <div className="text-xs text-[var(--text-secondary)]">ID: #{user.id} • {formatDate(user.created_at)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[var(--text-primary)]">{user.email}</div>
                          {user.celular && (
                            <div className="text-xs text-[var(--text-secondary)]">{user.celular}</div>
                          )}
                          <div className="mt-1">
                            {user.has_password ? (
                              <span className="text-xs text-green-400">✓ Conta ativa</span>
                            ) : (
                              <span className="text-xs text-orange-400">🔒 Sem conta de login</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.plano?.toLowerCase() === 'free' || !user.plano
                            ? 'bg-[var(--bg-elevated)]/20 text-[var(--text-secondary)]'
                            : 'bg-yellow-500/20 text-yellow-700'
                            }`}>
                            {user.plano}
                          </div>
                          {daysRemaining !== null && (
                            <div className="text-xs text-[var(--text-secondary)] mt-1">
                              Válido: {daysRemaining} dias
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.is_admin ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300">
                              Usuário
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--bg-elevated)]/20 text-[var(--text-secondary)]">
                              Usuário
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${daysRemaining !== null && daysRemaining < 0
                            ? 'bg-red-500/20 text-red-600'
                            : user.status === 'ativo'
                              ? 'bg-green-500/20 text-green-700'
                              : 'bg-red-500/20 text-red-600'
                            }`}>
                            {daysRemaining !== null && daysRemaining < 0 ? 'Vencido' : user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-blue-400"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-green-400"
                              title="Detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-red-400"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateUser}
      />

      {selectedUser && (
        <>
          <UserDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onEdit={() => {
              setIsDetailsModalOpen(false);
              setIsEditModalOpen(true);
            }}
            onRefresh={refreshUsers}
          />
          <UserEditModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSave={handleSaveEdit}
          />
          <UserDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onConfirm={handleConfirmDelete}
          />
        </>
      )}
    </div>
  );
}
