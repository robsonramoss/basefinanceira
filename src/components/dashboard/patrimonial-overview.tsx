"use client";

import { Building2, CreditCard } from "lucide-react";
import Link from "next/link";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Invoice {
  mes_referencia: string;
  valor_total: number;
  total_despesas: number;
  status: string;
}

interface CardWithInvoice {
  id: string;
  nome: string;
  ativo: boolean;
  currentInvoiceValue: number;
  totalExpenses: number;
  monthReference: string;
}

export function PatrimonialOverview() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { filter: accountFilter } = useAccountFilter();
  const { accounts, loading: loadingAccounts } = useAccounts(accountFilter);
  const { cards, loading: loadingCards } = useCreditCards(false);
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [displayMonth, setDisplayMonth] = useState("");
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Escutar eventos para atualizar faturas em tempo real
  useEffect(() => {
    const handleUpdate = () => setRefetchTrigger(prev => prev + 1);
    window.addEventListener('futureTransactionsChanged', handleUpdate);
    window.addEventListener('creditCardsChanged', handleUpdate);
    window.addEventListener('transactionsChanged', handleUpdate);
    return () => {
      window.removeEventListener('futureTransactionsChanged', handleUpdate);
      window.removeEventListener('creditCardsChanged', handleUpdate);
      window.removeEventListener('transactionsChanged', handleUpdate);
    };
  }, []);

  // Buscar lançamentos futuros dos cartões (fatura aberta atual)
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!cards || cards.length === 0) return;
      
      const supabase = createClient();
      const now = new Date();
      const currentDay = now.getDate();
      
      // Determinar qual mês de fatura mostrar baseado no dia de fechamento
      // Se ainda não fechou a fatura do mês atual, mostrar mês atual
      // Se já fechou, mostrar próximo mês
      
      // Pegar o menor dia de fechamento entre todos os cartões para determinar o mês de referência
      const earliestClosingDay = Math.min(...cards.map(c => c.dia_fechamento || 1));
      
      let invoiceMonthDate: Date;
      if (currentDay <= earliestClosingDay) {
        // Ainda estamos no período da fatura do mês atual
        invoiceMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // Já passou o fechamento, mostrar próximo mês
        invoiceMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      
      const invoiceMonthStr = `${invoiceMonthDate.getFullYear()}-${String(invoiceMonthDate.getMonth() + 1).padStart(2, '0')}`;
      
      setDisplayMonth(invoiceMonthStr);
      
      // Buscar lançamentos futuros do mês da fatura aberta
      const { data: futureTransactions, error } = await supabase
        .from('lancamentos_futuros')
        .select('cartao_id, mes_previsto, valor, status')
        .eq('mes_previsto', invoiceMonthStr)
        .eq('status', 'pendente')
        .not('cartao_id', 'is', null);
      
      if (futureTransactions) {
        // Agrupar por cartão e calcular totais
        const invoicesMap: Record<string, Invoice> = {};
        
        futureTransactions.forEach((transaction: any) => {
          const cardId = transaction.cartao_id;
          
          if (!invoicesMap[cardId]) {
            invoicesMap[cardId] = {
              mes_referencia: transaction.mes_previsto,
              valor_total: 0,
              total_despesas: 0,
              status: 'pendente'
            };
          }
          
          invoicesMap[cardId].valor_total += Number(transaction.valor);
          invoicesMap[cardId].total_despesas += 1;
        });
        
        setInvoices(invoicesMap);
      }
    };
    
    fetchInvoices();
  }, [cards, refetchTrigger]);

  // Calcular totais
  const totalAccounts = accounts
    .filter(a => !a.is_archived)
    .reduce((sum, account) => sum + Number(account.saldo_atual), 0);

  const totalCards = cards
    .filter((c) => c.ativo)
    .reduce((sum: number, card) => {
      const invoice = invoices[card.id];
      return sum + (invoice ? Number(invoice.valor_total) : 0);
    }, 0);

  const activeAccountsCount = accounts.filter(a => !a.is_archived).length;
  const activeCardsCount = cards.filter((c) => c.ativo).length;

  // Top 4 contas por saldo
  const topAccounts = [...accounts]
    .filter(a => !a.is_archived)
    .sort((a, b) => Number(b.saldo_atual) - Number(a.saldo_atual))
    .slice(0, 4);

  // Top 4 cartões por valor da fatura
  const topCards: CardWithInvoice[] = cards
    .filter((c) => c.ativo)
    .map((card) => {
      const invoice = invoices[card.id];
      return {
        id: card.id,
        nome: card.nome,
        ativo: card.ativo,
        currentInvoiceValue: invoice ? Number(invoice.valor_total) : 0,
        totalExpenses: invoice?.total_despesas || 0,
        monthReference: invoice?.mes_referencia || ""
      };
    })
    .sort((a: CardWithInvoice, b: CardWithInvoice) => b.currentInvoiceValue - a.currentInvoiceValue)
    .slice(0, 4);

  // Formatar mês de exibição
  const formatDisplayMonth = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (loadingAccounts || loadingCards) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 animate-pulse">
        <div className="h-64" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Visão Patrimonial</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartões de Crédito */}
        <Link 
          href="/dashboard/cartoes"
          className="space-y-4 group cursor-pointer hover:bg-[var(--bg-hover)] rounded-lg p-4 -m-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">Cartões de Crédito</h3>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{activeCardsCount} cartão(ões)</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">
                Total em Aberto - {displayMonth ? formatDisplayMonth(displayMonth) : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
              {formatCurrency(totalCards)}
            </p>
          </div>

          <div className="space-y-3 mt-4">
            {topCards.map((card, index) => {
              const percentage = totalCards > 0 ? (card.currentInvoiceValue / totalCards) * 100 : 0;
              const color = index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-purple-500' : index === 2 ? 'bg-pink-500' : 'bg-orange-500';
              
              return (
                <div key={card.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-sm text-[var(--text-primary)]">{card.nome}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {formatCurrency(card.currentInvoiceValue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {card.totalExpenses} despesa(s)
                  </div>
                </div>
              );
            })}
          </div>
        </Link>

        {/* Contas Bancárias */}
        <Link 
          href="/dashboard/contas"
          className="space-y-4 group cursor-pointer hover:bg-[var(--bg-hover)] rounded-lg p-4 -m-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">Contas Bancárias</h3>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{activeAccountsCount} conta(s)</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-[var(--text-tertiary)]">Saldo Total</span>
            <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors">
              {formatCurrency(totalAccounts)}
            </p>
          </div>

          <div className="space-y-3 mt-4">
            {topAccounts.map((account, index) => {
              const percentage = totalAccounts > 0 ? (Number(account.saldo_atual) / totalAccounts) * 100 : 0;
              const color = index === 0 ? 'bg-green-500' : index === 1 ? 'bg-emerald-500' : index === 2 ? 'bg-teal-500' : 'bg-cyan-500';
              
              return (
                <div key={account.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-sm text-[var(--text-primary)]">{account.nome}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {formatCurrency(Number(account.saldo_atual))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeAccountsCount > 4 && (
            <div className="text-center pt-2">
              <span className="text-xs text-[var(--text-tertiary)]">
                +{activeAccountsCount - 4} conta(s) adicional(is)
              </span>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
