"use client";

import { useState } from "react";
import { Play, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tutorial } from "@/hooks/use-tutorials";
import { useLanguage } from "@/contexts/language-context";

interface TutorialCardProps {
  tutorial: Tutorial;
  onPlay: () => void;
  onToggleWatched: () => void;
}

export function TutorialCard({ tutorial, onPlay, onToggleWatched }: TutorialCardProps) {
  const { t } = useLanguage();
  const [isTogglingWatched, setIsTogglingWatched] = useState(false);

  // Extrair thumbnail do YouTube se não tiver custom
  const getThumbnailUrl = () => {
    if (tutorial.thumbnail_url) return tutorial.thumbnail_url;

    // Extrair video ID do YouTube URL (incluindo links de shorts)
    const match = tutorial.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = match?.[1];

    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const handleToggleWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingWatched(true);
    try {
      await onToggleWatched();
    } finally {
      setIsTogglingWatched(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const thumbnailUrl = getThumbnailUrl();
  const duration = formatDuration(tutorial.duracao_seg);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden transition-all cursor-pointer",
        "hover:shadow-md hover:border-primary/50",
        tutorial.assistido && "opacity-75"
      )}
      onClick={onPlay}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={tutorial.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 bg-primary rounded-full">
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
        </div>

        {/* Duration Badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duration} {t('tutorials.duration')}
          </div>
        )}

        {/* New Badge */}
        {tutorial.is_new && !tutorial.assistido && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t('tutorials.badge.new')}
          </div>
        )}

        {/* Watched Badge */}
        {tutorial.assistido && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('tutorials.badge.watched')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {tutorial.titulo}
          </h3>
          {tutorial.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tutorial.descricao}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            tutorial.nivel === 'basico' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            tutorial.nivel === 'intermediario' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            tutorial.nivel === 'avancado' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {t(`tutorials.level.${tutorial.nivel}`)}
          </span>

          <button
            onClick={handleToggleWatched}
            disabled={isTogglingWatched}
            className={cn(
              "p-2 rounded-full transition-colors",
              tutorial.assistido
                ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            )}
            aria-label={tutorial.assistido ? t('tutorials.button.markUnwatched') : t('tutorials.button.markWatched')}
          >
            <CheckCircle2 className={cn("h-4 w-4", isTogglingWatched && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
}
