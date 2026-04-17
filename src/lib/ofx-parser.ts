/**
 * OFX Parser - Parseia arquivos OFX (Open Financial Exchange)
 * 
 * O formato OFX não é XML padrão. Ele tem um header SGML seguido de tags XML-like.
 * Este parser lida com ambos os formatos (SGML e XML).
 */

export interface OFXTransaction {
  type: 'DEBIT' | 'CREDIT';
  datePosted: string; // YYYY-MM-DD
  amount: number; // Valor absoluto (sempre positivo)
  originalAmount: number; // Valor original do OFX (negativo para débitos)
  fitId: string;
  memo: string;
}

export interface OFXParseResult {
  accountId: string;
  currency: string;
  organization: string;
  dateStart: string;
  dateEnd: string;
  transactions: OFXTransaction[];
  ledgerBalance: number;
  balanceDate: string;
  isCredit: boolean; // true = cartão de crédito
}

/**
 * Parseia uma data OFX no formato YYYYMMDDHHMMSS[offset:TZ] para YYYY-MM-DD
 */
function parseOFXDate(dateStr: string): string {
  // Remove timezone info: "20260203000000[-3:BRT]" -> "20260203000000"
  const clean = dateStr.replace(/\[.*?\]/, '').trim();
  const year = clean.substring(0, 4);
  const month = clean.substring(4, 6);
  const day = clean.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Extrai o valor de uma tag OFX
 */
function getTagValue(content: string, tagName: string): string {
  // Tenta formato XML: <TAG>value</TAG>
  const xmlRegex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch) return xmlMatch[1].trim();

  // Tenta formato SGML: <TAG>value\n
  const sgmlRegex = new RegExp(`<${tagName}>([^\\n<]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch) return sgmlMatch[1].trim();

  return '';
}

/**
 * Extrai todas as transações do bloco BANKTRANLIST
 */
function parseTransactions(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  
  // Encontra todos os blocos <STMTTRN>...</STMTTRN>
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtRegex.exec(content)) !== null) {
    const block = match[1];
    
    const rawType = getTagValue(block, 'TRNTYPE').toUpperCase();
    const datePostedRaw = getTagValue(block, 'DTPOSTED');
    const amountStr = getTagValue(block, 'TRNAMT');
    const fitId = getTagValue(block, 'FITID');
    const memo = getTagValue(block, 'MEMO');

    if (datePostedRaw && amountStr) {
      const originalAmount = parseFloat(amountStr);
      // Normaliza TRNTYPE para DEBIT/CREDIT
      // OFX pode ter: CREDIT, DEBIT, PAYMENT, CHECK, DEP, ATM, POS, XFER, FEE, SRVCHG, INT, OTHER
      // Usamos o sinal do valor como fonte primária quando o tipo não é explicitamente DEBIT ou CREDIT
      let type: 'DEBIT' | 'CREDIT';
      if (rawType === 'CREDIT' || rawType === 'DEP') {
        type = 'CREDIT';
      } else if (rawType === 'DEBIT') {
        type = 'DEBIT';
      } else {
        // PAYMENT, CHECK, XFER, ATM, POS, FEE, SRVCHG, INT, OTHER, etc.
        type = originalAmount < 0 ? 'DEBIT' : 'CREDIT';
      }
      transactions.push({
        type,
        datePosted: parseOFXDate(datePostedRaw),
        amount: Math.abs(originalAmount),
        originalAmount,
        fitId,
        memo,
      });
    }
  }

  return transactions;
}

/**
 * Parseia um arquivo OFX completo
 */
export function parseOFX(content: string): OFXParseResult {
  // Detectar se é cartão de crédito ou conta bancária
  const isCredit = content.includes('CREDITCARDMSGSRSV1') || content.includes('CCSTMTRS');

  // Organização
  const organization = getTagValue(content, 'ORG');
  
  // Moeda
  const currency = getTagValue(content, 'CURDEF') || 'BRL';

  // Account ID
  const accountId = getTagValue(content, 'ACCTID');

  // Período
  const dateStart = getTagValue(content, 'DTSTART');
  const dateEnd = getTagValue(content, 'DTEND');

  // Saldo
  const balanceStr = getTagValue(content, 'BALAMT');
  const balanceDateStr = getTagValue(content, 'DTASOF');

  // Transações
  const transactions = parseTransactions(content);

  return {
    accountId,
    currency,
    organization,
    dateStart: dateStart ? parseOFXDate(dateStart) : '',
    dateEnd: dateEnd ? parseOFXDate(dateEnd) : '',
    transactions,
    ledgerBalance: balanceStr ? parseFloat(balanceStr) : 0,
    balanceDate: balanceDateStr ? parseOFXDate(balanceDateStr) : '',
    isCredit,
  };
}
