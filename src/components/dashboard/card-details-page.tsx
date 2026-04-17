"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, CreditCard as CreditCardIcon, Calendar, DollarSign, ChevronLeft, ChevronRight, Pencil, Trash2, Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCardInvoice } from "@/hooks/use-card-invoice";
import { PayInvoiceModal } from "./pay-invoice-modal";
import { ReversePaymentModal } from "./reverse-payment-modal";
import { TransactionModal } from "./transaction-modal";
import { FutureTransactionModal } from "./future-transaction-modal";
import { DeleteFutureConfirmationModal } from "./delete-future-confirmation-modal";
import { OFXReconciliationModal } from "./ofx-reconciliation-modal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { useBranding } from "@/contexts/branding-context";
import type { CreditCard } from "@/hooks/use-credit-cards";
import { parseParcelaInfo } from "@/lib/parcela-parser";

interface CardDetailsPageProps {
  cardId: string;
}

export function CardDetailsPage({ cardId }: CardDetailsPageProps) {
  const { t, language } = useLanguage();
  const { formatCurrency: formatCurrencyFromContext } = useCurrency();
  const { settings: brandingSettings } = useBranding();
  const router = useRouter();
  const [card, setCard] = useState<CreditCard | null>(null);
  const [loading, setLoading] = useState(true);

  // Detectar se a cor do cartão é clara (branco, prata, amarelo claro, etc)
  const isLightColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180;
  };

  const useDarkText = card ? isLightColor(card.cor_cartao || '#6366f1') : false;
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOFXModalOpen, setIsOFXModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Controle de mês selecionado
  const getCurrentMonth = () => {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const hasAutoAdvanced = useRef(false);
  const [isCheckingAutoAdvance, setIsCheckingAutoAdvance] = useState(true);

  // Controle de pagamento parcial (NOVO - não afeta funcionalidade existente)
  const [paymentMode, setPaymentMode] = useState<'total' | 'partial'>('total');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const { invoice, loading: invoiceLoading, refetch: refetchInvoice } = useCardInvoice(cardId, selectedMonth);

  // Se a fatura do mês atual já está paga, avançar para o próximo mês automaticamente
  useEffect(() => {
    if (hasAutoAdvanced.current) {
      setIsCheckingAutoAdvance(false);
      return;
    }
    if (invoiceLoading || !invoice) return;
    if (selectedMonth !== getCurrentMonth()) {
      setIsCheckingAutoAdvance(false);
      return;
    }

    if (invoice.isPaid) {
      hasAutoAdvanced.current = true;
      const [year, month] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(year, month, 1);
      const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(nextMonth);
    } else {
      setIsCheckingAutoAdvance(false);
    }
  }, [invoice, invoiceLoading, selectedMonth]);

  useEffect(() => {
    if (!cardId) {
      router.push('/dashboard/cartoes');
      return;
    }

    const fetchCard = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) {
        router.push('/dashboard/cartoes');
        return;
      }

      setCard(data);
      setLoading(false);
    };

    fetchCard();
  }, [cardId, router]);

  const formatCurrency = formatCurrencyFromContext;

  const formatDate = (dateString: string) => {
    // Usar timezone local para evitar bug de conversão UTC
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 2, 1); // -2 porque month é 1-indexed
    const ano = newDate.getFullYear();
    const mes = String(newDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${ano}-${mes}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month, 1); // month já avança 1
    const ano = newDate.getFullYear();
    const mes = String(newDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${ano}-${mes}`);
  };

  const isCurrentMonth = () => {
    return selectedMonth === getCurrentMonth();
  };

  // Funções para pagamento parcial (NOVO)
  const handleToggleItemSelection = (itemId: number) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (!invoice) return;
    const pendingIds = invoice.items
      .filter(item => item.status === 'pendente')
      .map(item => item.id);
    setSelectedItemIds(pendingIds);
  };

  const handleDeselectAll = () => {
    setSelectedItemIds([]);
  };

  const calculateSelectedTotal = () => {
    if (!invoice) return 0;
    return invoice.items
      .filter(item => selectedItemIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.valor), 0);
  };

  // Resetar seleção ao trocar de modo ou mês
  useEffect(() => {
    setSelectedItemIds([]);
  }, [paymentMode, selectedMonth]);

  const handleExportInvoice = async () => {
    if (!invoice || !card) return;

    // Importação dinâmica do jsPDF
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();

    // Cores
    const primaryColor: [number, number, number] = [34, 197, 94];
    const darkBg: [number, number, number] = [17, 24, 39];
    const textColor: [number, number, number] = [255, 255, 255];

    // Cabeçalho
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 50, 'F');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FATURA DO CARTÃO', 105, 20, { align: 'center' });

    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.text(card.nome, 105, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(getMonthName(selectedMonth).toUpperCase(), 105, 40, { align: 'center' });

    // Informações da fatura
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let yPos = 60;

    doc.setFont('helvetica', 'bold');
    doc.text('Fechamento:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dia ${card.dia_fechamento}`, 60, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('Vencimento:', 110, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dia ${card.dia_vencimento}`, 150, yPos);

    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total da Fatura:', 20, yPos);
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.text(formatCurrency(invoice.total), 70, yPos);

    // Tabela de itens - manual
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Cabeçalho da tabela
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos - 5, 170, 8, 'F');
    doc.setTextColor(...textColor);
    doc.text('Data', 25, yPos);
    doc.text('Descrição', 50, yPos);
    doc.text('Parcela', 120, yPos);
    doc.text('Valor', 145, yPos);
    doc.text('Status', 170, yPos);

    // Itens
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    invoice.items.forEach((item, index) => {
      // Alternar cor de fundo
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos - 4, 170, 7, 'F');
      }

      doc.text(formatDate(item.data_prevista), 25, yPos);

      // Truncar descrição se muito longa
      const desc = item.descricao.length > 25 ? item.descricao.substring(0, 22) + '...' : item.descricao;
      doc.text(desc, 50, yPos);

      const parcelaInfo = parseParcelaInfo(item.parcela_info);
      const parcela = parcelaInfo ? `${parcelaInfo.numero}/${parcelaInfo.total}` : '-';
      doc.text(parcela, 120, yPos);

      doc.text(formatCurrency(Number(item.valor)), 145, yPos);
      doc.text(item.status === 'pago' ? 'Pago' : 'Pendente', 170, yPos);

      yPos += 7;

      // Nova página se necessário
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Rodapé com resumo
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 25, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Resumo:', 25, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total de itens: ${invoice.items.length}`, 25, yPos + 15);
    doc.text(`Itens pagos: ${invoice.items.filter(i => i.status === 'pago').length}`, 25, yPos + 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 130, yPos + 15);
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.text(formatCurrency(invoice.total), 185, yPos + 15, { align: 'right' });

    // Salvar PDF
    const fileName = `fatura_${card.nome.replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
    doc.save(fileName);
  };

  const isInvoiceClosed = () => {
    if (!card) return false;

    const today = new Date();
    const currentDay = today.getDate();
    const [year, month] = selectedMonth.split('-').map(Number);
    const invoiceDate = new Date(year, month - 1, 1);
    const currentYearMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Se for mês futuro, fatura ainda não fechou
    if (invoiceDate > currentYearMonth) {
      return false;
    }

    // Se for mês atual, verifica se já passou o dia de fechamento (>= para incluir o próprio dia)
    if (invoiceDate.getTime() === currentYearMonth.getTime()) {
      return currentDay >= card.dia_fechamento;
    }

    // Se for mês passado, já fechou
    return true;
  };

  const isCurrentOpenInvoice = () => {
    if (!card) return false;

    const today = new Date();
    const currentDay = today.getDate();
    let mesAtual = today.getMonth() + 1;
    let anoAtual = today.getFullYear();

    // Se já passou do fechamento, o ciclo aberto é para o próximo mês
    if (currentDay >= card.dia_fechamento) {
      mesAtual++;
      if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
      }
    }

    const mesCicloAberto = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
    return selectedMonth === mesCicloAberto;
  };

  if (loading || !card || isCheckingAutoAdvance) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  const limiteUsadoPercent = invoice ? (invoice.limite_usado / card.limite_total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/cartoes')}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{card.nome}</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {card.bandeira} {card.ultimos_digitos && `•••• ${card.ultimos_digitos}`}
          </p>
        </div>
      </div>

      {/* Card Visual + Limite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Visual */}
        <div
          className="h-56 rounded-xl p-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${card.cor_cartao} 0%, ${card.cor_cartao}dd 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium mb-2",
                  useDarkText ? "text-gray-700/80" : "text-white/80"
                )}>{card.bandeira}</p>
                <p className={cn(
                  "text-2xl font-bold",
                  useDarkText ? "text-gray-900" : "text-white"
                )}>{card.nome}</p>
              </div>
              <CreditCardIcon className={cn(
                "w-10 h-10",
                useDarkText ? "text-gray-700/40" : "text-white/40"
              )} />
            </div>
            <div>
              {card.ultimos_digitos && (
                <p className={cn(
                  "text-lg font-mono",
                  useDarkText ? "text-gray-900" : "text-white"
                )}>
                  •••• •••• •••• {card.ultimos_digitos}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Limite Info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('cardDetails.limit')}</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{t('cardDetails.limitUsed')}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {limiteUsadoPercent.toFixed(1)}%
              </span>
            </div>

            <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  limiteUsadoPercent > 80 ? "bg-red-500" :
                    limiteUsadoPercent > 50 ? "bg-yellow-500" :
                      "bg-green-500"
                )}
                style={{ width: `${Math.min(limiteUsadoPercent, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cardDetails.limitUsed')}</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(invoice?.limite_usado || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cardDetails.limitAvailable')}</p>
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(invoice?.limite_disponivel || card.limite_total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cardDetails.limitTotal')}</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatCurrency(card.limite_total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fatura Atual */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          {/* Navegação de Mês */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                title={t('cardDetails.previousMonth')}
              >
                <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>

              <div className="text-center min-w-[200px]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] capitalize">
                  {t('cardDetails.invoice')} {getMonthName(selectedMonth)}
                </h2>
                {isCurrentMonth() && (
                  <span className="inline-block px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full mt-1">
                    {t('cardDetails.currentMonth')}
                  </span>
                )}
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                title={t('cardDetails.nextMonth')}
              >
                <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão Conciliar Extrato OFX - controlado pelo admin */}
              {brandingSettings.habilitar_conciliacao_ofx !== false && (
                <button
                  onClick={() => setIsOFXModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg transition-colors text-sm font-medium"
                  title="Importar extrato para conciliar"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Conciliar Extrato</span>
                </button>
              )}
              <button
                onClick={handleExportInvoice}
                disabled={!invoice || invoice.items.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar fatura em PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t('cardDetails.newExpense')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <p className="text-xs text-[var(--text-secondary)]">
              {t('cardDetails.closes')} {card.dia_fechamento} • {t('cardDetails.due')} {card.dia_vencimento}
            </p>
            {invoice?.isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Fatura Paga
              </span>
            ) : isCurrentOpenInvoice() ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fatura Aberta
              </span>
            ) : isCurrentMonth() && isInvoiceClosed() && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Fatura Fechada
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Resumo da Fatura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-[var(--text-secondary)]">{t('cardDetails.invoiceValue')}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(invoice?.total || 0)}
              </p>
            </div>

            <div className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-[var(--text-secondary)]">{t('cardDetails.closing')}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                Dia {card.dia_fechamento}
              </p>
            </div>

            <div className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-red-400" />
                <span className="text-xs text-[var(--text-secondary)]">{t('cardDetails.dueDate')}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                Dia {card.dia_vencimento}
              </p>
            </div>
          </div>

          {/* Lista de Despesas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('cardDetails.expenses')}</h3>

              {/* Toggle de Modo de Pagamento (NOVO) */}
              {invoice && invoice.pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaymentMode('total')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${paymentMode === 'total'
                      ? 'bg-blue-500 text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)]'
                      }`}
                  >
                    Pagar Tudo
                  </button>
                  <button
                    onClick={() => setPaymentMode('partial')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${paymentMode === 'partial'
                      ? 'bg-purple-500 text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)]'
                      }`}
                  >
                    Pagamento Parcial
                  </button>
                </div>
              )}
            </div>

            {/* Contador e ações de seleção (NOVO - apenas modo parcial) */}
            {paymentMode === 'partial' && invoice && invoice.pendingCount > 0 && (
              <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-300">
                      {selectedItemIds.length} de {invoice.pendingCount} selecionado(s)
                    </span>
                    {selectedItemIds.length > 0 && (
                      <span className="text-sm font-bold text-purple-400">
                        • {formatCurrency(calculateSelectedTotal())}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Selecionar Todos
                    </button>
                    {selectedItemIds.length > 0 && (
                      <button
                        onClick={handleDeselectAll}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {invoiceLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-[var(--skeleton-pulse)] rounded-lg h-16" />
                ))}
              </div>
            ) : !invoice || invoice.items.length === 0 ? (
              <div className="text-center py-12">
                <CreditCardIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-tertiary)] text-sm">{t('cardDetails.noExpenses')}</p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  {t('cardDetails.addExpenses')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-[var(--bg-card-inner)] border rounded-lg p-4 transition-colors ${item.status === 'pago'
                      ? 'border-green-500/20 opacity-60'
                      : selectedItemIds.includes(item.id)
                        ? 'border-purple-500/50 bg-purple-500/5'
                        : 'border-[var(--border-default)] hover:border-[var(--border-medium)]'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Checkbox de seleção (NOVO - apenas modo parcial e pendentes) */}
                      {paymentMode === 'partial' && item.status === 'pendente' && (
                        <div className="mr-3">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => handleToggleItemSelection(item.id)}
                            className="w-4 h-4 rounded border-[var(--border-medium)] bg-[var(--bg-base)] text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-primary)] font-medium">{item.descricao}</p>
                          {item.status === 'pago' && (
                            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 font-medium">
                              {t('cardDetails.paid')}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatDate(item.data_prevista)}
                            </span>
                            {(() => {
                              const parcela = parseParcelaInfo(item.parcela_info);
                              if (parcela) {
                                return (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    • {parcela.numero}/{parcela.total}
                                  </span>
                                );
                              }
                              if (item.parcela_atual && item.numero_parcelas) {
                                return (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    • {item.parcela_atual}/{item.numero_parcelas}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {item.status === 'pago' && item.data_efetivacao && (
                              <span className="text-xs text-green-500">
                                • {t('cardDetails.paidOn')} {formatDate(item.data_efetivacao)}
                              </span>
                            )}
                          </div>
                          {item.created_at && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                              <Calendar className="w-3 h-3" />
                              <span>Criado em {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${item.status === 'pago' ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                            {formatCurrency(Number(item.valor))}
                          </p>
                          {(() => {
                            const parcela = parseParcelaInfo(item.parcela_info);
                            return parcela?.valor_original ? (
                              <p className="text-xs text-[var(--text-tertiary)]">
                                {t('cardDetails.total')}: {formatCurrency(parcela.valor_original)}
                              </p>
                            ) : null;
                          })()}
                        </div>
                        {item.status === 'pendente' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedTransaction(item);
                                setIsEditModalOpen(true);
                              }}
                              className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTransaction(item);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          {invoice && (
            <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
              {invoice.isPaid ? (
                // Fatura Paga - Mostrar informações e opção de reverter
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-400">{t('cardDetails.invoicePaid')}</p>
                        <p className="text-xs text-green-500">
                          Pago em {invoice.dataPagamento ? formatDate(invoice.dataPagamento) : '-'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-green-400/80">
                      {t('cardDetails.totalPaid')}: {formatCurrency(invoice.totalPaid)} • {invoice.paidCount} despesa(s)
                    </p>
                  </div>

                  <button
                    onClick={() => setIsReverseModalOpen(true)}
                    className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    {t('future.reversePayment')}
                  </button>
                </div>
              ) : invoice.total > 0 || (paymentMode === 'partial' && selectedItemIds.length > 0) ? (
                // Fatura Pendente - Botão de pagar (modo total ou parcial)
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  disabled={paymentMode === 'partial' && selectedItemIds.length === 0}
                  className={`w-full px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${paymentMode === 'partial'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                >
                  {paymentMode === 'partial' ? (
                    <>
                      <DollarSign className="w-5 h-5" />
                      Pagar Selecionados ({selectedItemIds.length}) - {formatCurrency(calculateSelectedTotal())}
                    </>
                  ) : isInvoiceClosed() ? (
                    <>
                      <DollarSign className="w-5 h-5" />
                      {t('cardDetails.payInvoice')} - {formatCurrency(invoice.total)}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      {t('cardDetails.advancePayment')} - {formatCurrency(invoice.total)}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pagamento */}
      <PayInvoiceModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={() => {
          setIsPayModalOpen(false);
          refetchInvoice();
        }}
        card={card}
        invoiceTotal={paymentMode === 'partial' ? calculateSelectedTotal() : (invoice?.total || 0)}
        invoiceMonth={selectedMonth}
        isInvoiceClosed={isInvoiceClosed()}
        paymentMode={paymentMode}
        selectedItemIds={selectedItemIds}
      />

      {/* Modal de Reversão de Pagamento */}
      {invoice?.isPaid && card && (
        <ReversePaymentModal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          onSuccess={() => {
            setIsReverseModalOpen(false);
            refetchInvoice();
          }}
          cardName={card.nome}
          invoiceMonth={selectedMonth}
          totalPaid={invoice.totalPaid}
          dataPagamento={invoice.dataPagamento || ''}
          paidCount={invoice.paidCount}
          cardId={cardId}
          contaId={card.conta_vinculada_id || ''}
        />
      )}

      {/* Modal de Nova Despesa */}
      <TransactionModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          setIsExpenseModalOpen(false);
          refetchInvoice();
        }}
        type="despesa"
        preSelectedCardId={cardId}
      />

      {/* Modal de Edição */}
      {selectedTransaction && (
        <FutureTransactionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
            refetchInvoice();
          }}
          type={selectedTransaction.tipo}
          transactionToEdit={selectedTransaction}
        />
      )}

      {/* Modal de Exclusão */}
      {selectedTransaction && (
        <DeleteFutureConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedTransaction(null);
          }}
          onSuccess={() => {
            setIsDeleteModalOpen(false);
            setSelectedTransaction(null);
            refetchInvoice();
          }}
          transaction={selectedTransaction}
        />
      )}

      {/* Modal de Conciliação de Extrato OFX */}
      <OFXReconciliationModal
        isOpen={isOFXModalOpen}
        onClose={() => setIsOFXModalOpen(false)}
        onSuccess={() => {
          setIsOFXModalOpen(false);
          refetchInvoice();
        }}
        cardId={cardId}
        cardName={card.nome}
        invoiceMonth={selectedMonth}
        invoiceItems={(invoice?.items || []).map((item: any) => ({
          id: item.id,
          descricao: item.descricao,
          valor: Number(item.valor),
          data_prevista: item.data_prevista,
          categoria_id: item.categoria_id,
          categoria_nome: item.categoria?.descricao || '',
          status: item.status,
          parcela_info: item.parcela_info,
        }))}
      />
    </div>
  );
}
