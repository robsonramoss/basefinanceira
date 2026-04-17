"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  Search,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { parseOFX, type OFXTransaction } from "@/lib/ofx-parser";
import {
  reconcileTransactions,
  type ReconciliationItem,
  type SystemTransaction,
} from "@/lib/ofx-reconciliation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useCategoriesQuery } from "@/hooks/use-categories-query";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";

// ==========================================
// Palavras-chave para sugestão automática de categorias
// ==========================================
const CATEGORY_KEYWORDS: { keywords: string[]; categoryHint: string }[] = [
  { keywords: ['supermercado', 'mercado', 'atacado', 'hortifruti', 'extra', 'pao de acucar', 'carrefour', 'assai', 'atacadao'], categoryHint: 'alimenta' },
  { keywords: ['restaurante', 'lanchonete', 'pizzaria', 'hamburguer', 'burger', 'mcdonalds', 'subway', 'ifood', 'rappi', 'delivery'], categoryHint: 'restaurante' },
  { keywords: ['posto', 'gasolina', 'combustivel', 'shell', 'petrobras', 'ipiranga'], categoryHint: 'combust' },
  { keywords: ['farmacia', 'drogaria', 'droga', 'ultrafarma', 'drogasil', 'pacheco', 'pague menos', 'remedios'], categoryHint: 'farm' },
  { keywords: ['uber', 'cabify', '99taxi', '99pop', 'taxi', 'metro', 'passagem', 'transporte'], categoryHint: 'transport' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'apple', 'youtube'], categoryHint: 'assinatura' },
  { keywords: ['academia', 'smartfit', 'bluefit', 'palestra', 'gym', 'crossfit'], categoryHint: 'academia' },
  { keywords: ['energia', 'enel', 'cemig', 'copel', 'eletricidade', 'luz'], categoryHint: 'energia' },
  { keywords: ['agua', 'sabesp', 'caesb', 'sanepar', 'compesa'], categoryHint: 'agua' },
  { keywords: ['internet', 'tim', 'vivo', 'claro', 'oi', 'net', 'telefone', 'celular'], categoryHint: 'telecom' },
  { keywords: ['aluguel', 'locacao', 'condominio', 'iptu'], categoryHint: 'moradia' },
  { keywords: ['shopping', 'loja', 'roupa', 'vestuario', 'calcado', 'sapato', 'hm', 'zara', 'renner', 'riachuelo'], categoryHint: 'roupa' },
  { keywords: ['saude', 'plano de saude', 'unimed', 'amil', 'sulamerica', 'bradesco saude', 'consulta', 'medico', 'clinica', 'hospital'], categoryHint: 'saude' },
  { keywords: ['escola', 'faculdade', 'curso', 'universidade', 'educacao', 'mensalidade'], categoryHint: 'educa' },
  { keywords: ['pet', 'veterinar', 'racao', 'petshop', 'cobasi', 'petz'], categoryHint: 'pet' },
];

function guessCategory(memo: string, categories: { id: number; descricao: string }[]): { id: number; confidence: number } | null {
  const normalizedMemo = memo.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  for (const { keywords, categoryHint } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => normalizedMemo.includes(kw))) {
      const matchedCat = categories.find(c => c.descricao.toLowerCase().includes(categoryHint));
      if (matchedCat) return { id: matchedCat.id, confidence: 75 };
    }
  }
  return null;
}

interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId: string;
  accountName: string;
}

type Step = 'upload' | 'review' | 'complete';
type FilterTab = 'all' | 'matched' | 'ofx_only' | 'system_only';

