"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Plus, X } from "lucide-react";

interface PlanCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: any) => Promise<void>;
}

export function PlanCreateModal({ isOpen, onClose, onSave }: PlanCreateModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    tipo_periodo: 'mensal',
    valor: '0',
    link_checkout: '',
    descricao: '',
    permite_compartilhamento: false,
    max_usuarios_dependentes: 0,
    destaque: false,
    permite_modo_pj: true,
    permite_investimentos: false,
  });
  const [recursos, setRecursos] = useState<string[]>([]);
  const [newRecurso, setNewRecurso] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        valor: parseFloat(formData.valor),
        recursos,
      });
      setFormData({
        nome: '',
        tipo_periodo: 'mensal',
        valor: '0',
        link_checkout: '',
        descricao: '',
        permite_compartilhamento: false,
        max_usuarios_dependentes: 0,
        destaque: false,
        permite_modo_pj: true,
        permite_investimentos: false,
      });
      setRecursos([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Plano">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nome *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Período *</label>
            <select
              value={formData.tipo_periodo}
              onChange={(e) => setFormData({ ...formData, tipo_periodo: e.target.value })}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
            >
              <option value="free">Gratuito</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="vitalicio">Vitalício</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Valor (R$) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Link Checkout</label>
          <input
            type="url"
            value={formData.link_checkout}
            onChange={(e) => setFormData({ ...formData, link_checkout: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Descrição</label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Recursos</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRecurso}
              onChange={(e) => setNewRecurso(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), setRecursos([...recursos, newRecurso.trim()]), setNewRecurso(''))}
              className="flex-1 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
              placeholder="Digite um recurso..."
            />
            <button
              type="button"
              onClick={() => { setRecursos([...recursos, newRecurso.trim()]); setNewRecurso(''); }}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[var(--text-primary)] px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-1">
            {recursos.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--bg-base)] border border-[var(--border-medium)] rounded px-3 py-2">
                <span className="text-sm text-[var(--text-primary)]">{r}</span>
                <button type="button" onClick={() => setRecursos(recursos.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[var(--text-primary)] font-medium">Permite Compartilhamento</div>
                <div className="text-sm text-[var(--text-secondary)]">Usuários podem adicionar dependentes</div>
              </div>
              <input
                type="checkbox"
                checked={formData.permite_compartilhamento}
                onChange={(e) => setFormData({ ...formData, permite_compartilhamento: e.target.checked })}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[var(--text-primary)] font-medium">Plano Destaque</div>
                <div className="text-sm text-[var(--text-secondary)]">Exibir como Mais Escolhido</div>
              </div>
              <input
                type="checkbox"
                checked={formData.destaque}
                onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
        </div>

        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-[var(--text-primary)] font-medium">Permite Modo PJ</div>
              <div className="text-sm text-[var(--text-secondary)]">Usuários podem usar contas Pessoa Jurídica</div>
            </div>
            <input
              type="checkbox"
              checked={formData.permite_modo_pj}
              onChange={(e) => setFormData({ ...formData, permite_modo_pj: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>

        <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-[var(--text-primary)] font-medium">Investimentos</div>
              <div className="text-sm text-[var(--text-secondary)]">Usuários podem usar o módulo de investimentos</div>
            </div>
            <input
              type="checkbox"
              checked={formData.permite_investimentos}
              onChange={(e) => setFormData({ ...formData, permite_investimentos: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>

        {formData.permite_compartilhamento && (
          <div className="bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl p-4">
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Máx. Dependentes (-1 = ilimitado)</label>
            <input
              type="number"
              value={formData.max_usuarios_dependentes || 0}
              onChange={(e) => setFormData({ ...formData, max_usuarios_dependentes: parseInt(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] rounded px-3 py-2 text-[var(--text-primary)]"
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Criando...' : 'Criar Plano'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
