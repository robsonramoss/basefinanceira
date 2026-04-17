"use client";

import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Plus, Edit, Trash2, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useBranding } from "@/contexts/branding-context";
import { updateTutorialSettings } from "@/actions/admin-settings-actions";
import { SuccessModal } from "@/components/admin/success-modal";
import { createClient } from "@/lib/supabase/client";
import { Tutorial } from "@/hooks/use-tutorials";
import { TutorialFormModal } from "./tutorial-form-modal";

export function TutorialAdminSection() {
  const { t } = useLanguage();
  const { settings, loading: brandingLoading } = useBranding();
  const supabase = createClient();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estado local dos toggles
  const [moduloHabilitado, setModuloHabilitado] = useState(false);

  // Carregar valores iniciais dos toggles quando settings mudar
  useEffect(() => {
    if (settings && !brandingLoading) {
      setModuloHabilitado(settings.habilitar_modulo_tutoriais || false);
    }
  }, [settings, brandingLoading]);

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutoriais')
        .select('*')
        .order('modulo', { ascending: true })
        .order('ordem', { ascending: true });

      if (error) throw error;
      setTutorials(data || []);
    } catch (err) {
      console.error('Error fetching tutorials:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  const handleSaveAllSettings = async () => {
    setSaving(true);
    try {
      const result = await updateTutorialSettings({
        habilitar_modulo_tutoriais: moduloHabilitado
      });

      if (result.success) {
        setShowSuccessModal(true);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert('❌ Erro ao salvar: ' + result.error);
      }
    } catch (err) {
      alert('❌ Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    setEditingTutorial(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('tutorials.admin.confirmDelete'))) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('tutoriais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTutorials();
    } catch (err) {
      console.error('Error deleting tutorial:', err);
      alert('Erro ao excluir tutorial');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (tutorial: Tutorial) => {
    try {
      const { error } = await supabase
        .from('tutoriais')
        .update({ ativo: !tutorial.ativo })
        .eq('id', tutorial.id);

      if (error) throw error;
      fetchTutorials();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const handleFormSave = () => {
    fetchTutorials();
  };

  const handleFormClose = () => {
    setShowFormModal(false);
    setEditingTutorial(undefined);
  };

  const getModuleColor = (modulo: string) => {
    const colors: Record<string, string> = {
      primeiros_passos: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      transacoes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cartao: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      investimentos: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      relatorios: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      configuracoes: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[modulo] || 'bg-gray-100 text-gray-700';
  };

  const getLevelColor = (nivel: string) => {
    const colors: Record<string, string> = {
      basico: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      intermediario: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      avancado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[nivel] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          {t('tutorials.admin.title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Gerencie os tutoriais em vídeo do sistema
        </p>
      </div>

      {/* Configurações de Tutoriais e Tour Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl p-5 space-y-5">
        {/* Toggle: Módulo de Tutoriais */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-[var(--text-primary)] font-medium flex items-center gap-2">
              {t('tutorials.admin.enableModule')}
              {moduloHabilitado ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {moduloHabilitado
                ? 'O módulo de tutoriais em vídeo está visível para os usuários'
                : 'O módulo de tutoriais em vídeo está oculto dos usuários'}
            </p>
          </div>
          <button
            onClick={() => setModuloHabilitado(!moduloHabilitado)}
            disabled={brandingLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${moduloHabilitado ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${moduloHabilitado ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {/* Botão Salvar Único */}
        <div className="flex justify-end pt-2 border-t border-[var(--border-medium)]">
          <button
            onClick={handleSaveAllSettings}
            disabled={saving || brandingLoading}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Tutorials List */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl overflow-hidden">
        {/* Header with Add Button */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-[var(--text-primary)] font-medium">
              Tutoriais Cadastrados
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {tutorials.length} {tutorials.length === 1 ? 'tutorial' : 'tutoriais'} no total
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('tutorials.admin.addTutorial')}
          </button>
        </div>

        {/* Tutorials Table */}
        <div className="overflow-x-auto">
          {tutorials.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Nenhum tutorial cadastrado</p>
              <button
                onClick={handleAdd}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Primeiro Tutorial
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Módulo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nível
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Idioma
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {tutorials.map((tutorial) => (
                  <tr key={tutorial.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(tutorial)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                          tutorial.ativo
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/50"
                        )}
                        title={tutorial.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {tutorial.ativo ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Inativo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {tutorial.titulo}
                        </p>
                        {tutorial.descricao && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {tutorial.descricao}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getModuleColor(tutorial.modulo))}>
                        {t(`tutorials.modules.${tutorial.modulo}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getLevelColor(tutorial.nivel))}>
                        {t(`tutorials.level.${tutorial.nivel}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground uppercase">
                        {tutorial.idioma}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        #{tutorial.ordem}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tutorial)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tutorial.id)}
                          disabled={deletingId === tutorial.id}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === tutorial.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <TutorialFormModal
          tutorial={editingTutorial}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações do módulo de tutoriais foram atualizadas com sucesso."
      />
    </div>
  );
}
