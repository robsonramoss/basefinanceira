"use client";

import { Modal } from "./modal";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface ExportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isExporting: boolean;
  transactionCount: number;
}

export function ExportTransactionsModal({
  isOpen,
  onClose,
  onExportCSV,
  onExportPDF,
  isExporting,
  transactionCount,
}: ExportTransactionsModalProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center space-y-6 py-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-[var(--text-primary)]">{t('common.export')} {t('sidebar.transactions')}</h3>
          <p className="text-[var(--text-secondary)] text-base">
            {transactionCount} {t('pagination.transactions')}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onExportCSV}
            disabled={isExporting}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
            Excel / CSV (.csv)
          </button>
          <button
            onClick={onExportPDF}
            disabled={isExporting}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            PDF (.pdf)
          </button>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-full bg-[var(--bg-active)] hover:bg-[var(--bg-strong)] text-[var(--text-primary)] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