export function BankReconciliationModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  accountName,
}: BankReconciliationModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { profile } = useUser();
  const { filter: accountFilter } = useAccountFilter();
  const { categories: allCategories } = useCategoriesQuery();

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [ofxPeriod, setOfxPeriod] = useState({ start: '', end: '' });
  const [ofxOrg, setOfxOrg] = useState('');
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [adjustedCount, setAdjustedCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [loadingSystem, setLoadingSystem] = useState(false);

  // Estado para itens "ofx_only" que o usuário quer adicionar
  const [itemsToAdd, setItemsToAdd] = useState<Record<string, {
    selected: boolean;
    categoryId: number;
    description: string;
    tipo: 'entrada' | 'saida';
    suggestedCategoryId?: number;
    suggestionConfidence?: number;
  }>>({});

  // Estado para ações em itens matched (ajustar valor)
  const [adjustedItems, setAdjustedItems] = useState<Set<string>>(new Set());
  const [adjustingItem, setAdjustingItem] = useState<string | null>(null);

  // Estado para itens system_only excluídos
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<ReconciliationItem | null>(null);

  // Estado para exclusão em massa dos itens system_only
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Contadores
  const counts = useMemo(() => {
    const matched = reconciliation.filter(r => r.status === 'matched').length;
    const ofxOnly = reconciliation.filter(r => r.status === 'ofx_only').length;
    const systemOnly = reconciliation.filter(r => r.status === 'system_only').length;
    return { matched, ofxOnly, systemOnly, total: reconciliation.length };
  }, [reconciliation]);

  // Filtrar itens
  const filteredItems = useMemo(() => {
    let items = reconciliation;
    if (filterTab !== 'all') {
      items = items.filter(r => r.status === filterTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(r => {
        const ofxMemo = r.ofxTransaction?.memo?.toLowerCase() || '';
        const sysDesc = r.systemTransaction?.descricao?.toLowerCase() || '';
        return ofxMemo.includes(term) || sysDesc.includes(term);
      });
    }
    return items;
  }, [reconciliation, filterTab, searchTerm]);

  // Total selecionado para adicionar
  const selectedToAddCount = useMemo(() => {
    return Object.values(itemsToAdd).filter(i => i.selected && i.categoryId > 0).length;
  }, [itemsToAdd]);

  // Buscar transações do sistema para o período do OFX
  const fetchSystemTransactions = async (startDate: string, endDate: string): Promise<SystemTransaction[]> => {
    if (!profile) return [];
    const supabase = createClient();

    const { data, error } = await supabase
      .from('transacoes')
      .select(`
        id,
        descricao,
        valor,
        data,
        tipo,
        categoria_id,
        categoria:categoria_trasacoes(descricao)
      `)
      .eq('usuario_id', profile.id)
      .eq('tipo_conta', accountFilter)
      .eq('conta_id', accountId)
      .gte('data', `${startDate}T00:00:00`)
      .lte('data', `${endDate}T23:59:59`)
      .order('data', { ascending: false });

    if (error) throw error;

    return (data || []).map((t: any) => ({
      id: t.id,
      descricao: t.descricao,
      valor: Math.abs(Number(t.valor)),
      data_prevista: t.data?.split('T')[0] || t.data,
      categoria_id: t.categoria_id,
      categoria_nome: t.categoria?.descricao,
      status: 'ativo',
      tipo: t.tipo as 'entrada' | 'saida',
    }));
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoadingSystem(true);

    try {
      const text = await file.text();
      const ofxResult = parseOFX(text);

      setOfxOrg(ofxResult.organization);
      setOfxPeriod({ start: ofxResult.dateStart, end: ofxResult.dateEnd });

      // Buscar transações do sistema no mesmo período
      const systemTxs = await fetchSystemTransactions(ofxResult.dateStart, ofxResult.dateEnd);

      const results = reconcileTransactions(ofxResult.transactions, systemTxs, { mode: 'bank' });
      setReconciliation(results);

      // Inicializar estado de itens para adicionar com sugestão automática de categoria
      const addState: Record<string, { selected: boolean; categoryId: number; description: string; tipo: 'entrada' | 'saida'; suggestedCategoryId?: number; suggestionConfidence?: number }> = {};
      results.forEach(r => {
        if (r.status === 'ofx_only' && r.ofxTransaction) {
          const tipoItem: 'entrada' | 'saida' = r.ofxTransaction.type === 'CREDIT' ? 'entrada' : 'saida';
          const categoriesForType = allCategories.filter(c => c.tipo === tipoItem || c.tipo === 'ambos');
          const suggestion = tipoItem === 'saida' ? guessCategory(r.ofxTransaction.memo, categoriesForType) : null;
          addState[r.id] = {
            selected: false,
            categoryId: suggestion ? suggestion.id : 0,
            description: r.ofxTransaction.memo,
            tipo: tipoItem,
            suggestedCategoryId: suggestion?.id,
            suggestionConfidence: suggestion?.confidence,
          };
        }
      });
      setItemsToAdd(addState);

      setStep('review');
    } catch (error) {
      alert(t('reconciliation.errorParsing'));
    } finally {
      setLoadingSystem(false);
    }
  }, [profile, accountFilter, accountId, allCategories]);

  const handleToggleAddItem = (id: string) => {
    setItemsToAdd(prev => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected },
    }));
  };

  const handleSetCategory = (id: string, categoryId: number) => {
    setItemsToAdd(prev => ({
      ...prev,
      [id]: { ...prev[id], categoryId },
    }));
  };

  const handleSetDescription = (id: string, description: string) => {
    setItemsToAdd(prev => ({
      ...prev,
      [id]: { ...prev[id], description },
    }));
  };

  // Ajustar valor da transação no sistema para bater com o OFX
  const handleAdjustValue = async (item: ReconciliationItem) => {
    if (!item.systemTransaction || !item.ofxTransaction) return;
    setAdjustingItem(item.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transacoes')
        .update({ valor: item.ofxTransaction.amount })
        .eq('id', item.systemTransaction.id);
      if (error) throw error;
      setAdjustedItems(prev => new Set(prev).add(item.id));
      setAdjustedCount(prev => prev + 1);
      setReconciliation(prev => prev.map(r => {
        if (r.id === item.id && r.systemTransaction) {
          return { ...r, systemTransaction: { ...r.systemTransaction, valor: item.ofxTransaction!.amount } };
        }
        return r;
      }));
    } catch (error) {
      alert(t('reconciliation.errorAdjusting'));
    } finally {
      setAdjustingItem(null);
    }
  };

  // Excluir transação do sistema (system_only)
  const handleDeleteSystemItem = (item: ReconciliationItem) => {
    setConfirmDeleteItem(item);
  };

  const handleConfirmDelete = async () => {
    const item = confirmDeleteItem;
    if (!item?.systemTransaction) return;
    setConfirmDeleteItem(null);
    setDeletingItem(item.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', item.systemTransaction.id);
      if (error) throw error;
      setDeletedItems(prev => new Set(prev).add(item.id));
      setDeletedCount(prev => prev + 1);
    } catch (error) {
      alert(t('reconciliation.errorDeleting'));
    } finally {
      setDeletingItem(null);
    }
  };

  const handleSelectAllOfxOnly = () => {
    setItemsToAdd(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], selected: true };
      });
      return next;
    });
  };

  // Aplicar todas as sugestões automáticas de categoria
  const handleApplySuggestions = () => {
    setItemsToAdd(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id].suggestedCategoryId && next[id].suggestedCategoryId! > 0) {
          next[id] = { ...next[id], selected: true, categoryId: next[id].suggestedCategoryId! };
        }
      });
      return next;
    });
  };

  // Quantos itens têm sugestão disponível
  const suggestionsAvailable = useMemo(() => {
    return Object.values(itemsToAdd).filter(i => i.suggestedCategoryId && i.suggestedCategoryId > 0 && !i.selected).length;
  }, [itemsToAdd]);

  // Excluir todos os itens system_only de uma vez
  const handleDeleteAll = async () => {
    const systemOnlyItems = reconciliation.filter(
      r => r.status === 'system_only' && !deletedItems.has(r.id) && r.systemTransaction
    );
    if (systemOnlyItems.length === 0) return;
    setConfirmDeleteAll(false);
    setDeletingAll(true);
    try {
      const supabase = createClient();
      const ids = systemOnlyItems.map(r => r.systemTransaction!.id);
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .in('id', ids);
      if (error) throw error;
      const newDeleted = new Set(deletedItems);
      systemOnlyItems.forEach(r => newDeleted.add(r.id));
      setDeletedItems(newDeleted);
      setDeletedCount(prev => prev + systemOnlyItems.length);
    } catch (error) {
      alert(t('reconciliation.errorDeleting'));
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const supabase = createClient();
      let count = 0;

      for (const [id, item] of Object.entries(itemsToAdd)) {
        if (!item.selected || item.categoryId <= 0) continue;

        const reconcItem = reconciliation.find(r => r.id === id);
        if (!reconcItem?.ofxTransaction) continue;

        const ofxDate = reconcItem.ofxTransaction.datePosted;
        const mes = ofxDate.substring(0, 7); // YYYY-MM

        const { error } = await supabase.from('transacoes').insert({
          descricao: item.description || reconcItem.ofxTransaction.memo,
          valor: reconcItem.ofxTransaction.amount,
          categoria_id: item.categoryId,
          tipo: item.tipo,
          usuario_id: profile.id,
          dependente_id: profile.is_dependente ? profile.dependente_id : null,
          tipo_conta: accountFilter,
          conta_id: accountId,
          data: `${ofxDate}T12:00:00`,
          mes,
          is_transferencia: false,
        });

        if (error) throw error;
        count++;
      }

      setSavedCount(count);
      setStep('complete');

      // Disparar evento para atualizar transações
      window.dispatchEvent(new CustomEvent('transactionsChanged'));
    } catch (error) {
      alert(t('reconciliation.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    const wasComplete = step === 'complete';
    const hadChanges = adjustedCount > 0 || deletedCount > 0;
    setStep('upload');
    setFileName('');
    setOfxPeriod({ start: '', end: '' });
    setOfxOrg('');
    setReconciliation([]);
    setFilterTab('all');
    setExpandedItem(null);
    setSearchTerm('');
    setItemsToAdd({});
    setSavedCount(0);
    setAdjustedCount(0);
    setDeletedCount(0);
    setAdjustedItems(new Set());
    setDeletedItems(new Set());
    setConfirmDeleteAll(false);
    setDeletingAll(false);
    onClose();
    if (wasComplete || hadChanges) {
      onSuccess();
    }
  };

  const formatPeriod = () => {
    if (!ofxPeriod.start || !ofxPeriod.end) return '';
    const fmt = (d: string) => d.split('-').reverse().join('/');
    return `${fmt(ofxPeriod.start)} — ${fmt(ofxPeriod.end)}`;
  };

  // Categorias filtradas por tipo da transação
  const getCategoriesForType = (tipo: 'entrada' | 'saida') => {
    return allCategories.filter(c => c.tipo === tipo || c.tipo === 'ambos');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'complete' ? t('reconciliation.bankComplete') : t('reconciliation.bankTitle')}
      className="max-w-3xl md:max-w-4xl"
    >
      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('reconciliation.bankImportTitle')}</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              {t('reconciliation.bankImportDesc')} <span className="text-[var(--text-primary)] font-medium">{accountName}</span>.
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--border-medium)] rounded-xl cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
              {loadingSystem ? (
                <>
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                  <span className="text-sm text-[var(--text-secondary)]">{t('reconciliation.processing')}</span>
                </>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-[var(--text-tertiary)] group-hover:text-blue-400 transition-colors mb-3" />
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {t('reconciliation.selectFile')}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] mt-1">.ofx</span>
                </>
              )}
              <input
                type="file"
                accept=".ofx,.OFX"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loadingSystem}
              />
            </label>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 max-w-md mx-auto">
            <p className="text-xs text-blue-400/80 text-center">
              {t('reconciliation.bankOFXHint')}
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-card-inner)] border border-[var(--border-default)] rounded-lg p-3 text-center">
              <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)] mb-1">{t('reconciliation.totalStatement')}</p>
              <p className="text-sm sm:text-lg font-bold font-mono text-[var(--text-primary)]">{counts.matched + counts.ofxOnly}</p>
            </div>
            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center">
              <p className="text-[10px] sm:text-xs text-green-400/70 mb-1">{t('reconciliation.reconciled')}</p>
              <p className="text-sm sm:text-lg font-bold font-mono text-green-400">{counts.matched}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-center">
              <p className="text-[10px] sm:text-xs text-amber-400/70 mb-1">{t('reconciliation.notInSystem')}</p>
              <p className="text-sm sm:text-lg font-bold font-mono text-amber-400">{counts.ofxOnly}</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-center">
              <p className="text-[10px] sm:text-xs text-red-400/70 mb-1">{t('reconciliation.notInStatement')}</p>
              <p className="text-sm sm:text-lg font-bold font-mono text-red-400">{counts.systemOnly}</p>
            </div>
          </div>

          {/* File info */}
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <FileText className="w-3.5 h-3.5" />
              <span>{fileName}</span>
              {ofxOrg && <><span>•</span><span>{ofxOrg}</span></>}
              {ofxPeriod.start && <><span>•</span><span>{formatPeriod()}</span></>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {suggestionsAvailable > 0 && (
                <button
                  onClick={handleApplySuggestions}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Aplicar {suggestionsAvailable} sugestão(ões)
                </button>
              )}
              {counts.ofxOnly > 0 && (
                <button
                  onClick={handleSelectAllOfxOnly}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('reconciliation.selectAllMissing')}
                </button>
              )}
              {counts.systemOnly - deletedItems.size > 0 && (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={deletingAll}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Excluir todos sem extrato ({counts.systemOnly - deletedItems.size})
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-lg p-1">
            {([
              { key: 'all', label: t('reconciliation.tabAll'), count: counts.total },
              { key: 'matched', label: t('reconciliation.tabReconciled'), count: counts.matched },
              { key: 'ofx_only', label: t('reconciliation.tabNotInSystem'), count: counts.ofxOnly },
              { key: 'system_only', label: t('reconciliation.tabNotInStatement'), count: counts.systemOnly },
            ] as { key: FilterTab; label: string; count: number }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors",
                  filterTab === tab.key
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('reconciliation.searchPlaceholder')}
              className="w-full h-9 pl-9 pr-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
            />
          </div>

          {/* Items List */}
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredItems.map(item => (
              <BankReconciliationRow
                key={item.id}
                item={item}
                isExpanded={expandedItem === item.id}
                onToggleExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                formatCurrency={formatCurrency}
                getCategoriesForType={getCategoriesForType}
                addState={itemsToAdd[item.id]}
                onToggleAdd={() => handleToggleAddItem(item.id)}
                onSetCategory={(catId) => handleSetCategory(item.id, catId)}
                onSetDescription={(desc) => handleSetDescription(item.id, desc)}
                onAdjustValue={() => handleAdjustValue(item)}
                isAdjusted={adjustedItems.has(item.id)}
                isAdjusting={adjustingItem === item.id}
                onDeleteSystem={() => handleDeleteSystemItem(item)}
                isDeleted={deletedItems.has(item.id)}
                isDeleting={deletingItem === item.id}
                t={t}
              />
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-[var(--text-tertiary)]">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('reconciliation.noItems')}</p>
              </div>
            )}
          </div>

          {/* Success banner when fully reconciled */}
          {counts.ofxOnly === 0 && counts.systemOnly === 0 && (
            <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/10 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-400 font-medium">{t('reconciliation.fullyReconciled')}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {t('reconciliation.allMatched').replace('{count}', String(counts.matched))}
                  {adjustedCount > 0 && ` ${adjustedCount} ${t('reconciliation.valuesAdjusted')}`}
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
            <button
              onClick={() => { setStep('upload'); setReconciliation([]); }}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('common.back')}
            </button>
            <div className="flex items-center gap-3">
              {counts.ofxOnly > 0 ? (
                <>
                  {selectedToAddCount > 0 && (
                    <span className="text-xs text-blue-400">
                      {selectedToAddCount} {t('reconciliation.itemsToAdd')}
                    </span>
                  )}
                  <button
                    onClick={handleSaveSelected}
                    disabled={saving || selectedToAddCount === 0}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      selectedToAddCount > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-[var(--text-primary)]"
                        : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {t('reconciliation.addSelected')} ({selectedToAddCount})
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setStep('complete')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('reconciliation.finish')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Complete */}
      {step === 'complete' && (
        <div className="space-y-6 py-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('reconciliation.bankCompleteTitle')}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {savedCount === 0 && adjustedCount === 0 && deletedCount === 0 ? (
                <>
                  {t('reconciliation.bankAllCorrect')} <span className="text-[var(--text-primary)] font-medium">{accountName}</span>.
                </>
              ) : (
                <>
                  {savedCount > 0 && (
                    <><span className="text-blue-400 font-medium">{savedCount}</span> {t('reconciliation.added')}. </>
                  )}
                  {adjustedCount > 0 && (
                    <><span className="text-amber-400 font-medium">{adjustedCount}</span> {t('reconciliation.adjusted')}. </>
                  )}
                  {deletedCount > 0 && (
                    <><span className="text-red-400 font-medium">{deletedCount}</span> {t('reconciliation.deleted')}. </>
                  )}
                  {t('reconciliation.accountUpdated')} <span className="text-[var(--text-primary)] font-medium">{accountName}</span>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 min-w-[100px] text-center">
              <p className="text-[10px] sm:text-xs text-green-400/70 mb-1">{t('reconciliation.reconciled')}</p>
              <p className="text-lg font-bold text-green-400">{counts.matched}</p>
            </div>
            {savedCount > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 min-w-[100px] text-center">
                <p className="text-[10px] sm:text-xs text-blue-400/70 mb-1">{t('reconciliation.addedItems')}</p>
                <p className="text-lg font-bold text-blue-400">{savedCount}</p>
              </div>
            )}
            {adjustedCount > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 min-w-[100px] text-center">
                <p className="text-[10px] sm:text-xs text-amber-400/70 mb-1">{t('reconciliation.adjustedItems')}</p>
                <p className="text-lg font-bold text-amber-400">{adjustedCount}</p>
              </div>
            )}
            {deletedCount > 0 && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 min-w-[100px] text-center">
                <p className="text-[10px] sm:text-xs text-red-400/70 mb-1">{t('reconciliation.deletedItems')}</p>
                <p className="text-lg font-bold text-red-400">{deletedCount}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Modal de confirmação de exclusão individual */}
      {confirmDeleteItem && confirmDeleteItem.systemTransaction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-2">{t('reconciliation.confirmDeleteTitle')}</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-1">
              {t('reconciliation.confirmDeleteDesc')}
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 my-4">
              <p className="text-sm text-[var(--text-primary)] font-medium">{confirmDeleteItem.systemTransaction.descricao}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-[var(--text-secondary)]">
                  {confirmDeleteItem.systemTransaction.data_prevista.split('-').reverse().join('/')}
                </span>
                <span className="text-xs text-[var(--text-muted)]">•</span>
                <span className={cn(
                  "text-xs font-mono font-medium",
                  confirmDeleteItem.systemTransaction.tipo === 'entrada' ? "text-green-400" : "text-red-400"
                )}>
                  {confirmDeleteItem.systemTransaction.tipo === 'entrada' ? '+' : '-'}{formatCurrency(confirmDeleteItem.systemTransaction.valor)}
                </span>
                {confirmDeleteItem.systemTransaction.categoria_nome && (
                  <>
                    <span className="text-xs text-[var(--text-muted)]">•</span>
                    <span className="text-xs text-[var(--text-secondary)]">{confirmDeleteItem.systemTransaction.categoria_nome}</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-red-400/60 text-center mb-4">
              {t('reconciliation.cannotUndo')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDeleteItem(null)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-[var(--border-medium)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão em massa (system_only) */}
      {confirmDeleteAll && (() => {
        const pendingCount = reconciliation.filter(r => r.status === 'system_only' && !deletedItems.has(r.id)).length;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] text-center mb-2">Excluir Todos Sem Extrato?</h3>
              <p className="text-sm text-[var(--text-secondary)] text-center mb-1">
                Esta ação irá excluir <span className="text-red-400 font-semibold">{pendingCount} lançamento(s)</span> que existem no sistema mas não foram encontrados no extrato.
              </p>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 my-4 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {reconciliation.filter(r => r.status === 'system_only' && !deletedItems.has(r.id) && r.systemTransaction).map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--text-primary)] truncate flex-1">{r.systemTransaction!.descricao}</p>
                    <span className={cn(
                      "text-xs font-mono flex-shrink-0",
                      r.systemTransaction!.tipo === 'entrada' ? "text-green-400" : "text-red-400"
                    )}>
                      {r.systemTransaction!.tipo === 'entrada' ? '+' : '-'}{formatCurrency(r.systemTransaction!.valor)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-red-400/60 text-center mb-4">
                {t('reconciliation.cannotUndo')}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-[var(--border-medium)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Todos ({pendingCount})
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}

// ==========================================
// Componente de linha de conciliação bancária
// ==========================================

interface BankReconciliationRowProps {
  item: ReconciliationItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatCurrency: (value: number) => string;
  getCategoriesForType: (tipo: 'entrada' | 'saida') => { id: number; descricao: string }[];
  addState?: { selected: boolean; categoryId: number; description: string; tipo: 'entrada' | 'saida'; suggestedCategoryId?: number; suggestionConfidence?: number };
  onToggleAdd: () => void;
  onSetCategory: (catId: number) => void;
  onSetDescription: (desc: string) => void;
  onAdjustValue: () => void;
  isAdjusted: boolean;
  isAdjusting: boolean;
  onDeleteSystem: () => void;
  isDeleted: boolean;
  isDeleting: boolean;
  t: (key: string) => string;
}

function BankReconciliationRow({
  item,
  isExpanded,
  onToggleExpand,
  formatCurrency,
  getCategoriesForType,
  addState,
  onToggleAdd,
  onSetCategory,
  onSetDescription,
  onAdjustValue,
  isAdjusted,
  isAdjusting,
  onDeleteSystem,
  isDeleted,
  isDeleting,
  t,
}: BankReconciliationRowProps) {
  const statusConfig = {
    matched: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/5 border-green-500/10',
    },
    ofx_only: {
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/5 border-amber-500/10',
    },
    system_only: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/5 border-red-500/10',
    },
  };

  const config = statusConfig[item.status];
  const Icon = config.icon;

  const isCredit = item.ofxTransaction?.type === 'CREDIT' || item.systemTransaction?.tipo === 'entrada';
  const TypeIcon = isCredit ? TrendingUp : TrendingDown;

  const hasValueDiff = item.status === 'matched' && item.ofxTransaction && item.systemTransaction &&
    Math.abs(item.ofxTransaction.amount - item.systemTransaction.valor) > 0.01;

  // Categorias baseadas no tipo da transação
  const categories = addState
    ? getCategoriesForType(addState.tipo)
    : getCategoriesForType('saida');

  if (isDeleted) {
    return (
      <div className="border rounded-lg bg-zinc-500/5 border-zinc-500/10 opacity-50">
        <div className="p-3 flex items-center gap-3">
          <Trash2 className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          <p className="text-xs text-[var(--text-tertiary)] line-through flex-1">
            {item.systemTransaction?.descricao || '—'}
          </p>
          <span className="text-[10px] text-zinc-600">{t('reconciliation.deletedLabel')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg transition-colors", config.bg)}>
      {/* Main Row */}
      <div
        onClick={onToggleExpand}
        className="w-full text-left p-3 cursor-pointer"
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />

          {item.status === 'ofx_only' && (
            <input
              type="checkbox"
              checked={addState?.selected || false}
              onChange={(e) => { e.stopPropagation(); onToggleAdd(); }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-[var(--border-strong)] bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
            />
          )}

          {/* Type badge (receita/despesa) */}
          <div className={cn(
            "p-1 rounded flex-shrink-0",
            isCredit ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            <TypeIcon className={cn("w-3 h-3", isCredit ? "text-green-400" : "text-red-400")} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium truncate">
              {item.ofxTransaction?.memo || item.systemTransaction?.descricao || '—'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {item.ofxTransaction && (
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {item.ofxTransaction.datePosted.split('-').reverse().join('/')}
                </span>
              )}
              {item.status === 'matched' && item.systemTransaction && (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                    {item.systemTransaction.descricao}
                  </span>
                </>
              )}
              {item.status === 'system_only' && item.systemTransaction && (
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {item.systemTransaction.data_prevista.split('-').reverse().join('/')}
                  {item.systemTransaction.categoria_nome && ` • ${item.systemTransaction.categoria_nome}`}
                </span>
              )}
            </div>
          </div>

          {item.status === 'matched' && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 hidden sm:inline",
              item.confidence >= 80 ? "bg-green-500/10 text-green-400" :
              item.confidence >= 50 ? "bg-amber-500/10 text-amber-400" :
              "bg-red-500/10 text-red-400"
            )}>
              {item.confidence}%
            </span>
          )}

          <div className="text-right flex-shrink-0">
            <p className={cn(
              "text-xs sm:text-sm font-mono font-bold",
              isCredit ? "text-green-400" : "text-[var(--text-primary)]"
            )}>
              {isCredit ? '+' : '-'}{formatCurrency(item.ofxTransaction?.amount || item.systemTransaction?.valor || 0)}
            </p>
            {hasValueDiff && !isAdjusted && (
              <p className="text-[10px] text-amber-400 font-mono">
                Sis: {formatCurrency(item.systemTransaction!.valor)}
              </p>
            )}
            {isAdjusted && (
              <p className="text-[10px] text-green-400 font-mono">{t('reconciliation.adjustedLabel')} ✓</p>
            )}
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Inline category select for ofx_only items when selected */}
      {item.status === 'ofx_only' && addState?.selected && !isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)]">{t('reconciliation.description')}</label>
              <input
                type="text"
                value={addState.description}
                onChange={(e) => onSetDescription(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-8 px-2 mt-0.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-blue-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                {t('reconciliation.category')} <span className="text-red-400">*</span>
                {addState.suggestedCategoryId && addState.suggestedCategoryId === addState.categoryId && (
                  <span className="flex items-center gap-0.5 text-purple-400 text-[9px] font-medium">
                    <Sparkles className="w-2.5 h-2.5" /> sugerido
                  </span>
                )}
              </label>
              <select
                value={addState.categoryId}
                onChange={(e) => onSetCategory(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-8 px-2 mt-0.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-blue-500/30"
              >
                <option value={0}>{t('reconciliation.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.descricao}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
          {/* === MATCHED === */}
          {item.status === 'matched' && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[var(--bg-base)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase mb-2 font-medium">{t('reconciliation.statementOFX')}</p>
                  <p className="text-sm text-[var(--text-primary)] break-words">{item.ofxTransaction?.memo}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {t('reconciliation.date')}: {item.ofxTransaction?.datePosted.split('-').reverse().join('/')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t('reconciliation.value')}: {isCredit ? '+' : '-'}{formatCurrency(item.ofxTransaction?.amount || 0)}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    FITID: {item.ofxTransaction?.fitId}
                  </p>
                </div>
                <div className="bg-[var(--bg-base)] rounded-lg p-3">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase mb-2 font-medium">{t('reconciliation.system')}</p>
                  <p className="text-sm text-[var(--text-primary)] break-words">{item.systemTransaction?.descricao}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {t('reconciliation.date')}: {item.systemTransaction?.data_prevista.split('-').reverse().join('/')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t('reconciliation.value')}: {formatCurrency(item.systemTransaction?.valor || 0)}
                  </p>
                  {item.systemTransaction?.categoria_nome && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t('reconciliation.category')}: {item.systemTransaction.categoria_nome}
                    </p>
                  )}
                </div>
              </div>

              {hasValueDiff && !isAdjusted && (
                <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 flex-wrap gap-2">
                  <div>
                    <p className="text-xs text-amber-400 font-medium">{t('reconciliation.differentValues')}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                      OFX: {formatCurrency(item.ofxTransaction?.amount || 0)} → {t('reconciliation.system')}: {formatCurrency(item.systemTransaction?.valor || 0)}
                      <span className="text-amber-400 ml-1">
                        (dif: {formatCurrency(Math.abs((item.ofxTransaction?.amount || 0) - (item.systemTransaction?.valor || 0)))})
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={onAdjustValue}
                    disabled={isAdjusting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isAdjusting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {t('reconciliation.adjustTo')} {formatCurrency(item.ofxTransaction?.amount || 0)}
                  </button>
                </div>
              )}
              {isAdjusted && (
                <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-green-400">{t('reconciliation.valueAdjustedSuccess')} {formatCurrency(item.ofxTransaction?.amount || 0)}</p>
                </div>
              )}
            </div>
          )}

          {/* === OFX ONLY === */}
          {item.status === 'ofx_only' && item.ofxTransaction && (
            <div className="mt-3 space-y-3">
              <div className="bg-[var(--bg-base)] rounded-lg p-3">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase mb-2 font-medium">{t('reconciliation.statementDetails')}</p>
                <p className="text-sm text-[var(--text-primary)] break-words">{item.ofxTransaction.memo}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t('reconciliation.date')}: {item.ofxTransaction.datePosted.split('-').reverse().join('/')} • {t('reconciliation.value')}: {isCredit ? '+' : '-'}{formatCurrency(item.ofxTransaction.amount)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    isCredit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {isCredit ? t('reconciliation.income') : t('reconciliation.expense')}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">FITID: {item.ofxTransaction.fitId}</p>
              </div>

              {addState?.selected && (
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-blue-400 uppercase font-medium">{t('reconciliation.addToSystem')}</p>
                  <div>
                    <label className="text-[10px] text-[var(--text-tertiary)]">{t('reconciliation.description')}</label>
                    <input
                      type="text"
                      value={addState.description}
                      onChange={(e) => onSetDescription(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-8 px-2 mt-0.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-tertiary)]">
                      {t('reconciliation.category')} <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={addState.categoryId}
                      onChange={(e) => onSetCategory(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-8 px-2 mt-0.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)] text-xs focus:outline-none focus:border-blue-500/30 appearance-auto"
                    >
                      <option value={0}>{t('reconciliation.selectCategory')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.descricao}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === SYSTEM ONLY === */}
          {item.status === 'system_only' && item.systemTransaction && (
            <div className="mt-3 space-y-3">
              <div className="bg-[var(--bg-base)] rounded-lg p-3">
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase mb-2 font-medium">{t('reconciliation.systemOnlyDesc')}</p>
                <p className="text-sm text-[var(--text-primary)] break-words">{item.systemTransaction.descricao}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t('reconciliation.date')}: {item.systemTransaction.data_prevista.split('-').reverse().join('/')} • {t('reconciliation.value')}: {formatCurrency(item.systemTransaction.valor)}
                </p>
                {item.systemTransaction.categoria_nome && (
                  <p className="text-xs text-[var(--text-secondary)]">{t('reconciliation.category')}: {item.systemTransaction.categoria_nome}</p>
                )}
                <p className="text-[10px] text-red-400/70 mt-2">
                  {t('reconciliation.systemOnlyHint')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onDeleteSystem}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {t('reconciliation.deleteTransaction')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
