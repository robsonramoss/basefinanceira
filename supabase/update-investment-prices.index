import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ==============================================================================
// Edge Function: update-investment-prices
// Atualiza preços de ativos via Brapi API e Binance API
// ==============================================================================

const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface BrapiQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketTime: string;
}

interface BrapiResponse {
  results: BrapiQuote[];
  requestedAt: string;
  took: string;
}

interface CoinGeckoPrice {
  [cryptoId: string]: {
    [currency: string]: number;
  };
}

// Mapeamento prioritário para criptos principais (evita ambiguidade)
const PRIORITY_CRYPTO_MAP: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'MATIC': 'matic-network',
  'DOT': 'polkadot',
  'LINK': 'chainlink',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'UNI': 'uniswap',
  'XLM': 'stellar',
  'AVAX': 'avalanche-2',
  'SHIB': 'shiba-inu',
  'ATOM': 'cosmos',
  'TRX': 'tron',
  'NEAR': 'near',
  'PEPE': 'pepe',
  'BONK': 'bonk',
  'WIF': 'dogwifcoin',
  'FLOKI': 'floki',
  'MEME': 'memecoin',
};

// Cache de símbolos → IDs CoinGecko
const CRYPTO_ID_CACHE: { [key: string]: string } = {};
let COINGECKO_COINS_LIST: Array<{ id: string; symbol: string; name: string }> | null = null;

// Buscar lista completa de criptos do CoinGecko
async function fetchCoinGeckoList(): Promise<Array<{ id: string; symbol: string; name: string }>> {
  if (COINGECKO_COINS_LIST) {
    return COINGECKO_COINS_LIST;
  }

  console.log('🔄 Carregando lista completa de criptos do CoinGecko...');
  const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar lista CoinGecko: HTTP ${response.status}`);
  }

  const data = await response.json();
  COINGECKO_COINS_LIST = data;
  console.log(`✅ ${data.length} criptos carregadas do CoinGecko`);
  return data;
}

// Buscar ID do CoinGecko a partir do símbolo (dinâmico)
async function getCoinGeckoId(symbol: string): Promise<string | null> {
  const upperSymbol = symbol.toUpperCase();
  
  // Verificar cache primeiro
  if (CRYPTO_ID_CACHE[upperSymbol]) {
    return CRYPTO_ID_CACHE[upperSymbol];
  }

  // Verificar mapeamento prioritário
  if (PRIORITY_CRYPTO_MAP[upperSymbol]) {
    CRYPTO_ID_CACHE[upperSymbol] = PRIORITY_CRYPTO_MAP[upperSymbol];
    return PRIORITY_CRYPTO_MAP[upperSymbol];
  }

  // Buscar na lista completa do CoinGecko
  try {
    const coinsList = await fetchCoinGeckoList();
    const coin = coinsList.find(c => c.symbol.toUpperCase() === upperSymbol);
    
    if (coin) {
      CRYPTO_ID_CACHE[upperSymbol] = coin.id;
      console.log(`✅ Cripto encontrada: ${upperSymbol} → ${coin.id}`);
      return coin.id;
    }
    
    console.error(`❌ Cripto não encontrada no CoinGecko: ${symbol}`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar cripto ${symbol}:`, error);
    return null;
  }
}

// Normalizar moeda (USDT → USD)
function normalizeCurrency(currency: string): string {
  const normalized = currency.toLowerCase();
  return normalized === 'usdt' ? 'usd' : normalized;
}

// Converter ticker para formato CoinGecko
async function parseTickerForCoinGecko(ticker: string): Promise<{ cryptoId: string; currency: string; error?: string } | null> {
  const parts = ticker.split('-');
  if (parts.length !== 2) {
    return null;
  }

  const [cryptoSymbol, currencySymbol] = parts;
  const cryptoId = await getCoinGeckoId(cryptoSymbol);
  
  if (!cryptoId) {
    return {
      cryptoId: '',
      currency: '',
      error: `Criptomoeda '${cryptoSymbol}' não encontrada no CoinGecko. Verifique o símbolo.`
    };
  }

  return {
    cryptoId,
    currency: normalizeCurrency(currencySymbol),
  };
}

interface UpdateResult {
  success: number;
  failed: number;
  errors: string[];
  updated: string[];
}

