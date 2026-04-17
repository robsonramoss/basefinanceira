"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import { AlertCircle, TrendingUp } from "lucide-react";

interface ConsolidatePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPosition: {
    ticker: string;
    quantidade: number;
    preco_medio: number;
    valor_investido: number;
  };
  newPosition: {
    quantidade: number;
    preco_medio: number;
  };
  onConsolidate: () => void;
  onCreateNew: () => void;
}

export function ConsolidatePositionModal({
  isOpen,
  onClose,
  existingPosition,
  newPosition,
  onConsolidate,
  onCreateNew,
}: ConsolidatePositionModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  // Calcular valores consolidados
  const totalQuantidade = existingPosition.quantidade + newPosition.quantidade;
  const existingTotal = existingPosition.valor_investido;
  const newTotal = newPosition.quantidade * newPosition.preco_medio;
  const totalInvestido = existingTotal + newTotal;
  const newPrecoMedio = totalInvestido / totalQuantidade;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ativo Já Existe na Carteira"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Alert Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-400 mb-1">
              Você já possui {existingPosition.ticker} na sua carteira
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Escolha como deseja adicionar este novo aporte:
            </p>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção 1: Consolidar */}
          <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-semibold text-green-400">
                Consolidar (Recomendado)
              </h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Posição Atual</p>
                <div className="bg-[var(--bg-elevated)] rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Quantidade:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {existingPosition.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Preço Médio:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(existingPosition.preco_medio)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Total Investido:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(existingTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-green-500 text-xs font-medium">
                + Novo Aporte
              </div>

              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Novo Aporte</p>
                <div className="bg-[var(--bg-elevated)] rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Quantidade:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {newPosition.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Preço:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(newPosition.preco_medio)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Valor:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(newTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-green-500 text-xs font-medium">
                = Posição Consolidada
              </div>

              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Resultado Final</p>
                <div className="bg-green-500/20 border border-green-500/30 rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Quantidade Total:</span>
                    <span className="text-[var(--text-primary)] font-semibold">
                      {totalQuantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Novo Preço Médio:</span>
                    <span className="text-[var(--text-primary)] font-semibold">
                      {formatCurrency(newPrecoMedio)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Total Investido:</span>
                    <span className="text-[var(--text-primary)] font-semibold">
                      {formatCurrency(totalInvestido)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-[var(--text-secondary)] italic">
                  ✅ Mantém 1 única posição<br/>
                  ✅ Proventos consolidados<br/>
                  ✅ Visão unificada do ativo
                </p>
              </div>
            </div>
          </div>

          {/* Opção 2: Criar Nova */}
          <div className="bg-[var(--bg-elevated)] border-2 border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                Criar Posição Separada
              </h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Posição Atual</p>
                <div className="bg-[var(--bg-elevated)] rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Quantidade:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {existingPosition.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Preço Médio:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(existingPosition.preco_medio)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[var(--text-tertiary)] text-xs font-medium">
                + Nova Posição Separada
              </div>

              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Nova Posição</p>
                <div className="bg-[var(--bg-elevated)] rounded p-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Quantidade:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {newPosition.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Preço:</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {formatCurrency(newPosition.preco_medio)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[var(--text-tertiary)] text-xs font-medium">
                = 2 Posições Separadas
              </div>

              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Resultado</p>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded p-2">
                  <p className="text-xs text-[var(--text-secondary)] text-center">
                    Você terá 2 cards de<br/>
                    <strong>{existingPosition.ticker}</strong><br/>
                    na sua carteira
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-[var(--text-secondary)] italic">
                  ⚠️ Duplicação visual<br/>
                  ⚠️ Proventos separados<br/>
                  ⚠️ Dificulta análise
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-zinc-700">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onCreateNew}
            className="flex-1 bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
          >
            Criar Separada
          </Button>
          <Button
            type="button"
            onClick={onConsolidate}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Consolidar (Recomendado)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
