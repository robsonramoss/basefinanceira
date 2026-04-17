"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
  duration?: number;
}

export function UndoToast({ message, onUndo, onClose, duration = 5000 }: UndoToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleUndo = () => {
    setIsVisible(false);
    onUndo();
    setTimeout(onClose, 300);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-4 px-4 py-3 bg-[#323232] text-white rounded-lg shadow-2xl min-w-[300px] max-w-md">
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={handleUndo}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide"
        >
          Desfazer
        </button>
        <button
          onClick={handleClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
