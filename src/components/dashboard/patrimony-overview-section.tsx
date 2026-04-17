"use client";

import { CreditCard, Building2, TrendingUpIcon } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { cn } from "@/lib/utils";

interface CreditCardItem {
  id: string;
  nome: string;
  bandeira: string | null;
  cor: string;
  total: number;
  count: number;
  percentage: number;
}

interface AccountItem {
  id: string;
  nome: string;
  saldo: number;
  percentage: number;
}

interface InvestmentType {
  type: string;
  count: number;
  invested: number;
  currentValue: number;
  percentage: number;
}

interface PatrimonyOverviewProps {
  creditCardData: {
    cards: CreditCardItem[];
    total: number;
    count: number;
    nextMonth?: string;
  };
  accountsData: {
    accounts: AccountItem[];
    total: number;
    count: number;
  };
  investmentsData: {
    total: number;
    invested: number;
    profit: number;
    profitPercentage: number;
    count: number;
    byType: InvestmentType[];
  };
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  'stock': 'Ações',
  'fii': 'FIIs',
  'crypto': 'Criptomoedas',
  'cripto': 'Criptomoedas',
  'fixed_income': 'Renda Fixa',
  'renda_fixa': 'Renda Fixa',
  'bdr': 'BDRs',
  'fiis': 'FIIs',
  'other': 'Outros'
};

export function PatrimonyOverviewSection({
  creditCardData,
  accountsData,
  investmentsData
}: PatrimonyOverviewProps) {
  const { formatCurrency } = useCurrency();

  const hasData = creditCardData.count > 0 || accountsData.count > 0 || investmentsData.count > 0;

  if (!hasData) {
    return null;
  }

  // Formatar mês para exibição (ex: "2026-02" → "Fevereiro/2026")
  const formatMonth = (monthStr?: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  return (
    <div className="pt-8 border-t border-[var(--border-medium)]">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-purple-500" />
        Visão Patrimonial
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 💳 Cartões de Crédito */}
        {creditCardData.count > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cartões de Crédito</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">{creditCardData.count} cartão(ões)</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">
                Total em Aberto - {formatMonth(creditCardData.nextMonth)}
              </p>
              <p className="text-2xl font-bold text-blue-500">
                {formatCurrency(creditCardData.total)}
              </p>
            </div>

            <div className="space-y-3">
              {creditCardData.cards.slice(0, 4).map((card) => (
                <div key={card.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: card.cor }}
                      />
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[120px]">
                        {card.nome}
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)] text-xs">
                      {formatCurrency(card.total)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-hover)] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${card.percentage}%`,
                        backgroundColor: card.cor
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {card.percentage.toFixed(1)}% • {card.count} despesa(s)
                  </p>
                </div>
              ))}
              
              {creditCardData.cards.length > 4 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                  +{creditCardData.cards.length - 4} cartão(ões) adicional(is)
                </p>
              )}
            </div>
          </div>
        )}

        {/* 🏦 Contas Bancárias */}
        {accountsData.count > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contas Bancárias</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">{accountsData.count} conta(s)</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Saldo Total</p>
              <p className={cn(
                "text-2xl font-bold",
                accountsData.total >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {formatCurrency(accountsData.total)}
              </p>
            </div>

            <div className="space-y-3">
              {accountsData.accounts.slice(0, 4).map((account) => (
                <div key={account.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)] font-medium truncate max-w-[120px]">
                      {account.nome}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      account.saldo >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(account.saldo)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-hover)] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        account.saldo >= 0 ? "bg-green-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.abs(account.percentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {account.percentage.toFixed(1)}% do total
                  </p>
                </div>
              ))}
              
              {accountsData.accounts.length > 4 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                  +{accountsData.accounts.length - 4} conta(s) adicional(is)
                </p>
              )}
            </div>
          </div>
        )}

        {/* 📈 Investimentos */}
        {investmentsData.count > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUpIcon className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Investimentos</h3>
                  <p className="text-xs text-[var(--text-tertiary)]">{investmentsData.count} ativo(s)</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1">Patrimônio Investido</p>
              <p className="text-2xl font-bold text-purple-500">
                {formatCurrency(investmentsData.total)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  investmentsData.profit >= 0 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-red-500/10 text-red-400"
                )}>
                  {investmentsData.profit >= 0 ? '+' : ''}{investmentsData.profitPercentage.toFixed(2)}%
                </span>
                <span className={cn(
                  "text-xs",
                  investmentsData.profit >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(investmentsData.profit)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {investmentsData.byType.slice(0, 4).map((type) => (
                <div key={type.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)] font-medium">
                      {ASSET_TYPE_LABELS[type.type] || type.type}
                    </span>
                    <span className="text-[var(--text-secondary)] text-xs">
                      {formatCurrency(type.currentValue)}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-hover)] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {type.percentage.toFixed(1)}% • {type.count} ativo(s)
                  </p>
                </div>
              ))}
              
              {investmentsData.byType.length > 4 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                  +{investmentsData.byType.length - 4} tipo(s) adicional(is)
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
