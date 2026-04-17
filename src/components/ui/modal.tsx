"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Rastreia se o mousedown começou dentro do conteúdo do modal
  // para evitar fechar ao arrastar texto para fora do modal
  const mouseDownOnOverlay = useRef(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    // Só marca como "clique no overlay" se o mousedown foi diretamente no backdrop
    mouseDownOnOverlay.current = e.target === overlayRef.current;
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Só fecha se o mousedown E o mouseup (click) foram ambos no overlay
    // Evita fechar ao arrastar seleção de texto de dentro para fora do modal
    if (e.target === overlayRef.current && mouseDownOnOverlay.current) {
      onClose();
    }
    mouseDownOnOverlay.current = false;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 transition-all duration-200"
    >
      <div
        className={cn(
          "bg-[var(--bg-card)] border-t md:border border-[var(--border-medium)] rounded-t-2xl md:rounded-xl w-full max-w-3xl shadow-2xl flex flex-col",
          "max-h-[85vh] md:h-auto md:max-h-[90vh]",
          "animate-in slide-in-from-bottom md:fade-in md:zoom-in-95 duration-300",
          className
        )}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-3 md:p-6 border-b border-[var(--border-default)] flex-shrink-0">
          <h2 className="text-base md:text-xl font-semibold text-[var(--text-primary)] truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 hover:bg-[var(--bg-hover)] rounded-lg flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 md:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
