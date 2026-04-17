"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle } from "lucide-react";
import type { PositionDividend } from "@/hooks/use-position-dividends";

interface DeleteDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  dividend: PositionDividend;
  quantidade: number;
  ticker: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function DeleteDividendModal({
  isOpen,
  onClose,
  dividend,
  quantidade,
  ticker,
  onSuccess,
  onError
}: DeleteDividendModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from("investment_dividends")
        .delete()
        .eq('id', dividend.id);

      if (error) throw error;

      onClose();
      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Erro ao excluir provento');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = Number(dividend.valor_por_ativo) * quantidade;
  
  const typeLabels = {
    dividendo: 'Dividendo',
    jcp: 'JCP',
    rendimento: 'Rendimento',
    amortizacao: 'Amortização'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir Provento"
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500 mb-1">
              Atenção! Esta ação não pode ser desfeita.
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Você está prestes a excluir permanentemente este provento do histórico.
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] border border-zinc-700 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Ativo</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{ticker}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Tipo</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {typeLabels[dividend.tipo]}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Data Pagamento</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {dividend.data_pagamento.split('T')[0].split('-').reverse().join('/')}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Valor Total</p>
            <p className="text-xl font-bold text-red-500">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {formatCurrency(dividend.valor_por_ativo)} × {quantidade} ativos
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700"
            disabled={loading}
          >
            {loading ? 'Excluindo...' : 'Excluir Provento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
