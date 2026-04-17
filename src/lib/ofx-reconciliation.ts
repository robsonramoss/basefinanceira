/**
 * Algoritmo de conciliação OFX
 * 
 * Compara transações do extrato OFX com lançamentos do sistema (lancamentos_futuros)
 * e tenta fazer match automático por valor + data.
 */

import type { OFXTransaction } from './ofx-parser';

export interface SystemTransaction {
  id: number;
  descricao: string;
  valor: number;
  data_prevista: string;
  categoria_id: number;
  categoria_nome?: string;
  status: string;
  parcela_info?: any;
  tipo?: 'entrada' | 'saida';
}

export type ReconciliationStatus = 'matched' | 'ofx_only' | 'system_only';

export interface ReconciliationItem {
  id: string;
  status: ReconciliationStatus;
  ofxTransaction?: OFXTransaction;
  systemTransaction?: SystemTransaction;
  confidence: number; // 0-100
  manualMatch?: boolean;
}

/**
 * Calcula similaridade entre duas strings (Dice coefficient simplificado)
 */
function stringSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;
  
  // Verifica se um contém o outro
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  
  // Bigrams
  const getBigrams = (s: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const bigramsA = getBigrams(na);
  const bigramsB = getBigrams(nb);
  let intersection = 0;
  
  bigramsA.forEach(bg => {
    if (bigramsB.has(bg)) intersection++;
  });
  
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Executa a conciliação entre transações OFX e do sistema
 */
export function reconcileTransactions(
  ofxTransactions: OFXTransaction[],
  systemTransactions: SystemTransaction[],
  options: {
    valueTolerance?: number; // Tolerância de valor em R$ (default: 0.50)
    dateTolerance?: number; // Tolerância de data em dias (default: 5)
    mode?: 'card' | 'bank'; // card = só débitos, bank = todos com match por tipo
  } = {}
): ReconciliationItem[] {
  const { valueTolerance = 0.50, dateTolerance = 5, mode = 'card' } = options;
  
  const results: ReconciliationItem[] = [];
  const matchedOFX = new Set<number>();
  const matchedSystem = new Set<number>();

  // card mode: só débitos (cartão de crédito)
  // bank mode: todos (conta bancária - receitas e despesas)
  const ofxFiltered = mode === 'bank'
    ? ofxTransactions
    : ofxTransactions.filter(t => t.type === 'DEBIT');

  // Helper: verifica se o tipo OFX é compatível com o tipo do sistema
  const typesMatch = (ofx: OFXTransaction, sys: SystemTransaction): boolean => {
    if (mode === 'card') return true; // cartão é tudo saída
    if (!sys.tipo) return true; // sem tipo definido, aceita qualquer
    if (ofx.type === 'CREDIT' && sys.tipo === 'entrada') return true;
    if (ofx.type === 'DEBIT' && sys.tipo === 'saida') return true;
    return false;
  };

  // PASSO 1: Match exato por valor
  for (let i = 0; i < ofxFiltered.length; i++) {
    if (matchedOFX.has(i)) continue;
    const ofx = ofxFiltered[i];

    for (let j = 0; j < systemTransactions.length; j++) {
      if (matchedSystem.has(j)) continue;
      const sys = systemTransactions[j];

      if (!typesMatch(ofx, sys)) continue;

      const valueDiff = Math.abs(ofx.amount - sys.valor);
      
      if (valueDiff < 0.01) {
        // Match exato por valor
        matchedOFX.add(i);
        matchedSystem.add(j);
        
        const nameSim = stringSimilarity(ofx.memo, sys.descricao);
        const confidence = Math.min(95, 70 + Math.round(nameSim * 30));
        
        results.push({
          id: `match-${i}-${j}`,
          status: 'matched',
          ofxTransaction: ofx,
          systemTransaction: sys,
          confidence,
        });
        break;
      }
    }
  }

  // PASSO 2: Match aproximado (tolerância de valor + data)
  for (let i = 0; i < ofxFiltered.length; i++) {
    if (matchedOFX.has(i)) continue;
    const ofx = ofxFiltered[i];

    let bestMatch: { index: number; score: number } | null = null;

    for (let j = 0; j < systemTransactions.length; j++) {
      if (matchedSystem.has(j)) continue;
      const sys = systemTransactions[j];

      if (!typesMatch(ofx, sys)) continue;

      const valueDiff = Math.abs(ofx.amount - sys.valor);
      
      if (valueDiff <= valueTolerance) {
        // Calcular score baseado em valor + nome
        const valueScore = 1 - (valueDiff / valueTolerance);
        const nameScore = stringSimilarity(ofx.memo, sys.descricao);
        const totalScore = (valueScore * 0.6) + (nameScore * 0.4);

        if (!bestMatch || totalScore > bestMatch.score) {
          bestMatch = { index: j, score: totalScore };
        }
      }
    }

    if (bestMatch && bestMatch.score > 0.3) {
      matchedOFX.add(i);
      matchedSystem.add(bestMatch.index);
      
      const sys = systemTransactions[bestMatch.index];
      const confidence = Math.min(85, 40 + Math.round(bestMatch.score * 50));
      
      results.push({
        id: `approx-${i}-${bestMatch.index}`,
        status: 'matched',
        ofxTransaction: ofx,
        systemTransaction: sys,
        confidence,
      });
    }
  }

  // PASSO 3: Transações OFX sem match (só no extrato)
  for (let i = 0; i < ofxFiltered.length; i++) {
    if (matchedOFX.has(i)) continue;
    results.push({
      id: `ofx-${i}`,
      status: 'ofx_only',
      ofxTransaction: ofxFiltered[i],
      confidence: 0,
    });
  }

  // PASSO 4: Transações do sistema sem match (só no sistema)
  for (let j = 0; j < systemTransactions.length; j++) {
    if (matchedSystem.has(j)) continue;
    results.push({
      id: `sys-${j}`,
      status: 'system_only',
      systemTransaction: systemTransactions[j],
      confidence: 0,
    });
  }

  // Ordenar: matched primeiro (por confidence desc), depois ofx_only, depois system_only
  results.sort((a, b) => {
    const order = { matched: 0, ofx_only: 1, system_only: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.confidence - a.confidence;
  });

  return results;
}
