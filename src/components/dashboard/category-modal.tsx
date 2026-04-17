"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { IconSelector, suggestIcon } from "./icon-selector";
import { useLanguage } from "@/contexts/language-context";

type CategoryFormValues = {
  descricao: string;
};

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'entrada' | 'saida';
  categoryToEdit?: any;
}

export function CategoryModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  type,
  categoryToEdit 
}: CategoryModalProps) {
  const { t } = useLanguage();
  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedType, setSelectedType] = useState<'entrada' | 'saida' | 'ambos'>(type);
  
  // Schema dinâmico com tradução
  const categorySchema = z.object({
    descricao: z.string().min(1, t('categories.modal.nameRequired')),
  });
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      descricao: "",
    },
  });

  const accentColor = selectedType === 'entrada' ? '#22C55E' : selectedType === 'saida' ? '#EF4444' : '#3B82F6';
  const accentColorHover = selectedType === 'entrada' ? '#16A34A' : selectedType === 'saida' ? '#DC2626' : '#2563EB';

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setValue('descricao', categoryToEdit.descricao);
        setSelectedIcon(categoryToEdit.icon_key || '');
        setKeywords(categoryToEdit.keywords || []);
        setSelectedType(categoryToEdit.tipo || type);
      } else {
        reset({ descricao: "" });
        setSelectedIcon('');
        setKeywords([]);
        setSelectedType(type);
      }
      setKeywordInput('');
    }
  }, [isOpen, categoryToEdit, reset, setValue, type]);

  // Sugerir ícone automaticamente quando digitar
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('descricao', value);
    
    // Se não tem ícone selecionado e está digitando, sugerir
    if (!selectedIcon && value.length > 2) {
      const suggested = suggestIcon(value, selectedType === 'ambos' ? 'entrada' : selectedType);
      setSelectedIcon(suggested);
    }
  };

  // Adicionar keyword
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  // Remover keyword
  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  // Adicionar keyword ao pressionar Enter
  const handleKeywordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const onSubmit = async (data: CategoryFormValues) => {
    if (!profile) return;

    try {
      const supabase = createClient();
      const categoryData = {
        descricao: data.descricao,
        tipo: selectedType,
        usuario_id: profile.id,
        icon_key: selectedIcon || null,
        tipo_conta: accountFilter,
        keywords: keywords,
      };

      let error;

      if (categoryToEdit) {
        const { error: updateError } = await supabase
          .from('categoria_trasacoes')
          .update(categoryData)
          .eq('id', categoryToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('categoria_trasacoes')
          .insert([categoryData]);
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? t('categories.modal.editTitle') : t('categories.modal.newTitle')}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Aviso de Contexto: Conta Pessoal/PJ + Tipo */}
        <div className="flex flex-col items-center gap-2 pb-2 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {accountFilter === 'pessoal' ? `👤 ${t('categories.modal.contextPersonal')}` : `🏢 ${t('categories.modal.contextPJ')}`}
            </span>
            <span className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold",
              selectedType === 'entrada'
                ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30"
                : selectedType === 'saida'
                ? "bg-red-500/10 text-red-500 border border-red-500/30"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
            )}>
              {selectedType === 'entrada' ? t('categories.modal.typeIncome') : selectedType === 'saida' ? t('categories.modal.typeExpense') : 'Ambos'}
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] text-center">
            {t('categories.modal.willBeCreatedFor')} {accountFilter === 'pessoal' ? t('categories.modal.contextUsagePersonal') : t('categories.modal.contextUsagePJ')}
          </p>
        </div>

        {/* Seletor de Tipo (apenas ao editar) */}
        {categoryToEdit && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Tipo da Categoria <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedType('entrada')}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                  selectedType === 'entrada'
                    ? "bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E]"
                    : "bg-[var(--input-bg)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}
              >
                💰 Receita
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('saida')}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                  selectedType === 'saida'
                    ? "bg-red-500/10 border-red-500 text-red-500"
                    : "bg-[var(--input-bg)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}
              >
                💸 Despesa
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('ambos')}
                className={cn(
                  "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                  selectedType === 'ambos'
                    ? "bg-blue-500/10 border-blue-500 text-blue-400"
                    : "bg-[var(--input-bg)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}
              >
                🔄 Ambos
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedType === 'ambos' 
                ? '⚠️ Categoria aparecerá tanto em Receitas quanto em Despesas'
                : selectedType === 'entrada'
                ? '✅ Categoria aparecerá apenas em Receitas'
                : '✅ Categoria aparecerá apenas em Despesas'
              }
            </p>
          </div>
        )}

        {/* Nome da Categoria */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('categories.modal.categoryName')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register("descricao")}
            onChange={handleDescriptionChange}
            placeholder={selectedType === 'entrada' ? t('categories.modal.placeholderIncome') : selectedType === 'saida' ? t('categories.modal.placeholderExpense') : 'Ex: Transferência, Ajuste'}
            className="bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] h-11"
            onFocus={(e) => e.target.style.borderColor = accentColor}
            onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
          />
          {errors.descricao && (
            <p className="text-xs text-red-400">{errors.descricao.message}</p>
          )}
        </div>

        {/* Seletor de Ícones */}
        <IconSelector
          selectedIcon={selectedIcon}
          onSelectIcon={setSelectedIcon}
          accentColor={accentColor}
        />

        {/* Palavras-chave para IA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('categories.modal.keywordsLabel')}
            </label>
            <span className="text-xs text-[var(--text-tertiary)] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              🤖 IA
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {t('categories.modal.keywordsDescription')}
          </p>

          {/* Keywords Tags */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-lg">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm rounded-full border border-[var(--border-medium)] hover:border-red-500/30 transition-colors group"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input para adicionar keyword */}
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={handleKeywordKeyPress}
              placeholder={t('categories.modal.keywordPlaceholder')}
              className="flex-1 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] h-10 text-sm"
              onFocus={(e) => e.target.style.borderColor = accentColor}
              onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
            />
            <Button
              type="button"
              onClick={handleAddKeyword}
              disabled={!keywordInput.trim()}
              className="px-4 text-white font-medium text-sm"
              style={{ backgroundColor: accentColor }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColorHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor}
            >
              {t('categories.modal.addKeyword')}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 text-white font-medium"
            style={{ backgroundColor: accentColor }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColorHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {categoryToEdit ? t('common.save') : t('categories.modal.createButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
