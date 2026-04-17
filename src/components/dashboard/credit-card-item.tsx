"use client";

import { useEffect, useState } from "react";
import { CreditCard as CreditCardIcon, Pencil, Trash2, ArrowRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CreditCard } from "@/hooks/use-credit-cards";
import { useLanguage } from "@/contexts/language-context";

interface CreditCardItemProps {
  card: CreditCard;
  onEdit: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
  onReactivate?: (card: CreditCard) => void;
  formatCurrency: (value: number) => string;
}

export function CreditCardItem({ card, onEdit, onDelete, onReactivate, formatCurrency }: CreditCardItemProps) {
  const { t } = useLanguage();
  const { profile } = useUser();
  const [limiteUsado, setLimiteUsado] = useState(0);
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

  const useDarkText = isLightColor(card.cor_cartao || '#6366f1');

  useEffect(() => {
    fetchLimiteUsado();

    // Escutar eventos de atualização
    const handleUpdate = () => {
      fetchLimiteUsado();
    };

    window.addEventListener('creditCardsChanged', handleUpdate);
    window.addEventListener('futureTransactionsChanged', handleUpdate);

    return () => {
      window.removeEventListener('creditCardsChanged', handleUpdate);
      window.removeEventListener('futureTransactionsChanged', handleUpdate);
    };
  }, [card.id, profile]);

  const fetchLimiteUsado = async () => {
    if (!profile) return;

    try {
      const supabase = createClient();
      
      // Calcular mês do ciclo atual de fatura
      const hoje = new Date();
      const diaHoje = hoje.getDate();
      let mesAtual = hoje.getMonth() + 1;
      let anoAtual = hoje.getFullYear();
      
      // Se já passou do fechamento, o ciclo atual é para o próximo mês
      if (diaHoje >= card.dia_fechamento) {
        mesAtual++;
        if (mesAtual > 12) {
          mesAtual = 1;
          anoAtual++;
        }
      }
      
      const mesCicloAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
      
      // Buscar TODOS os lançamentos pendentes deste cartão
      const { data, error } = await supabase
        .from('lancamentos_futuros')
        .select('valor, recorrente, mes_previsto')
        .eq('usuario_id', profile.id)
        .eq('cartao_id', card.id)
        .eq('status', 'pendente');

      if (error) throw error;

      // Calcular limite usado:
      // - Lançamentos NORMAIS e PARCELADOS: contam todos os pendentes (todas as faturas)
      // - Lançamentos RECORRENTES: contam apenas o do ciclo atual (fatura aberta)
      const total = data?.reduce((sum, item) => {
        if (item.recorrente) {
          // Recorrente: só conta se for do ciclo atual
          return item.mes_previsto === mesCicloAtual ? sum + Number(item.valor) : sum;
        } else {
          // Normal ou parcelado: conta sempre
          return sum + Number(item.valor);
        }
      }, 0) || 0;
      
      setLimiteUsado(total);
    } catch (error) {
      setLimiteUsado(0);
    } finally {
      setLoading(false);
    }
  };

  const limiteDisponivel = card.limite_total - limiteUsado;
  const percentualUsado = card.limite_total > 0 ? (limiteUsado / card.limite_total) * 100 : 0;

  return (
    <div className={cn(
      "bg-[var(--bg-card)] border rounded-xl overflow-hidden hover:border-[var(--border-medium)] transition-all group",
      card.ativo ? "border-[var(--border-default)]" : "border-red-500/30 opacity-75"
    )}>
      {/* Card Visual */}
      <div
        className="h-48 p-6 relative overflow-hidden"
        style={{
          background: card.ativo 
            ? `linear-gradient(135deg, ${card.cor_cartao} 0%, ${card.cor_cartao}dd 100%)`
            : `linear-gradient(135deg, #4B5563 0%, #374151 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className={cn(
                "text-xs font-medium mb-1",
                useDarkText ? "text-gray-700/80" : "text-white/80"
              )}>{card.bandeira}</p>
              <p className={cn(
                "text-lg font-bold",
                useDarkText ? "text-gray-900" : "text-white"
              )}>{card.nome}</p>
              {!card.ativo && (
                <span className="inline-block mt-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-semibold">
                  INATIVO
                </span>
              )}
            </div>
            <CreditCardIcon className={cn(
              "w-8 h-8",
              useDarkText ? "text-gray-700/40" : "text-white/40"
            )} />
          </div>
          <div>
            {card.ultimos_digitos && (
              <p className={cn(
                "text-sm font-mono",
                useDarkText ? "text-gray-900" : "text-white"
              )}>
                •••• •••• •••• {card.ultimos_digitos}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-6 space-y-4">
        {/* Limite */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-secondary)]">{t('cards.limitUsed')}</span>
            <span className="text-xs text-[var(--text-secondary)]">
              {loading ? '...' : `${percentualUsado.toFixed(1)}%`}
            </span>
          </div>
          <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
              style={{ width: `${percentualUsado}%` }}
            />
          </div>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cards.used')}</p>
            <p className="text-sm font-semibold text-red-400">
              {loading ? '...' : formatCurrency(limiteUsado)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cards.available')}</p>
            <p className="text-sm font-semibold text-green-400">
              {loading ? '...' : formatCurrency(limiteDisponivel)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">{t('cards.total')}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatCurrency(card.limite_total)}
            </p>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-default)]">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">📅 {t('cards.closingDate')}</p>
            <p className="text-sm text-[var(--text-primary)] font-medium">{t('cards.everyDay')} {card.dia_fechamento}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">📅 {t('cards.dueDate')}</p>
            <p className="text-sm text-[var(--text-primary)] font-medium">{t('cards.everyDay')} {card.dia_vencimento}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {card.ativo ? (
            <>
              <Link
                href={`/dashboard/cartoes/${card.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {t('cards.invoiceDetails')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => onEdit(card)}
                className="p-2 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
                title={t('cards.editCard')}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(card)}
                className="p-2 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 rounded-lg transition-colors"
                title="Excluir ou Inativar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onReactivate?.(card)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reativar Cartão
              </button>
              <button
                onClick={() => onDelete(card)}
                className="p-2 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
