"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tutorial } from "@/hooks/use-tutorials";
import { useTutorials } from "@/hooks/use-tutorials";
import { useLanguage } from "@/contexts/language-context";

interface TutorialPlayerModalProps {
  tutorialId: string;
  tutorials: Tutorial[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function TutorialPlayerModal({
  tutorialId,
  tutorials,
  onClose,
  onNavigate,
}: TutorialPlayerModalProps) {
  const { t } = useLanguage();
  const { markAsWatched } = useTutorials();
  const [isMarkingWatched, setIsMarkingWatched] = useState(false);

  const currentIndex = tutorials.findIndex((t) => t.id === tutorialId);
  const tutorial = tutorials[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < tutorials.length - 1;

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevenir scroll do body quando modal aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(tutorials[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(tutorials[currentIndex + 1].id);
    }
  };

  const handleMarkWatched = async () => {
    if (!tutorial) return;
    setIsMarkingWatched(true);
    try {
      await markAsWatched(tutorial.id, !tutorial.assistido);
    } finally {
      setIsMarkingWatched(false);
    }
  };

  // Extrair URL embed do YouTube
  const getEmbedUrl = (url: string) => {
    // Extrair video ID para recriar o link do zero garantindo os parâmetros corretos
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match?.[1];

    // O YouTube permite sugerir qualidade HD usando vq=hd1080.
    // Também adicionei rel=0 (não mostrar vídeos de outros canais no fim) e
    // modestbranding=1 (reduzir logo do YT)
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&vq=hd1080&rel=0&modestbranding=1`
      : url;
  };

  if (!tutorial) return null;

  const embedUrl = getEmbedUrl(tutorial.video_url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-background rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          {/* Mobile: Empilhar tudo verticalmente */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Título e descrição */}
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-lg font-semibold line-clamp-1">{tutorial.titulo}</h2>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {tutorial.descricao}
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2 justify-between md:justify-end flex-shrink-0">
              {/* Mark as Watched Button */}
              <button
                onClick={handleMarkWatched}
                disabled={isMarkingWatched}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 flex-1 md:flex-initial justify-center border",
                  tutorial.assistido
                    ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
                )}
              >
                <CheckCircle2 className={cn("h-4 w-4", isMarkingWatched && "animate-spin")} />
                <span className="hidden sm:inline">
                  {tutorial.assistido ? t('tutorials.badge.watched') : t('tutorials.button.markWatched')}
                </span>
                <span className="sm:hidden">
                  {tutorial.assistido ? 'Assistido' : 'Marcar visto'}
                </span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div
          className={cn(
            "relative w-full bg-black flex-shrink-0 mx-auto",
            tutorial.video_url.includes('/shorts/')
              ? "aspect-[9/16] max-w-[400px]"
              : "aspect-video"
          )}
          style={{ maxHeight: 'calc(90vh - 140px)' }}
        >
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={tutorial.titulo}
          />
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 gap-2">
          <button
            onClick={handlePrevious}
            disabled={!hasPrevious}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-colors min-w-[44px] justify-center",
              hasPrevious
                ? "bg-background hover:bg-muted text-foreground"
                : "text-muted-foreground cursor-not-allowed opacity-50"
            )}
            aria-label={t('common.previous')}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline">{t('common.previous')}</span>
          </button>

          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {currentIndex + 1} / {tutorials.length}
          </span>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-md font-medium transition-colors min-w-[44px] justify-center",
              hasNext
                ? "bg-background hover:bg-muted text-foreground"
                : "text-muted-foreground cursor-not-allowed opacity-50"
            )}
            aria-label={t('common.next')}
          >
            <span className="hidden sm:inline">{t('common.next')}</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
