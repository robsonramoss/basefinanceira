"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { createClient } from "@/lib/supabase/client";
import { Tutorial } from "@/hooks/use-tutorials";

type TutorialModulo =
  | 'primeiros_passos'
  | 'dashboard'
  | 'receitas'
  | 'despesas'
  | 'transacoes'
  | 'cartao'
  | 'contas'
  | 'investimentos'
  | 'categorias'
  | 'programados'
  | 'metas'
  | 'relatorios'
  | 'tutoriais'
  | 'configuracoes'
  | 'ia_whats'
  | 'instalar_app'
  | 'compromissos'
  | 'plano_casal';
type TutorialNivel = 'basico' | 'intermediario' | 'avancado';
type TutorialIdioma = 'pt' | 'es' | 'en';

interface TutorialFormModalProps {
  tutorial?: Tutorial;
  onClose: () => void;
  onSave: () => void;
}

export function TutorialFormModal({ tutorial, onClose, onSave }: TutorialFormModalProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [titulo, setTitulo] = useState(tutorial?.titulo || '');
  const [descricao, setDescricao] = useState(tutorial?.descricao || '');
  const [videoUrl, setVideoUrl] = useState(tutorial?.video_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(tutorial?.thumbnail_url || '');
  const [modulo, setModulo] = useState<TutorialModulo>(tutorial?.modulo || 'primeiros_passos');
  const [ordem, setOrdem] = useState(tutorial?.ordem || 1);
  const [nivel, setNivel] = useState<TutorialNivel>(tutorial?.nivel || 'basico');
  const [idioma, setIdioma] = useState<TutorialIdioma>(tutorial?.idioma || 'pt');
  const [ativo, setAtivo] = useState(tutorial?.ativo !== false);

  // Format seconds to MM:SS
  const formatSecondsToMMSS = (totalSeconds: number | null | undefined) => {
    if (!totalSeconds) return '';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [duracaoInput, setDuracaoInput] = useState(formatSecondsToMMSS(tutorial?.duracao_seg));

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Parse MM:SS to seconds properly
      let duracaoParse: number | null = null;
      if (duracaoInput) {
        const parts = duracaoInput.split(':');
        if (parts.length === 2) {
          const m = parseInt(parts[0]);
          const s = parseInt(parts[1]);
          if (!isNaN(m) && !isNaN(s)) {
            duracaoParse = m * 60 + s;
          }
        } else if (parts.length === 1) {
          const s = parseInt(parts[0]);
          if (!isNaN(s)) {
            duracaoParse = s;
          }
        }
      }

      const tutorialData = {
        titulo,
        descricao,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        modulo,
        ordem,
        nivel,
        idioma,
        ativo,
        duracao_seg: duracaoParse,
      };

      if (tutorial) {
        // Update existing tutorial
        const { error: updateError } = await supabase
          .from('tutoriais')
          .update(tutorialData)
          .eq('id', tutorial.id);

        if (updateError) throw updateError;
      } else {
        // Create new tutorial
        const { error: insertError } = await supabase
          .from('tutoriais')
          .insert([tutorialData]);

        if (insertError) throw insertError;
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving tutorial:', err);
      let errorMsg = 'Erro ao salvar tutorial';
      if (err.message) errorMsg = err.message;
      else if (err.details) errorMsg = `${err.code}: ${err.details}`;
      else if (typeof err === 'object') errorMsg = JSON.stringify(err);
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const modules: { value: TutorialModulo; label: string }[] = [
    { value: 'primeiros_passos', label: t('tutorials.modules.primeiros_passos') },
    { value: 'dashboard', label: t('tutorials.modules.dashboard') },
    { value: 'receitas', label: t('tutorials.modules.receitas') },
    { value: 'despesas', label: t('tutorials.modules.despesas') },
    { value: 'transacoes', label: t('tutorials.modules.transacoes') },
    { value: 'cartao', label: t('tutorials.modules.cartao') },
    { value: 'contas', label: t('tutorials.modules.contas') },
    { value: 'investimentos', label: t('tutorials.modules.investimentos') },
    { value: 'categorias', label: t('tutorials.modules.categorias') },
    { value: 'programados', label: t('tutorials.modules.programados') },
    { value: 'metas', label: t('tutorials.modules.metas') },
    { value: 'relatorios', label: t('tutorials.modules.relatorios') },
    { value: 'tutoriais', label: t('tutorials.modules.tutoriais') },
    { value: 'configuracoes', label: t('tutorials.modules.configuracoes') },
    { value: 'ia_whats', label: t('tutorials.modules.ia_whats') },
    { value: 'instalar_app', label: t('tutorials.modules.instalar_app') },
    { value: 'compromissos', label: t('tutorials.modules.compromissos') },
    { value: 'plano_casal', label: t('tutorials.modules.plano_casal') },
  ];

  const levels: { value: TutorialNivel; label: string }[] = [
    { value: 'basico', label: t('tutorials.level.basico') },
    { value: 'intermediario', label: t('tutorials.level.intermediario') },
    { value: 'avancado', label: t('tutorials.level.avancado') },
  ];

  const languages: { value: TutorialIdioma; label: string }[] = [
    { value: 'pt', label: 'Português' },
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-background rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">
              {tutorial ? t('tutorials.admin.editTutorial') : t('tutorials.admin.addTutorial')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tutorial ? 'Edite as informações do tutorial' : 'Adicione um novo tutorial ao sistema'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('tutorials.form.title')} *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('tutorials.form.description')}
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('tutorials.form.videoUrl')} *
            </label>
            <div className="relative">
              <Play className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cole a URL completa do vídeo do YouTube
            </p>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('tutorials.form.thumbnailUrl')}
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe em branco para usar thumbnail automática do YouTube
            </p>
          </div>

          {/* Row: Module, Order, Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Módulo */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('tutorials.form.module')} *
              </label>
              <select
                value={modulo}
                onChange={(e) => setModulo(e.target.value as TutorialModulo)}
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
                required
              >
                {modules.map((mod) => (
                  <option key={mod.value} value={mod.value}>
                    {mod.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordem */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('tutorials.form.order')} *
              </label>
              <input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {/* Nível */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('tutorials.form.level')} *
              </label>
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value as TutorialNivel)}
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
                required
              >
                {levels.map((lv) => (
                  <option key={lv.value} value={lv.value}>
                    {lv.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row: Language, Duration, Active */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Idioma *
              </label>
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value as TutorialIdioma)}
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
                required
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duração */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('tutorials.form.duration')}
              </label>
              <input
                type="text"
                value={duracaoInput}
                onChange={(e) => {
                  // Allow typing formats like 3:00 or 03:00, or even just 180 (seconds)
                  // We just store the string here and parse on submit.
                  let val = e.target.value.replace(/[^\d:]/g, '');
                  setDuracaoInput(val);
                }}
                placeholder="Ex: 03:00"
                className="w-full px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Ativo */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('tutorials.form.active')}
              </label>
              <label className="flex items-center gap-3 px-4 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 text-primary bg-[var(--input-bg)] border-[var(--input-border)] rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">{ativo ? 'Sim' : 'Não'}</span>
              </label>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {t('tutorials.form.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              "px-6 py-2.5 bg-primary text-primary-foreground rounded-lg",
              "text-sm font-semibold hover:bg-primary/90 transition-colors",
              "flex items-center gap-2 shadow-lg shadow-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvando...' : t('tutorials.form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
