"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, ArrowRight, Tag, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: number;
  descricao: string;
  tipo: "entrada" | "saida" | "ambos";
}

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetCategoryId?: number) => void;
  category: Category | null;
  isDeleting: boolean;
  allCategories: Category[];
}

export function DeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  category,
  isDeleting,
  allCategories,
}: DeleteCategoryModalProps) {
  const { t } = useLanguage();
  const [linkCount, setLinkCount] = useState<{ transacoes: number; lancamentos: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<number | "">("");
  const [step, setStep] = useState<"confirm" | "migrate">("confirm");

  // Categorias disponíveis para migração (excluindo a que será deletada, mesmo tipo ou 'ambos')
  const availableCategories = allCategories.filter(
    (c) =>
      c.id !== category?.id &&
      (
        c.tipo === "ambos" ||
        category?.tipo === "ambos" ||
        c.tipo === category?.tipo
      )
  );

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen && category) {
      setStep("confirm");
      setTargetCategoryId("");
      setLinkCount(null);
      checkLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category?.id]);

  const checkLinks = async () => {
    if (!category) return;
    setChecking(true);
    try {
      const supabase = createClient();
      // p_check_only: true = apenas verifica vinculos, NAO deleta a categoria
      const { data } = await supabase.rpc("delete_category_safe", {
        p_category_id: category.id,
        p_target_category_id: null,
        p_check_only: true,
      });
      if (data && data.requires_migration) {
        setLinkCount({
          transacoes: data.transacoes_count || 0,
          lancamentos: data.lancamentos_count || 0,
        });
        setStep("migrate");
      } else {
        setLinkCount({ transacoes: 0, lancamentos: 0 });
        setStep("confirm");
      }
    } catch {
      setLinkCount({ transacoes: 0, lancamentos: 0 });
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = () => {
    if (step === "migrate") {
      if (!targetCategoryId) return;
      onConfirm(Number(targetCategoryId));
    } else {
      onConfirm(undefined);
    }
  };

  if (!category) return null;

  const isIncome = category.tipo === "entrada";
  const total = (linkCount?.transacoes ?? 0) + (linkCount?.lancamentos ?? 0);
  const hasMigration = step === "migrate";
  const canConfirm = !hasMigration || targetCategoryId !== "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasMigration ? "Mover transações antes de excluir" : t("modal.deleteTitle")}
      className="max-w-md"
    >
      <div className="space-y-5">
        {/* Ícone de estado */}
        <div className="flex justify-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all",
              hasMigration
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-red-500/10 border-red-500/30"
            )}
          >
            {checking ? (
              <Loader2 className="w-7 h-7 text-[var(--text-secondary)] animate-spin" />
            ) : hasMigration ? (
              <ArrowRight className="w-7 h-7 text-amber-400" />
            ) : (
              <Trash2 className="w-7 h-7 text-red-500" />
            )}
          </div>
        </div>

        {/* Título e descrição */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {hasMigration
              ? "Categoria vinculada a transações"
              : t("modal.deleteMessage")}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {hasMigration
              ? "Antes de excluir, escolha para onde mover as transações vinculadas."
              : t("modal.deleteWarning")}
          </p>
        </div>

        {/* Card da categoria */}
        <div className="bg-[var(--bg-card-inner)] rounded-xl p-4 border border-[var(--border-medium)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">Categoria</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {isIncome ? "💰 Receita" : "💸 Despesa"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
              )}
            >
              <Tag className={cn("w-4 h-4", isIncome ? "text-emerald-400" : "text-red-400")} />
            </div>
            <span className="text-[var(--text-primary)] font-medium">{category.descricao}</span>
          </div>

          {/* Contagem de vínculos */}
          {hasMigration && linkCount && (
            <div className="mt-2 pt-3 border-t border-[var(--border-default)] grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{linkCount.transacoes}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Transações</p>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{linkCount.lancamentos}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Lançamentos futuros</p>
              </div>
            </div>
          )}
        </div>

        {/* Seletor de categoria destino (modo migração) */}
        {hasMigration && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-amber-400" />
              Mover{" "}
              <span className="text-amber-400 font-bold">{total} registro{total !== 1 ? "s" : ""}</span>{" "}
              para:
            </label>

            {availableCategories.length === 0 ? (
              <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-medium)] text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Nenhuma outra categoria disponível.{" "}
                  <span className="text-[var(--text-primary)]">Crie uma categoria primeiro</span> para poder mover as transações.
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={targetCategoryId}
                  onChange={(e) =>
                    setTargetCategoryId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className={cn(
                    "w-full bg-[var(--input-bg)] border rounded-xl px-4 py-3 text-sm appearance-none cursor-pointer transition-all outline-none",
                    targetCategoryId !== ""
                      ? "border-emerald-500/50 text-[var(--text-primary)]"
                      : "border-[var(--border-medium)] text-[var(--text-secondary)]"
                  )}
                >
                  <option value="">Selecione a categoria destino...</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[var(--bg-card)]">
                      {cat.descricao}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {targetCategoryId !== "" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aviso simples quando não há vínculos */}
        {!hasMigration && !checking && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
            <div className="flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">
                {t("categories.modal.warningTransactions")}
              </p>
            </div>
          </div>
        )}

        {/* Aviso de migração */}
        {hasMigration && targetCategoryId !== "" && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-400 leading-relaxed">
                {total} registro{total !== 1 ? "s serão movidos" : " será movido"} para{" "}
                <span className="font-semibold text-emerald-300">
                  {availableCategories.find((c) => c.id === targetCategoryId)?.descricao}
                </span>{" "}
                e a categoria <span className="font-semibold">{category.descricao}</span> será excluída.
              </p>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-transparent border border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting || checking || !canConfirm || (hasMigration && availableCategories.length === 0)}
            className={cn(
              "flex-1 text-white font-semibold transition-all",
              hasMigration
                ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40"
                : "bg-red-500 hover:bg-red-600 disabled:bg-red-500/40"
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {hasMigration ? "Migrando..." : t("common.deleting")}
              </>
            ) : hasMigration ? (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Mover e Excluir
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t("common.confirmDelete")}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
