"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FileText, Files, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/language-context";
import { parseParcelaInfo } from "@/lib/parcela-parser";

interface DeleteFutureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: any;
}

/**
 * Extrai a descrição base removendo sufixo de parcela em qualquer formato.
 * Formatos tratados:
 * - Plataforma: "Compra de perfume - (1/2)" → "Compra de perfume"
 * - RPC: "Perfumes (2/2)" → "Perfumes"
 * - N8N: "Compra de perfume - Parcela 1/2" → "Compra de perfume"
 * - Genérico: "Algo 1/2" → "Algo"
 */
function getBaseDescricao(descricao: string): string {
  if (!descricao) return descricao;
  return descricao
    // Remove " - Parcela N/M" (formato N8N)
    .replace(/\s*-?\s*[Pp]arcela\s*\d+\/\d+\s*$/, '')
    // Remove " - (N/M)" (formato plataforma)
    .replace(/\s*-?\s*\(\d+\/\d+\)\s*$/, '')
    // Remove " N/M" solto no final (fallback)
    .replace(/\s+\d+\/\d+\s*$/, '')
    .trim();
}

/**
 * Verifica se um lançamento é REALMENTE parcelado (mais de 1 parcela).
 * Lançamentos à vista (1/1) ou sem parcela NÃO são considerados parcelados.
 */
function isReallyParcelado(transaction: any): boolean {
  // Verificar via parcelamento flag + numero_parcelas
  // Plataforma usa 'true'/'false', RPC usa 'TRUE', N8N usa 'sim'
  const parcelamentoStr = String(transaction.parcelamento).toLowerCase();
  if ((parcelamentoStr === 'true' || parcelamentoStr === 'sim') && transaction.numero_parcelas > 1) {
    return true;
  }
  
  // Fallback: verificar via parcela_info (aceita objeto ou string "1/2")
  if (transaction.parcela_info) {
    const parsed = parseParcelaInfo(transaction.parcela_info);
    if (parsed && parsed.total > 1) return true;
    return false;
  }
  
  return false;
}

