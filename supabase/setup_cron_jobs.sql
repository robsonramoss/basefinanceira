-- =====================================================
-- CONFIGURAÇÃO DE CRON JOBS - GRANAZAP V5
-- =====================================================
-- Este arquivo configura os Cron Jobs para atualização automática
-- de preços de investimentos (ações, FIIs, criptomoedas).
-- 
-- ⚠️ IMPORTANTE: Execute este arquivo SEPARADAMENTE após o setup_differential_COMPLETO.sql
-- 
-- 📋 PRÉ-REQUISITOS:
-- 1. ✅ Extensão pg_cron habilitada (já incluída no setup_differential_COMPLETO.sql)
-- 2. ✅ Extensão pg_net habilitada (já incluída no setup_differential_COMPLETO.sql)
-- 3. ✅ Edge Functions deployadas (update-investment-prices)
-- 
-- Data: 12/01/2026
-- Projeto: GranaZap V5
-- =====================================================

-- =====================================================
-- PASSO 1: CONFIGURAR VARIÁVEIS DE AMBIENTE
-- =====================================================

-- 🔑 VARIÁVEIS NECESSÁRIAS (APENAS NA EDGE FUNCTION):
-- 
-- ⚠️ IMPORTANTE: Configure as seguintes variáveis APENAS na Edge Function:
-- 
-- Acesse: Supabase Dashboard > Edge Functions > update-investment-prices > Settings > Secrets
-- 
-- 1️⃣ BRAPI_TOKEN
--    Valor: Token da API BrAPI (obtenha em https://brapi.dev)
--    Plano gratuito: 100 requisições/dia
-- 
-- 2️⃣ SUPABASE_URL
--    Valor: URL do seu projeto (ex: https://abc123xyz.supabase.co)
--    Onde: Dashboard > Settings > API > Project URL
-- 
-- 3️⃣ SUPABASE_SERVICE_ROLE_KEY
--    Valor: Service role key (chave secreta)
--    Onde: Dashboard > Settings > API > service_role
-- 
-- ⚠️ ATENÇÃO: NÃO é necessário configurar variáveis no banco de dados!
-- As cron jobs chamam a Edge Function, que usa as variáveis configuradas nela.

-- =====================================================
-- PASSO 2: HABILITAR EXTENSÕES NECESSÁRIAS
-- =====================================================

-- 🔌 Habilitar pg_cron (para agendar tarefas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 🔌 Habilitar pg_net (para fazer requisições HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ✅ Verificar se as extensões foram habilitadas:
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- =====================================================
-- PASSO 3: VERIFICAR SE EDGE FUNCTION EXISTE
-- =====================================================

-- 📝 NOTA: Antes de criar os Cron Jobs, certifique-se que a Edge Function
-- 'update-investment-prices' está deployada no seu projeto.
-- 
-- Para verificar:
-- SELECT * FROM pg_catalog.pg_extension WHERE extname = 'pg_net';
-- 
-- Para deployar a Edge Function (via Supabase CLI):
-- supabase functions deploy update-investment-prices

-- =====================================================
-- PASSO 4: CRIAR OU ATUALIZAR CRON JOBS
-- =====================================================

-- 🔄 CRON JOB 1: Atualizar preços de investimentos (Mercado)
-- Executa: Segunda a Sexta, às 12h, 15h e 21h (horário UTC)
-- Atualiza: Ações, FIIs, ETFs, BDRs

-- Remover job existente se já existe (para quem está atualizando)
SELECT cron.unschedule('update-investment-prices-market') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-investment-prices-market');

-- Criar cron job (usa URL do projeto automaticamente)
-- ⚠️ IMPORTANTE: Substitua YOUR_PROJECT_REF pelo ID do seu projeto
-- Exemplo: vrmickfxoxvyljounoxq
-- Você encontra em: Dashboard > Settings > General > Reference ID
DO $$
DECLARE
    v_project_ref TEXT := 'YOUR_PROJECT_REF'; -- ⚠️ SUBSTITUA AQUI
    v_project_url TEXT;
BEGIN
    -- Construir URL do projeto
    v_project_url := 'https://' || v_project_ref || '.supabase.co';
    
    -- Validar se o project_ref foi substituído
    IF v_project_ref = 'YOUR_PROJECT_REF' THEN
        RAISE EXCEPTION 'ERRO: Você precisa substituir YOUR_PROJECT_REF pelo ID do seu projeto no script!';
    END IF;
    
    -- Criar cron job que chama a Edge Function
    -- A Edge Function tem verify_jwt=false, então não precisa de Authorization header
    PERFORM cron.schedule(
        'update-investment-prices-market',
        '0 12,15,21 * * 1-5',
        format(
            'SELECT net.http_post(url := %L || ''/functions/v1/update-investment-prices'', headers := jsonb_build_object(''Content-Type'', ''application/json''), body := ''{}''::jsonb) as request_id;',
            v_project_url
        )
    );
    
    RAISE NOTICE '✅ Cron job update-investment-prices-market criado com sucesso!';
    RAISE NOTICE '📍 URL: %', v_project_url;
END $$;

-- 🔄 CRON JOB 2: Atualizar preços de criptomoedas
-- Executa: A cada 4 horas, todos os dias
-- Atualiza: Bitcoin, Ethereum, e outras criptomoedas

-- Remover job existente se já existe (para quem está atualizando)
SELECT cron.unschedule('update-investment-prices-crypto') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-investment-prices-crypto');

-- Criar cron job (usa URL do projeto automaticamente)
-- ⚠️ IMPORTANTE: Substitua YOUR_PROJECT_REF pelo ID do seu projeto
-- Exemplo: vrmickfxoxvyljounoxq
-- Você encontra em: Dashboard > Settings > General > Reference ID
DO $$
DECLARE
    v_project_ref TEXT := 'YOUR_PROJECT_REF'; -- ⚠️ SUBSTITUA AQUI
    v_project_url TEXT;
BEGIN
    -- Construir URL do projeto
    v_project_url := 'https://' || v_project_ref || '.supabase.co';
    
    -- Validar se o project_ref foi substituído
    IF v_project_ref = 'YOUR_PROJECT_REF' THEN
        RAISE EXCEPTION 'ERRO: Você precisa substituir YOUR_PROJECT_REF pelo ID do seu projeto no script!';
    END IF;
    
    -- Criar cron job que chama a Edge Function
    -- A Edge Function tem verify_jwt=false, então não precisa de Authorization header
    PERFORM cron.schedule(
        'update-investment-prices-crypto',
        '0 */4 * * *',
        format(
            'SELECT net.http_post(url := %L || ''/functions/v1/update-investment-prices'', headers := jsonb_build_object(''Content-Type'', ''application/json''), body := ''{}''::jsonb) as request_id;',
            v_project_url
        )
    );
    
    RAISE NOTICE '✅ Cron job update-investment-prices-crypto criado com sucesso!';
    RAISE NOTICE '📍 URL: %', v_project_url;
END $$;

-- =====================================================
-- PASSO 5: CRON JOB - GOOGLE CALENDAR SYNC BIDIRECIONAL
-- =====================================================

-- 🔄 CRON JOB 3: Google Calendar - Renovação de Webhooks + Sync Diário
-- Executa: Uma vez por dia às 06:00 UTC (03:00 BRT)
-- Função: Renova webhooks que estão expirando + sync incremental de segurança
-- ⚠️ PRÉ-REQUISITO: Edge Function 'google-calendar-cron' deployada
-- ⚠️ OPCIONAL: Só necessário se usar sincronização bidirecional Google Calendar

-- Remover job existente se já existe (para quem está atualizando)
SELECT cron.unschedule('google-calendar-sync-cron') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'google-calendar-sync-cron');

-- Criar cron job
-- ⚠️ IMPORTANTE: Substitua YOUR_PROJECT_REF pelo ID do seu projeto
DO $$
DECLARE
    v_project_ref TEXT := 'YOUR_PROJECT_REF'; -- ⚠️ SUBSTITUA AQUI
    v_project_url TEXT;
BEGIN
    -- Construir URL do projeto
    v_project_url := 'https://' || v_project_ref || '.supabase.co';
    
    -- Validar se o project_ref foi substituído
    IF v_project_ref = 'YOUR_PROJECT_REF' THEN
        RAISE EXCEPTION 'ERRO: Você precisa substituir YOUR_PROJECT_REF pelo ID do seu projeto no script!';
    END IF;
    
    -- Criar cron job que chama a Edge Function
    -- A Edge Function tem verify_jwt=false, então não precisa de Authorization header
    PERFORM cron.schedule(
        'google-calendar-sync-cron',
        '0 6 * * *',
        format(
            'SELECT net.http_post(url := %L || ''/functions/v1/google-calendar-cron'', headers := jsonb_build_object(''Content-Type'', ''application/json''), body := ''{}''::jsonb) as request_id;',
            v_project_url
        )
    );
    
    RAISE NOTICE '✅ Cron job google-calendar-sync-cron criado com sucesso!';
    RAISE NOTICE '📍 URL: %', v_project_url;
    RAISE NOTICE '⏰ Executa diariamente às 06:00 UTC (03:00 BRT)';
END $$;

-- =====================================================
-- PASSO 6: VERIFICAR SE OS JOBS FORAM CRIADOS
-- =====================================================

-- Execute esta query para verificar:
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
ORDER BY jobname;

-- ✅ Resultado esperado:
-- Você deve ver até 3 jobs:
-- - update-investment-prices-market (active: true)
-- - update-investment-prices-crypto (active: true)
-- - google-calendar-sync-cron (active: true) [se configurou o sync bidirecional]

-- =====================================================
-- COMANDOS ÚTEIS
-- =====================================================

-- 📊 Ver histórico de execuções:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'update-investment%')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- ⏸️ Desabilitar um job:
-- UPDATE cron.job SET active = false WHERE jobname = 'update-investment-prices-market';

-- ▶️ Habilitar um job:
-- UPDATE cron.job SET active = true WHERE jobname = 'update-investment-prices-market';

-- 🗑️ Remover um job:
-- SELECT cron.unschedule('update-investment-prices-market');

-- 🔄 Executar um job manualmente (para testar):
-- SELECT net.http_post(
--     url := 'YOUR_PROJECT_URL/functions/v1/update-investment-prices',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
-- );

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- ❌ Problema: "relation cron.job does not exist"
-- Solução: A extensão pg_cron não está habilitada. Execute:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ❌ Problema: "function net.http_post does not exist"
-- Solução: A extensão pg_net não está habilitada. Execute:
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ❌ Problema: Jobs criados mas não executam
-- Solução: Verifique se:
-- 1. A Edge Function 'update-investment-prices' está deployada
-- 2. As credenciais (PROJECT_URL e ANON_KEY) estão corretas
-- 3. O job está ativo: SELECT * FROM cron.job WHERE jobname = 'nome-do-job';

-- ❌ Problema: Erro 401 Unauthorized
-- Solução: A ANON_KEY está incorreta. Verifique em Settings > API

-- ❌ Problema: Erro 404 Not Found
-- Solução: A PROJECT_URL está incorreta ou a Edge Function não foi deployada

-- =====================================================
-- INFORMAÇÕES ADICIONAIS
-- =====================================================

-- 📅 Horários dos Cron Jobs (UTC):
-- - Mercado: 12h, 15h, 21h (Segunda a Sexta)
--   * 12h UTC = 09h BRT (Brasília)
--   * 15h UTC = 12h BRT (Brasília)
--   * 21h UTC = 18h BRT (Brasília)
-- 
-- - Crypto: A cada 4 horas (Todos os dias)
--   * 00h, 04h, 08h, 12h, 16h, 20h UTC

-- 🔐 Segurança:
-- - As cron jobs detectam automaticamente a URL do projeto
-- - NÃO é necessário configurar credenciais no banco de dados
-- - As credenciais ficam APENAS na Edge Function (BRAPI_TOKEN, SUPABASE_SERVICE_ROLE_KEY)
-- - verify_jwt está desabilitado na Edge Function para permitir chamadas do cron
-- - Cada aluno só precisa configurar as variáveis na Edge Function do projeto dele

-- 📊 Performance:
-- - Cada execução atualiza TODOS os ativos de uma vez
-- - Usa cache para evitar chamadas desnecessárias às APIs externas
-- - Registra logs na tabela api_usage_log

-- =====================================================
-- FIM DO ARQUIVO
-- =====================================================