Deno.serve(async (req: Request) => {
  try {
    // Verificar método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar variáveis de ambiente
    if (!BRAPI_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return new Response(
        JSON.stringify({ error: "Configuração inválida" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com service_role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("🚀 Iniciando atualização de preços...");

    // Buscar todos os ativos ativos (Brapi e Binance)
    const { data: brapiAssets, error: brapiError } = await supabase
      .from("investment_assets")
      .select("id, ticker, type")
      .eq("is_active", true)
      .eq("source", "brapi");

    const { data: binanceAssets, error: binanceError } = await supabase
      .from("investment_assets")
      .select("id, ticker, type")
      .eq("is_active", true)
      .eq("source", "binance");

    if (brapiError || binanceError) {
      console.error("❌ Erro ao buscar ativos:", brapiError || binanceError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar ativos" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const totalAssets = (brapiAssets?.length || 0) + (binanceAssets?.length || 0);
    
    if (totalAssets === 0) {
      console.log("ℹ️ Nenhum ativo para atualizar");
      return new Response(
        JSON.stringify({ message: "Nenhum ativo para atualizar", success: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 ${totalAssets} ativos encontrados (${brapiAssets?.length || 0} Brapi, ${binanceAssets?.length || 0} Binance)`);

    // Agrupar tickers (máximo 10 por request para não exceder limite)
    const batchSize = 10;
    const result: UpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
      updated: [],
    };

    // ========================================
    // PROCESSAR ATIVOS DA BRAPI
    // ========================================
    if (brapiAssets && brapiAssets.length > 0) {
      console.log(`\n🟢 Processando ${brapiAssets.length} ativos da BrAPI...`);
      
      // Processar 1 ativo por vez (limite do plano BrAPI free)
      const BATCH_SIZE = 1;
      
      for (let i = 0; i < brapiAssets.length; i += BATCH_SIZE) {
        const batch = brapiAssets.slice(i, i + BATCH_SIZE);
        const tickers = batch.map((a) => a.ticker).join(",");

      console.log(`🔄 Processando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${tickers}`);

      const startTime = Date.now();

      try {
        // Chamar Brapi API
        const brapiUrl = `https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}`;
        const brapiResponse = await fetch(brapiUrl);

        if (!brapiResponse.ok) {
          const errorText = await brapiResponse.text();
          console.error(`❌ Erro na API Brapi (${brapiResponse.status}):`, errorText);
          
          // Log do erro
          await supabase.from("api_usage_log").insert({
            api_name: "brapi",
            endpoint: `/api/quote/${tickers}`,
            tickers_count: batch.length,
            status: brapiResponse.status === 429 ? "rate_limit" : "error",
            response_time_ms: Date.now() - startTime,
            error_message: `HTTP ${brapiResponse.status}: ${errorText.substring(0, 200)}`,
          });

          result.failed += batch.length;
          result.errors.push(`Lote ${tickers}: ${brapiResponse.status}`);
          continue;
        }

        const data: BrapiResponse = await brapiResponse.json();
        const responseTime = Date.now() - startTime;

        // Log de sucesso
        await supabase.from("api_usage_log").insert({
          api_name: "brapi",
          endpoint: `/api/quote/${tickers}`,
          tickers_count: batch.length,
          status: "success",
          response_time_ms: responseTime,
        });

        console.log(`✅ Resposta recebida em ${responseTime}ms`);

        // Atualizar cada ativo
        for (const quote of data.results) {
          const asset = batch.find((a) => a.ticker === quote.symbol);
          if (!asset) continue;

          const { error: updateError } = await supabase
            .from("investment_assets")
            .update({
              current_price: quote.regularMarketPrice,
              previous_close: quote.regularMarketPreviousClose,
              last_updated: new Date().toISOString(),
            })
            .eq("id", asset.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar ${quote.symbol}:`, updateError);
            result.failed++;
            result.errors.push(`${quote.symbol}: ${updateError.message}`);
          } else {
            console.log(`✅ ${quote.symbol}: R$ ${quote.regularMarketPrice}`);
            result.success++;
            result.updated.push(quote.symbol);
          }
        }

        // Aguardar 1 segundo entre lotes para não sobrecarregar API
        if (i + batchSize < brapiAssets.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erro ao processar lote ${tickers}:`, error);
        result.failed += batch.length;
        result.errors.push(`${tickers}: ${(error as Error).message}`);

        // Log do erro
        await supabase.from("api_usage_log").insert({
          api_name: "brapi",
          endpoint: `/api/quote/${tickers}`,
          tickers_count: batch.length,
          status: "error",
          response_time_ms: Date.now() - startTime,
          error_message: (error as Error).message.substring(0, 200),
        });
      }
    }
    }

    // ========================================
    // PROCESSAR ATIVOS DE CRIPTOMOEDAS (CoinGecko)
    // ========================================
    if (binanceAssets && binanceAssets.length > 0) {
      console.log(`\n🟡 Processando ${binanceAssets.length} ativos de criptomoedas via CoinGecko...`);
      
      // Agrupar ativos por moeda para otimizar chamadas à API
      const assetsByCurrency = new Map<string, typeof binanceAssets>();
      
      for (const asset of binanceAssets) {
        const parsed = await parseTickerForCoinGecko(asset.ticker);
        if (!parsed || parsed.error) {
          const errorMsg = parsed?.error || `Formato inválido: ${asset.ticker}. Use: CRIPTO-MOEDA (ex: BTC-BRL)`;
          console.error(`⚠️ ${errorMsg}`);
          result.failed++;
          result.errors.push(`${asset.ticker}: ${errorMsg}`);
          continue;
        }
        
        const key = parsed.currency;
        if (!assetsByCurrency.has(key)) {
          assetsByCurrency.set(key, []);
        }
        assetsByCurrency.get(key)!.push(asset);
      }
      
      // Processar cada grupo de moeda
      for (const [currency, assets] of assetsByCurrency) {
        const startTime = Date.now();
        
        try {
          // Coletar IDs únicos de criptos
          const cryptoIds = new Set<string>();
          const assetMap = new Map<string, typeof assets[0]>();
          
          for (const asset of assets) {
            const parsed = await parseTickerForCoinGecko(asset.ticker);
            if (parsed && !parsed.error) {
              cryptoIds.add(parsed.cryptoId);
              assetMap.set(`${parsed.cryptoId}-${parsed.currency}`, asset);
            }
          }
          
          const idsParam = Array.from(cryptoIds).join(',');
          console.log(`🔄 Buscando preços para ${cryptoIds.size} criptos em ${currency.toUpperCase()}...`);
          
          // Chamar CoinGecko API pública (sem API key necessária)
          const coinGeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=${currency}`;
          const coinGeckoResponse = await fetch(coinGeckoUrl);
          
          if (!coinGeckoResponse.ok) {
            const errorText = await coinGeckoResponse.text();
            console.error(`❌ Erro na API CoinGecko (${coinGeckoResponse.status}):`, errorText);
            
            // Log do erro
            await supabase.from("api_usage_log").insert({
              api_name: "coingecko",
              endpoint: `/api/v3/simple/price`,
              tickers_count: cryptoIds.size,
              status: coinGeckoResponse.status === 429 ? "rate_limit" : "error",
              response_time_ms: Date.now() - startTime,
              error_message: `HTTP ${coinGeckoResponse.status}: ${errorText.substring(0, 200)}`,
            });
            
            // Marcar todos os ativos deste grupo como falhados
            for (const asset of assets) {
              result.failed++;
              result.errors.push(`${asset.ticker}: CoinGecko ${coinGeckoResponse.status}`);
            }
            continue;
          }
          
          const data: CoinGeckoPrice = await coinGeckoResponse.json();
          const responseTime = Date.now() - startTime;
          
          // Log de sucesso
          await supabase.from("api_usage_log").insert({
            api_name: "coingecko",
            endpoint: `/api/v3/simple/price`,
            tickers_count: cryptoIds.size,
            status: "success",
            response_time_ms: responseTime,
          });
          
          console.log(`✅ Resposta recebida em ${responseTime}ms`);
          
          // Atualizar cada ativo
          for (const [key, asset] of assetMap) {
            const [cryptoId, curr] = key.split('-');
            
            if (data[cryptoId] && data[cryptoId][curr] !== undefined) {
              const price = data[cryptoId][curr];
              
              const { error: updateError } = await supabase
                .from("investment_assets")
                .update({
                  current_price: price,
                  last_updated: new Date().toISOString(),
                })
                .eq("id", asset.id);
              
              if (updateError) {
                console.error(`❌ Erro ao atualizar ${asset.ticker}:`, updateError);
                result.failed++;
                result.errors.push(`${asset.ticker}: ${updateError.message}`);
              } else {
                const currencySymbol = curr === 'brl' ? 'R$' : curr.toUpperCase();
                console.log(`✅ ${asset.ticker}: ${currencySymbol} ${price.toFixed(2)}`);
                result.success++;
                result.updated.push(asset.ticker);
              }
            } else {
              console.error(`❌ Preço não encontrado para ${asset.ticker}`);
              result.failed++;
              result.errors.push(`${asset.ticker}: Preço não retornado pela API`);
            }
          }
          
          // Aguardar 1 segundo entre requests para respeitar rate limit (30 req/min)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Erro ao processar grupo de moeda ${currency}:`, error);
          
          // Marcar todos os ativos deste grupo como falhados
          for (const asset of assets) {
            result.failed++;
            result.errors.push(`${asset.ticker}: ${(error as Error).message}`);
          }
          
          // Log do erro
          await supabase.from("api_usage_log").insert({
            api_name: "coingecko",
            endpoint: `/api/v3/simple/price`,
            tickers_count: assets.length,
            status: "error",
            response_time_ms: Date.now() - startTime,
            error_message: (error as Error).message.substring(0, 200),
          });
        }
      }
    }

    console.log(`\n🎉 Atualização concluída: ${result.success} sucesso, ${result.failed} falhas`);

    return new Response(
      JSON.stringify({
        message: "Atualização concluída",
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
