"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useAccounts, BankAccount } from "@/hooks/use-accounts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: BankAccount | null;
}

export function AdjustBalanceModal({ isOpen, onClose, account, onSuccess }: AdjustBalanceModalProps) {
  const { t } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const { filter: accountFilter } = useAccountFilter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
      });
      setType('entrada');
      setFeedback(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    setLoading(true);
    setFeedback(null);

    const amount = parseFloat(formData.amount);
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      setFeedback({ type: 'error', message: t('validation.valueRequired') });
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 🔒 SEGURANÇA: Buscar usuario_id correto (INTEGER) usando função segura
      const { data: usuarioIdData, error: usuarioError } = await supabase
        .rpc('get_usuario_id_from_auth');
      
      if (usuarioError || !usuarioIdData) {
        throw new Error('Erro ao validar usuário');
      }

      // Buscar ou criar categoria "Ajuste de Saldo" do usuário
      let categoriaId: number;
      
      const { data: categoriaExistente } = await supabase
        .from('categoria_trasacoes')
        .select('id')
        .eq('descricao', 'Ajuste de Saldo')
        .eq('tipo', type)
        .eq('tipo_conta', accountFilter)
        .eq('usuario_id', usuarioIdData)
        .maybeSingle();

      if (categoriaExistente) {
        categoriaId = categoriaExistente.id;
      } else {
        const { data: novaCategoria, error: catError } = await supabase
          .from('categoria_trasacoes')
          .insert({
            descricao: 'Ajuste de Saldo',
            tipo: type,
            tipo_conta: accountFilter,
            usuario_id: usuarioIdData,
            icon_key: 'Settings'
          })
          .select('id')
          .single();

        if (catError || !novaCategoria) {
          throw new Error(`Erro ao criar categoria de ajuste: ${catError?.message}`);
        }
        
        categoriaId = novaCategoria.id;
      }

      // Formatar data com timestamp
      const dataFormatada = `${formData.date}T00:00:00`;
      const mesFormatado = formData.date.substring(0, 7);

      const { error } = await supabase.from('transacoes').insert({
        usuario_id: usuarioIdData,
        tipo_conta: accountFilter,
        conta_id: account.id,
        tipo: type,
        valor: amount,
        descricao: formData.description || (type === 'entrada' ? 'Ajuste (Crédito)' : 'Ajuste (Débito)'),
        data: dataFormatada,
        mes: mesFormatado,
        categoria_id: categoriaId
      });

      if (error) throw error;

      setFeedback({ type: 'success', message: t('accounts.adjustSuccess') });
      
      setTimeout(() => {
        onSuccess();
        onClose();
        setFeedback(null);
      }, 1500);

    } catch (error: any) {
      setFeedback({ type: 'error', message: t('accounts.errorAdjust') });
    } finally {
      setLoading(false);
    }
  };

  if (feedback) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={feedback.type === 'success' ? t('common.save') : 'Erro'} className="max-w-sm">
             <div className="flex flex-col items-center text-center space-y-4 p-4">
                {feedback.type === 'success' ? <CheckCircle2 className="w-12 h-12 text-green-500" /> : <XCircle className="w-12 h-12 text-red-500" />}
                <p className="text-[var(--text-primary)] text-lg font-medium">{feedback.message}</p>
             </div>
        </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('accounts.adjustBalanceTitle')}
      className="max-w-md w-full p-0 overflow-hidden"
    >
      <div className="p-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="mb-6 text-center">
            <p className="text-[var(--text-secondary)] text-sm">{t('accounts.adjustBalanceDesc')}</p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{account?.nome}</p>
        </div>

        {/* Tipo Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            <button
                type="button"
                onClick={() => setType('entrada')}
                className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                    type === 'entrada' 
                        ? "bg-green-500/10 border-green-500 text-green-400" 
                        : "bg-[var(--bg-card-inner)] border-[var(--border-medium)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]"
                )}
            >
                <div className={cn("p-2 rounded-full", type === 'entrada' ? "bg-green-500/20" : "bg-[var(--bg-active)]")}>
                    <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{t('accounts.willBeAdded')}</span>
            </button>

            <button
                type="button"
                onClick={() => setType('saida')}
                className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                    type === 'saida' 
                        ? "bg-red-500/10 border-red-500 text-red-400" 
                        : "bg-[var(--bg-card-inner)] border-[var(--border-medium)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]"
                )}
            >
                <div className={cn("p-2 rounded-full", type === 'saida' ? "bg-red-500/20" : "bg-[var(--bg-active)]")}>
                    <Minus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{t('accounts.willBeSubtracted')}</span>
            </button>
        </div>

        {/* Info Box */}
        <div className={cn(
          "rounded-lg p-3 border mb-6",
          accountFilter === 'pessoal'
            ? "bg-blue-500/10 border-blue-500/20"
            : "bg-purple-500/10 border-purple-500/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              accountFilter === 'pessoal' ? "bg-blue-500/20" : "bg-purple-500/20"
            )}>
              {accountFilter === 'pessoal' ? (
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <div>
              <p className={cn(
                "text-xs font-medium uppercase tracking-wider",
                accountFilter === 'pessoal' ? "text-blue-400" : "text-purple-400"
              )}>
                {accountFilter === 'pessoal' ? t('sidebar.personal') : t('sidebar.pj')}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                O ajuste será vinculado ao seu perfil {accountFilter === 'pessoal' ? 'pessoal' : 'de empresa'}.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
             {/* Data */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] ml-1 uppercase tracking-wide">{t('form.date')}</label>
                <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                    <Calendar className="w-4 h-4" />
                </div>
                <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 h-10 text-sm text-[var(--input-text)] focus:outline-none focus:border-blue-500"
                    style={{ colorScheme: 'dark' }}
                />
                </div>
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] ml-1 uppercase tracking-wide">{t('form.value')}</label>
                <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                    <DollarSign className="w-4 h-4" />
                </div>
                <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 h-10 text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
                />
                </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] ml-1 uppercase tracking-wide">{t('accounts.adjustReason')}</label>
            <input
                type="text"
                placeholder={type === 'entrada' ? "Ex: Estorno, Bônus..." : "Ex: Taxa bancária, Ajuste..."}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 h-10 text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border-default)] mt-4">
            <Button 
              type="button" 
              variant="ghost"
              onClick={onClose}
              className="flex-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              className={cn(
                  "flex-[2] text-white",
                  type === 'entrada' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              )}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {type === 'entrada' ? t('accounts.willBeAdded') : t('accounts.willBeSubtracted')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
