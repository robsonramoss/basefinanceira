import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { useBranding } from '@/contexts/branding-context';
import { useLanguage } from '@/contexts/language-context';
import { useCurrency } from '@/contexts/currency-context';

interface Transaction {
  id: number;
  data: string;
  valor: number;
  descricao: string;
  tipo: 'entrada' | 'saida';
  categoria_id: number;
  tipo_conta: 'pessoal' | 'pj';
  is_transferencia?: boolean;
  categoria?: {
    descricao: string;
    icon_key?: string;
  };
}

interface ExportOptions {
  transactions: Transaction[];
  accountFilter: 'pessoal' | 'pj';
  periodLabel: string;
  typeFilter: string;
}

const dateLocales = { pt: ptBR, es: es, en: enUS } as const;
const localeStrings: Record<string, string> = { pt: 'pt-BR', es: 'es-ES', en: 'en-US' };

export function useExportTransactions() {
  const { settings } = useBranding();
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();

  const getTypeLabel = useCallback((tipo: string, isTransfer?: boolean) => {
    if (isTransfer) return t('transactions.transfers');
    return tipo === 'entrada' ? t('transactions.income') : t('transactions.expenses');
  }, [t]);

  const exportToCSV = useCallback((options: ExportOptions) => {
    const { transactions, accountFilter, periodLabel, typeFilter } = options;
    const appName = settings?.appName || 'Gestão Financeira';
    const sep = ';';

    if (transactions.length === 0) return;

    const escapeCell = (val: string) => {
      if (val.includes(sep) || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headers = [
      t('table.date'),
      t('form.type'),
      t('table.description'),
      t('table.category'),
      t('table.amount'),
    ];

    const rows = transactions.map(tx => {
      const dateStr = tx.data.split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      const formattedDate = date.toLocaleDateString(localeStrings[language]);

      return [
        formattedDate,
        getTypeLabel(tx.tipo, tx.is_transferencia === true),
        tx.descricao,
        tx.categoria?.descricao || '-',
        formatCurrency(Number(tx.valor)),
      ];
    });

    const accountText = accountFilter === 'pessoal' ? t('sidebar.personal') : t('sidebar.pj');

    let csvContent = `${appName} - ${t('sidebar.transactions')}\n`;
    csvContent += `${t('table.date')}: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language as keyof typeof dateLocales] })}\n`;
    csvContent += `${accountText} - ${periodLabel}\n\n`;
    csvContent += headers.join(sep) + '\n';
    csvContent += rows.map(row =>
      row.map(cell => escapeCell(String(cell))).join(sep)
    ).join('\n');

    const income = transactions.filter(tx => tx.tipo === 'entrada' && !tx.is_transferencia).reduce((s, tx) => s + Number(tx.valor), 0);
    const expense = transactions.filter(tx => tx.tipo === 'saida' && !tx.is_transferencia).reduce((s, tx) => s + Number(tx.valor), 0);

    csvContent += `\n\n${t('transactions.income')}${sep}${formatCurrency(income)}`;
    csvContent += `\n${t('transactions.expenses')}${sep}${formatCurrency(expense)}`;
    csvContent += `\n${t('dashboard.stats.balance')}${sep}${formatCurrency(income - expense)}`;

    const fileName = `${appName.toLowerCase().replace(/\s+/g, '_')}_${t('sidebar.transactions').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [settings, t, language, getTypeLabel, formatCurrency]);

  const exportToPDF = useCallback((options: ExportOptions) => {
    const { transactions, accountFilter, periodLabel } = options;
    const appName = settings?.appName || 'Gestão Financeira';

    if (transactions.length === 0) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header
    pdf.setFillColor(249, 250, 251);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    pdf.setDrawColor(229, 231, 235);
    pdf.line(0, 50, pageWidth, 50);

    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('sidebar.transactions'), margin, 20);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(periodLabel, margin, 30);

    // Badge
    const accountText = accountFilter === 'pessoal' ? t('sidebar.personal') : t('sidebar.pj');
    const badgeColor = accountFilter === 'pessoal' ? [59, 130, 246] : [168, 85, 247];
    pdf.setFillColor(accountFilter === 'pessoal' ? 239 : 245, accountFilter === 'pessoal' ? 246 : 243, 255);
    pdf.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    pdf.setFontSize(9);
    const badgeWidth = pdf.getTextWidth(accountText) + 8;
    pdf.roundedRect(pageWidth - margin - badgeWidth, 15, badgeWidth, 8, 2, 2, 'F');
    pdf.text(accountText, pageWidth - margin - badgeWidth + 4, 20);

    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(8);
    pdf.text(`${appName} - ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: dateLocales[language] })}`, margin, 42);

    // Stats
    const income = transactions.filter(tx => tx.tipo === 'entrada' && !tx.is_transferencia).reduce((s, tx) => s + Number(tx.valor), 0);
    const expense = transactions.filter(tx => tx.tipo === 'saida' && !tx.is_transferencia).reduce((s, tx) => s + Number(tx.valor), 0);
    const balance = income - expense;

    let y = 58;
    const cardW = (pageWidth - margin * 2 - 10) / 3;
    const cardH = 25;

    // Card Receitas
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(9);
    pdf.text(t('transactions.income'), margin + 4, y + 8);
    pdf.setTextColor(34, 197, 94);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(income), margin + 4, y + 18);

    // Card Despesas
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin + cardW + 5, y, cardW, cardH, 2, 2, 'FD');
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t('transactions.expenses'), margin + cardW + 9, y + 8);
    pdf.setTextColor(239, 68, 68);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(expense), margin + cardW + 9, y + 18);

    // Card Saldo
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin + (cardW + 5) * 2, y, cardW, cardH, 2, 2, 'FD');
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t('dashboard.stats.balance'), margin + (cardW + 5) * 2 + 4, y + 8);
    const balColor = balance >= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setTextColor(balColor[0], balColor[1], balColor[2]);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(balance), margin + (cardW + 5) * 2 + 4, y + 18);

    y += cardH + 12;

    // Table
    const tableData = transactions.map(tx => {
      const dateStr = tx.data.split('T')[0];
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return [
        date.toLocaleDateString(localeStrings[language]),
        getTypeLabel(tx.tipo, tx.is_transferencia === true),
        tx.descricao,
        tx.categoria?.descricao || '-',
        formatCurrency(Number(tx.valor)),
      ];
    });

    autoTable(pdf, {
      startY: y,
      head: [[
        t('table.date'),
        t('form.type'),
        t('table.description'),
        t('table.category'),
        t('table.amount'),
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = data.cell.raw;
          if (val === t('transactions.income')) {
            data.cell.styles.textColor = [34, 197, 94];
          } else if (val === t('transactions.expenses')) {
            data.cell.styles.textColor = [239, 68, 68];
          } else {
            data.cell.styles.textColor = [168, 85, 247];
          }
        }
        if (data.section === 'body' && data.column.index === 4) {
          const rowIdx = data.row.index;
          const tx = transactions[rowIdx];
          if (tx) {
            data.cell.styles.textColor = tx.tipo === 'entrada' ? [34, 197, 94] : [239, 68, 68];
          }
        }
      },
      didDrawPage: (data: any) => {
        // Footer
        const pageCount = pdf.getNumberOfPages();
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `${appName} - ${format(new Date(), 'dd/MM/yyyy')}`,
          margin,
          pageHeight - 8
        );
        pdf.text(
          `${data.pageNumber}/${pageCount}`,
          pageWidth - margin - 10,
          pageHeight - 8
        );
      },
    });

    // Total row
    const finalY = (pdf as any).lastAutoTable?.finalY || y + 20;
    if (finalY + 15 < pageHeight - margin) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${transactions.length} ${t('pagination.transactions')}`, margin, finalY + 8);
    }

    const fileName = `${appName.toLowerCase().replace(/\s+/g, '_')}_${t('sidebar.transactions').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(fileName);
  }, [settings, t, language, formatCurrency, getTypeLabel]);

  return { exportToCSV, exportToPDF };
}
