"use client";

import { useState, useEffect } from "react";
import { X, Clock, Calendar, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import type { Lembrete, LembreteInput } from "@/hooks/use-lembretes";

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LembreteInput) => Promise<any>;
  onDelete?: (id: number) => Promise<void>;
  onToggleStatus?: (data: { id: number; status: 'ativo' | 'executado' | 'cancelado' }) => Promise<any>;
  reminder?: Lembrete | null;
  defaultDate?: string;
  defaultTime?: string;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function ReminderModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onToggleStatus,
  reminder,
  defaultDate,
  defaultTime,
  isSaving,
  isDeleting,
}: ReminderModalProps) {
  const { t } = useLanguage();
  const isEditing = !!reminder;

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLembrete, setDataLembrete] = useState("");
  const [horaLembrete, setHoraLembrete] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<string>("mensal");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (reminder) {
        setTitulo(reminder.titulo);
        setDescricao(reminder.descricao || "");
        setDataLembrete(reminder.data_lembrete);
        setHoraLembrete(reminder.hora_lembrete || "");
        setHoraFim(reminder.hora_fim || "");
        setRecorrente(reminder.recorrente || false);
        setTipoRecorrencia(reminder.tipo_recorrencia || "mensal");
      } else {
        setTitulo("");
        setDescricao("");
        setDataLembrete(defaultDate || new Date().toISOString().split('T')[0]);
        setHoraLembrete(defaultTime || "");
        setHoraFim("");
        setRecorrente(false);
        setTipoRecorrencia("mensal");
      }
      setShowDeleteConfirm(false);
      setError("");
    }
  }, [isOpen, reminder, defaultDate, defaultTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!titulo.trim()) {
      setError(t('reminders.modal.titleRequired'));
      return;
    }
    if (!dataLembrete) {
      setError(t('reminders.modal.dateRequired'));
      return;
    }
    if (horaLembrete && horaFim && horaFim <= horaLembrete) {
      setError(t('reminders.modal.endTimeError'));
      return;
    }

    try {
      const data: any = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        data_lembrete: dataLembrete,
        hora_lembrete: horaLembrete || null,
        hora_fim: horaFim || null,
        recorrente,
        tipo_recorrencia: recorrente ? tipoRecorrencia : null,
      };

      if (isEditing && reminder) {
        data.id = reminder.id;
        data.status = reminder.status;
      }

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message || t('reminders.modal.saveError'));
    }
  };

  const handleDelete = async () => {
    if (!reminder || !onDelete) return;
    try {
      await onDelete(reminder.id);
      onClose();
    } catch (err: any) {
      setError(err.message || t('reminders.modal.deleteError'));
    }
  };

  const handleToggleStatus = async (status: 'ativo' | 'executado' | 'cancelado') => {
    if (!reminder || !onToggleStatus) return;
    try {
      await onToggleStatus({ id: reminder.id, status });
      onClose();
    } catch (err: any) {
      setError(err.message || t('reminders.modal.statusError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[var(--border-medium)] rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:p-6 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {isEditing ? t('reminders.modal.editTitle') : t('reminders.modal.newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 sm:p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('reminders.modal.titleLabel')} *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t('reminders.modal.titlePlaceholder')}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              {t('reminders.modal.descriptionLabel')}
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={t('reminders.modal.descriptionPlaceholder')}
              rows={3}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('reminders.modal.dateLabel')} *
            </label>
            <input
              type="date"
              value={dataLembrete}
              onChange={(e) => setDataLembrete(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Hora Início e Fim */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('reminders.modal.startTime')}
              </label>
              <input
                type="time"
                value={horaLembrete}
                onChange={(e) => setHoraLembrete(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('reminders.modal.endTime')}
              </label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <RefreshCw className="w-4 h-4" />
                {t('reminders.modal.recurring')}
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={recorrente}
                  onChange={(e) => setRecorrente(e.target.checked)}
                />
                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {recorrente && (
              <select
                value={tipoRecorrencia}
                onChange={(e) => setTipoRecorrencia(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--input-text)] appearance-none focus:outline-none focus:border-primary transition-colors"
              >
                <option value="diario">{t('reminders.modal.daily')}</option>
                <option value="semanal">{t('reminders.modal.weekly')}</option>
                <option value="quinzenal">{t('reminders.modal.biweekly')}</option>
                <option value="mensal">{t('reminders.modal.monthly')}</option>
                <option value="bimestral">{t('reminders.modal.bimonthly')}</option>
                <option value="trimestral">{t('reminders.modal.quarterly')}</option>
                <option value="semestral">{t('reminders.modal.semiannual')}</option>
                <option value="anual">{t('reminders.modal.yearly')}</option>
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-default)]">
            {isEditing && onDelete ? (
              !showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[44px] text-red-400 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('reminders.modal.delete')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 min-h-[44px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isDeleting ? t('reminders.modal.deleting') : t('reminders.modal.confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-3 sm:py-2.5 min-h-[44px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-sm"
                  >
                    {t('reminders.modal.cancel')}
                  </button>
                </div>
              )
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 min-h-[44px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] rounded-lg transition-colors text-sm font-medium"
              >
                {t('reminders.modal.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 min-h-[44px] bg-primary hover:bg-primary/90 active:bg-primary/80 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? t('reminders.modal.saving') : isEditing ? t('reminders.modal.save') : t('reminders.modal.create')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
