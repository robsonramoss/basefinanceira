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
import { useCreditCards } from "@/hooks/use-credit-cards";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { CreditCardSuccessModal } from "./credit-card-success-modal";
import { InvoicePaidWarningModal } from "./invoice-paid-warning-modal";

const locales = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES'
};

const transactionSchemaBase = z.object({
  descricao: z.string(),
  valor: z.string(),
  categoria_id: z.string(),
  data: z.string(),
  conta_id: z.string().optional(),
  forma_pagamento: z.enum(['dinheiro', 'debito', 'credito']).optional(),
  cartao_id: z.string().optional(),
  parcelas: z.string().optional(),
  tipo_conta: z.enum(['pessoal', 'pj']).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchemaBase>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'receita' | 'despesa';
  transactionToEdit?: any;
  preSelectedCardId?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  transactionToEdit,
  preSelectedCardId
}: TransactionModalProps) {
  const { t, language } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const { categories: allCategories, loading: loadingCategories } = useCategoriesQuery();
  const { accounts, loading: loadingAccounts } = useAccounts(accountFilter);
  const { cards } = useCreditCards();

  const transactionSchema = useMemo(() => z.object({
    descricao: z.string().min(1, t('validation.descriptionRequired')),
    valor: z.string().min(1, t('validation.valueRequired')),
    categoria_id: z.string().min(1, t('validation.categoryRequired')),
    data: z.string().min(1, t('validation.dateRequired')),
    conta_id: z.string().optional(),
    forma_pagamento: z.enum(['dinheiro', 'debito', 'credito']).optional(),
    cartao_id: z.string().optional(),
    parcelas: z.string().optional(),
    tipo_conta: z.enum(['pessoal', 'pj']).optional(),
  }), [t]);
  const tipoFiltro = type === 'receita' ? 'entrada' : 'saida';
  const categories = allCategories.filter(c => c.tipo === tipoFiltro || c.tipo === 'ambos');

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [valorDisplay, setValorDisplay] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'debito' | 'credito'>('dinheiro');
  const [parcelado, setParcelado] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isInvoicePaidWarningOpen, setIsInvoicePaidWarningOpen] = useState(false);
  const [invoicePaidMonth, setInvoicePaidMonth] = useState("");
  const [installmentData, setInstallmentData] = useState<{
    description: string;
    totalValue: number;
    installments: number;
    installmentValue: number;
    cardName: string;
    firstDueDate: Date;
  } | null>(null);

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
      forma_pagamento: 'dinheiro',
      cartao_id: "",
      parcelas: "1",
      tipo_conta: accountFilter,
    },
  });

  const selectedCategory = watch("categoria_id");
  const selectedAccount = watch("conta_id");

  // Definir cor baseada no tipo (receita = verde, despesa = vermelho)
  const accentColor = type === 'receita' ? '#22C55E' : '#EF4444';
  const accentColorHover = type === 'receita' ? '#16A34A' : '#DC2626';

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo exceto números
    const numbers = e.target.value.replace(/\D/g, '');

    if (!numbers) {
      setValorDisplay('');
      setValue('valor', '');
      return;
    }

    // Converte para número e divide por 100 (centavos)
    const amount = parseFloat(numbers) / 100;

    // Formata como moeda baseada no idioma
    const formatted = amount.toLocaleString(locales[language], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setValorDisplay(formatted);
    // Salva o valor numérico puro no form como string "1234.56"
    setValue('valor', amount.toString());
  };

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setValue('descricao', transactionToEdit.descricao);
        const valorFormatado = parseFloat(transactionToEdit.valor).toLocaleString(locales[language], {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setValorDisplay(valorFormatado);
        setValue('valor', String(transactionToEdit.valor));
        setValue('categoria_id', String(transactionToEdit.categoria_id));
        // Extrair apenas a parte da data (YYYY-MM-DD) ignorando timezone
        const dataStr = transactionToEdit.data.split('T')[0];
        setValue('data', dataStr);
        setValue('conta_id', transactionToEdit.conta_id || "");
        setValue('tipo_conta', transactionToEdit.tipo_conta || accountFilter);
      } else {
        // Tentar encontrar uma conta padrão para pré-selecionar
        const defaultAccount = accounts.find(acc => acc.is_default);

        reset({
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
          conta_id: defaultAccount ? defaultAccount.id : "",
          tipo_conta: accountFilter,
        });
        setValorDisplay("");

        // Se preSelectedCardId for fornecido, pré-selecionar cartão de crédito
        if (preSelectedCardId && type === 'despesa') {
          setFormaPagamento('credito');
          setValue('forma_pagamento', 'credito');
          setValue('cartao_id', preSelectedCardId);
          setParcelado(false);
          setValue('parcelas', '1');
        }
      }
      setShowNewCategory(false);
      setNewCategoryName("");
    }
  }, [isOpen, transactionToEdit, reset, setValue, accounts, language, locales, preSelectedCardId, type]);

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
          tipo: type === 'receita' ? 'entrada' : 'saida',
          tipo_conta: accountFilter,
        }])
        .select()
        .single();

      if (error) throw error;

      // Selecionar a nova categoria automaticamente
      setValue('categoria_id', String(data.id));
      setShowNewCategory(false);
      setNewCategoryName("");

      // Recarregar categorias sem fechar o modal
      // Disparar evento para forçar refresh do hook useCategories
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
      // data.valor já deve estar em formato numérico string "1234.56" devido ao novo handler
      // Mas se veio do edit sem alteração, já é string numérica também.
      // Se tiver problemas, garantir parseFloat
      const valor = parseFloat(data.valor);

      // Se for cartão de crédito, criar lançamentos futuros
      if (formaPagamento === 'credito' && data.cartao_id && type === 'despesa') {
        const numeroParcelas = parseInt(data.parcelas || '1');
        const valorParcela = valor / numeroParcelas;

        // Buscar informações do cartão para calcular fatura correta
        const cartaoSelecionado = cards.find(c => c.id === data.cartao_id);
        if (!cartaoSelecionado) {
          alert(t('validation.cardNotFound'));
          return;
        }

        // 🔒 VALIDAÇÃO: Verificar se a fatura do mês já foi paga
        const [anoCompra, mesCompra, diaCompraValidacao] = data.data.split('-').map(Number);
        const dataCompraValidacao = new Date(anoCompra, mesCompra - 1, diaCompraValidacao);
        const diaCompraNum = dataCompraValidacao.getDate();

        // Determinar em qual mês a primeira parcela cairá
        let mesPrimeiraParcela = mesCompra;
        let anoPrimeiraParcela = anoCompra;

        if (diaCompraNum >= cartaoSelecionado.dia_fechamento) {
          // Compra depois do fechamento → próximo mês
          mesPrimeiraParcela++;
          if (mesPrimeiraParcela > 12) {
            mesPrimeiraParcela = 1;
            anoPrimeiraParcela++;
          }
        }

        const mesPrimeiraParcelaStr = `${anoPrimeiraParcela}-${String(mesPrimeiraParcela).padStart(2, '0')}`;

        // Verificar se há lançamentos pagos nesse mês
        const { data: lancamentosPagos, error: checkError } = await supabase
          .from('lancamentos_futuros')
          .select('id')
          .eq('cartao_id', data.cartao_id)
          .eq('mes_previsto', mesPrimeiraParcelaStr)
          .eq('status', 'pago')
          .limit(1);

        if (checkError) throw checkError;

        if (lancamentosPagos && lancamentosPagos.length > 0) {
          setInvoicePaidMonth(mesPrimeiraParcelaStr);
          setIsInvoicePaidWarningOpen(true);
          return;
        }

        // Criar lançamentos futuros (parcelas)
        const lancamentos = [];

        // Calcular a data da primeira parcela considerando o fechamento
        // IMPORTANTE: Usar timezone local para evitar bug de conversão UTC
        const [ano, mes, dia] = data.data.split('-').map(Number);
        const diaCompra = dia;

        // Calcular mês/ano da primeira parcela
        let mesFatura = mes; // mes já é 1-indexed (1=jan, 2=fev...)
        let anoFatura = ano;

        // Se comprou no dia ou depois do fechamento, primeira parcela vai para próximo mês
        if (diaCompra >= cartaoSelecionado.dia_fechamento) {
          mesFatura++;
          if (mesFatura > 12) {
            mesFatura = 1;
            anoFatura++;
          }
        }

        // Criar data da primeira parcela usando dia de vencimento diretamente
        // (evita bug de overflow quando dia da compra > dias do mês seguinte, ex: 29 jan → fev)
        const dataPrimeiraParcela = new Date(anoFatura, mesFatura - 1, cartaoSelecionado.dia_vencimento);

        // Criar cada parcela a partir da primeira
        for (let i = 0; i < numeroParcelas; i++) {
          const dataFatura = new Date(dataPrimeiraParcela);
          dataFatura.setMonth(dataPrimeiraParcela.getMonth() + i);

          const ano = dataFatura.getFullYear();
          const mes = String(dataFatura.getMonth() + 1).padStart(2, '0');
          const dia = String(dataFatura.getDate()).padStart(2, '0');

          lancamentos.push({
            usuario_id: profile.id,
            dependente_id: profile.is_dependente ? profile.dependente_id : null, // Adicionar dependente_id
            tipo: 'saida',
            valor: valorParcela,
            descricao: numeroParcelas > 1
              ? `${data.descricao} (${i + 1}/${numeroParcelas})`
              : data.descricao,
            categoria_id: parseInt(data.categoria_id),
            data_prevista: `${ano}-${mes}-${dia}`,
            mes_previsto: `${ano}-${mes}`,
            status: 'pendente',
            cartao_id: data.cartao_id,
            parcela_info: {
              numero: i + 1,
              total: numeroParcelas,
              valor_original: valor,
            },
            tipo_conta: data.tipo_conta || accountFilter,
          });
        }

        const { error } = await supabase
          .from('lancamentos_futuros')
          .insert(lancamentos);

        if (error) throw error;

        // Disparar evento de atualização de lançamentos futuros
        window.dispatchEvent(new CustomEvent('futureTransactionsChanged'));

        // Preparar dados para o modal de sucesso
        setInstallmentData({
          description: data.descricao,
          totalValue: valor,
          installments: numeroParcelas,
          installmentValue: valorParcela,
          cardName: cartaoSelecionado.nome,
          firstDueDate: dataPrimeiraParcela
        });

        // Mostrar modal de sucesso
        setIsSuccessModalOpen(true);
      } else {
        // Transação normal (dinheiro ou débito)
        const mesFormatado = data.data.substring(0, 7);
        const dataFormatada = `${data.data}T00:00:00`;

        const transactionData = {
          descricao: data.descricao,
          valor,
          categoria_id: parseInt(data.categoria_id),
          data: dataFormatada,
          mes: mesFormatado,
          tipo: type === 'receita' ? 'entrada' : 'saida',
          tipo_conta: data.tipo_conta || accountFilter,
          usuario_id: profile.id,
          dependente_id: profile.is_dependente ? profile.dependente_id : null,
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

        if (error) throw error;
      }

      // Disparar eventos de atualização localmente para atualizar a UI instantaneamente
      window.dispatchEvent(new CustomEvent('creditCardsChanged'));
      window.dispatchEvent(new CustomEvent('transactionsChanged'));
      window.dispatchEvent(new CustomEvent('futureTransactionsChanged'));
      window.dispatchEvent(new CustomEvent('accountsChanged'));

      // Se não for cartão de crédito, fechar modal normalmente
      if (formaPagamento !== 'credito') {
        onSuccess();
        onClose();
      }
      // Se for cartão, o modal de sucesso já foi aberto e vai chamar onSuccess/onClose
    } catch (error: any) {
      alert(`${t('validation.errorSaving')}: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? t(type === 'receita' ? 'modal.editIncome' : 'modal.editExpense') : t(type === 'receita' ? 'modal.newIncome' : 'modal.newExpense')}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Descrição */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('form.description')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register("descricao")}
            placeholder={t(type === 'receita' ? 'form.placeholderIncome' : 'form.placeholderExpense')}
            className="bg-[var(--bg-card-inner)] border-[var(--input-border)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] h-11"
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
              {t('form.value')} <span className="text-red-400">*</span>
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
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none transition-colors font-mono text-lg"
                style={{
                  borderColor: 'var(--input-border)',
                  '--focus-color': accentColor
                } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = accentColor}
                onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
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
              className="w-full h-11 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] transition-colors"
              onFocus={(e) => e.target.style.borderColor = accentColor}
              onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
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
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
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
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
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
          <div className="space-y-3 p-4 bg-[var(--bg-card-inner)] border border-[var(--border-medium)] rounded-lg">
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
                className="bg-[var(--bg-card)] border-[var(--input-border)] text-[var(--input-text)] flex-1 h-10"
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
                className="text-white h-10 px-4"
                style={{
                  backgroundColor: accentColor,
                }}
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
                "w-full h-11 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--input-text)]",
                "focus:outline-none transition-colors",
                "appearance-none cursor-pointer",
                !selectedCategory && "text-[var(--input-placeholder)]"
              )}
              style={{ borderColor: 'var(--border-medium)' }}
              onFocus={(e) => e.target.style.borderColor = accentColor}
              onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
            >
              <option value="" className="text-[var(--input-placeholder)]">
                {loadingCategories ? t('common.loading') : t('form.selectCategory')}
              </option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="text-[var(--input-text)] bg-[var(--bg-card)]">
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
          <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full">
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
              "w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--input-text)]",
              "focus:outline-none transition-colors",
              "appearance-none cursor-pointer",
              !selectedAccount && "text-[var(--input-placeholder)]"
            )}
            onFocus={(e) => e.target.style.borderColor = accentColor}
            onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
          >
            <option value="" className="text-[var(--input-placeholder)]">
              {loadingAccounts ? t('common.loading') : t('form.noAccount')}
            </option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id} className="text-[var(--input-text)] bg-[var(--bg-card)]">
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
          {t(type === 'receita' ? 'form.accountHintIncome' : 'form.accountHintExpense')}
        </p>
      </div>

      {/* Forma de Pagamento (só para despesas) */}
      {type === 'despesa' && !transactionToEdit && (
        <div className="space-y-4 p-4 bg-[var(--bg-card-inner)] border border-[var(--border-medium)] rounded-lg">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            {t('form.paymentMethod')}
          </label>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormaPagamento('dinheiro');
                setValue('forma_pagamento', 'dinheiro');
              }}
              className={cn(
                "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                formaPagamento === 'dinheiro'
                  ? "border-[var(--border-strong)] bg-[var(--bg-strong)]/10 text-[var(--text-strong)]"
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              💵 {t('form.money')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormaPagamento('debito');
                setValue('forma_pagamento', 'debito');
              }}
              className={cn(
                "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                formaPagamento === 'debito'
                  ? "border-[var(--border-strong)] bg-[var(--bg-strong)]/10 text-[var(--text-strong)]"
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              🏦 {t('form.debit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormaPagamento('credito');
                setValue('forma_pagamento', 'credito');
              }}
              className={cn(
                "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                formaPagamento === 'credito'
                  ? "border-[var(--border-strong)] bg-[var(--bg-strong)]/10 text-[var(--text-strong)]"
                  : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              )}
            >
              💳 {t('form.credit')}
            </button>
          </div>

          {/* Se for cartão de crédito */}
          {formaPagamento === 'credito' && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-default)]">
              {/* Seleção de Cartão */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  {t('form.creditCard')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <select
                    {...register("cartao_id")}
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--input-text)] focus:outline-none focus:border-[var(--border-strong)] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">{t('form.selectCard')}</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id} className="text-[var(--input-text)] bg-[var(--bg-card)]">
                        {card.nome} - Limite: {getCurrencySymbol()} {card.limite_total.toLocaleString(locales[language], { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Parcelamento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  {t('form.installments')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParcelado(false);
                      setValue('parcelas', '1');
                    }}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium",
                      !parcelado
                        ? "border-[var(--border-strong)] bg-[var(--bg-strong)]/10 text-[var(--text-strong)]"
                        : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    )}
                  >
                    {t('form.cash')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setParcelado(true)}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium",
                      parcelado
                        ? "border-[var(--border-strong)] bg-[var(--bg-strong)]/10 text-[var(--text-strong)]"
                        : "border-[var(--border-medium)] bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    )}
                  >
                    {t('form.installment')}
                  </button>
                </div>
              </div>

              {/* Número de Parcelas */}
              {parcelado && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    {t('form.installmentsCount')}
                  </label>
                  <select
                    {...register("parcelas")}
                    className="w-full h-11 px-4 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--input-text)] focus:outline-none focus:border-[var(--border-strong)] transition-colors appearance-none cursor-pointer"
                  >
                    {[...Array(12)].map((_, i) => {
                      const parcela = i + 1;
                      const valorParcela = valorDisplay ?
                        (parseFloat(valorDisplay.replace(/\./g, '').replace(',', '.')) / parcela).toLocaleString(locales[language], { minimumFractionDigits: 2 })
                        : '0,00';
                      return (
                        <option key={parcela} value={parcela} className="text-[var(--input-text)] bg-[var(--bg-card)]">
                          {parcela}x de {getCurrencySymbol()} {valorParcela}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <p className="text-xs text-[var(--text-tertiary)]">
                💡 {t('form.installmentHint')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
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
          {transactionToEdit ? t('common.save') : t('common.add')}
        </Button>
      </div>
      </form>

      {/* Success Modal for Credit Card Transactions */}
      <CreditCardSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setInstallmentData(null);
          onSuccess();
          onClose();
        }}
        installmentData={installmentData}
      />

      {/* Warning Modal for Paid Invoice */}
      <InvoicePaidWarningModal
        isOpen={isInvoicePaidWarningOpen}
        onClose={() => setIsInvoicePaidWarningOpen(false)}
        invoiceMonth={invoicePaidMonth}
      />
    </Modal>
  );
}
