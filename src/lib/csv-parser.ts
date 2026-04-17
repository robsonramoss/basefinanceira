/**
 * CSV Parser - Parseia arquivos CSV de faturas de cartão de crédito
 * 
 * Suporta diferentes formatos de bancos brasileiros (XP, C6, etc).
 * Detecta automaticamente o separador, colunas e formato de data/valor.
 * Retorna OFXTransaction[] para reutilizar o algoritmo de conciliação.
 */

import { OFXTransaction } from './ofx-parser';

export interface CSVParseResult {
  transactions: OFXTransaction[];
  detectedBank: string;
  totalRows: number;
  skippedRows: number;
}

interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
  installment?: number;
}

/**
 * Detecta o separador do CSV (vírgula, ponto-e-vírgula, tab)
 */
function detectSeparator(firstLine: string): string {
  const separators = [';', ',', '\t', '|'];
  let bestSep = ';';
  let maxCount = 0;

  for (const sep of separators) {
    const count = (firstLine.match(new RegExp(`\\${sep}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestSep = sep;
    }
  }

  return bestSep;
}

/**
 * Detecta qual banco gerou o CSV baseado nos headers
 */
function detectBank(headers: string[]): string {
  const normalized = headers.map(h => h.toLowerCase().trim());

  // XP: Data;Estabelecimento;Portador;Valor;Parcela
  if (normalized.includes('estabelecimento') && normalized.includes('portador')) {
    return 'XP';
  }

  // C6: Data,Descrição,Valor,Categoria (formato comum)
  if (normalized.includes('categoria')) {
    return 'C6';
  }

  // Nubank CSV: date,title,amount
  if (normalized.includes('title') && normalized.includes('amount')) {
    return 'Nubank';
  }

  // Inter: Data,Lançamento,Valor
  if (normalized.includes('lançamento') || normalized.includes('lancamento')) {
    return 'Inter';
  }

  // Itaú: data,lançamento,valor
  if (normalized.includes('lançamento') || normalized.includes('lancamento')) {
    return 'Itaú';
  }

  return 'Genérico';
}

/**
 * Mapeia as colunas do CSV para os campos necessários
 */
function mapColumns(headers: string[], bank: string): ColumnMapping {
  const normalized = headers.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let installmentCol = -1;

  // C6 tem múltiplas colunas de valor: "valor (em us$)", "cotacao (em r$)", "valor (em r$)"
  // Precisamos pegar a última coluna de valor (em R$)
  if (bank === 'C6') {
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (h.includes('data de compra') || h.includes('data')) dateCol = i;
      if (h.includes('descricao')) descCol = i;
      if (h.includes('valor') && h.includes('r$')) amountCol = i; // Pega a última que tem R$
      if (h.includes('parcela')) installmentCol = i;
    }
  }

  // Mapeamento genérico para outros bancos
  if (dateCol === -1 || descCol === -1 || amountCol === -1) {
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];

      // Data
      if (dateCol === -1 && (h === 'data' || h === 'date' || h === 'dt' || h.includes('data'))) {
        dateCol = i;
      }

      // Descrição
      if (descCol === -1 && (
        h === 'estabelecimento' || h === 'descricao' || h === 'description' ||
        h === 'title' || h === 'lancamento' || h === 'historico' || h === 'memo' ||
        h.includes('descricao') || h.includes('estabelecimento')
      )) {
        descCol = i;
      }

      // Valor - pega a última coluna que contém "valor" para evitar pegar US$
      if (
        h === 'valor' || h === 'amount' || h === 'value' || h === 'vlr' ||
        h.includes('valor') || h.includes('amount')
      ) {
        amountCol = i;
      }

      // Parcela
      if (installmentCol === -1 && (
        h === 'parcela' || h === 'installment' || h.includes('parcela')
      )) {
        installmentCol = i;
      }
    }
  }

  // Fallback: se não encontrou, tenta posição padrão (data, desc, valor)
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1;
  if (amountCol === -1) amountCol = normalized.length >= 4 ? 3 : 2;

  return { date: dateCol, description: descCol, amount: amountCol, installment: installmentCol >= 0 ? installmentCol : undefined };
}

/**
 * Parseia uma data no formato brasileiro (DD/MM/YYYY) para YYYY-MM-DD
 */
function parseDate(dateStr: string): string {
  const clean = dateStr.trim();

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD (já no formato correto)
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return clean;
  }

  // YYYY/MM/DD
  const isoSlashMatch = clean.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (isoSlashMatch) {
    return `${isoSlashMatch[1]}-${isoSlashMatch[2]}-${isoSlashMatch[3]}`;
  }

  return clean;
}

/**
 * Parseia um valor monetário brasileiro para número
 * Exemplos: "R$ 49,83" -> 49.83, "R$ -5.076,50" -> -5076.50, "49.83" -> 49.83
 */
function parseAmount(amountStr: string): number {
  let clean = amountStr.trim();

  // Remove "R$" e espaços
  clean = clean.replace(/R\$\s*/gi, '').trim();

  // Detecta formato brasileiro (1.234,56) vs americano (1,234.56)
  const hasCommaDecimal = /,\d{1,2}$/.test(clean);

  if (hasCommaDecimal) {
    // Formato BR: remove pontos de milhar, troca vírgula por ponto
    clean = clean.replace(/\./g, '').replace(',', '.');
  }

  const value = parseFloat(clean);
  return isNaN(value) ? 0 : value;
}

/**
 * Parseia o conteúdo de um CSV e gera um ID único para cada transação
 */
function generateFitId(date: string, description: string, amount: number, index: number): string {
  return `CSV-${date}-${amount.toFixed(2)}-${index}`;
}

/**
 * Parseia um arquivo CSV de fatura de cartão de crédito
 */
export function parseCSV(content: string): CSVParseResult {
  // Normaliza quebras de linha
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    return { transactions: [], detectedBank: 'Desconhecido', totalRows: 0, skippedRows: 0 };
  }

  // Detecta separador e headers
  const separator = detectSeparator(lines[0]);
  const headers = lines[0].split(separator).map(h => h.replace(/^["']|["']$/g, '').trim());
  const bank = detectBank(headers);
  const mapping = mapColumns(headers, bank);

  interface RawEntry {
    date: string;
    description: string;
    originalAmount: number;
    memo: string;
    lineIndex: number;
  }

  // 1ª passagem: coleta TODOS os lançamentos (incluindo negativos)
  // Precisamos dos negativos para detectar pares que se cancelam
  const allEntries: RawEntry[] = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line, separator);

    if (cols.length <= Math.max(mapping.date, mapping.description, mapping.amount)) {
      skippedRows++;
      continue;
    }

    const dateStr = cols[mapping.date]?.trim();
    const description = cols[mapping.description]?.trim();
    const amountStr = cols[mapping.amount]?.trim();

    if (!dateStr || !amountStr) {
      skippedRows++;
      continue;
    }

    const date = parseDate(dateStr);
    const originalAmount = parseAmount(amountStr);

    // Ignora valor zero
    if (originalAmount === 0) {
      skippedRows++;
      continue;
    }

    // Ignora pagamento de fatura: valor negativo com descrição de pagamento
    const descLower = (description || '').toLowerCase();
    const isPayment =
      originalAmount < 0 &&
      (descLower.includes('pagamento') ||
        descLower.includes('inclusao de pagamento') ||
        descLower.includes('inclusc3a3o de pagamento'));

    if (isPayment) {
      skippedRows++;
      continue;
    }

    let memo = description || '';
    if (mapping.installment !== undefined && cols[mapping.installment]) {
      const parcela = cols[mapping.installment].trim();
      if (parcela && parcela !== '-' && parcela.toLowerCase() !== 'unica' && parcela.toLowerCase() !== 'única') {
        memo += ` (${parcela})`;
      }
    }

    allEntries.push({ date, description: description || '', originalAmount, memo, lineIndex: i });
  }

  // 2ª passagem: detecta pares que se cancelam (mesmo valor absoluto, sinais opostos, mesma data)
  // Ex: "Anuidade Diferenciada" +98,00 e "Estorno Tarifa" -98,00 no mesmo dia → excluir ambos
  // Ex: MERCADOLIVRE +121,60 (1/3) e MERCADOLIVRE -121,60 (reversão) no mesmo dia → excluir ambos
  const canceledIndexes = new Set<number>();

  for (let a = 0; a < allEntries.length; a++) {
    if (canceledIndexes.has(a)) continue;
    const entryA = allEntries[a];

    // Processa apenas entradas negativas (são elas que buscam o par positivo)
    if (entryA.originalAmount >= 0) continue;

    for (let b = 0; b < allEntries.length; b++) {
      if (a === b || canceledIndexes.has(b)) continue;
      const entryB = allEntries[b];

      // Par positivo: mesmo valor absoluto (tolerância 1 centavo) e mesma data
      if (
        entryB.originalAmount > 0 &&
        entryB.date === entryA.date &&
        Math.abs(entryB.originalAmount - Math.abs(entryA.originalAmount)) < 0.01
      ) {
        canceledIndexes.add(a);
        canceledIndexes.add(b);
        break;
      }
    }
  }

  skippedRows += canceledIndexes.size;

  // 3ª passagem: monta resultado final sem pares cancelados e sem negativos restantes
  const transactions: OFXTransaction[] = [];

  for (let i = 0; i < allEntries.length; i++) {
    if (canceledIndexes.has(i)) continue;

    const entry = allEntries[i];

    // Descarta negativos restantes (estornos/créditos sem par correspondente)
    if (entry.originalAmount < 0) {
      skippedRows++;
      continue;
    }

    transactions.push({
      type: 'DEBIT',
      datePosted: entry.date,
      amount: entry.originalAmount,
      originalAmount: entry.originalAmount,
      fitId: generateFitId(entry.date, entry.description, entry.originalAmount, entry.lineIndex),
      memo: entry.memo,
    });
  }

  return {
    transactions,
    detectedBank: bank,
    totalRows: lines.length - 1,
    skippedRows,
  };
}


/**
 * Parseia uma linha CSV respeitando campos entre aspas
 */
function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      if (inQuotes && i + 1 < line.length && line[i + 1] === char) {
        current += char;
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
