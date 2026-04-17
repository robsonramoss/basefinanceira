/**
 * Parser para campo parcela_info que aceita múltiplos formatos
 * 
 * Formatos suportados:
 * 1. JSON: { numero: 1, total: 2, valor_original: 100 }
 * 2. String com aspas: "1/2"
 * 3. String sem aspas: 1/2
 * 4. Qualquer variação: "1/1", 2/3, etc.
 */

export interface ParcelaInfo {
  numero: number;
  total: number;
  valor_original?: number;
}

/**
 * Parseia parcela_info de qualquer formato para objeto padronizado
 * @param parcelaInfo - Pode ser objeto JSON, string "1/2", ou null
 * @returns Objeto ParcelaInfo padronizado ou null se inválido
 */
export function parseParcelaInfo(parcelaInfo: any): ParcelaInfo | null {
  // Se for null ou undefined, retornar null
  if (!parcelaInfo) {
    return null;
  }

  // Se já for um objeto com numero e total, retornar diretamente
  if (
    typeof parcelaInfo === 'object' &&
    'numero' in parcelaInfo &&
    'total' in parcelaInfo
  ) {
    return {
      numero: Number(parcelaInfo.numero),
      total: Number(parcelaInfo.total),
      valor_original: parcelaInfo.valor_original
        ? Number(parcelaInfo.valor_original)
        : undefined,
    };
  }

  // Se for string, tentar parsear formato "1/2" ou 1/2
  if (typeof parcelaInfo === 'string') {
    // Remover aspas se existirem e espaços
    const cleaned = parcelaInfo.replace(/["']/g, '').trim();
    
    // Verificar se está no formato numero/total
    const match = cleaned.match(/^(\d+)\/(\d+)$/);
    
    if (match) {
      const numero = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      
      // Validar que os números fazem sentido
      if (numero > 0 && total > 0 && numero <= total) {
        return {
          numero,
          total,
        };
      }
    }
  }

  // Se chegou aqui, formato inválido
  return null;
}

/**
 * Formata parcela_info para exibição (ex: "1/2")
 * @param parcelaInfo - Qualquer formato de parcela_info
 * @returns String formatada "numero/total" ou null
 */
export function formatParcelaInfo(parcelaInfo: any): string | null {
  const parsed = parseParcelaInfo(parcelaInfo);
  
  if (!parsed) {
    return null;
  }
  
  return `${parsed.numero}/${parsed.total}`;
}
