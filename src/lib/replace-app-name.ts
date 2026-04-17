/**
 * Substitui todas as ocorrências de "{appName}" e "GranaZap" pelo nome da aplicação configurado
 */
export function replaceAppName(text: string, appName: string): string {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{appName\}/g, appName).replace(/GranaZap/g, appName);
}
