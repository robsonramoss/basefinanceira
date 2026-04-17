"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useCategoriesQuery } from "@/hooks/use-categories-query";
import { useAccounts } from "@/hooks/use-accounts";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";

const locales = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES'
};

const transactionSchemaBase = z.object({
  tipo: z.enum(['entrada', 'saida']),
  descricao: z.string(),
  valor: z.string(),
  categoria_id: z.string(),
  data: z.string(),
  conta_id: z.string().optional(),
  tipo_conta: z.enum(['pessoal', 'pj']).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchemaBase>;

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: any;
}

export function AllTransactionsModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transactionToEdit 
}: AllTransactionsModalProps) {
  const { t, language } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const { accounts, loading: loadingAccounts } = useAccounts(accountFilter);
  
  const [selectedType, setSelectedType] = useState<'entrada' | 'saida'>('entrada');
  const { categories: allCategories, loading: loadingCategories } = useCategoriesQuery();
  const categories = allCategories.filter(c => c.tipo === selectedType);
  
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [valorDisplay, setValorDisplay] = useState("");

  const transactionSchema = useMemo(() => z.object({
    tipo: z.enum(['entrada', 'saida']),
    descricao: z.string().min(1, t('validation.descriptionRequired')),
    valor: z.string().min(1, t('validation.valueRequired')),
    categoria_id: z.string().min(1, t('validation.categoryRequired')),
    data: z.string().min(1, t('validation.dateRequired')),
    conta_id: z.string().optional(),
    tipo_conta: z.enum(['pessoal', 'pj']).optional(),
  }), [t]);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tipo: 'entrada',
      descricao: "",
      valor: "",
      categoria_id: "",
      data: (() => {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const dia = String(now.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      })(),
      conta_id: "",
      tipo_conta: accountFilter,
    },
  });

  const selectedCategory = watch("categoria_id");
  const selectedAccount = watch("conta_id");
  const tipo = watch("tipo");

  // Definir cor baseada no tipo
  const accentColor = tipo === 'entrada' ? '#22C55E' : '#EF4444';
  const accentColorHover = tipo === 'entrada' ? '#16A34A' : '#DC2626';

  // Formatar valor como moeda baseada no idioma
  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString(locales[language], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setValorDisplay(formatted);
    // Salva o valor numérico puro no form como string "1234.56"
    // Remove formatting characters to store raw number string
    const rawValue = e.target.value.replace(/\D/g, '');
    const amount = parseFloat(rawValue) / 100;
    setValue('valor', amount.toString());
  };

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setValue('tipo', transactionToEdit.tipo);
        setSelectedType(transactionToEdit.tipo);
        setValue('descricao', transactionToEdit.descricao);
        const valorFormatado = parseFloat(transactionToEdit.valor).toLocaleString(locales[language], {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setValorDisplay(valorFormatado);
        setValue('valor', String(transactionToEdit.valor));
        setValue('categoria_id', String(transactionToEdit.categoria_id));
        setValue('conta_id', transactionToEdit.conta_id || '');
        setValue('tipo_conta', transactionToEdit.tipo_conta || accountFilter);
        const dataStr = new Date(transactionToEdit.data).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        setValue('data', dataStr);
      } else {
        reset({
          tipo: 'entrada',
          descricao: "",
          valor: "",
          categoria_id: "",
          data: (() => {
            const now = new Date();
            const ano = now.getFullYear();
            const mes = String(now.getMonth() + 1).padStart(2, '0');
            const dia = String(now.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
          })(),
          conta_id: "",
          tipo_conta: accountFilter,
        });
        setSelectedType('entrada');
        setValorDisplay("");
      }
      setShowNewCategory(false);
      setNewCategoryName("");
    }
  }, [isOpen, transactionToEdit, reset, setValue, language, locales]);

  // Atualizar tipo selecionado quando mudar no form
  useEffect(() => {
    setSelectedType(tipo);
  }, [tipo]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !profile) return;

    try {
      setCreatingCategory(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('categoria_trasacoes')
        .insert([{
          descricao: newCategoryName.trim(),
          usuario_id: profile.id,
          tipo: selectedType,
          tipo_conta: accountFilter,
        }])
        .select()
        .single();

      if (error) throw error;

      setValue('categoria_id', String(data.id));
      setShowNewCategory(false);
      setNewCategoryName("");
      window.dispatchEvent(new CustomEvent('categoriesChanged'));
    } catch (error) {
      alert(t('validation.errorCreatingCategory'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!profile) return;

    try {
      const supabase = createClient();
      const mesFormatado = data.data.substring(0, 7);
      const dataFormatada = `${data.data}T00:00:00`;
      
      const transactionData = {
        descricao: data.descricao,
        valor: parseFloat(data.valor), // data.valor is already "1234.56" string
        categoria_id: parseInt(data.categoria_id),
        data: dataFormatada,
        mes: mesFormatado,
        tipo: data.tipo,
        tipo_conta: data.tipo_conta || accountFilter,
        usuario_id: profile.id,
        conta_id: data.conta_id || null,
      };

      let error;

      if (transactionToEdit) {
        const { error: updateError } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', transactionToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('transacoes')
          .insert([transactionData]);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      // Disparar eventos para atualizar TODOS os hooks (React Query + legado)
      window.dispatchEvent(new CustomEvent('transactionsChanged'));
      window.dispatchEvent(new CustomEvent('accountsChanged'));

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`${t('validation.errorSaving')}: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit 
        ? (transactionToEdit.tipo === 'entrada' ? t('modal.editIncome') : t('modal.editExpense'))
        : (transactionToEdit?.tipo === 'entrada' ? t('modal.newIncome') : t('modal.newExpense'))
      }
      // I don't have these keys. I'll use hardcoded for now or add them.
      // Wait, I have 'modal.deleteTitle': 'Excluir Transação'.
      // I'll stick to dynamic based on type:
      // title={transactionToEdit ? t(tipo === 'entrada' ? 'modal.editIncome' : 'modal.editExpense') : t(tipo === 'entrada' ? 'modal.newIncome' : 'modal.newExpense')}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de Transação */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('form.type')} <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setValue('tipo', 'entrada');
                setValue('categoria_id', ''); // Reset categoria
              }}
              className={cn(
                "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                tipo === 'entrada'
                  ? "bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E]"
                  : "bg-[var(--bg-base)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              💰 {t('categories.modal.typeIncome')}
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('tipo', 'saida');
                setValue('categoria_id', ''); // Reset categoria
              }}
              className={cn(
                "px-4 py-3 rounded-lg text-sm font-medium transition-all border-2",
                tipo === 'saida'
                  ? "bg-red-500/10 border-red-500 text-red-500"
                  : "bg-[var(--bg-base)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              💸 {t('categories.modal.typeExpense')}
            </button>
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('form.description')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register("descricao")}
            placeholder={tipo === 'entrada' ? t('form.placeholderIncome') : t('form.placeholderExpense')}
            className="bg-[var(--bg-base)] border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] h-11"
          />
          {errors.descricao && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              {errors.descricao.message}
            </p>
          )}
        </div>

        {/* Valor e Data */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.value')} ({getCurrencySymbol()}) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: accentColor }}
              >
                {getCurrencySymbol()}
              </span>
              <input
                type="text"
                value={valorDisplay}
                onChange={handleValorChange}
                placeholder="0,00"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-colors font-mono text-lg"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                onFocus={(e) => e.target.style.borderColor = accentColor}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
            {errors.valor && (
              <p className="text-xs text-red-400">{errors.valor.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.date')} <span className="text-red-400">*</span>
            </label>
            <input
              {...register("data")}
              type="date"
              className="w-full h-11 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-medium)] text-[var(--text-primary)] transition-colors [color-scheme:dark]"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              onFocus={(e) => e.target.style.borderColor = accentColor}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            {errors.data && (
              <p className="text-xs text-red-400">{errors.data.message}</p>
            )}
          </div>
        </div>

        {/* Tipo de Perfil (Pessoal / PJ) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
            Perfil de Lançamento <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue("tipo_conta", "pessoal")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2",
                watch("tipo_conta") === "pessoal"
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : "border-[var(--border-medium)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              👤 Pessoal
            </button>
            <button
              type="button"
              onClick={() => setValue("tipo_conta", "pj")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2",
                watch("tipo_conta") === "pj"
                  ? "border-purple-500 bg-purple-500/10 text-purple-500"
                  : "border-[var(--border-medium)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              🏢 Empresarial
            </button>
          </div>
        </div>

        {/* Categoria */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              {t('form.category')} <span className="text-red-400">*</span>
            </label>
            {!showNewCategory && (
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="text-xs font-medium flex items-center gap-1 transition-colors"
                style={{ color: accentColor }}
                onMouseEnter={(e) => e.currentTarget.style.color = accentColorHover}
                onMouseLeave={(e) => e.currentTarget.style.color = accentColor}
              >
                <Plus className="w-3 h-3" />
                {t('form.newCategory')}
              </button>
            )}
          </div>

          {showNewCategory ? (
            <div className="space-y-3 p-4 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">{t('form.createCategory')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t('form.categoryName')}
                  className="bg-[var(--bg-card)] border-[var(--border-medium)] text-[var(--text-primary)] flex-1 h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCategory}
                  className="text-[var(--text-primary)] h-10 px-4"
                  style={{ backgroundColor: accentColor }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColorHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor}
                >
                  {creatingCategory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('common.create')
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <select
                {...register("categoria_id")}
                disabled={loadingCategories}
                className={cn(
                  "w-full h-11 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)]",
                  "focus:outline-none transition-colors",
                  "appearance-none cursor-pointer",
                  !selectedCategory && "text-[var(--text-tertiary)]"
                )}
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                onFocus={(e) => e.target.style.borderColor = accentColor}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <option value="" className="text-[var(--text-tertiary)]">
                  {loadingCategories ? t('common.loading') : t('form.selectCategory')}
                </option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="text-[var(--text-primary)] bg-[var(--bg-card)]">
                    {cat.descricao}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {errors.categoria_id && (
            <p className="text-xs text-red-400">{errors.categoria_id.message}</p>
          )}
        </div>

        {/* Conta Bancária */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)] flex items-center justify-between">
            {t('form.account')}
            <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {accountFilter === 'pessoal' ? t('sidebar.personal') : t('sidebar.pj')} {t('form.optional')}
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
              <Wallet className="w-4 h-4" />
            </div>
            <select
              {...register("conta_id")}
              disabled={loadingAccounts}
              className={cn(
                "w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)]",
                "focus:outline-none transition-colors",
                "appearance-none cursor-pointer",
                !selectedAccount && "text-[var(--text-tertiary)]"
              )}
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              onFocus={(e) => e.target.style.borderColor = accentColor}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <option value="" className="text-[var(--text-tertiary)]">
                {loadingAccounts ? t('common.loading') : t('form.noAccount')}
              </option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="text-[var(--text-primary)] bg-[var(--bg-card)]">
                  {acc.nome} {acc.saldo_atual !== undefined ? `(${getCurrencySymbol()} ${acc.saldo_atual.toLocaleString(locales[language], { minimumFractionDigits: 2 })})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] pl-1">
            {t(tipo === 'entrada' ? 'form.accountHintIncome' : 'form.accountHintExpense')}
          </p>
        </div>



        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 text-[var(--text-primary)] font-medium"
            style={{ backgroundColor: accentColor }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColorHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {transactionToEdit ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