export function DeleteFutureConfirmationModal({
  isOpen,
  onClose,
  onSuccess,
  transaction
}: DeleteFutureConfirmationModalProps) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'all'>('single');

  // Resetar para 'single' sempre que o modal abrir para evitar estado residual
  useEffect(() => {
    if (isOpen) {
      setDeleteType('single');
    }
  }, [isOpen]);

  if (!transaction) return null;

  const isParcelado = isReallyParcelado(transaction);
  const isRecorrente = !!transaction.recorrente;
  // Só mostra opção "este e futuros" se REALMENTE tem parcelas futuras ou é recorrente
  const isRelated = isParcelado || isRecorrente;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const supabase = createClient();

      // 🔒 PROTEÇÃO: Não permitir exclusão de lançamentos pagos ou efetivados
      if (transaction.status === 'pago' || transaction.status === 'efetivado') {
        alert('❌ Não é possível excluir um lançamento que já foi pago. Use a opção "Reverter Pagamento" para cancelar.');
        setDeleting(false);
        return;
      }

      // 🔒 SEGURANÇA: Se não é parcelado nem recorrente, SEMPRE deletar apenas por ID
      // Isso garante que lançamentos avulsos nunca apaguem outros
      if (!isRelated || deleteType === 'single') {
        const { error } = await supabase
          .from('lancamentos_futuros')
          .delete()
          .eq('id', transaction.id)
          .eq('status', 'pendente');

        if (error) throw error;
      } else {
        // Excluir este e futuros relacionados — só chega aqui se isRelated === true E deleteType === 'all'
        if (isParcelado) {
          // Para parcelados: excluir esta parcela e as futuras DA MESMA SÉRIE
          // Determinar parcela atual e total via QUALQUER campo disponível
          const parsedInfo = parseParcelaInfo(transaction.parcela_info);
          const parcelaAtual = transaction.parcela_atual || parsedInfo?.numero || 1;
          const numParcelas = transaction.numero_parcelas || parsedInfo?.total || 1;
          const baseDesc = getBaseDescricao(transaction.descricao);

          // Buscar TODOS os lançamentos pendentes deste usuário + cartão
          // Sem filtrar por parcelamento/numero_parcelas pois esses campos podem estar inconsistentes
          let query = supabase
            .from('lancamentos_futuros')
            .select('id, descricao, parcela_atual, parcela_info, numero_parcelas, parcelamento')
            .eq('usuario_id', transaction.usuario_id)
            .eq('status', 'pendente');

          if (transaction.cartao_id) {
            query = query.eq('cartao_id', transaction.cartao_id);
          }

          const { data: candidates, error: fetchError } = await query;
          if (fetchError) throw fetchError;

          // Filtrar no JS: mesma base de descrição + mesma série + parcela >= atual
          const idsToDelete = candidates
            ?.filter((t: any) => {
              // 1. Base da descrição deve ser igual
              if (getBaseDescricao(t.descricao) !== baseDesc) return false;

              // 2. Determinar parcela deste candidato
              const candidateParsed = parseParcelaInfo(t.parcela_info);
              const candidateParcelaAtual = t.parcela_atual || candidateParsed?.numero;
              const candidateTotal = t.numero_parcelas || candidateParsed?.total;

              // 3. Deve ter info de parcela e ser da mesma série (mesmo total)
              if (!candidateParcelaAtual || !candidateTotal) return false;
              if (candidateTotal !== numParcelas) return false;

              // 4. Parcela deve ser >= à atual
              if (candidateParcelaAtual < parcelaAtual) return false;

              return true;
            })
            .map((t: any) => t.id) || [];

          if (idsToDelete.length > 0) {
            const { error } = await supabase
              .from('lancamentos_futuros')
              .delete()
              .in('id', idsToDelete);

            if (error) throw error;
          }
        } else if (isRecorrente) {
          // Para recorrentes: excluir este e futuros com mesma descrição, periodicidade e recorrência
          const { error } = await supabase
            .from('lancamentos_futuros')
            .delete()
            .eq('usuario_id', transaction.usuario_id)
            .eq('descricao', transaction.descricao)
            .eq('recorrente', true)
            .eq('periodicidade', transaction.periodicidade)
            .eq('status', 'pendente')
            .gte('data_prevista', transaction.data_prevista);

          if (error) throw error;
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert(t('future.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  // Informação da parcela para exibição
  const parcelaDisplay = (() => {
    if (isParcelado && transaction.parcela_info) {
      const parcela = parseParcelaInfo(transaction.parcela_info);
      return parcela ? `💳 ${t('future.installment')} (${parcela.numero}/${parcela.total})` : null;
    }
    if (isParcelado && transaction.parcela_atual) {
      return `💳 ${t('future.installment')} (${transaction.parcela_atual}/${transaction.numero_parcelas})`;
    }
    if (isRecorrente) {
      return `🔄 ${t('future.recurring')} (${transaction.periodicidade})`;
    }
    return null;
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('future.deleteMessage')}
      className="max-w-lg"
    >
      <div className="space-y-6">
        {/* Info */}
        <p className="text-sm text-[var(--text-secondary)]">
          {t('common.cannotUndo')}
        </p>

        {/* Transaction Info */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-red-500">
                  {transaction.descricao}
                </p>
                {transaction.tipo_conta === 'pj' ? (
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30 font-medium">
                    💼 PJ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/30 font-medium">
                    👤 {t('future.personal')}
                  </span>
                )}
              </div>
              {parcelaDisplay && (
                <p className="text-xs text-red-500/80">{parcelaDisplay}</p>
              )}
            </div>
          </div>
        </div>

        {isRelated && (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t('common.delete')}</p>
            <div className="space-y-2">
              {/* Apenas esta transação */}
              <label className="flex items-center gap-3 p-3 border border-[var(--border-medium)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                <input
                  type="radio"
                  name="deleteType"
                  value="single"
                  checked={deleteType === 'single'}
                  onChange={(e) => setDeleteType(e.target.value as 'single' | 'all')}
                  className="w-4 h-4 text-red-500"
                />
                <span className="text-sm text-[var(--text-primary)]">{t('future.editSingle')}</span>
              </label>

              {/* Esta e futuras transações */}
              <label className="flex items-center gap-3 p-3 border border-[var(--border-medium)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                <input
                  type="radio"
                  name="deleteType"
                  value="all"
                  checked={deleteType === 'all'}
                  onChange={(e) => setDeleteType(e.target.value as 'single' | 'all')}
                  className="w-4 h-4 text-red-500"
                />
                <span className="text-sm text-[var(--text-primary)]">{t('future.editFuture')}</span>
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
          <Button
            onClick={onClose}
            disabled={deleting}
            className="px-6 bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 bg-red-500 hover:bg-red-600 text-white font-medium"
          >
            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
