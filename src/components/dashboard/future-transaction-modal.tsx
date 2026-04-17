"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useCategoriesQuery } from "@/hooks/use-categories-query";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Repeat, CreditCard, Wallet, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths, addDays, addWeeks, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";

const futureTransactionSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.string().min(1, "Valor é obrigatório"),
  categoria_id: z.number().min(1, "Categoria é obrigatória"),
  data_prevista: z.string().min(1, "Data prevista é obrigatória"),
  pagador_recebedor: z.string().optional(),
  conta_id: z.string().optional(),
  cartao_id: z.string().optional(),
  tipo_conta: z.enum(['pessoal', 'pj']).optional(),
});

type FutureTransactionFormValues = z.infer<typeof futureTransactionSchema>;

interface FutureTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'entrada' | 'saida';
  transactionToEdit?: any;
  editType?: 'single' | 'future';
}

export function FutureTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  transactionToEdit,
  editType = 'single'
}: FutureTransactionModalProps) {
  const { t, language } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const { categories: allCategories } = useCategoriesQuery();
  const { accounts, loading: loadingAccounts } = useAccounts(accountFilter);
  const { cards, loading: loadingCards } = useCreditCards();
  
  // Filtrar categorias por tipo
  const categories = allCategories.filter(c => c.tipo === type);

  const [isRecurrent, setIsRecurrent] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [periodicidade, setPeriodicidade] = useState('mensal');
  const [dataFinal, setDataFinal] = useState('');
  const [numeroParcelas, setNumeroParcelas] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FutureTransactionFormValues>({
    resolver: zodResolver(futureTransactionSchema),
  });

  const selectedAccount = watch("conta_id");
  const accentColor = type === 'entrada' ? '#22C55E' : '#EF4444';
  const accentColorHover = type === 'entrada' ? '#16A34A' : '#DC2626';

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setValue('descricao', transactionToEdit.descricao);
        setValue('valor', String(transactionToEdit.valor));
        setValue('categoria_id', transactionToEdit.categoria_id);
        setValue('data_prevista', transactionToEdit.data_prevista);
        setValue('pagador_recebedor', transactionToEdit.pagador_recebedor || '');
        setValue('conta_id', transactionToEdit.conta_id || '');
        setValue('cartao_id', transactionToEdit.cartao_id || '');
        setValue('tipo_conta', transactionToEdit.tipo_conta || accountFilter);
        setIsRecurrent(Boolean(transactionToEdit.recorrente));
        setIsInstallment(String(transactionToEdit.parcelamento) === 'true');
        setPeriodicidade(transactionToEdit.periodicidade || 'mensal');
        setDataFinal(transactionToEdit.data_final || '');
        setNumeroParcelas(String(transactionToEdit.numero_parcelas || ''));
      } else {
        // Tentar encontrar uma conta padrão para pré-selecionar
        const defaultAccount = accounts.find(acc => acc.is_default);

        reset({
          descricao: '',
          valor: '',
          categoria_id: 0,
          data_prevista: format(new Date(), 'yyyy-MM-dd'),
          pagador_recebedor: '',
          conta_id: defaultAccount ? defaultAccount.id : "",
          cartao_id: "",
        });
        setIsRecurrent(false);
        setIsInstallment(false);
        setPeriodicidade('mensal');
        setDataFinal('');
        setNumeroParcelas('');
        setValue('tipo_conta', accountFilter);
      }
      setShowNewCategory(false);
      setNewCategoryName("");
    }
  }, [isOpen, transactionToEdit, reset, setValue, accounts]);

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
          tipo: type,
          tipo_conta: accountFilter,
        }])
        .select()
        .single();

      if (error) throw error;

      // Selecionar a nova categoria automaticamente
      setValue('categoria_id', data.id);
      setShowNewCategory(false);
      setNewCategoryName("");
      
      // Recarregar categorias
      window.dispatchEvent(new CustomEvent('categoriesChanged'));
    } catch (error) {
      alert(t('validation.errorCreatingCategory'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const generateRecurrentDates = (startDate: string, endDate: string, period: string) => {
    // ... (same as before)
    const dates = [];
    // Usar timezone local para evitar bug de conversão UTC
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    let currentDate = new Date(startYear, startMonth - 1, startDay);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const finalDate = new Date(endYear, endMonth - 1, endDay);

    while (currentDate <= finalDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      
      switch (period) {
        case 'diario':
          currentDate = addDays(currentDate, 1);
          break;
        case 'semanal':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'quinzenal':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'mensal':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'bimestral':
          currentDate = addMonths(currentDate, 2);
          break;
        case 'trimestral':
          currentDate = addMonths(currentDate, 3);
          break;
        case 'semestral':
          currentDate = addMonths(currentDate, 6);
          break;
        case 'anual':
          currentDate = addMonths(currentDate, 12);
          break;
        default:
          currentDate = addMonths(currentDate, 1);
      }
    }

    return dates;
  };

  const onSubmit = async (data: FutureTransactionFormValues) => {
    if (!profile) return;

    // Validação: Data Final é obrigatória quando for recorrente
    if (isRecurrent && !dataFinal) {
      alert('Por favor, preencha a data final para lançamentos recorrentes.');
      return;
    }

    // Validação: Número de parcelas é obrigatório quando for parcelado
    if (isInstallment && !numeroParcelas) {
      alert('Por favor, preencha o número de parcelas.');
      return;
    }

    try {
      const supabase = createClient();
      const baseData = {
        descricao: data.descricao,
        valor: parseFloat(data.valor),
        categoria_id: data.categoria_id,
        tipo: type,
        usuario_id: profile.id,
        dependente_id: profile.is_dependente ? profile.dependente_id : null, // Adicionar dependente_id
        pagador_recebedor: data.pagador_recebedor || null,
        tipo_conta: data.tipo_conta || accountFilter,
        status: 'pendente',
        conta_id: data.conta_id || null,
        cartao_id: data.cartao_id || null,
      };

      if (transactionToEdit) {
        // ... (Update logic needs to update conta_id too)
        // Editar lançamento existente
        const isParcelado = String(transactionToEdit.parcelamento) === 'true';
        const isRecorrente = transactionToEdit.recorrente;

        if (editType === 'single' || (!isParcelado && !isRecorrente)) {
          // Editar apenas este registro
          const { error } = await supabase
            .from('lancamentos_futuros')
            .update({
              ...baseData,
              data_prevista: data.data_prevista,
              mes_previsto: data.data_prevista.substring(0, 7), // YYYY-MM
            })
            .eq('id', transactionToEdit.id);

          if (error) throw error;
        } else {
          // Editar este e futuros relacionados (Recurring/Installments)
          if (isParcelado) {
            // ...
            const { data: relatedTransactions, error: fetchError } = await supabase
              .from('lancamentos_futuros')
              .select('id, descricao')
              .eq('usuario_id', profile.id)
              .eq('parcelamento', 'true')
              .eq('descricao', transactionToEdit.descricao) 
              .eq('numero_parcelas', transactionToEdit.numero_parcelas)
              .gte('parcela_atual', transactionToEdit.parcela_atual);

            if (fetchError) throw fetchError;

            if (relatedTransactions && relatedTransactions.length > 0) {
              // Usar timezone local para evitar bug de conversão UTC
              const [year, month, day] = data.data_prevista.split('-').map(Number);
              const dataNova = new Date(year, month - 1, day);
              
              for (let i = 0; i < relatedTransactions.length; i++) {
                const transaction = relatedTransactions[i];
                const parcelaAtual = transactionToEdit.parcela_atual + i;
                const mesesDiferenca = parcelaAtual - transactionToEdit.parcela_atual;
                const novaData = addMonths(dataNova, mesesDiferenca);
                
                const { error } = await supabase
                  .from('lancamentos_futuros')
                  .update({
                    descricao: data.descricao,
                    valor: parseFloat(data.valor),
                    categoria_id: data.categoria_id,
                    pagador_recebedor: data.pagador_recebedor || null,
                    data_prevista: format(novaData, 'yyyy-MM-dd'),
                    mes_previsto: format(novaData, 'yyyy-MM'),
                    conta_id: data.conta_id || null,
                    cartao_id: data.cartao_id || null,
                  })
                  .eq('id', transaction.id);

                if (error) throw error;
              }
            }
          } else if (isRecorrente) {
             // ...
            const { data: relatedTransactions, error: fetchError } = await supabase
              .from('lancamentos_futuros')
              .select('id, descricao, data_prevista')
              .eq('usuario_id', profile.id)
              .eq('recorrente', true)
              .eq('descricao', transactionToEdit.descricao) 
              .eq('periodicidade', transactionToEdit.periodicidade)
              .gte('data_prevista', transactionToEdit.data_prevista)
              .order('data_prevista');

            if (fetchError) throw fetchError;

            if (relatedTransactions && relatedTransactions.length > 0) {
              // Usar timezone local para evitar bug de conversão UTC
              const [year, month, day] = data.data_prevista.split('-').map(Number);
              const dataNova = new Date(year, month - 1, day);
              const periodicidade = transactionToEdit.periodicidade;
              
              for (let i = 0; i < relatedTransactions.length; i++) {
                const transaction = relatedTransactions[i];
                let novaData = dataNova;
                
                // ... (Recalculate date logic - kept same)
                switch (periodicidade) {
                  case 'diario': novaData = addDays(dataNova, i); break;
                  case 'semanal': novaData = addWeeks(dataNova, i); break;
                  case 'quinzenal': novaData = addWeeks(dataNova, i * 2); break;
                  case 'mensal': novaData = addMonths(dataNova, i); break;
                  case 'bimestral': novaData = addMonths(dataNova, i * 2); break;
                  case 'trimestral': novaData = addMonths(dataNova, i * 3); break;
                  case 'semestral': novaData = addMonths(dataNova, i * 6); break;
                  case 'anual': novaData = addMonths(dataNova, i * 12); break;
                  default: novaData = addMonths(dataNova, i);
                }
                
                const { error } = await supabase
                  .from('lancamentos_futuros')
                  .update({
                    descricao: data.descricao,
                    valor: parseFloat(data.valor),
                    categoria_id: data.categoria_id,
                    pagador_recebedor: data.pagador_recebedor || null,
                    data_prevista: format(novaData, 'yyyy-MM-dd'),
                    mes_previsto: format(novaData, 'yyyy-MM'),
                    conta_id: data.conta_id || null,
                    cartao_id: data.cartao_id || null,
                  })
                  .eq('id', transaction.id);

                if (error) throw error;
              }
            }
          }
        }
      } else {
        // ... (Insert logic uses baseData which has conta_id)
        if (isRecurrent && dataFinal) {
          const dates = generateRecurrentDates(data.data_prevista, dataFinal, periodicidade);
          const transactions = dates.map(date => ({
            ...baseData,
            data_prevista: date,
            mes_previsto: date.substring(0, 7), // YYYY-MM
            recorrente: true,
            periodicidade,
            data_final: dataFinal,
          }));
          const { error } = await supabase.from('lancamentos_futuros').insert(transactions);
          if (error) throw error;
        } else if (isInstallment && numeroParcelas) {
           // ...
          const parcelas = parseInt(numeroParcelas);
          const valorTotal = parseFloat(data.valor);
          const valorParcela = valorTotal / parcelas;
          const transactions = [];
          // Usar timezone local para evitar bug de conversão UTC
          const [year, month, day] = data.data_prevista.split('-').map(Number);
          const baseDate = new Date(year, month - 1, day);
          for (let i = 0; i < parcelas; i++) {
            const date = addMonths(baseDate, i);
            transactions.push({
              ...baseData,
              valor: valorParcela,
              data_prevista: format(date, 'yyyy-MM-dd'),
              mes_previsto: format(date, 'yyyy-MM'), // YYYY-MM
              parcelamento: 'true',
              numero_parcelas: parcelas,
              parcela_atual: i + 1,
              parcela_info: {
                numero: i + 1,
                total: parcelas,
                valor_original: valorTotal
              }
            });
          }
          const { error } = await supabase.from('lancamentos_futuros').insert(transactions);
          if (error) throw error;
        } else {
          // ...
          const { error } = await supabase
            .from('lancamentos_futuros')
            .insert([{
              ...baseData,
              data_prevista: data.data_prevista,
              mes_previsto: data.data_prevista.substring(0, 7), // YYYY-MM
              recorrente: false,
              parcelamento: 'false',
            }]);
          if (error) throw error;
        }
      }

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
      title={transactionToEdit ? t('future.editFutureTransaction') : t('future.newFutureTransaction')}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
        {/* ... (Header Badges - kept same) */}
        <div className="flex justify-center gap-2">
          <span className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold",
            type === 'entrada'
              ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30"
              : "bg-red-500/10 text-red-500 border border-red-500/30"
          )}>
            {type === 'entrada' ? `💰 ${t('future.toReceive')}` : `💸 ${t('future.toPay')}`}
          </span>
          
          {accountFilter === 'pj' ? (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              💼 PJ
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">
              👤 {t('future.personal')}
            </span>
          )}
        </div>

        {/* Tipo de Perfil (Pessoal / PJ) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
            Perfil de Lançamento <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue("tipo_conta", "pessoal")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg border transition-all text-xs font-medium flex items-center justify-center gap-2",
                watch("tipo_conta") === "pessoal"
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              👤 Pessoal
            </button>
            <button
              type="button"
              onClick={() => setValue("tipo_conta", "pj")}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg border transition-all text-xs font-medium flex items-center justify-center gap-2",
                watch("tipo_conta") === "pj"
                  ? "border-purple-500 bg-purple-500/10 text-purple-500"
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              🏢 Empresarial
            </button>
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t('future.description')} <span className="text-red-400">*</span>
            </label>
            <Input
              {...register("descricao")}
              placeholder="Ex: IPTU, Salário, Energia..."
              className="mt-1 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] h-9 text-sm"
            />
            {errors.descricao && (
              <p className="text-xs text-red-400 mt-0.5">{errors.descricao.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t('future.value')} <span className="text-red-400">*</span>
            </label>
            <Input
              {...register("valor")}
              type="number"
              step="0.01"
              placeholder="Ex: 1.500,00"
              className="mt-1 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] h-9 text-sm"
            />
            {errors.valor && (
              <p className="text-xs text-red-400 mt-0.5">{errors.valor.message}</p>
            )}
          </div>
        </div>

        {/* Conta Bancária */}
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between items-center">
            {t('future.bankAccount')}
            <span className="text-[10px] text-[var(--text-tertiary)]">{accountFilter === 'pessoal' ? t('future.personal') : t('future.business')}</span>
          </label>
          <div className="relative mt-1">
             <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <select
              {...register("conta_id")}
              disabled={loadingAccounts}
              className="w-full h-9 pl-8 pr-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none appearance-none"
            >
              <option value="">{t('future.noAccountLinked')}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nome} {acc.saldo_atual !== undefined ? `(${getCurrencySymbol()} ${acc.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cartão de Crédito */}
        {type === 'saida' && (
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between items-center">
              Cartão de Crédito
              <span className="text-[10px] text-[var(--text-tertiary)]">Opcional</span>
            </label>
            <div className="relative mt-1">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <select
                {...register("cartao_id")}
                disabled={loadingCards}
                className="w-full h-9 pl-8 pr-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none appearance-none"
              >
                <option value="">Sem cartão vinculado</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.nome} {card.ultimos_digitos ? `(****${card.ultimos_digitos})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Classificação */}
        <div className="space-y-3">
          {/* Categoria */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
              <span>{t('future.category')} <span className="text-red-400">*</span></span>
              {!showNewCategory && (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-xs flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                  style={{ color: accentColor }}
                >
                  <Plus className="w-3 h-3" />
                  {t('categories.newCategory')}
                </button>
              )}
            </label>
            
            {showNewCategory ? (
              <div className="mt-1 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={type === 'entrada' ? 'Ex: Salário, Freelance...' : 'Ex: Alimentação, Transporte...'}
                  className="flex-1 h-9 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    } else if (e.key === 'Escape') {
                      setShowNewCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="flex-1 sm:flex-none h-9 px-4 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ 
                      backgroundColor: accentColor,
                      opacity: (creatingCategory || !newCategoryName.trim()) ? 0.5 : 1
                    }}
                  >
                    {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName("");
                    }}
                    className="h-9 px-3 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <select
                {...register("categoria_id", { valueAsNumber: true })}
                className="mt-1 w-full h-9 px-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none"
              >
                <option value={0}>{t('future.select')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.descricao}
                  </option>
                ))}
              </select>
            )}
            {errors.categoria_id && (
              <p className="text-xs text-red-400 mt-0.5">{errors.categoria_id.message}</p>
            )}
          </div>

          {/* Recebedor/Pagador */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {type === 'entrada' ? t('future.payer') : t('future.receiver')}
            </label>
            <Input
              {...register("pagador_recebedor")}
              placeholder={t('future.optional')}
              className="mt-1 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] h-9 text-sm"
            />
          </div>
        </div>

        {/* Agendamento and Options (Recurrent/Installments) - kept same */}
        {/* ... */}
        
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            📅 {t('future.dueDate')} <span className="text-red-400">*</span>
          </label>
          <input
            {...register("data_prevista")}
            type="date"
            className="mt-1 w-full h-9 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none"
          />
          {errors.data_prevista && (
            <p className="text-xs text-red-400 mt-0.5">{errors.data_prevista.message}</p>
          )}
        </div>

        {!transactionToEdit && (
          <div className="space-y-2">
            {/* Recorrente and Parcelado sections - kept same */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2 bg-[var(--bg-card-inner)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border-medium)]">
                <div className="flex items-center gap-2">
                  <Repeat className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{t('future.recurring')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurrent}
                  onChange={(e) => {
                    setIsRecurrent(e.target.checked);
                    if (e.target.checked) setIsInstallment(false);
                  }}
                  className="w-4 h-4"
                />
              </label>

              {isRecurrent && (
                <div className="pl-6 space-y-1.5">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">{t('common.frequency')}</label>
                    <select
                      value={periodicidade}
                      onChange={(e) => setPeriodicidade(e.target.value)}
                      className="mt-1 w-full h-8 px-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-xs"
                    >
                      <option value="diario">{t('common.daily')}</option>
                      <option value="semanal">{t('common.weekly')}</option>
                      <option value="quinzenal">{t('common.biweekly')}</option>
                      <option value="mensal">{t('common.monthly')}</option>
                      <option value="bimestral">{t('common.bimonthly')}</option>
                      <option value="trimestral">{t('common.quarterly')}</option>
                      <option value="semestral">{t('common.semiannual')}</option>
                      <option value="anual">{t('common.annual')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      {t('common.until')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={dataFinal}
                      onChange={(e) => setDataFinal(e.target.value)}
                      className="mt-1 w-full h-8 px-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2 bg-[var(--bg-card-inner)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border-medium)]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">{t('future.installment')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => {
                    setIsInstallment(e.target.checked);
                    if (e.target.checked) setIsRecurrent(false);
                  }}
                  className="w-4 h-4"
                />
              </label>

              {isInstallment && (
                <div className="pl-6">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    {t('common.installments')} <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="number"
                    min="2"
                    max="120"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    placeholder="Ex: 12"
                    className="mt-1 bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer - kept same */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {t('future.cancel')}
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
            {transactionToEdit ? t('future.saveChanges') : t('future.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
