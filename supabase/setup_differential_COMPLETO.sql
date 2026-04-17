-- =====================================================
-- SETUP DIFFERENTIAL COMPLETO - GRANAZAP V5
-- =====================================================
-- Este arquivo contém TODAS as diferenças entre o setup.sql original
-- e o banco de dados atual em produção no Supabase.
-- 
-- ⚠️ IMPORTANTE: Execute este arquivo APÓS o setup.sql
-- 
-- Data de Geração: 22/12/2024 (Atualizado)
-- Projeto: vrmickfxoxvyljounoxq
-- Última Atualização: 30/03/2026 - Sync gap auditado via MCP Supabase
-- Atualizações Anteriores:
--   - 30/03/2026 v2: Audit final exaustivo — adicionados verificar_admin_sem_recursao(),
--     policy n8n_chat_admin_insert, 7 índices FK, colunas dark mode (logo_url_header/login_dark/light),
--     exibir_modal_boas_vindas em usuarios
--   - 30/03/2026 v1: Audit via MCP Supabase — adicionadas funções/triggers/índices/colunas
--     que existiam no banco mas estavam ausentes do arquivo:
--     DDL: ADD COLUMN habilitar_suporte_whatsapp + suporte_whatsapp_text em configuracoes_sistema
--     Functions: auto_fill_usuario_id_lancamentos, auto_fill_usuario_principal_id,
--       registrar_acesso_usuario, get_user_numeric_id_safe, usuario_tem_acesso_ativo,
--       verificar_email_cadastro, fix_duplicate_transactions, create_default_notification_preferences,
--       calculate_fixed_income_price (2ª sobrecarga), update_system_settings (3ª versão c/ whatsapp)
--     Triggers: trigger_auto_fill_usuario_id_lancamentos, trigger_auto_fill_usuario_principal_id,
--       trigger_update_contas_bancarias_timestamp
--     Indexes: idx_investment_positions_yield, investment_positions_usuario_id_asset_id_key
--   - 28/02/2026: Feature OFX reativada com toggle no painel admin
--   - 12/01/2026: Filtros avançados na gestão de usuários (admin_list_users_v2)
--   - 19/01/2026: Módulo completo de gestão de dependentes no painel admin
--   - 31/01/2026: Métricas de planos vencidos e receita real (admin_get_system_stats)
--   - 09/02/2026: Feature Conciliação de Extrato na fatura do cartão (100% frontend, sem DDL)
--     Arquivos criados: src/lib/ofx-parser.ts, src/lib/ofx-reconciliation.ts, src/lib/csv-parser.ts,
--     src/components/dashboard/ofx-reconciliation-modal.tsx
--     Alterados: card-details-page.tsx (botão + modal), use-card-invoice.ts (join categoria)
--   - 09/02/2026: REVOKE EXECUTE de anon em 42 funções admin/legadas (defesa em profundidade)
--   - 26/02/2026: Fix investimentos para dependentes via RPC SECURITY DEFINER
--     Problema: RLS da tabela usuarios bloqueava dependentes de ler plano_id do principal
--     Solução: Função obter_dados_plano_usuario() com SECURITY DEFINER (mesmo padrão de obter_uuid_proprietario)
--     Também adicionado campo permite_investimentos no permissoes do dependente (default true)
--     Fix adicional: getOwnerUUID() (src/lib/get-owner-uuid.ts) agora usa RPC obter_uuid_proprietario()
--     em vez de join usuarios!inner(auth_user) que era bloqueado por RLS (erro 406)
--     Arquivos alterados: src/hooks/use-user.ts, src/hooks/use-user-plan.ts,
--       src/hooks/use-investments.ts, src/hooks/use-investment-summary.ts,
--       src/hooks/use-investment-access.ts, src/lib/get-owner-uuid.ts,
--       src/components/dashboard/settings/edit-member-modal.tsx,
--       src/hooks/use-team-members.ts,
--       src/components/dashboard/investments/add-dividend-modal.tsx
--   - 27/02/2026: Fix permissões de filtro de dados para dependentes (100% frontend, sem DDL)
--     Problema: Dependentes com pode_ver_dados_admin=false ainda viam dados do principal
--     Solução: permissoes incluído no profile do dependente em use-user.ts;
--       use-user-filter.ts respeita pode_ver_dados_admin ao calcular filtro efetivo;
--       upcoming-payments.tsx filtra pagamentos baseado em pode_ver_dados_admin;
--       Cache do localStorage invalidado para dependentes sem o campo permissoes.
--     Arquivos alterados: src/hooks/use-user.ts, src/hooks/use-user-filter.ts,
--       src/components/dashboard/upcoming-payments.tsx
--   - 28/02/2026: Feature OFX reativada com toggle controlado pelo painel admin
--     DDL: ADD COLUMN habilitar_conciliacao_ofx BOOLEAN DEFAULT TRUE em configuracoes_sistema
--     DDL: Recriar get_system_settings() com campo habilitar_conciliacao_ofx
--     DDL: Recriar update_system_settings() com p_habilitar_conciliacao_ofx
--     Frontend: card-details-page.tsx - botão "Conciliar Extrato" condicional ao branding setting
--     Frontend: settings-page.tsx - toggle "Habilitar Conciliação de Extrato OFX" no admin
--     Frontend: branding-context.tsx - campo habilitar_conciliacao_ofx no BrandingSettings
--     Arquivos OFX commitados: src/lib/ofx-parser.ts, src/lib/ofx-reconciliation.ts,
--       src/components/dashboard/ofx-reconciliation-modal.tsx
-- =====================================================

-- =====================================================
-- 0. LIMPEZA DE FUNCTIONS E POLICIES ANTIGAS/NÃO USADAS
-- =====================================================
-- Dropar functions e policies que podem existir no banco do aluno mas não são mais usadas
-- Isso garante que o banco do aluno fique igual ao banco de produção

-- Policies antigas com nomenclatura incorreta (serão recriadas com nomes corretos)
DROP POLICY IF EXISTS "categoria_delete_segura" ON categoria_trasacoes;
DROP POLICY IF EXISTS "categoria_insert_segura" ON categoria_trasacoes;
DROP POLICY IF EXISTS "categoria_select_segura" ON categoria_trasacoes;
DROP POLICY IF EXISTS "categoria_update_segura" ON categoria_trasacoes;
DROP POLICY IF EXISTS "lancamentos_select_segura" ON lancamentos_futuros;
DROP POLICY IF EXISTS "planos_admin_segura" ON planos_sistema;
DROP POLICY IF EXISTS "transacoes_select_segura" ON transacoes;

-- Functions antigas com nomenclatura em português (não usadas)
DROP FUNCTION IF EXISTS atualizar_dependente(integer, text, text, text, jsonb);
DROP FUNCTION IF EXISTS atualizar_dependente(integer, text, text, text, jsonb, text[]);
DROP FUNCTION IF EXISTS contar_dependentes_ativos();
DROP FUNCTION IF EXISTS criar_dependente(text, text, text, jsonb);
DROP FUNCTION IF EXISTS criar_dependente(text, text, text, jsonb, text[]);
DROP FUNCTION IF EXISTS excluir_dependente(integer);
DROP FUNCTION IF EXISTS listar_meus_dependentes();
DROP FUNCTION IF EXISTS obter_info_dependentes();
DROP FUNCTION IF EXISTS pode_adicionar_dependente();

-- Versão antiga de get_system_settings (sem campos PWA)
DROP FUNCTION IF EXISTS get_system_settings();

-- NOTA: handle_updated_at() NÃO pode ser dropada pois tem triggers dependentes
-- Os triggers que dependem dela são:
-- - on_preferencias_notificacao_updated (preferencias_notificacao)
-- - on_update_contas_bancarias (contas_bancarias)
-- - on_update_investment_assets (investment_assets)
-- - on_update_investment_positions (investment_positions)
-- Se precisar atualizar, use CREATE OR REPLACE FUNCTION ao invés de DROP

-- NOTA: calculate_fixed_income_price() NÃO pode ser dropada pois tem views dependentes
-- As views que dependem dela são:
-- - v_positions_detailed
-- - v_portfolio_summary (depende de v_positions_detailed)
-- Será atualizada via CREATE OR REPLACE FUNCTION na seção 4.2

-- Versão antiga de calculate_fixed_income_price (nomenclatura portuguesa)
DROP FUNCTION IF EXISTS calcular_preco_renda_fixa(date, numeric, numeric);

-- =====================================================
-- 1. EXTENSÕES HABILITADAS (não estão no setup.sql)
-- =====================================================

-- Extensões já habilitadas no Supabase:
-- ✅ pg_graphql (schema: graphql)
-- ✅ supabase_vault (schema: vault)
-- ✅ uuid-ossp (schema: extensions)
-- ✅ pg_net (schema: extensions) - NECESSÁRIA para Cron Jobs
-- ✅ http (schema: extensions)
-- ✅ pgcrypto (schema: extensions)
-- ✅ pg_stat_statements (schema: extensions)
-- ✅ pg_cron (schema: pg_catalog) - NECESSÁRIA para Investment Updates

-- =====================================================
-- 2. NOVAS TABELAS (criar PRIMEIRO para evitar erros de dependência)
-- =====================================================

-- 2.1 Tabela: usuarios_dependentes (adicionar colunas faltantes)
-- Tabela já existe, apenas adicionar colunas que podem estar faltando
ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS convite_token TEXT;

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS convite_expira_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS convite_status TEXT DEFAULT 'pendente' CHECK (convite_status IN ('pendente', 'aceito', 'recusado', 'cancelado'));

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS convite_enviado_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{"pode_criar": true, "pode_editar": true, "pode_deletar": false}'::jsonb;

ALTER TABLE usuarios_dependentes 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE usuarios_dependentes 
ALTER COLUMN permissoes SET DEFAULT '{"nivel_acesso": "basico", "pode_ver_relatorios": true, "pode_ver_dados_admin": true, "pode_convidar_membros": false, "pode_criar_transacoes": true, "pode_gerenciar_contas": false, "pode_editar_transacoes": true, "pode_gerenciar_cartoes": false, "pode_deletar_transacoes": false, "pode_ver_outros_membros": false}'::jsonb;

-- 2.1.1 Adicionar coluna tipo_conta na tabela metas_orcamento
ALTER TABLE metas_orcamento
ADD COLUMN IF NOT EXISTS tipo_conta TEXT NOT NULL DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj'));

COMMENT ON COLUMN metas_orcamento.tipo_conta IS 'Tipo de conta: pessoal ou PJ. Permite separar metas por contexto de conta.';

-- 2.1.2 Atualizar constraint tipo_meta para incluir geral_entrada e geral_saida
-- (setup.sql original só tinha 'categoria', 'geral', 'economia')
ALTER TABLE metas_orcamento DROP CONSTRAINT IF EXISTS metas_orcamento_tipo_meta_check;
ALTER TABLE metas_orcamento ADD CONSTRAINT metas_orcamento_tipo_meta_check
  CHECK (tipo_meta IN ('categoria', 'geral', 'economia', 'geral_entrada', 'geral_saida'));

COMMENT ON TABLE usuarios_dependentes IS 'Usuários dependentes vinculados a um usuário principal. Compartilham os mesmos dados financeiros do principal sem ter autenticação própria.';
COMMENT ON COLUMN usuarios_dependentes.usuario_principal_id IS 'ID do usuário principal (titular do plano) ao qual este dependente pertence';
COMMENT ON COLUMN usuarios_dependentes.auth_user_id IS 'UUID do auth.users se o dependente tiver login próprio';
COMMENT ON COLUMN usuarios_dependentes.permissoes IS 'Permissões do dependente em formato JSON';

-- 2.2 Tabela: contas_bancarias
CREATE TABLE IF NOT EXISTS contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    banco TEXT,
    saldo_atual NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    tipo_conta TEXT NOT NULL DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE contas_bancarias IS 'Contas bancárias e carteiras do usuário para controle de saldo';
COMMENT ON COLUMN contas_bancarias.usuario_id IS 'UUID do auth.users (para RLS)';
COMMENT ON COLUMN contas_bancarias.user_id IS 'ID do usuário na tabela usuarios (INTEGER). Preenchido automaticamente via trigger baseado em usuario_id (UUID).';
COMMENT ON COLUMN contas_bancarias.saldo_atual IS 'Saldo atual calculado automaticamente';
COMMENT ON COLUMN contas_bancarias.tipo_conta IS 'Tipo de conta: pessoal ou pj (Pessoa Jurídica)';

-- 2.3 Tabela: cartoes_credito
CREATE TABLE IF NOT EXISTS cartoes_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    bandeira TEXT,
    ultimos_digitos TEXT,
    limite_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (limite_total >= 0),
    dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    tipo_conta TEXT NOT NULL DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj')),
    cor_cartao TEXT DEFAULT '#8A05BE',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conta_vinculada_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL
);

COMMENT ON TABLE cartoes_credito IS 'Cartões de crédito do usuário';
COMMENT ON COLUMN cartoes_credito.usuario_id IS 'UUID do auth.users (para RLS)';
COMMENT ON COLUMN cartoes_credito.user_id IS 'ID do usuário na tabela usuarios (INTEGER). Preenchido automaticamente via trigger baseado em usuario_id (UUID).';
COMMENT ON COLUMN cartoes_credito.dia_fechamento IS 'Dia do mês em que a fatura fecha';
COMMENT ON COLUMN cartoes_credito.dia_vencimento IS 'Dia do mês em que a fatura vence';
COMMENT ON COLUMN cartoes_credito.conta_vinculada_id IS 'Conta bancária usada para pagar a fatura';

-- 2.4 Tabela: investment_assets
CREATE TABLE IF NOT EXISTS investment_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker TEXT NOT NULL UNIQUE,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('acao', 'fii', 'etf', 'renda_fixa', 'cripto', 'bdr')),
    current_price NUMERIC(15,2),
    previous_close NUMERIC(15,2),
    last_updated TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'brapi' CHECK (source IN ('brapi', 'manual', 'fallback', 'binance')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE investment_assets IS 'Ativos disponíveis para investimento (ações, FIIs, criptos, etc)';
COMMENT ON COLUMN investment_assets.ticker IS 'Código do ativo (ex: PETR4, BTCBRL)';
COMMENT ON COLUMN investment_assets.type IS 'Tipo do ativo: acao, fii, etf, renda_fixa, cripto, bdr';
COMMENT ON COLUMN investment_assets.source IS 'Fonte dos dados: brapi, binance, manual, fallback';

-- 2.5 Tabela: investment_positions (CRIAR ANTES de investment_dividends)
CREATE TABLE IF NOT EXISTS investment_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES investment_assets(id) ON DELETE RESTRICT,
    conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    quantidade NUMERIC(15,4) NOT NULL CHECK (quantidade > 0),
    preco_medio NUMERIC(15,2) NOT NULL CHECK (preco_medio >= 0),
    data_compra DATE NOT NULL,
    tipo_conta TEXT NOT NULL CHECK (tipo_conta IN ('pessoal', 'pj')),
    is_manual_price BOOLEAN DEFAULT false,
    manual_price NUMERIC(15,8),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    yield_percentage NUMERIC(5,2) DEFAULT NULL,
    manual_ir NUMERIC(15,2),
    manual_iof NUMERIC(15,2),
    use_manual_tax BOOLEAN DEFAULT false
);

COMMENT ON TABLE investment_positions IS 'Posições de investimento do usuário';
COMMENT ON COLUMN investment_positions.usuario_id IS 'UUID do auth.users (para RLS)';
COMMENT ON COLUMN investment_positions.user_id IS 'ID do usuário na tabela usuarios (INTEGER). Preenchido automaticamente via trigger baseado em usuario_id (UUID).';
COMMENT ON COLUMN investment_positions.quantidade IS 'Quantidade de ativos na posição';
COMMENT ON COLUMN investment_positions.preco_medio IS 'Preço médio de compra';
COMMENT ON COLUMN investment_positions.is_manual_price IS 'Se true, usa manual_price ao invés do preço da API';
COMMENT ON COLUMN investment_positions.yield_percentage IS 'Rentabilidade contratada para Renda Fixa (ex: 100 = 100% CDI, 110 = 110% CDI). NULL para outros tipos de ativos.';
COMMENT ON COLUMN investment_positions.manual_ir IS 'Valor manual de IR (para bater com banco)';
COMMENT ON COLUMN investment_positions.manual_iof IS 'Valor manual de IOF (para bater com banco)';
COMMENT ON COLUMN investment_positions.use_manual_tax IS 'Se true, usa valores manuais de impostos ao invés de calcular';

-- 2.6 Tabela: investment_dividends
CREATE TABLE IF NOT EXISTS investment_dividends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES investment_positions(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('dividendo', 'jcp', 'rendimento', 'amortizacao')),
    valor_por_ativo NUMERIC(15,8) NOT NULL CHECK (valor_por_ativo > 0),
    data_com DATE,
    data_pagamento DATE NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE investment_dividends IS 'Proventos recebidos de investimentos (dividendos, JCP, rendimentos)';
COMMENT ON COLUMN investment_dividends.tipo IS 'Tipo do provento: dividendo, jcp, rendimento, amortizacao';
COMMENT ON COLUMN investment_dividends.valor_por_ativo IS 'Valor pago por ativo';
COMMENT ON COLUMN investment_dividends.data_com IS 'Data COM (quem tinha o ativo nesta data recebe)';

-- 2.6 Tabela: api_usage_log
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    tickers_count INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limit')),
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

COMMENT ON TABLE api_usage_log IS 'Log de uso das APIs externas (BrAPI, Binance, etc)';
COMMENT ON COLUMN api_usage_log.status IS 'Status da chamada: success, error, rate_limit';

-- 2.7 Tabela: cdi_rates
CREATE TABLE IF NOT EXISTS cdi_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    rate NUMERIC NOT NULL,
    source TEXT DEFAULT 'banco_central',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE cdi_rates IS 'Historical CDI rates from Banco Central do Brasil';
COMMENT ON COLUMN cdi_rates.date IS 'Reference date for the rate';
COMMENT ON COLUMN cdi_rates.rate IS 'Annual CDI rate in decimal format (0.1165 = 11.65%)';

-- =====================================================
-- 3. NOVAS COLUNAS EM TABELAS EXISTENTES
-- =====================================================

-- 3.1 Tabela: usuarios
-- Colunas de Internacionalização
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS idioma TEXT DEFAULT 'pt' CHECK (idioma IN ('pt', 'es', 'en'));

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL' CHECK (moeda IN ('BRL', 'USD', 'EUR', 'PYG', 'ARS'));

COMMENT ON COLUMN usuarios.idioma IS 'Idioma preferido do usuário: pt (Português), es (Español), en (English)';
COMMENT ON COLUMN usuarios.moeda IS 'Moeda preferida do usuário: BRL (Real), USD (Dólar), EUR (Euro)';

-- 2.2 Tabela: categoria_trasacoes
-- Colunas para Modo PJ e Keywords AI
ALTER TABLE categoria_trasacoes 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('entrada', 'saida', 'ambos'));

ALTER TABLE categoria_trasacoes 
ADD COLUMN IF NOT EXISTS tipo_conta TEXT NOT NULL DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj'));

ALTER TABLE categoria_trasacoes 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

COMMENT ON COLUMN categoria_trasacoes.tipo IS 'Tipo de categoria: entrada, saida ou ambos';
COMMENT ON COLUMN categoria_trasacoes.keywords IS 'Keywords for AI-powered category identification';

-- 2.3 Tabela: transacoes
-- Colunas para Modo PJ, Transferências, Contas Bancárias e Cartões
ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS dependente_id INTEGER REFERENCES usuarios_dependentes(id) ON DELETE SET NULL;

ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS tipo_conta TEXT DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj'));

ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS is_transferencia BOOLEAN DEFAULT false;

ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;

ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

ALTER TABLE transacoes 
ADD COLUMN IF NOT EXISTS conta_destino_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;

COMMENT ON COLUMN transacoes.conta_destino_id IS 'Conta bancária de destino (usado em transferências entre contas)';

-- Adicionar constraint de valor positivo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transacoes_valor_positivo'
    ) THEN
        ALTER TABLE transacoes ADD CONSTRAINT transacoes_valor_positivo CHECK (valor > 0);
    END IF;
END $$;

COMMENT ON COLUMN transacoes.dependente_id IS 'ID do dependente que criou a transação. NULL = transação do usuário principal';
COMMENT ON COLUMN transacoes.tipo_conta IS 'Tipo de conta da transação: pessoal ou pj (Pessoa Jurídica)';
COMMENT ON COLUMN transacoes.is_transferencia IS 'Flag para identificar transferências entre contas (não conta em relatórios)';
COMMENT ON COLUMN transacoes.conta_id IS 'Conta bancária de origem da transação';
COMMENT ON COLUMN transacoes.cartao_id IS 'Cartão de crédito usado na transação (se aplicável)';

-- 2.4 Tabela: lancamentos_futuros
-- Colunas para Recorrentes, Dependentes e Cartões
ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS dependente_id INTEGER REFERENCES usuarios_dependentes(id) ON DELETE SET NULL;

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS data_final DATE DEFAULT NULL;

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS confirmed_dates TEXT DEFAULT NULL;

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS parcela_info JSONB DEFAULT NULL;

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS tipo_conta TEXT DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'pj'));

ALTER TABLE lancamentos_futuros 
ADD COLUMN IF NOT EXISTS conta_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL;

COMMENT ON COLUMN lancamentos_futuros.dependente_id IS 'ID do dependente que criou o lançamento futuro. NULL = lançamento do usuário principal';
COMMENT ON COLUMN lancamentos_futuros.data_final IS 'Data final opcional para lançamentos recorrentes. NULL = recorrente indefinido (comportamento atual mantido)';
COMMENT ON COLUMN lancamentos_futuros.confirmed_dates IS 'JSON array com datas já confirmadas de recorrentes expandidos. NULL = comportamento atual mantido';
COMMENT ON COLUMN lancamentos_futuros.cartao_id IS 'Cartão de crédito vinculado ao lançamento (para parcelas)';
COMMENT ON COLUMN lancamentos_futuros.parcela_info IS 'Informações da parcela: {"numero": 1, "total": 12, "valor_original": 1200.00}';
COMMENT ON COLUMN lancamentos_futuros.tipo_conta IS 'Tipo de conta: pessoal ou pj (Pessoa Jurídica)';
COMMENT ON COLUMN lancamentos_futuros.conta_id IS 'Conta bancária vinculada ao lançamento futuro';

-- 2.5 Tabela: planos_sistema
-- Colunas para Planos Compartilhados e Modo PJ
ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS permite_compartilhamento BOOLEAN DEFAULT false;

ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS max_usuarios_dependentes INTEGER DEFAULT 0 CHECK (max_usuarios_dependentes >= 0);

ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS destaque BOOLEAN DEFAULT false;

ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS permite_modo_pj BOOLEAN DEFAULT true;

ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS permite_investimentos BOOLEAN DEFAULT false;

ALTER TABLE planos_sistema 
ADD COLUMN IF NOT EXISTS max_ativos_investimento INTEGER DEFAULT 0;

COMMENT ON COLUMN planos_sistema.permite_compartilhamento IS 'Define se este plano permite adicionar usuários dependentes (ex: Plano Casal, Plano Empresa). FALSE = não permite, TRUE = permite';
COMMENT ON COLUMN planos_sistema.max_usuarios_dependentes IS 'Número máximo de usuários dependentes permitidos neste plano. 0 = não permite, -1 = ilimitado, N = limite específico';
COMMENT ON COLUMN planos_sistema.destaque IS 'Se este plano deve ser destacado na interface (ex: "Mais Popular")';
COMMENT ON COLUMN planos_sistema.permite_modo_pj IS 'Se este plano permite usar o modo PJ (Pessoa Jurídica)';

-- 2.6 Tabela: configuracoes_sistema
-- Colunas Admin e Configurações Adicionais
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS support_email CHARACTER VARYING DEFAULT 'suporte@granazap.com';

-- Configuração unificada de cadastro (substituiu bloquear_cadastro_novos_usuarios)
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS restringir_cadastro_usuarios_existentes BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS habilitar_modo_pj BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS show_sidebar_logo BOOLEAN DEFAULT false;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS show_sidebar_name BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS show_login_logo BOOLEAN DEFAULT false;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS show_login_name BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS logo_url_sidebar TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS logo_url_login TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS video_url_instalacao TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS whatsapp_suporte_url TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS webhook_convite_membro TEXT DEFAULT '';

-- Campos PWA (Progressive Web App)
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT DEFAULT NULL;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS apple_touch_icon_url TEXT DEFAULT NULL;

-- Configurações da Página de Planos Pública
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS idioma_padrao_planos TEXT DEFAULT 'pt' 
  CHECK (idioma_padrao_planos IN ('pt', 'es', 'en'));

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS moeda_padrao_planos TEXT DEFAULT 'BRL' 
  CHECK (moeda_padrao_planos IN ('BRL', 'USD', 'EUR', 'PYG', 'ARS'));

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS habilitar_toggle_periodo_planos BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS percentual_desconto_anual INTEGER DEFAULT 15;

COMMENT ON COLUMN configuracoes_sistema.support_email IS 'Email de suporte exibido na plataforma';
COMMENT ON COLUMN configuracoes_sistema.idioma_padrao_planos IS 'Idioma padrão inicial da página de planos (pode ser alterado pelo visitante)';
COMMENT ON COLUMN configuracoes_sistema.moeda_padrao_planos IS 'Moeda padrão para exibição dos valores na página de planos';
COMMENT ON COLUMN configuracoes_sistema.habilitar_toggle_periodo_planos IS 'Se true, exibe toggle Mensal/Anual na página de planos (padrão moderno). Se false, exibe todos os períodos (trimestral, semestral, etc)';
COMMENT ON COLUMN configuracoes_sistema.percentual_desconto_anual IS 'Percentual de desconto aplicado em planos anuais (ex: 15 = 15% de desconto)';
COMMENT ON COLUMN configuracoes_sistema.restringir_cadastro_usuarios_existentes IS 'Define se apenas usuários pré-cadastrados (via WhatsApp/N8N) podem fazer login. FALSE = qualquer pessoa pode se cadastrar (modo público). TRUE = apenas usuários existentes na tabela usuarios podem fazer login (modo restrito).';
COMMENT ON COLUMN configuracoes_sistema.habilitar_modo_pj IS 'Se true, habilita o modo PJ (Pessoa Jurídica) na plataforma';
COMMENT ON COLUMN configuracoes_sistema.show_sidebar_logo IS 'Se true, exibe logo na sidebar';
COMMENT ON COLUMN configuracoes_sistema.show_sidebar_name IS 'Se true, exibe nome da empresa na sidebar';
COMMENT ON COLUMN configuracoes_sistema.show_login_logo IS 'Se true, exibe logo na tela de login';
COMMENT ON COLUMN configuracoes_sistema.show_login_name IS 'Se true, exibe nome da empresa na tela de login';
COMMENT ON COLUMN configuracoes_sistema.logo_url_sidebar IS 'URL do logo para exibir na sidebar';
COMMENT ON COLUMN configuracoes_sistema.logo_url_login IS 'URL do logo para exibir na tela de login';
COMMENT ON COLUMN configuracoes_sistema.favicon_url IS 'URL do favicon (ícone da aba do navegador)';
COMMENT ON COLUMN configuracoes_sistema.video_url_instalacao IS 'URL do vídeo de instalação/tutorial';
COMMENT ON COLUMN configuracoes_sistema.pwa_icon_192_url IS 'URL do ícone PWA 192x192px (manifest.json)';
COMMENT ON COLUMN configuracoes_sistema.pwa_icon_512_url IS 'URL do ícone PWA 512x512px (manifest.json)';
COMMENT ON COLUMN configuracoes_sistema.apple_touch_icon_url IS 'URL do ícone Apple Touch (iOS home screen)';

-- =====================================================
-- 4. FUNÇÕES SQL (ordem correta: tabelas já existem)
-- =====================================================

-- 4.1 Função: is_user_admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_is_admin
    FROM usuarios
    WHERE auth_user = auth.uid();
    
    RETURN COALESCE(v_is_admin, false);
END;
$$;

COMMENT ON FUNCTION is_user_admin() IS 'Verifica se o usuário logado é administrador';

-- 4.2 Função: calculate_fixed_income_price
-- NOTA: Precisa usar DROP CASCADE pois não é possível mudar nomes de parâmetros com CREATE OR REPLACE
-- As views serão recriadas logo após a function
DROP FUNCTION IF EXISTS calculate_fixed_income_price(date, numeric, numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_fixed_income_price(
    purchase_date date, 
    yield_percentage numeric, 
    base_price numeric DEFAULT 1.00
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  days_invested INTEGER;
  daily_cdi_rate NUMERIC;
  accumulated_return NUMERIC;
  final_price NUMERIC;
  latest_cdi_rate NUMERIC;
BEGIN
  -- Se não tem yield_percentage, retorna preço base
  IF yield_percentage IS NULL THEN
    RETURN base_price;
  END IF;

  -- Calcula dias investidos
  days_invested := CURRENT_DATE - purchase_date;
  
  -- Se investiu hoje ou no futuro, retorna preço base
  IF days_invested <= 0 THEN
    RETURN base_price;
  END IF;

  -- Busca a taxa CDI mais recente do banco de dados
  SELECT rate INTO latest_cdi_rate
  FROM cdi_rates
  WHERE date <= CURRENT_DATE
  ORDER BY date DESC
  LIMIT 1;
  
  -- Se não encontrou taxa no banco, usa fallback de 11.65% ao ano
  IF latest_cdi_rate IS NULL THEN
    latest_cdi_rate := 0.1165;
  END IF;
  
  -- Calcula taxa diária do CDI (juros compostos)
  -- Formula: (1 + annual_rate)^(1/252) - 1
  daily_cdi_rate := POWER(1 + latest_cdi_rate, 1.0/252.0) - 1;
  
  -- Aplica o percentual do CDI contratado (ex: 100% = 1.0, 110% = 1.1)
  daily_cdi_rate := daily_cdi_rate * (yield_percentage / 100.0);
  
  -- Calcula retorno acumulado com juros compostos
  accumulated_return := POWER(1 + daily_cdi_rate, days_invested) - 1;
  
  -- Calcula preço final
  final_price := base_price * (1 + accumulated_return);
  
  RETURN ROUND(final_price, 8);
END;
$function$;

COMMENT ON FUNCTION calculate_fixed_income_price(date, numeric, numeric) IS 'Calcula o preço atual de um ativo de renda fixa baseado no CDI e yield contratado. Versão atualizada com fallback e arredondamento.';

-- Recriar views que dependem de calculate_fixed_income_price
-- View 1: v_positions_detailed
CREATE OR REPLACE VIEW v_positions_detailed AS
SELECT 
    p.id,
    p.usuario_id,
    p.tipo_conta,
    p.quantidade,
    p.preco_medio,
    p.data_compra,
    p.is_manual_price,
    p.manual_price,
    p.observacao,
    p.yield_percentage,
    p.use_manual_tax,
    p.manual_ir,
    p.manual_iof,
    a.ticker,
    a.name AS asset_name,
    a.type AS asset_type,
    a.current_price,
    a.previous_close,
    a.last_updated AS price_last_updated,
    a.source AS price_source,
    (p.quantidade * p.preco_medio) AS valor_investido,
    (p.quantidade * COALESCE(p.manual_price,
        CASE
            WHEN ((a.type = 'renda_fixa') AND (p.yield_percentage IS NOT NULL)) THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio)) AS valor_atual,
    ((p.quantidade * COALESCE(p.manual_price,
        CASE
            WHEN ((a.type = 'renda_fixa') AND (p.yield_percentage IS NOT NULL)) THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio)) - (p.quantidade * p.preco_medio)) AS lucro_prejuizo,
    CASE
        WHEN (p.preco_medio > 0) THEN (((COALESCE(p.manual_price,
        CASE
            WHEN ((a.type = 'renda_fixa') AND (p.yield_percentage IS NOT NULL)) THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio) - p.preco_medio) / p.preco_medio) * 100)
        ELSE 0
    END AS rentabilidade_percentual,
    p.created_at,
    p.updated_at
FROM investment_positions p
JOIN investment_assets a ON p.asset_id = a.id
WHERE a.is_active = true;

COMMENT ON VIEW v_positions_detailed IS 'View detalhada de posições de investimento com cálculo de valores atuais e rentabilidade';

-- View 2: v_portfolio_summary
CREATE OR REPLACE VIEW v_portfolio_summary AS
SELECT 
    usuario_id,
    tipo_conta,
    COUNT(DISTINCT id) AS total_ativos,
    SUM(valor_investido) AS valor_investido,
    SUM(valor_atual) AS valor_atual,
    SUM(lucro_prejuizo) AS lucro_prejuizo,
    CASE
        WHEN (SUM(valor_investido) > 0) THEN ((SUM(lucro_prejuizo) / SUM(valor_investido)) * 100)
        ELSE 0
    END AS rentabilidade_percentual
FROM v_positions_detailed
GROUP BY usuario_id, tipo_conta;

COMMENT ON VIEW v_portfolio_summary IS 'View resumida do portfólio de investimentos por usuário e tipo de conta';

-- 4.3 Função: atualizar_saldo_conta
-- CORRIGIDA: Remove verificação auth.uid() para funcionar em todos os contextos
-- Esta function atualiza saldo para TODAS as transações, incluindo transferências
-- Atualização: 16/01/2026 - Removida dependência de auth.uid() para garantir execução
CREATE OR REPLACE FUNCTION atualizar_saldo_conta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Atualizar saldo da conta quando transação é inserida
    IF TG_OP = 'INSERT' THEN
        IF NEW.conta_id IS NOT NULL THEN
            UPDATE contas_bancarias
            SET saldo_atual = saldo_atual + 
                CASE 
                    WHEN NEW.tipo = 'entrada' THEN NEW.valor
                    WHEN NEW.tipo = 'saida' THEN -NEW.valor
                    ELSE 0
                END,
                updated_at = NOW()
            WHERE id = NEW.conta_id;
            -- Removido: AND usuario_id = auth.uid()
            -- Agora atualiza sem verificar autenticação
        END IF;
    END IF;
    
    -- Reverter saldo quando transação é deletada
    IF TG_OP = 'DELETE' THEN
        IF OLD.conta_id IS NOT NULL THEN
            UPDATE contas_bancarias
            SET saldo_atual = saldo_atual - 
                CASE 
                    WHEN OLD.tipo = 'entrada' THEN OLD.valor
                    WHEN OLD.tipo = 'saida' THEN -OLD.valor
                    ELSE 0
                END,
                updated_at = NOW()
            WHERE id = OLD.conta_id;
            -- Removido: AND usuario_id = auth.uid()
        END IF;
    END IF;
    
    -- Atualizar saldo quando transação é modificada
    IF TG_OP = 'UPDATE' THEN
        -- Reverter o valor antigo
        IF OLD.conta_id IS NOT NULL THEN
            UPDATE contas_bancarias
            SET saldo_atual = saldo_atual - 
                CASE 
                    WHEN OLD.tipo = 'entrada' THEN OLD.valor
                    WHEN OLD.tipo = 'saida' THEN -OLD.valor
                    ELSE 0
                END,
                updated_at = NOW()
            WHERE id = OLD.conta_id;
        END IF;
        
        -- Aplicar o novo valor
        IF NEW.conta_id IS NOT NULL THEN
            UPDATE contas_bancarias
            SET saldo_atual = saldo_atual + 
                CASE 
                    WHEN NEW.tipo = 'entrada' THEN NEW.valor
                    WHEN NEW.tipo = 'saida' THEN -NEW.valor
                    ELSE 0
                END,
                updated_at = NOW()
            WHERE id = NEW.conta_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 4.4 Função: update_account_balance
-- NOTA: Esta function está vazia no banco de produção
-- A lógica de atualização de saldo é feita por atualizar_saldo_conta()
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Implementação existente (se houver)
    RETURN NEW;
END;
$$;

-- 4.5 Função: validar_saldo_suficiente
CREATE OR REPLACE FUNCTION validar_saldo_suficiente(p_conta_id UUID, p_valor NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_saldo_atual NUMERIC;
BEGIN
    SELECT saldo_atual INTO v_saldo_atual
    FROM contas_bancarias
    WHERE id = p_conta_id
    AND usuario_id = auth.uid();
    
    IF v_saldo_atual IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_saldo_atual >= p_valor;
END;
$$;

-- 4.6 Função: prevent_duplicate_user_on_signup
-- NOTA: A função principal link_existing_user_on_signup está no setup.sql
-- Esta função é um complemento para evitar duplicação de usuários
-- A lógica completa de dependentes está implementada no setup.sql
CREATE OR REPLACE FUNCTION prevent_duplicate_user_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_user_id INTEGER;
BEGIN
    -- Verificar se já existe usuário com este email
    SELECT id INTO v_existing_user_id
    FROM usuarios
    WHERE LOWER(email) = LOWER(NEW.email);
    
    -- Se encontrou, vincular auth_user ao usuário existente
    IF v_existing_user_id IS NOT NULL THEN
        UPDATE usuarios
        SET auth_user = NEW.auth_user,
            has_password = true,
            ultima_atualizacao = NOW()
        WHERE id = v_existing_user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4.7 Função: handle_public_user_invite_link
-- Vincula auth_user_id em usuarios_dependentes quando um usuário é criado
CREATE OR REPLACE FUNCTION handle_public_user_invite_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Atualizar usuarios_dependentes se houver convite pendente com este email
    UPDATE public.usuarios_dependentes
    SET 
        auth_user_id = NEW.auth_user,
        convite_status = 'aceito',
        data_ultima_modificacao = NOW()
    WHERE 
        LOWER(email) = LOWER(NEW.email)
        AND convite_status = 'pendente';
    
    RETURN NEW;
END;
$$;

-- 4.7.1 Função: verificar_proprietario_por_auth (CRÍTICA para RLS)
CREATE OR REPLACE FUNCTION verificar_proprietario_por_auth()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_id INTEGER;
    principal_id INTEGER;
BEGIN
    -- 1. Tentar buscar como usuário principal
    SELECT id INTO user_id
    FROM public.usuarios
    WHERE auth_user = auth.uid();
    
    -- Se encontrou, retornar
    IF user_id IS NOT NULL THEN
        RETURN user_id;
    END IF;
    
    -- 2. Se não encontrou, verificar se é dependente
    SELECT usuario_principal_id INTO principal_id
    FROM public.usuarios_dependentes
    WHERE auth_user_id = auth.uid() 
      AND status = 'ativo';
    
    -- Retornar ID do principal (para acessar dados compartilhados)
    RETURN COALESCE(principal_id, 0);
END;
$$;

COMMENT ON FUNCTION verificar_proprietario_por_auth() IS 'Retorna o ID do usuário principal. Se for dependente, retorna o ID do titular. Usado nas políticas RLS para permitir acesso compartilhado.';

-- 4.7.2 Função: obter_uuid_proprietario (para tabelas que usam UUID como FK)
-- Equivalente à verificar_proprietario_por_auth() mas retorna UUID (auth_user) ao invés de INTEGER (id)
-- Necessária para contas_bancarias e cartoes_credito que referenciam auth.users.id
CREATE OR REPLACE FUNCTION public.obter_uuid_proprietario()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    owner_uuid UUID;
    principal_auth_uuid UUID;
BEGIN
    -- 1. Verificar se é usuário principal
    SELECT auth_user INTO owner_uuid
    FROM public.usuarios
    WHERE auth_user = auth.uid();
    
    IF owner_uuid IS NOT NULL THEN
        RETURN owner_uuid;
    END IF;
    
    -- 2. Se não encontrou, verificar se é dependente
    SELECT u.auth_user INTO principal_auth_uuid
    FROM public.usuarios_dependentes d
    JOIN public.usuarios u ON u.id = d.usuario_principal_id
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo';
    
    RETURN COALESCE(principal_auth_uuid, auth.uid());
END;
$$;

COMMENT ON FUNCTION obter_uuid_proprietario() IS 'Retorna UUID do proprietário: se principal retorna próprio auth.uid(), se dependente retorna auth_user do principal. Para tabelas com usuario_id UUID.';

-- 4.8 Função: sync_user_id_from_auth (ATUALIZADA - 10/01/2026)
-- Suporta tanto usuários principais quanto dependentes
CREATE OR REPLACE FUNCTION sync_user_id_from_auth()
RETURNS TRIGGER AS $$
DECLARE
  v_principal_auth_user UUID;
BEGIN
  -- Se user_id já está preenchido, não faz nada
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Primeiro, tentar buscar o user_id (INTEGER) baseado no usuario_id (UUID) na tabela usuarios
  SELECT id INTO NEW.user_id
  FROM usuarios
  WHERE auth_user = NEW.usuario_id;
  
  -- Se encontrou, retornar (usuário principal)
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se não encontrou, verificar se é um dependente
  -- Buscar o auth_user do principal baseado no auth_user_id do dependente
  SELECT u.auth_user INTO v_principal_auth_user
  FROM usuarios_dependentes d
  JOIN usuarios u ON u.id = d.usuario_principal_id
  WHERE d.auth_user_id = NEW.usuario_id
    AND d.status = 'ativo';
  
  -- Se encontrou dependente, buscar user_id do principal
  IF v_principal_auth_user IS NOT NULL THEN
    SELECT id INTO NEW.user_id
    FROM usuarios
    WHERE auth_user = v_principal_auth_user;
    
    -- Se encontrou o principal, retornar
    IF NEW.user_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Se não encontrou nem como principal nem como dependente, lançar erro
  RAISE EXCEPTION 'Usuário não encontrado na tabela usuarios para auth_user: %', NEW.usuario_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_user_id_from_auth() IS 'Preenche automaticamente user_id (INTEGER) baseado em usuario_id (UUID). Suporta tanto usuários principais quanto dependentes.';

-- 4.9 Função: auto_set_plano_id (NOVA - 22/12/2024)
CREATE OR REPLACE FUNCTION auto_set_plano_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se plano_id já está preenchido, não faz nada
  IF NEW.plano_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Se plano é 'Free' ou NULL, seta plano_id = 1 (Plano Free)
  IF NEW.plano = 'Free' OR NEW.plano IS NULL THEN
    NEW.plano_id := 1;
    NEW.plano := 'Free'; -- Garante que o campo texto também está correto
    RETURN NEW;
  END IF;

  -- Para outros planos, tenta encontrar o ID baseado no nome
  -- Mensal = 2, Trimestral = 3, Semestral = 4, Anual = 5
  CASE LOWER(NEW.plano)
    WHEN 'mensal' THEN NEW.plano_id := 2;
    WHEN 'trimestral' THEN NEW.plano_id := 3;
    WHEN 'semestral' THEN NEW.plano_id := 4;
    WHEN 'anual' THEN NEW.plano_id := 5;
    ELSE 
      -- Se não reconhecer, seta como Free por segurança
      NEW.plano_id := 1;
      NEW.plano := 'Free';
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_set_plano_id() IS 'Preenche automaticamente plano_id baseado no campo plano. Se plano=Free ou NULL, seta plano_id=1. Garante que nenhum usuário fique sem plano vinculado.';

-- 4.10 Funções Admin (novas)
CREATE OR REPLACE FUNCTION admin_create_user(
    p_nome TEXT,
    p_email TEXT,
    p_celular TEXT DEFAULT NULL,
    p_plano TEXT DEFAULT 'free',
    p_is_admin BOOLEAN DEFAULT false,
    p_plano_id INTEGER DEFAULT NULL,
    p_data_final_plano TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id INTEGER;
    v_plano_nome TEXT;
    v_data_final_plano TIMESTAMPTZ;
    v_tipo_periodo TEXT;
BEGIN
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
    END IF;

    IF EXISTS (SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER(p_email)) THEN
        RAISE EXCEPTION 'Email já cadastrado.';
    END IF;

    -- Resolver nome e data_final_plano a partir de plano_id (preferencial)
    IF p_plano_id IS NOT NULL THEN
        SELECT nome, tipo_periodo
        INTO v_plano_nome, v_tipo_periodo
        FROM planos_sistema WHERE id = p_plano_id;

        IF v_plano_nome IS NOT NULL THEN
            CASE v_tipo_periodo
                WHEN 'mensal'     THEN v_data_final_plano := NOW() + INTERVAL '1 month';
                WHEN 'trimestral' THEN v_data_final_plano := NOW() + INTERVAL '3 months';
                WHEN 'semestral'  THEN v_data_final_plano := NOW() + INTERVAL '6 months';
                WHEN 'anual'      THEN v_data_final_plano := NOW() + INTERVAL '1 year';
                ELSE NULL;
            END CASE;
        END IF;
    END IF;

    -- Fallback: usar p_plano (tipo_periodo) se plano_id não resolveu nome
    IF v_plano_nome IS NULL THEN
        v_plano_nome := COALESCE(
            (SELECT nome FROM planos_sistema WHERE LOWER(tipo_periodo) = LOWER(p_plano) LIMIT 1),
            p_plano
        );
    END IF;

    -- Sobrescrever data_final com valor manual se fornecido
    IF p_data_final_plano IS NOT NULL THEN
        v_data_final_plano := p_data_final_plano;
    END IF;

    INSERT INTO usuarios (
        nome, email, celular, plano, plano_id, is_admin,
        status, has_password, aceite_termos, data_compra, data_final_plano, created_at
    )
    VALUES (
        p_nome, p_email, p_celular, v_plano_nome, p_plano_id, p_is_admin,
        'ativo', false, true, NOW(), v_data_final_plano, NOW()
    )
    RETURNING id INTO v_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Usuário criado com sucesso',
        'user_id', v_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_auth_for_user(
    p_user_id INTEGER,
    p_senha TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_auth_user_id UUID;
    v_encrypted_password TEXT;
    v_existing_auth UUID;
BEGIN
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
    END IF;
    
    SELECT email, auth_user INTO v_email, v_existing_auth
    FROM usuarios
    WHERE id = p_user_id;
    
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
    
    -- Se já tem auth_user, apenas resetar senha
    IF v_existing_auth IS NOT NULL THEN
        SELECT extensions.crypt(p_senha, extensions.gen_salt('bf')) INTO v_encrypted_password;
        
        UPDATE auth.users
        SET encrypted_password = v_encrypted_password,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = v_existing_auth;
        
        UPDATE usuarios
        SET has_password = true, ultima_atualizacao = NOW()
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Senha atualizada com sucesso',
            'auth_user_id', v_existing_auth
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE EXCEPTION 'Email já cadastrado no sistema de autenticação';
    END IF;
    
    SELECT extensions.crypt(p_senha, extensions.gen_salt('bf')) INTO v_encrypted_password;
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
        'authenticated', v_email, v_encrypted_password, NOW(), NOW(), NOW(), '', ''
    ) RETURNING id INTO v_auth_user_id;
    
    UPDATE usuarios
    SET auth_user = v_auth_user_id, has_password = true, ultima_atualizacao = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Conta de autenticação criada com sucesso',
        'auth_user_id', v_auth_user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar conta: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION admin_clear_chat_history(p_user_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
    END IF;
    
    WITH user_data AS (
        SELECT 
            lid_original, 
            celular || '@s.whatsapp.net' AS cid 
        FROM usuarios 
        WHERE id = p_user_id
    )
    DELETE FROM n8n_chat_histories_corporation
    WHERE session_id IN (
        SELECT u.id_value 
        FROM user_data, 
        UNNEST(ARRAY[lid_original, cid]) AS u(id_value) 
        WHERE u.id_value IS NOT NULL
    );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    UPDATE usuarios 
    SET data_ultima_mensagem = NULL 
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Histórico de chat limpo com sucesso',
        'deleted_count', v_deleted_count
    );
END;
$$;

-- Dropar todas as versões anteriores de admin_create_plan
DROP FUNCTION IF EXISTS admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer);
DROP FUNCTION IF EXISTS admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer, boolean);
DROP FUNCTION IF EXISTS admin_create_plan(character varying, character varying, numeric, text, text, text, boolean, integer, boolean, boolean);
DROP FUNCTION IF EXISTS admin_create_plan(character varying, character varying, numeric, text, text, text, boolean, integer, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION admin_create_plan(
    p_nome VARCHAR,
    p_tipo_periodo VARCHAR,
    p_valor NUMERIC,
    p_link_checkout TEXT DEFAULT '',
    p_descricao TEXT DEFAULT '',
    p_recursos TEXT DEFAULT '[]',
    p_permite_compartilhamento BOOLEAN DEFAULT false,
    p_max_usuarios_dependentes INTEGER DEFAULT 0,
    p_destaque BOOLEAN DEFAULT false,
    p_permite_modo_pj BOOLEAN DEFAULT true,
    p_permite_investimentos BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_user_id UUID;
    v_new_id INTEGER;
    v_max_ordem INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    SELECT u.is_admin INTO v_is_admin
    FROM usuarios u
    WHERE u.auth_user = v_user_id;
    
    IF v_is_admin IS NULL OR v_is_admin = false THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
    END IF;
    
    SELECT COALESCE(MAX(ordem_exibicao), 0) + 1 INTO v_max_ordem
    FROM planos_sistema;
    
    IF p_destaque IS TRUE THEN 
        UPDATE planos_sistema SET destaque = false; 
    END IF;
    
    INSERT INTO planos_sistema (
        nome, tipo_periodo, valor, link_checkout, descricao, recursos,
        ativo, ordem_exibicao, permite_compartilhamento, max_usuarios_dependentes,
        destaque, permite_modo_pj, permite_investimentos
    ) VALUES (
        p_nome, p_tipo_periodo, p_valor, p_link_checkout, p_descricao, p_recursos::jsonb,
        true, v_max_ordem, p_permite_compartilhamento, p_max_usuarios_dependentes,
        p_destaque, p_permite_modo_pj, p_permite_investimentos
    )
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$;

-- 4.10.2 Função: admin_create_plan (versão retorno JSON)
CREATE OR REPLACE FUNCTION admin_create_plan(
    p_nome text,
    p_tipo_periodo text,
    p_valor numeric,
    p_link_checkout text DEFAULT '',
    p_descricao text DEFAULT '',
    p_recursos jsonb DEFAULT '[]',
    p_permite_compartilhamento boolean DEFAULT false,
    p_max_usuarios_dependentes integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_id integer;
  v_max_ordem integer;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Buscar próxima ordem
  SELECT COALESCE(MAX(ordem_exibicao), 0) + 1 INTO v_max_ordem FROM planos_sistema;
  
  -- Criar plano
  INSERT INTO planos_sistema (
    nome,
    tipo_periodo,
    valor,
    link_checkout,
    descricao,
    recursos,
    ativo,
    ordem_exibicao,
    permite_compartilhamento,
    max_usuarios_dependentes,
    created_at,
    updated_at
  ) VALUES (
    p_nome,
    p_tipo_periodo,
    p_valor,
    p_link_checkout,
    p_descricao,
    p_recursos,
    true,
    v_max_ordem,
    p_permite_compartilhamento,
    p_max_usuarios_dependentes,
    NOW(),
    NOW()
  ) RETURNING id INTO v_plan_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Plano criado com sucesso',
    'plan_id', v_plan_id
  );
END;
$$;

-- 4.10.3 Função: admin_create_plan (versão retorno JSONB com destaque)
CREATE OR REPLACE FUNCTION admin_create_plan(
    p_nome text,
    p_tipo_periodo text,
    p_valor numeric,
    p_link_checkout text DEFAULT NULL,
    p_descricao text DEFAULT NULL,
    p_recursos jsonb DEFAULT '[]',
    p_permite_compartilhamento boolean DEFAULT false,
    p_max_usuarios_dependentes integer DEFAULT 0,
    p_destaque boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_plan_id integer;
    v_result jsonb;
BEGIN
    -- Se estiver criando como destaque, desmarcar todos os outros
    IF p_destaque IS TRUE THEN
        UPDATE planos_sistema SET destaque = false;
    END IF;

    INSERT INTO planos_sistema (
        nome,
        tipo_periodo,
        valor,
        link_checkout,
        descricao,
        recursos,
        permite_compartilhamento,
        max_usuarios_dependentes,
        destaque,
        ativo,
        ordem_exibicao
    ) VALUES (
        p_nome,
        p_tipo_periodo,
        p_valor,
        p_link_checkout,
        p_descricao,
        p_recursos,
        p_permite_compartilhamento,
        p_max_usuarios_dependentes,
        p_destaque,
        true,
        (SELECT COALESCE(MAX(ordem_exibicao), 0) + 1 FROM planos_sistema)
    )
    RETURNING id INTO v_new_plan_id;

    SELECT to_jsonb(p.*) INTO v_result
    FROM planos_sistema p
    WHERE id = v_new_plan_id;

    RETURN v_result;
END;
$$;

-- 4.11 Função: admin_create_user_with_auth
-- CORRIGIDO v2:
-- 1. Insere em auth.identities (obrigatorio para login email/senha no GoTrue)
-- 2. usa gen_salt('bf', 10) - cost 10 compativel com GoTrue
-- 3. raw_app/user_meta_data corretos
-- 4. ON CONFLICT em public.usuarios (trigger modo livre pode criar antes)
CREATE OR REPLACE FUNCTION public.admin_create_user_with_auth(
    p_nome text,
    p_email text,
    p_senha text,
    p_celular text DEFAULT NULL,
    p_plano_id integer DEFAULT NULL,
    p_is_admin boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id integer;
  v_auth_user_id uuid;
  v_encrypted_password text;
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email já cadastrado.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email já cadastrado no sistema de autenticação.';
  END IF;

  -- Hash bcrypt cost 10 (compativel com GoTrue)
  SELECT extensions.crypt(p_senha, extensions.gen_salt('bf', 10)) INTO v_encrypted_password;

  -- Inserir em auth.users com metadata correto
  -- NOTA: O trigger link_existing_user_on_signup dispara aqui.
  -- No modo livre ele cria o usuario em public.usuarios automaticamente.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(), NOW(), NOW(),
    '', '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::text[]),
    jsonb_build_object('nome', p_nome)
  )
  RETURNING id INTO v_auth_user_id;

  -- CRITICO: inserir em auth.identities (obrigatorio para login email/senha no GoTrue)
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    p_email,
    v_auth_user_id,
    jsonb_build_object(
      'sub', v_auth_user_id::text,
      'email', p_email,
      'email_verified', true,
      'provider_type', 'email'
    ),
    'email',
    NOW(), NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Inserir/atualizar em public.usuarios
  -- ON CONFLICT: se o trigger ja criou o usuario, atualiza com os dados do admin
  INSERT INTO public.usuarios (
    nome, email, celular, plano_id, is_admin,
    status, has_password, auth_user, created_at
  ) VALUES (
    p_nome, p_email, p_celular, p_plano_id, p_is_admin,
    'ativo', true, v_auth_user_id, NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    celular = COALESCE(EXCLUDED.celular, public.usuarios.celular),
    plano_id = COALESCE(EXCLUDED.plano_id, public.usuarios.plano_id),
    is_admin = EXCLUDED.is_admin,
    status = 'ativo',
    has_password = true,
    auth_user = EXCLUDED.auth_user,
    ultima_atualizacao = NOW()
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Usuário criado com sucesso com conta de login',
    'user_id', v_user_id,
    'auth_user_id', v_auth_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
END;
$$;


-- 4.12 Função: admin_delete_plan
CREATE OR REPLACE FUNCTION admin_delete_plan(p_plan_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_users_count integer;
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  SELECT COUNT(*) INTO v_users_count FROM usuarios WHERE plano_id = p_plan_id;
  
  IF v_users_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir. Existem % usuários usando este plano.', v_users_count;
  END IF;
  
  DELETE FROM planos_sistema WHERE id = p_plan_id;
  
  RETURN json_build_object('success', true, 'message', 'Plano excluído com sucesso');
END;
$$;

-- 4.12.1 Função: admin_update_plan
-- Dropar todas as versões anteriores de admin_update_plan
DROP FUNCTION IF EXISTS admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer);
DROP FUNCTION IF EXISTS admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer, boolean);
DROP FUNCTION IF EXISTS admin_update_plan(integer, character varying, character varying, numeric, text, text, text, boolean, integer, boolean, integer, boolean, boolean);
DROP FUNCTION IF EXISTS admin_update_plan(integer, character varying, character varying, numeric, text, text, text, boolean, integer, boolean, integer, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION admin_update_plan(
    p_plan_id INTEGER,
    p_nome VARCHAR DEFAULT NULL,
    p_tipo_periodo VARCHAR DEFAULT NULL,
    p_valor NUMERIC DEFAULT NULL,
    p_link_checkout TEXT DEFAULT NULL,
    p_descricao TEXT DEFAULT NULL,
    p_recursos TEXT DEFAULT NULL,
    p_ativo BOOLEAN DEFAULT NULL,
    p_ordem_exibicao INTEGER DEFAULT NULL,
    p_permite_compartilhamento BOOLEAN DEFAULT NULL,
    p_max_usuarios_dependentes INTEGER DEFAULT NULL,
    p_destaque BOOLEAN DEFAULT NULL,
    p_permite_modo_pj BOOLEAN DEFAULT NULL,
    p_permite_investimentos BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  SELECT u.is_admin INTO v_is_admin
  FROM usuarios u
  WHERE u.auth_user = v_user_id;
  
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  IF p_destaque IS TRUE THEN 
    UPDATE planos_sistema SET destaque = false WHERE id != p_plan_id; 
  END IF;
  
  UPDATE planos_sistema
  SET
    nome = COALESCE(p_nome, nome),
    tipo_periodo = COALESCE(p_tipo_periodo, tipo_periodo),
    valor = COALESCE(p_valor, valor),
    link_checkout = COALESCE(p_link_checkout, link_checkout),
    descricao = COALESCE(p_descricao, descricao),
    recursos = CASE WHEN p_recursos IS NOT NULL THEN p_recursos::jsonb ELSE recursos END,
    ativo = COALESCE(p_ativo, ativo),
    ordem_exibicao = COALESCE(p_ordem_exibicao, ordem_exibicao),
    permite_compartilhamento = COALESCE(p_permite_compartilhamento, permite_compartilhamento),
    max_usuarios_dependentes = COALESCE(p_max_usuarios_dependentes, max_usuarios_dependentes),
    destaque = COALESCE(p_destaque, destaque),
    permite_modo_pj = COALESCE(p_permite_modo_pj, permite_modo_pj),
    permite_investimentos = COALESCE(p_permite_investimentos, permite_investimentos),
    updated_at = NOW()
  WHERE id = p_plan_id;
END;
$$;

-- 4.12.2 Função: admin_update_plan (versão retorno JSON com p_recursos jsonb)
CREATE OR REPLACE FUNCTION admin_update_plan(
    p_plan_id integer,
    p_nome text DEFAULT NULL,
    p_tipo_periodo text DEFAULT NULL,
    p_valor numeric DEFAULT NULL,
    p_link_checkout text DEFAULT NULL,
    p_descricao text DEFAULT NULL,
    p_recursos jsonb DEFAULT NULL,
    p_ativo boolean DEFAULT NULL,
    p_ordem_exibicao integer DEFAULT NULL,
    p_permite_compartilhamento boolean DEFAULT NULL,
    p_max_usuarios_dependentes integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Atualizar apenas campos não nulos
  UPDATE planos_sistema
  SET
    nome = COALESCE(p_nome, nome),
    tipo_periodo = COALESCE(p_tipo_periodo, tipo_periodo),
    valor = COALESCE(p_valor, valor),
    link_checkout = COALESCE(p_link_checkout, link_checkout),
    descricao = COALESCE(p_descricao, descricao),
    recursos = COALESCE(p_recursos, recursos),
    ativo = COALESCE(p_ativo, ativo),
    ordem_exibicao = COALESCE(p_ordem_exibicao, ordem_exibicao),
    permite_compartilhamento = COALESCE(p_permite_compartilhamento, permite_compartilhamento),
    max_usuarios_dependentes = COALESCE(p_max_usuarios_dependentes, max_usuarios_dependentes),
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  RETURN json_build_object('success', true, 'message', 'Plano atualizado com sucesso');
END;
$$;

-- 4.12.3 Função: admin_update_plan (versão retorno VOID com destaque e p_recursos jsonb)
CREATE OR REPLACE FUNCTION admin_update_plan(
    p_plan_id integer,
    p_nome text DEFAULT NULL,
    p_tipo_periodo text DEFAULT NULL,
    p_valor numeric DEFAULT NULL,
    p_link_checkout text DEFAULT NULL,
    p_descricao text DEFAULT NULL,
    p_recursos jsonb DEFAULT NULL,
    p_ativo boolean DEFAULT NULL,
    p_ordem_exibicao integer DEFAULT NULL,
    p_permite_compartilhamento boolean DEFAULT NULL,
    p_max_usuarios_dependentes integer DEFAULT NULL,
    p_destaque boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se estiver marcando como destaque, desmarcar todos os outros primeiro
    IF p_destaque IS TRUE THEN
        UPDATE planos_sistema SET destaque = false WHERE id != p_plan_id;
    END IF;

    UPDATE planos_sistema
    SET 
        nome = COALESCE(p_nome, nome),
        tipo_periodo = COALESCE(p_tipo_periodo, tipo_periodo),
        valor = COALESCE(p_valor, valor),
        link_checkout = COALESCE(p_link_checkout, link_checkout),
        descricao = COALESCE(p_descricao, descricao),
        recursos = COALESCE(p_recursos, recursos),
        ativo = COALESCE(p_ativo, ativo),
        ordem_exibicao = COALESCE(p_ordem_exibicao, ordem_exibicao),
        permite_compartilhamento = COALESCE(p_permite_compartilhamento, permite_compartilhamento),
        max_usuarios_dependentes = COALESCE(p_max_usuarios_dependentes, max_usuarios_dependentes),
        destaque = COALESCE(p_destaque, destaque),
        updated_at = now()
    WHERE id = p_plan_id;
END;
$$;

-- 4.12.1 Função + Trigger: prevent_delete_paid_lancamentos
-- Impede exclusão de lançamentos futuros já pagos/efetivados.
-- A função admin_delete_user desabilita este trigger temporariamente para permitir cascade.
CREATE OR REPLACE FUNCTION prevent_delete_paid_lancamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF OLD.status = 'pago' OR OLD.status = 'efetivado' THEN
        RAISE EXCEPTION 'Não é possível excluir um lançamento que já foi pago ou efetivado. Use a opção de reversão de pagamento.';
    END IF;
    RETURN OLD;
END;
$$;

-- Criar trigger apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_prevent_delete_paid_lancamentos'
    ) THEN
        CREATE TRIGGER trigger_prevent_delete_paid_lancamentos
        BEFORE DELETE ON lancamentos_futuros
        FOR EACH ROW EXECUTE FUNCTION prevent_delete_paid_lancamentos();
    END IF;
END;
$$;

-- 4.13 Função: admin_delete_user
-- Atualizada em 26/02/2026: Fix FK usuarios_dependentes_auth_user_id_fkey (ON DELETE NO ACTION)
-- Limpa auth_user_id em usuarios_dependentes antes de deletar auth.users
CREATE OR REPLACE FUNCTION admin_delete_user(
    p_user_id integer, 
    p_delete_auth boolean DEFAULT false, 
    p_delete_transactions boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user uuid;
  v_celular text;
  v_session_id text;
  v_chat_deleted integer := 0;
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  IF p_user_id = (SELECT id FROM usuarios WHERE auth_user = auth.uid()) THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;
  
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário com ID % não encontrado.', p_user_id;
  END IF;
  
  -- Buscar auth_user e celular do usuário
  SELECT auth_user, celular INTO v_auth_user, v_celular 
  FROM usuarios 
  WHERE id = p_user_id;
  
  -- Deletar histórico de chat do WhatsApp/N8N se celular existir
  IF v_celular IS NOT NULL AND v_celular != '' THEN
    v_session_id := v_celular || '@s.whatsapp.net';
    
    DELETE FROM n8n_chat_histories_corporation 
    WHERE session_id = v_session_id;
    
    GET DIAGNOSTICS v_chat_deleted = ROW_COUNT;
  END IF;
  
  -- ============================================================
  -- IMPORTANTE: SEMPRE desabilitar trigger de lançamentos pagos
  -- porque as FKs lancamentos_futuros -> usuarios são CASCADE,
  -- então o DELETE FROM usuarios dispara cascade e o trigger bloqueia.
  -- ============================================================
  ALTER TABLE lancamentos_futuros DISABLE TRIGGER trigger_prevent_delete_paid_lancamentos;
  
  -- Limpar referências cruzadas (FK circular)
  UPDATE transacoes SET lancamento_futuro_id = NULL WHERE usuario_id = p_user_id;
  UPDATE lancamentos_futuros SET transacao_id = NULL WHERE usuario_id = p_user_id;
  
  -- Limpar referência de dividendos -> transações
  UPDATE investment_dividends SET transacao_id = NULL 
  WHERE transacao_id IN (SELECT id FROM transacoes WHERE usuario_id = p_user_id);
  
  -- Deletar transações e lançamentos (ordem importa por causa de FKs RESTRICT)
  DELETE FROM transacoes WHERE usuario_id = p_user_id;
  DELETE FROM lancamentos_futuros WHERE usuario_id = p_user_id;
  DELETE FROM metas_orcamento WHERE usuario_id = p_user_id;
  DELETE FROM categoria_trasacoes WHERE usuario_id = p_user_id;
  
  -- 6. Deletar registros dependentes
  DELETE FROM preferencias_notificacao WHERE usuario_id = p_user_id;
  DELETE FROM consentimentos_usuarios WHERE usuario_id = p_user_id;
  DELETE FROM solicitacoes_lgpd WHERE usuario_id = p_user_id;
  
  -- Deletar lembretes e integrações Google Calendar (se as tabelas existirem)
  -- Essas tabelas são criadas pela migration migrations_lembretes_google_calendar.sql
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lembretes') THEN
    DELETE FROM lembretes WHERE usuario_id = p_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'google_calendar_integrations') THEN
    DELETE FROM google_calendar_integrations WHERE usuario_id = p_user_id;
  END IF;
  
  -- 7. Limpar auth_user_id em usuarios_dependentes onde este usuário é DEPENDENTE
  -- FK: usuarios_dependentes_auth_user_id_fkey -> auth.users é ON DELETE NO ACTION
  -- Sem isso, ao deletar auth.users ocorre: violates foreign key constraint
  IF v_auth_user IS NOT NULL THEN
    UPDATE usuarios_dependentes SET auth_user_id = NULL WHERE auth_user_id = v_auth_user;
  END IF;

  -- 8. Deletar registros onde o usuário é o PRINCIPAL (dono dos dependentes)
  DELETE FROM usuarios_dependentes WHERE usuario_principal_id = p_user_id;
  
  -- Deletar investimentos vinculados
  DELETE FROM investment_dividends WHERE position_id IN (
    SELECT id FROM investment_positions WHERE user_id = p_user_id
  );
  DELETE FROM investment_positions WHERE user_id = p_user_id;
  
  -- Deletar cartões e contas bancárias
  DELETE FROM cartoes_credito WHERE user_id = p_user_id;
  DELETE FROM contas_bancarias WHERE user_id = p_user_id;
  
  -- Deletar usuário da tabela usuarios
  DELETE FROM usuarios WHERE id = p_user_id;
  
  -- Reabilitar trigger
  ALTER TABLE lancamentos_futuros ENABLE TRIGGER trigger_prevent_delete_paid_lancamentos;
  
  -- 13. Deletar da autenticação se solicitado
  -- auth_user_id em usuarios_dependentes já foi zerado no passo 7
  IF p_delete_auth AND v_auth_user IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Usuário excluído com sucesso',
    'chat_messages_deleted', v_chat_deleted,
    'auth_deleted', p_delete_auth AND v_auth_user IS NOT NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Garantir que o trigger seja reabilitado em caso de erro
  BEGIN
    ALTER TABLE lancamentos_futuros ENABLE TRIGGER trigger_prevent_delete_paid_lancamentos;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$$;

COMMENT ON FUNCTION admin_delete_user(integer, boolean, boolean) IS 'Exclui usuário com limpeza completa. Trata: trigger lançamentos pagos, FK circular transacoes/lancamentos, auth_user_id em usuarios_dependentes (ON DELETE NO ACTION).';

-- 4.14 Função: admin_get_user_stats
CREATE OR REPLACE FUNCTION admin_get_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  SELECT json_build_object(
    'total_usuarios', COUNT(*),
    'usuarios_ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
    'administradores', COUNT(*) FILTER (WHERE is_admin = true),
    'novos_30_dias', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'usuarios_free', COUNT(*) FILTER (WHERE plano = 'free' OR plano IS NULL),
    'usuarios_premium', COUNT(*) FILTER (WHERE plano IN ('pro', 'vitalicio'))
  ) INTO v_result
  FROM usuarios;
  
  RETURN v_result;
END;
$$;

-- 4.15 Função: processar_pagamento_fatura_segura (CORRIGIDA)
CREATE OR REPLACE FUNCTION processar_pagamento_fatura_segura(
    p_cartao_id UUID,
    p_conta_id UUID,
    p_mes_fatura TEXT,
    p_data_pagamento DATE,
    p_tipo_conta TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id INTEGER;
    v_total_fatura NUMERIC := 0;
    v_saldo_conta NUMERIC;
    v_cartao_nome TEXT;
    v_transacao_id INTEGER;
    v_count_lancamentos INTEGER := 0;
    v_categoria_id INTEGER;
BEGIN
    -- 1. Validar usuário
    SELECT id INTO v_usuario_id
    FROM usuarios
    WHERE auth_user = auth.uid();
    
    IF v_usuario_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;
    
    -- 2. Validar que cartão e conta pertencem ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM cartoes_credito 
        WHERE id = p_cartao_id AND usuario_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Cartão não pertence ao usuário');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM contas_bancarias 
        WHERE id = p_conta_id AND usuario_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Conta não pertence ao usuário');
    END IF;
    
    -- 3. Calcular total da fatura
    SELECT COALESCE(SUM(valor), 0), COUNT(*) 
    INTO v_total_fatura, v_count_lancamentos
    FROM lancamentos_futuros
    WHERE cartao_id = p_cartao_id
    AND mes_previsto = p_mes_fatura
    AND status = 'pendente'
    AND usuario_id = v_usuario_id;
    
    IF v_count_lancamentos = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Nenhum lançamento pendente encontrado');
    END IF;
    
    -- 4. Validar saldo
    SELECT saldo_atual INTO v_saldo_conta
    FROM contas_bancarias
    WHERE id = p_conta_id;
    
    IF v_saldo_conta < v_total_fatura THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
    
    -- 5. Buscar nome do cartão
    SELECT nome INTO v_cartao_nome
    FROM cartoes_credito
    WHERE id = p_cartao_id;
    
    -- 6. Buscar categoria apropriada (prioriza "Cartao" ou "Fatura")
    SELECT id INTO v_categoria_id
    FROM categoria_trasacoes
    WHERE usuario_id = v_usuario_id
    AND tipo_conta = p_tipo_conta
    AND (tipo = 'saida' OR tipo = 'ambos')
    ORDER BY 
        CASE WHEN LOWER(descricao) LIKE '%cartao%' THEN 1
             WHEN LOWER(descricao) LIKE '%fatura%' THEN 2
             ELSE 3
        END,
        id
    LIMIT 1;
    
    -- Se não encontrou, usar primeira categoria de saída
    IF v_categoria_id IS NULL THEN
        SELECT id INTO v_categoria_id
        FROM categoria_trasacoes
        WHERE (tipo = 'saida' OR tipo = 'ambos')
        AND tipo_conta = p_tipo_conta
        ORDER BY id
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, retornar erro
    IF v_categoria_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Nenhuma categoria de saída encontrada');
    END IF;
    
    -- 7. Criar transação de pagamento
    INSERT INTO transacoes (
        usuario_id,
        tipo_conta,
        conta_id,
        tipo,
        valor,
        descricao,
        data,
        mes,
        cartao_id,
        categoria_id
    ) VALUES (
        v_usuario_id,
        p_tipo_conta,
        p_conta_id,
        'saida',
        v_total_fatura,
        'Pagamento Fatura ' || v_cartao_nome || ' - ' || p_mes_fatura,
        p_data_pagamento,
        TO_CHAR(p_data_pagamento, 'YYYY-MM'),
        p_cartao_id,
        v_categoria_id
    ) RETURNING id INTO v_transacao_id;
    
    -- 8. Marcar lançamentos como pagos
    UPDATE lancamentos_futuros
    SET status = 'pago',
        data_efetivacao = p_data_pagamento
    WHERE cartao_id = p_cartao_id
    AND mes_previsto = p_mes_fatura
    AND status = 'pendente'
    AND usuario_id = v_usuario_id;
    
    -- 9. Retornar sucesso
    RETURN json_build_object(
        'success', true,
        'transacao_id', v_transacao_id,
        'total_pago', v_total_fatura,
        'lancamentos_pagos', v_count_lancamentos
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION processar_pagamento_fatura_segura(UUID, UUID, TEXT, DATE, TEXT) IS 'Processa pagamento TOTAL de fatura de cartão de crédito com categoria_id automática';

-- 4.16 Função: processar_pagamento_fatura_parcial (NOVA)
CREATE OR REPLACE FUNCTION processar_pagamento_fatura_parcial(
    p_cartao_id UUID,
    p_conta_id UUID,
    p_data_pagamento DATE,
    p_tipo_conta TEXT,
    p_lancamento_ids INTEGER[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id INTEGER;
    v_total_pagar NUMERIC := 0;
    v_saldo_conta NUMERIC;
    v_cartao_nome TEXT;
    v_transacao_id INTEGER;
    v_count_lancamentos INTEGER := 0;
    v_mes_fatura TEXT;
    v_categoria_id INTEGER;
BEGIN
    -- 1. Validar usuário autenticado
    SELECT id INTO v_usuario_id
    FROM usuarios
    WHERE auth_user = auth.uid();
    
    IF v_usuario_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;
    
    -- 2. Validar que cartão pertence ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM cartoes_credito 
        WHERE id = p_cartao_id AND usuario_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Cartão não pertence ao usuário');
    END IF;
    
    -- 3. Validar que conta pertence ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM contas_bancarias 
        WHERE id = p_conta_id AND usuario_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Conta não pertence ao usuário');
    END IF;
    
    -- 4. Validar que array de IDs não está vazio
    IF p_lancamento_ids IS NULL OR array_length(p_lancamento_ids, 1) IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Nenhum lançamento selecionado');
    END IF;
    
    -- 5. Calcular total APENAS dos lançamentos selecionados
    SELECT 
        COALESCE(SUM(valor), 0), 
        COUNT(*),
        MIN(mes_previsto)
    INTO v_total_pagar, v_count_lancamentos, v_mes_fatura
    FROM lancamentos_futuros
    WHERE id = ANY(p_lancamento_ids)
    AND cartao_id = p_cartao_id
    AND status = 'pendente'
    AND usuario_id = v_usuario_id;
    
    -- 6. Validar que encontrou lançamentos válidos
    IF v_count_lancamentos = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Nenhum lançamento válido selecionado');
    END IF;
    
    -- 7. Validar que todos os IDs fornecidos foram encontrados
    IF v_count_lancamentos != array_length(p_lancamento_ids, 1) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Alguns lançamentos selecionados não existem ou já foram pagos'
        );
    END IF;
    
    -- 8. Validar saldo suficiente
    SELECT saldo_atual INTO v_saldo_conta
    FROM contas_bancarias
    WHERE id = p_conta_id;
    
    IF v_saldo_conta < v_total_pagar THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
    
    -- 9. Buscar nome do cartão
    SELECT nome INTO v_cartao_nome
    FROM cartoes_credito
    WHERE id = p_cartao_id;
    
    -- 10. Buscar categoria apropriada
    SELECT id INTO v_categoria_id
    FROM categoria_trasacoes
    WHERE usuario_id = v_usuario_id
    AND tipo_conta = p_tipo_conta
    AND (tipo = 'saida' OR tipo = 'ambos')
    ORDER BY 
        CASE WHEN LOWER(descricao) LIKE '%cartao%' THEN 1
             WHEN LOWER(descricao) LIKE '%fatura%' THEN 2
             ELSE 3
        END,
        id
    LIMIT 1;
    
    IF v_categoria_id IS NULL THEN
        SELECT id INTO v_categoria_id
        FROM categoria_trasacoes
        WHERE (tipo = 'saida' OR tipo = 'ambos')
        AND tipo_conta = p_tipo_conta
        ORDER BY id
        LIMIT 1;
    END IF;
    
    IF v_categoria_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Nenhuma categoria de saída encontrada');
    END IF;
    
    -- 11. Criar transação de pagamento parcial
    INSERT INTO transacoes (
        usuario_id,
        tipo_conta,
        conta_id,
        tipo,
        valor,
        descricao,
        data,
        mes,
        cartao_id,
        categoria_id
    ) VALUES (
        v_usuario_id,
        p_tipo_conta,
        p_conta_id,
        'saida',
        v_total_pagar,
        'Pagamento Parcial Fatura ' || v_cartao_nome || ' - ' || v_mes_fatura || ' (' || v_count_lancamentos || ' despesas)',
        p_data_pagamento,
        TO_CHAR(p_data_pagamento, 'YYYY-MM'),
        p_cartao_id,
        v_categoria_id
    ) RETURNING id INTO v_transacao_id;
    
    -- 12. Marcar APENAS os lançamentos selecionados como pagos
    UPDATE lancamentos_futuros
    SET status = 'pago',
        data_efetivacao = p_data_pagamento,
        transacao_id = v_transacao_id
    WHERE id = ANY(p_lancamento_ids)
    AND cartao_id = p_cartao_id
    AND status = 'pendente'
    AND usuario_id = v_usuario_id;
    
    -- 13. Retornar sucesso com detalhes
    RETURN json_build_object(
        'success', true,
        'transacao_id', v_transacao_id,
        'total_pago', v_total_pagar,
        'lancamentos_pagos', v_count_lancamentos,
        'mes_fatura', v_mes_fatura
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION processar_pagamento_fatura_parcial IS 'Processa pagamento PARCIAL de fatura de cartão de crédito (despesas selecionadas)';

-- 4.17 Função: admin_list_plans
DROP FUNCTION IF EXISTS admin_list_plans();
CREATE OR REPLACE FUNCTION admin_list_plans()
RETURNS TABLE(
    id integer, nome character varying, tipo_periodo character varying, valor numeric, 
    link_checkout text, ativo boolean, ordem_exibicao integer, descricao text, recursos jsonb, 
    created_at timestamp with time zone, updated_at timestamp with time zone, 
    permite_compartilhamento boolean, max_usuarios_dependentes integer, destaque boolean, 
    permite_modo_pj boolean, permite_investimentos boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_is_admin boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  SELECT u.is_admin INTO v_is_admin FROM usuarios u WHERE u.auth_user = v_user_id;
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.nome, p.tipo_periodo, p.valor, p.link_checkout, p.ativo, p.ordem_exibicao,
    p.descricao, p.recursos, p.created_at, p.updated_at, p.permite_compartilhamento,
    p.max_usuarios_dependentes, COALESCE(p.destaque, false) as destaque,
    COALESCE(p.permite_modo_pj, true) as permite_modo_pj,
    COALESCE(p.permite_investimentos, false) as permite_investimentos
  FROM planos_sistema p ORDER BY p.ordem_exibicao;
END;
$$;

-- 4.18 Função: admin_list_users
CREATE OR REPLACE FUNCTION admin_list_users(
    p_search text DEFAULT NULL, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id integer, nome text, email text, celular text, plano text, status text, is_admin boolean, 
    data_compra timestamp with time zone, data_final_plano timestamp with time zone, 
    data_ultimo_acesso timestamp with time zone, has_password boolean, created_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.nome, u.email, u.celular, u.plano, u.status, u.is_admin,
    u.data_compra, u.data_final_plano, u.data_ultimo_acesso, u.has_password, u.created_at
  FROM usuarios u
  WHERE (p_search IS NULL OR u.nome ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%')
  ORDER BY u.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4.18.1 Função: admin_list_users_v2 (com filtros avançados)
-- Data: 12/01/2026
-- Descrição: Versão melhorada com múltiplos filtros para gestão de usuários
CREATE OR REPLACE FUNCTION admin_list_users_v2(
    p_search text DEFAULT NULL,
    p_plano_ids integer[] DEFAULT NULL,
    p_status text[] DEFAULT NULL,
    p_is_admin boolean DEFAULT NULL,
    p_has_password boolean DEFAULT NULL,
    p_data_cadastro_inicio date DEFAULT NULL,
    p_data_cadastro_fim date DEFAULT NULL,
    p_plano_valido boolean DEFAULT NULL,
    p_ultimo_acesso_dias integer DEFAULT NULL,
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id integer,
    nome text,
    email text,
    celular text,
    plano text,
    plano_id integer,
    status text,
    is_admin boolean,
    data_compra timestamp with time zone,
    data_final_plano timestamp with time zone,
    data_ultimo_acesso timestamp with time zone,
    has_password boolean,
    created_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT is_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.nome,
        u.email,
        u.celular,
        COALESCE(p.nome::text, 'Free') as plano,
        u.plano_id,
        u.status,
        u.is_admin,
        u.data_compra,
        u.data_final_plano,
        u.data_ultimo_acesso,
        u.has_password,
        u.created_at
    FROM usuarios u
    LEFT JOIN planos_sistema p ON u.plano_id = p.id
    WHERE 
        -- Filtro de busca por texto (nome ou email)
        (p_search IS NULL OR u.nome ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%')
        
        -- Filtro por plano_id (array de IDs)
        AND (p_plano_ids IS NULL OR u.plano_id = ANY(p_plano_ids))
        
        -- Filtro por status (array de status)
        AND (p_status IS NULL OR u.status = ANY(p_status))
        
        -- Filtro por tipo de usuário (admin ou não)
        AND (p_is_admin IS NULL OR u.is_admin = p_is_admin)
        
        -- Filtro por ter senha/login
        AND (p_has_password IS NULL OR u.has_password = p_has_password)
        
        -- Filtro por data de cadastro (início)
        AND (p_data_cadastro_inicio IS NULL OR u.created_at::date >= p_data_cadastro_inicio)
        
        -- Filtro por data de cadastro (fim)
        AND (p_data_cadastro_fim IS NULL OR u.created_at::date <= p_data_cadastro_fim)
        
        -- Filtro por validade do plano
        AND (
            p_plano_valido IS NULL 
            OR (p_plano_valido = true AND (u.data_final_plano IS NULL OR u.data_final_plano >= NOW()))
            OR (p_plano_valido = false AND u.data_final_plano IS NOT NULL AND u.data_final_plano < NOW())
        )
        
        -- Filtro por último acesso (dias atrás)
        AND (
            p_ultimo_acesso_dias IS NULL 
            OR u.data_ultimo_acesso >= NOW() - (p_ultimo_acesso_dias || ' days')::interval
        )
    ORDER BY u.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_users_v2(TEXT, INTEGER[], TEXT[], BOOLEAN, BOOLEAN, DATE, DATE, BOOLEAN, INTEGER, INTEGER, INTEGER) IS 'Lista usuários com filtros avançados: plano, status, admin, login, datas, validade. Mantém compatibilidade com admin_list_users.';

-- 4.19 Função: admin_reset_user_password
-- CORRIGIDO:
-- 1. usa gen_salt('bf', 10) - cost 10 compativel com GoTrue
-- 2. garante raw_app_meta_data correto (evita bloqueio GoTrue)
-- 3. garante auth.identities existe (usuarios criados antes do fix podem nao ter)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id integer,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user uuid;
  v_email text;
  v_encrypted_password text;
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  SELECT auth_user, email INTO v_auth_user, v_email
  FROM public.usuarios
  WHERE id = p_user_id;

  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado ou sem conta de autenticação';
  END IF;

  -- Hash bcrypt cost 10 (compativel com GoTrue)
  SELECT extensions.crypt(p_new_password, extensions.gen_salt('bf', 10))
  INTO v_encrypted_password;

  -- Atualizar senha e garantir raw_app_meta_data correto
  UPDATE auth.users
  SET
    encrypted_password = v_encrypted_password,
    raw_app_meta_data = COALESCE(
      NULLIF(raw_app_meta_data, 'null'::jsonb),
      '{"provider": "email", "providers": ["email"]}'::jsonb
    ),
    raw_user_meta_data = COALESCE(
      NULLIF(raw_user_meta_data, 'null'::jsonb),
      '{}'::jsonb
    ),
    updated_at = NOW()
  WHERE id = v_auth_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado no sistema de autenticação';
  END IF;

  -- Garantir que auth.identities existe (usuarios criados antes do fix podem nao ter)
  IF v_email IS NOT NULL THEN
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      v_email,
      v_auth_user,
      jsonb_build_object(
        'sub', v_auth_user::text,
        'email', v_email,
        'email_verified', true,
        'provider_type', 'email'
      ),
      'email',
      NOW(), NOW()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  UPDATE public.usuarios
  SET has_password = true, ultima_atualizacao = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Senha resetada com sucesso');

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao resetar senha: %', SQLERRM;
END;
$$;

-- 4.20 Função: admin_update_user
CREATE OR REPLACE FUNCTION admin_update_user(
    p_user_id integer, p_nome text DEFAULT NULL, p_email text DEFAULT NULL, p_celular text DEFAULT NULL, 
    p_plano_id integer DEFAULT NULL, p_status text DEFAULT NULL, p_is_admin boolean DEFAULT NULL, 
    p_data_compra timestamp with time zone DEFAULT NULL, p_data_final_plano timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  UPDATE usuarios SET
    nome = COALESCE(p_nome, nome), email = COALESCE(p_email, email),
    celular = COALESCE(p_celular, celular), plano_id = COALESCE(p_plano_id, plano_id),
    status = COALESCE(p_status, status), is_admin = COALESCE(p_is_admin, is_admin),
    data_compra = COALESCE(p_data_compra, data_compra),
    data_final_plano = COALESCE(p_data_final_plano, data_final_plano),
    ultima_atualizacao = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Usuário atualizado com sucesso');
END;
$$;

-- 4.21 Função: get_system_settings
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE(
    app_name text, 
    app_logo_url text, 
    primary_color text, 
    secondary_color text, 
    support_email text, 
    habilitar_modo_pj boolean, 
    restringir_cadastro_usuarios_existentes boolean, 
    dias_acesso_free integer, 
    show_sidebar_logo boolean, 
    show_sidebar_name boolean, 
    show_login_logo boolean, 
    show_login_name boolean, 
    logo_url_sidebar text, 
    logo_url_login text, 
    favicon_url text, 
    pwa_icon_192_url text, 
    pwa_icon_512_url text, 
    apple_touch_icon_url text, 
    idioma_padrao_planos text, 
    moeda_padrao_planos text, 
    habilitar_toggle_periodo_planos boolean, 
    percentual_desconto_anual integer,
    whatsapp_suporte_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        c.company_name::TEXT,
        c.logo_url::TEXT,
        c.primary_color::TEXT,
        c.secondary_color::TEXT,
        c.support_email::TEXT,
        c.habilitar_modo_pj,
        c.restringir_cadastro_usuarios_existentes,
        c.dias_acesso_free,
        c.show_sidebar_logo,
        c.show_sidebar_name,
        c.show_login_logo,
        c.show_login_name,
        c.logo_url_sidebar::TEXT,
        c.logo_url_login::TEXT,
        c.favicon_url::TEXT,
        c.pwa_icon_192_url::TEXT,
        c.pwa_icon_512_url::TEXT,
        c.apple_touch_icon_url::TEXT,
        c.idioma_padrao_planos::TEXT,
        c.moeda_padrao_planos::TEXT,
        c.habilitar_toggle_periodo_planos,
        c.percentual_desconto_anual,
        c.whatsapp_suporte_url::TEXT
    FROM configuracoes_sistema c
    WHERE c.id = 1;
END;
$$;

-- 4.22 Função: update_system_settings
-- IMPORTANTE: Remover versão antiga da função (5 parâmetros) se existir
DROP FUNCTION IF EXISTS update_system_settings(text, text, text, text, text);

-- Criar versão atualizada com todos os parâmetros
CREATE OR REPLACE FUNCTION update_system_settings(
    p_app_name text, 
    p_app_logo_url text, 
    p_primary_color text, 
    p_secondary_color text, 
    p_support_email text,
    p_whatsapp_suporte_url text DEFAULT NULL,
    p_idioma_padrao_planos text DEFAULT NULL,
    p_moeda_padrao_planos text DEFAULT NULL,
    p_habilitar_toggle_periodo_planos boolean DEFAULT NULL,
    p_percentual_desconto_anual integer DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_id UUID;
    is_user_admin BOOLEAN := FALSE;
BEGIN
    current_user_id := auth.uid();
    SELECT usuarios.is_admin INTO is_user_admin FROM public.usuarios WHERE usuarios.auth_user = current_user_id;
    
    IF NOT is_user_admin THEN
        RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
    END IF;
    
    UPDATE public.configuracoes_sistema SET 
        company_name = p_app_name, 
        logo_url = p_app_logo_url,
        primary_color = p_primary_color, 
        secondary_color = p_secondary_color,
        support_email = p_support_email,
        whatsapp_suporte_url = p_whatsapp_suporte_url,
        idioma_padrao_planos = COALESCE(p_idioma_padrao_planos, idioma_padrao_planos),
        moeda_padrao_planos = COALESCE(p_moeda_padrao_planos, moeda_padrao_planos),
        habilitar_toggle_periodo_planos = COALESCE(p_habilitar_toggle_periodo_planos, habilitar_toggle_periodo_planos),
        percentual_desconto_anual = COALESCE(p_percentual_desconto_anual, percentual_desconto_anual),
        updated_at = NOW()
    WHERE id = 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Configurações não encontradas'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'Configurações atualizadas com sucesso'::TEXT;
END;
$$;

-- 4.23 Função: handle_updated_at
-- IMPORTANTE: Esta function DEVE ter SECURITY DEFINER (não INVOKER)
-- É usada por múltiplos triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_updated_at() IS 'Trigger function para atualizar updated_at automaticamente. SECURITY DEFINER é necessário para funcionar corretamente em todas as tabelas.';

-- 4.24 Função: processar_transferencia_segura
CREATE OR REPLACE FUNCTION processar_transferencia_segura(
    p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric, 
    p_descricao text, p_data date, p_tipo_conta text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_usuario_id INTEGER;
    v_saldo_origem NUMERIC;
    v_conta_origem_nome TEXT;
    v_conta_destino_nome TEXT;
    v_transacao_saida_id INTEGER;
    v_transacao_entrada_id INTEGER;
BEGIN
    SELECT id INTO v_usuario_id FROM usuarios WHERE auth_user = auth.uid();
    IF v_usuario_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
    END IF;
    
    SELECT COUNT(*) INTO v_saldo_origem FROM contas_bancarias
    WHERE id IN (p_conta_origem_id, p_conta_destino_id) AND usuario_id = auth.uid();
    IF v_saldo_origem != 2 THEN
        RETURN json_build_object('success', false, 'error', 'Contas não pertencem ao usuário');
    END IF;
    
    SELECT saldo_atual, nome INTO v_saldo_origem, v_conta_origem_nome
    FROM contas_bancarias WHERE id = p_conta_origem_id AND usuario_id = auth.uid();
    IF v_saldo_origem < p_valor THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;
    
    SELECT nome INTO v_conta_destino_nome FROM contas_bancarias WHERE id = p_conta_destino_id;
    
    INSERT INTO transacoes (usuario_id, tipo_conta, conta_id, tipo, valor, descricao, data, mes, categoria_id)
    VALUES (v_usuario_id, p_tipo_conta, p_conta_origem_id, 'saida', p_valor,
        COALESCE(p_descricao, 'Transferência para ' || v_conta_destino_nome),
        p_data, TO_CHAR(p_data, 'YYYY-MM'), NULL)
    RETURNING id INTO v_transacao_saida_id;
    
    INSERT INTO transacoes (usuario_id, tipo_conta, conta_id, tipo, valor, descricao, data, mes, categoria_id)
    VALUES (v_usuario_id, p_tipo_conta, p_conta_destino_id, 'entrada', p_valor,
        COALESCE(p_descricao, 'Transferência de ' || v_conta_origem_nome),
        p_data, TO_CHAR(p_data, 'YYYY-MM'), NULL)
    RETURNING id INTO v_transacao_entrada_id;
    
    RETURN json_build_object('success', true, 'transacao_saida_id', v_transacao_saida_id,
        'transacao_entrada_id', v_transacao_entrada_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.24 Função: calcular_dias_restantes_free
CREATE OR REPLACE FUNCTION calcular_dias_restantes_free(p_usuario_id integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    usuario_record RECORD;
    config_dias INTEGER;
    dias_passados INTEGER;
    dias_restantes INTEGER;
    data_final DATE;
BEGIN
    SELECT created_at, plano, data_final_plano INTO usuario_record FROM public.usuarios WHERE id = p_usuario_id;
    IF NOT FOUND THEN RETURN 0; END IF;
    
    IF usuario_record.plano IS NOT NULL AND LOWER(usuario_record.plano) != 'free' THEN
        RETURN -1;
    END IF;
    
    IF usuario_record.data_final_plano IS NOT NULL THEN
        data_final := DATE(usuario_record.data_final_plano);
        dias_restantes := (data_final - CURRENT_DATE);
        IF dias_restantes < 0 THEN RETURN 0; END IF;
        RETURN dias_restantes;
    END IF;
    
    SELECT dias_acesso_free INTO config_dias FROM public.configuracoes_sistema WHERE id = 1;
    IF NOT FOUND THEN config_dias := 7; END IF;
    
    dias_passados := EXTRACT(DAY FROM (NOW() - usuario_record.created_at));
    dias_restantes := config_dias - dias_passados;
    IF dias_restantes < 0 THEN RETURN 0; END IF;
    
    RETURN dias_restantes;
END;
$$;

-- 4.25 Função: calcular_progresso_meta (COMPLETA)
CREATE OR REPLACE FUNCTION calcular_progresso_meta(
    p_meta_id integer, 
    p_data_referencia date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    meta_id integer, 
    nome text, 
    tipo_meta text, 
    valor_limite numeric, 
    valor_gasto numeric, 
    valor_restante numeric, 
    percentual_usado numeric, 
    dias_restantes integer, 
    projecao_final numeric, 
    data_inicio date, 
    data_fim date, 
    status text, 
    erro text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_meta RECORD;
    v_valor_gasto NUMERIC := 0;
    v_percentual_usado NUMERIC := 0;
    v_dias_restantes INTEGER := 0;
    v_dias_totais INTEGER := 0;
    v_dias_passados INTEGER := 0;
    v_projecao_final NUMERIC := 0;
    v_valor_restante NUMERIC := 0;
    v_status TEXT := 'normal';
    v_data_calculo DATE;
BEGIN
    -- Buscar dados da meta
    SELECT * INTO v_meta
    FROM public.metas_orcamento
    WHERE id = p_meta_id AND ativo = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            p_meta_id, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 
            NULL::NUMERIC, NULL::NUMERIC, NULL::INTEGER, NULL::NUMERIC, 
            NULL::DATE, NULL::DATE, NULL::TEXT, 'Meta não encontrada ou inativa'::TEXT;
        RETURN;
    END IF;
    
    -- Ajustar data de cálculo
    IF p_data_referencia < v_meta.data_inicio THEN
        v_data_calculo := v_meta.data_inicio;
    ELSIF p_data_referencia > v_meta.data_fim THEN
        v_data_calculo := v_meta.data_fim;
    ELSE
        v_data_calculo := p_data_referencia;
    END IF;
    
    -- Calcular valor gasto baseado no tipo
    IF v_meta.tipo_meta = 'categoria' THEN
        SELECT COALESCE(SUM(t.valor), 0) INTO v_valor_gasto
        FROM public.transacoes t
        WHERE t.usuario_id = v_meta.usuario_id
          AND t.categoria_id = v_meta.categoria_id
          AND t.tipo = 'saida'
          AND t.data >= v_meta.data_inicio
          AND t.data <= v_data_calculo;
          
    ELSIF v_meta.tipo_meta = 'geral' THEN
        SELECT COALESCE(SUM(t.valor), 0) INTO v_valor_gasto
        FROM public.transacoes t
        WHERE t.usuario_id = v_meta.usuario_id
          AND t.tipo = 'saida'
          AND t.data >= v_meta.data_inicio
          AND t.data <= v_data_calculo;
          
    ELSIF v_meta.tipo_meta = 'economia' THEN
        SELECT COALESCE(
            (SELECT SUM(valor) FROM public.transacoes WHERE usuario_id = v_meta.usuario_id AND tipo = 'entrada' AND data >= v_meta.data_inicio AND data <= v_data_calculo) -
            (SELECT SUM(valor) FROM public.transacoes WHERE usuario_id = v_meta.usuario_id AND tipo = 'saida' AND data >= v_meta.data_inicio AND data <= v_data_calculo),
            0
        ) INTO v_valor_gasto;
        
        v_valor_gasto := GREATEST(v_valor_gasto, 0);
    END IF;
    
    -- Calcular percentual
    v_percentual_usado := CASE 
        WHEN v_meta.valor_limite > 0 THEN (v_valor_gasto / v_meta.valor_limite) * 100
        ELSE 0
    END;
    
    -- Calcular dias
    v_dias_totais := (v_meta.data_fim - v_meta.data_inicio) + 1;
    v_dias_passados := GREATEST((v_data_calculo - v_meta.data_inicio) + 1, 0);
    v_dias_restantes := GREATEST((v_meta.data_fim - v_data_calculo), 0);
    
    -- Calcular projeção
    IF v_dias_passados > 0 AND v_dias_totais > 0 THEN
        v_projecao_final := (v_valor_gasto / v_dias_passados) * v_dias_totais;
    ELSE
        v_projecao_final := v_valor_gasto;
    END IF;
    
    v_valor_restante := v_meta.valor_limite - v_valor_gasto;
    
    -- Determinar status
    IF v_percentual_usado >= 100 THEN
        v_status := 'excedida';
    ELSIF v_percentual_usado >= 90 THEN
        v_status := 'critica';
    ELSIF v_percentual_usado >= 80 THEN
        v_status := 'alerta';
    ELSIF v_percentual_usado >= 70 THEN
        v_status := 'atencao';
    ELSE
        v_status := 'normal';
    END IF;
    
    RETURN QUERY SELECT 
        v_meta.id,
        v_meta.nome,
        v_meta.tipo_meta,
        v_meta.valor_limite,
        v_valor_gasto,
        v_valor_restante,
        v_percentual_usado,
        v_dias_restantes,
        v_projecao_final,
        v_meta.data_inicio,
        v_meta.data_fim,
        v_status,
        NULL::TEXT;
END;
$$;

-- 4.26 Função: create_installments (COMPLETA)
CREATE OR REPLACE FUNCTION create_installments(
    p_usuario_id integer, 
    p_tipo text, 
    p_valor numeric, 
    p_descricao text, 
    p_data_prevista date, 
    p_categoria_id integer, 
    p_numero_parcelas integer
)
RETURNS SETOF lancamentos_futuros
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    data_parcela DATE;
    descricao_parcela TEXT;
    i INTEGER;
    parcela_id INTEGER;
    mes_previsto TEXT;
    dia_original INTEGER;
    ultimo_dia_mes INTEGER;
BEGIN
    dia_original := EXTRACT(DAY FROM p_data_prevista);

    FOR i IN 1..p_numero_parcelas LOOP
        IF i = 1 THEN
            data_parcela := p_data_prevista;
        ELSE
            data_parcela := DATE_TRUNC('month', p_data_prevista + ((i-1) || ' months')::INTERVAL)::DATE;
            ultimo_dia_mes := (DATE_TRUNC('month', data_parcela) + '1 month'::INTERVAL - '1 day'::INTERVAL)::DATE;
            ultimo_dia_mes := EXTRACT(DAY FROM ultimo_dia_mes);

            IF dia_original <= ultimo_dia_mes THEN
                data_parcela := data_parcela + (dia_original - 1) * INTERVAL '1 day';
            ELSE
                data_parcela := data_parcela + (ultimo_dia_mes - 1) * INTERVAL '1 day';
            END IF;
        END IF;

        descricao_parcela := p_descricao || ' (' || i || '/' || p_numero_parcelas || ')';
        mes_previsto := to_char(data_parcela, 'YYYY-MM');

        INSERT INTO public.lancamentos_futuros (
            usuario_id, tipo, valor, descricao, data_prevista, categoria_id, mes_previsto, status, recorrente, parcelamento, numero_parcelas, parcela_atual
        ) VALUES (
            p_usuario_id, p_tipo, p_valor, descricao_parcela, data_parcela, p_categoria_id, mes_previsto, 'pendente', FALSE, 'TRUE', p_numero_parcelas, i
        ) RETURNING id INTO parcela_id;

        RETURN QUERY SELECT * FROM public.lancamentos_futuros WHERE id = parcela_id;
    END LOOP;

    RETURN;
END;
$$;

-- 4.27 Função: get_metas_usuario (COMPLETA)
CREATE OR REPLACE FUNCTION get_metas_usuario(
    p_usuario_id integer, 
    p_data_referencia date DEFAULT CURRENT_DATE
)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    meta_record RECORD;
    progresso_record RECORD;
    resultado json;
BEGIN
    FOR meta_record IN 
        SELECT id FROM public.metas_orcamento 
        WHERE usuario_id = p_usuario_id AND ativo = true
        ORDER BY created_at DESC
    LOOP
        SELECT * INTO progresso_record
        FROM public.calcular_progresso_meta(meta_record.id, p_data_referencia);
        
        IF progresso_record.erro IS NULL THEN
            resultado := json_build_object(
                'meta_id', progresso_record.meta_id,
                'nome', progresso_record.nome,
                'tipo_meta', progresso_record.tipo_meta,
                'valor_limite', progresso_record.valor_limite,
                'valor_gasto', progresso_record.valor_gasto,
                'valor_restante', progresso_record.valor_restante,
                'percentual_usado', progresso_record.percentual_usado,
                'dias_restantes', progresso_record.dias_restantes,
                'projecao_final', progresso_record.projecao_final,
                'data_inicio', progresso_record.data_inicio,
                'data_fim', progresso_record.data_fim,
                'status', progresso_record.status
            );
            
            RETURN NEXT resultado;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$;

-- =====================================================
-- 5. NOVOS TRIGGERS (não existem no setup.sql)
-- =====================================================

-- 5.1 Trigger: atualizar saldo de conta
DROP TRIGGER IF EXISTS trigger_atualizar_saldo_conta ON transacoes;
CREATE TRIGGER trigger_atualizar_saldo_conta
    AFTER INSERT OR DELETE ON transacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_saldo_conta();

-- 5.2 Trigger: atualizar saldo em transferências
DROP TRIGGER IF EXISTS trigger_update_balance ON transacoes;
CREATE TRIGGER trigger_update_balance
    AFTER INSERT OR DELETE OR UPDATE ON transacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- 5.3 Trigger: prevenir duplicação de usuário no signup
DROP TRIGGER IF EXISTS prevent_duplicate_user_trigger ON usuarios;
CREATE TRIGGER prevent_duplicate_user_trigger
    BEFORE INSERT ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_user_on_signup();

-- 5.4 Trigger: processar convite de dependente
DROP TRIGGER IF EXISTS on_public_user_created_link_invite ON usuarios;
CREATE TRIGGER on_public_user_created_link_invite
    AFTER INSERT ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION handle_public_user_invite_link();

-- 5.5 Triggers: atualizar updated_at
DROP TRIGGER IF EXISTS on_update_contas_bancarias ON contas_bancarias;
CREATE TRIGGER on_update_contas_bancarias
    BEFORE UPDATE ON contas_bancarias
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_update_investment_assets ON investment_assets;
CREATE TRIGGER on_update_investment_assets
    BEFORE UPDATE ON investment_assets
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_update_investment_positions ON investment_positions;
CREATE TRIGGER on_update_investment_positions
    BEFORE UPDATE ON investment_positions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 5.6 Triggers: sync user_id automaticamente (NOVOS - 22/12/2024)
DROP TRIGGER IF EXISTS sync_user_id_contas ON contas_bancarias;
CREATE TRIGGER sync_user_id_contas
  BEFORE INSERT OR UPDATE ON contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_from_auth();

DROP TRIGGER IF EXISTS sync_user_id_cartoes ON cartoes_credito;
CREATE TRIGGER sync_user_id_cartoes
  BEFORE INSERT OR UPDATE ON cartoes_credito
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_from_auth();

DROP TRIGGER IF EXISTS sync_user_id_investments ON investment_positions;
CREATE TRIGGER sync_user_id_investments
  BEFORE INSERT OR UPDATE ON investment_positions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_id_from_auth();

-- 5.7 Trigger: auto-set plano_id em usuários (NOVO - 22/12/2024)
DROP TRIGGER IF EXISTS set_plano_id_on_user ON usuarios;
CREATE TRIGGER set_plano_id_on_user
  BEFORE INSERT OR UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_plano_id();

-- =====================================================
-- 6. VIEWS (não existem no setup.sql)
-- =====================================================

-- 6.1 View: v_positions_detailed
CREATE OR REPLACE VIEW v_positions_detailed AS
SELECT 
    p.id,
    p.usuario_id,
    p.tipo_conta,
    p.quantidade,
    p.preco_medio,
    p.data_compra,
    p.is_manual_price,
    p.manual_price,
    p.observacao,
    p.yield_percentage,
    p.use_manual_tax,
    p.manual_ir,
    p.manual_iof,
    a.ticker,
    a.name AS asset_name,
    a.type AS asset_type,
    a.current_price,
    a.previous_close,
    a.last_updated AS price_last_updated,
    a.source AS price_source,
    (p.quantidade * p.preco_medio) AS valor_investido,
    (p.quantidade * COALESCE(
        p.manual_price,
        CASE 
            WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
            THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END,
        p.preco_medio
    )) AS valor_atual,
    ((p.quantidade * COALESCE(
        p.manual_price,
        CASE 
            WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
            THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END,
        p.preco_medio
    )) - (p.quantidade * p.preco_medio)) AS lucro_prejuizo,
    CASE 
        WHEN p.preco_medio > 0 THEN 
            (((COALESCE(
                p.manual_price,
                CASE 
                    WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
                    THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
                    ELSE a.current_price
                END,
                p.preco_medio
            ) - p.preco_medio) / p.preco_medio) * 100)
        ELSE 0
    END AS rentabilidade_percentual,
    p.created_at,
    p.updated_at
FROM investment_positions p
JOIN investment_assets a ON p.asset_id = a.id
WHERE a.is_active = true;

-- 6.2 View: v_portfolio_summary
CREATE OR REPLACE VIEW v_portfolio_summary AS
SELECT 
    usuario_id,
    tipo_conta,
    COUNT(DISTINCT id) AS total_ativos,
    SUM(valor_investido) AS valor_investido,
    SUM(valor_atual) AS valor_atual,
    SUM(lucro_prejuizo) AS lucro_prejuizo,
    CASE 
        WHEN SUM(valor_investido) > 0 
        THEN (SUM(lucro_prejuizo) / SUM(valor_investido)) * 100
        ELSE 0
    END AS rentabilidade_percentual
FROM v_positions_detailed
GROUP BY usuario_id, tipo_conta;

-- 6.3 View: v_dividends_summary
CREATE OR REPLACE VIEW v_dividends_summary AS
SELECT 
    p.usuario_id,
    p.tipo_conta,
    COUNT(d.id) AS total_proventos,
    SUM(d.valor_por_ativo * p.quantidade) AS valor_total_proventos,
    EXTRACT(YEAR FROM d.data_pagamento) AS ano,
    EXTRACT(MONTH FROM d.data_pagamento) AS mes
FROM investment_dividends d
JOIN investment_positions p ON d.position_id = p.id
GROUP BY p.usuario_id, p.tipo_conta, EXTRACT(YEAR FROM d.data_pagamento), EXTRACT(MONTH FROM d.data_pagamento);

-- =====================================================
-- 6.4 Segurança das Views (Security Invoker)
-- =====================================================
-- Configurar views para usar security_invoker = true
-- Isso faz com que as views herdem as permissões RLS das tabelas base
ALTER VIEW v_positions_detailed SET (security_invoker = true);
ALTER VIEW v_portfolio_summary SET (security_invoker = true);
ALTER VIEW v_dividends_summary SET (security_invoker = true);

-- Comentários explicativos
COMMENT ON VIEW v_positions_detailed IS 'View com detalhes das posições de investimento. Security invoker habilitado para herdar RLS das tabelas base (investment_positions, investment_assets).';
COMMENT ON VIEW v_portfolio_summary IS 'View com resumo do portfólio por usuário e tipo de conta. Security invoker habilitado para herdar RLS da view v_positions_detailed.';
COMMENT ON VIEW v_dividends_summary IS 'View com resumo de dividendos por usuário, tipo de conta e período. Security invoker habilitado para herdar RLS das tabelas base (investment_dividends, investment_positions).';

-- =====================================================
-- 6.1 ÍNDICES PARA OTIMIZAÇÃO DE FILTROS DE USUÁRIOS
-- Data: 12/01/2026
-- Descrição: Índices para melhorar performance dos filtros avançados
-- =====================================================

-- Índices para filtros de usuários
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user ON usuarios(auth_user);
CREATE INDEX IF NOT EXISTS idx_usuarios_plano_id ON usuarios(plano_id) WHERE plano_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios(status);
CREATE INDEX IF NOT EXISTS idx_usuarios_is_admin ON usuarios(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_has_password ON usuarios(has_password);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_data_final_plano ON usuarios(data_final_plano) WHERE data_final_plano IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_data_ultimo_acesso ON usuarios(data_ultimo_acesso DESC);

-- Índice composto para busca por nome/email (full-text search)
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_email_search ON usuarios USING gin(to_tsvector('portuguese', nome || ' ' || email));

-- Comentários nos índices
COMMENT ON INDEX idx_usuarios_auth_user IS 'CRÍTICO: Otimiza todas as RLS policies que usam auth.uid() - previne timeout em queries';
COMMENT ON INDEX idx_usuarios_plano_id IS 'Otimiza filtro por plano na gestão de usuários';
COMMENT ON INDEX idx_usuarios_status IS 'Otimiza filtro por status na gestão de usuários';
COMMENT ON INDEX idx_usuarios_is_admin IS 'Otimiza filtro por admin (apenas true) na gestão de usuários';
COMMENT ON INDEX idx_usuarios_has_password IS 'Otimiza filtro por login na gestão de usuários';
COMMENT ON INDEX idx_usuarios_created_at IS 'Otimiza ordenação e filtro por data de cadastro';
COMMENT ON INDEX idx_usuarios_data_final_plano IS 'Otimiza filtro por validade do plano';
COMMENT ON INDEX idx_usuarios_data_ultimo_acesso IS 'Otimiza filtro por último acesso';
COMMENT ON INDEX idx_usuarios_nome_email_search IS 'Otimiza busca full-text por nome/email';

-- =====================================================
-- 7. ÍNDICES ADICIONAIS (não existem no setup.sql)
-- =====================================================

-- Índices para contas_bancarias
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_usuario_id ON contas_bancarias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contas_user_id ON contas_bancarias(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_usuario_saldo ON contas_bancarias(usuario_id, saldo_atual);
CREATE INDEX IF NOT EXISTS idx_contas_tipo_conta ON contas_bancarias(tipo_conta);

-- Índices para cartoes_credito
CREATE INDEX IF NOT EXISTS idx_cartoes_usuario ON cartoes_credito(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id ON cartoes_credito(user_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_tipo_conta ON cartoes_credito(tipo_conta);
CREATE INDEX IF NOT EXISTS idx_cartoes_ativo ON cartoes_credito(ativo);
CREATE INDEX IF NOT EXISTS idx_cartoes_conta_vinculada ON cartoes_credito(conta_vinculada_id);

-- Índices para transacoes
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_id ON transacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cartao ON transacoes(cartao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_dependente ON transacoes(dependente_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_is_transferencia ON transacoes(is_transferencia);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo_conta ON transacoes(tipo_conta);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_conta ON transacoes(usuario_id, tipo_conta);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_conta_data ON transacoes(usuario_id, tipo_conta, data);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_data ON transacoes(usuario_id, data);

-- Índices para lancamentos_futuros
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_cartao ON lancamentos_futuros(cartao_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_dependente ON lancamentos_futuros(dependente_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_conta ON lancamentos_futuros(conta_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_tipo_conta ON lancamentos_futuros(tipo_conta);
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_data_final ON lancamentos_futuros(data_final) WHERE data_final IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_recorrente_periodo ON lancamentos_futuros(recorrente, data_prevista, status) WHERE recorrente = true AND status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_expansion_query ON lancamentos_futuros(usuario_id, recorrente, status, data_prevista, data_final) WHERE recorrente = true AND status = 'pendente' AND data_final IS NOT NULL;

-- Índices para categoria_trasacoes
CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categoria_trasacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categoria_trasacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_categories_tipo_conta ON categoria_trasacoes(tipo_conta);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categoria_trasacoes(usuario_id, tipo_conta);
CREATE INDEX IF NOT EXISTS idx_categories_keywords ON categoria_trasacoes USING gin(keywords);

-- Índices para investment_assets
CREATE INDEX IF NOT EXISTS idx_investment_assets_ticker ON investment_assets(ticker);
CREATE INDEX IF NOT EXISTS idx_investment_assets_type ON investment_assets(type);
CREATE INDEX IF NOT EXISTS idx_investment_assets_active ON investment_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_investment_assets_source ON investment_assets(source);

-- Índices para investment_positions
CREATE INDEX IF NOT EXISTS idx_investment_positions_usuario ON investment_positions(usuario_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investment_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_positions_asset ON investment_positions(asset_id);
CREATE INDEX IF NOT EXISTS idx_investment_positions_conta ON investment_positions(conta_id);
CREATE INDEX IF NOT EXISTS idx_investment_positions_tipo_conta ON investment_positions(tipo_conta);
CREATE INDEX IF NOT EXISTS idx_investment_positions_usuario_tipo ON investment_positions(usuario_id, tipo_conta);

-- Índices para investment_dividends
CREATE INDEX IF NOT EXISTS idx_investment_dividends_position ON investment_dividends(position_id);
CREATE INDEX IF NOT EXISTS idx_investment_dividends_data_pagamento ON investment_dividends(data_pagamento);

-- Índices para api_usage_log
CREATE INDEX IF NOT EXISTS idx_api_usage_log_api_name ON api_usage_log(api_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_status ON api_usage_log(status);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created_at ON api_usage_log(created_at);

-- Índices para cdi_rates
CREATE INDEX IF NOT EXISTS idx_cdi_rates_date ON cdi_rates(date DESC);

-- Índices para usuarios_dependentes
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_principal ON usuarios_dependentes(usuario_principal_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_status ON usuarios_dependentes(usuario_principal_id, status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_nome ON usuarios_dependentes(nome);
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_email ON usuarios_dependentes(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_auth_user ON usuarios_dependentes(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_dependentes_permissoes ON usuarios_dependentes USING gin(permissoes);

-- Índices para planos_sistema
CREATE INDEX IF NOT EXISTS idx_planos_compartilhamento ON planos_sistema(permite_compartilhamento) WHERE permite_compartilhamento = true;

-- =====================================================
-- 8. RLS POLICIES (novas tabelas)
-- =====================================================

-- RLS para contas_bancarias
-- ATUALIZADO: Usa obter_uuid_proprietario() (SECURITY DEFINER) para evitar
-- bloqueio pelo RLS da tabela usuarios quando dependente faz JOIN
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver suas proprias contas" ON contas_bancarias;
CREATE POLICY "Usuarios podem ver suas proprias contas" ON contas_bancarias
    FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "dependentes_veem_contas_com_permissao" ON contas_bancarias;
DROP POLICY IF EXISTS "dependentes_veem_contas_tipo_conta_permitido" ON contas_bancarias;
DROP POLICY IF EXISTS "dependentes_veem_contas_segura" ON contas_bancarias;
CREATE POLICY "dependentes_veem_contas_segura" ON contas_bancarias
    FOR SELECT USING (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuarios podem criar suas proprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "contas_bancarias_insert" ON contas_bancarias;
DROP POLICY IF EXISTS "contas_bancarias_insert_segura" ON contas_bancarias;
CREATE POLICY "contas_bancarias_insert_segura" ON contas_bancarias
    FOR INSERT WITH CHECK (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuarios podem atualizar suas proprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "contas_bancarias_update_segura" ON contas_bancarias;
CREATE POLICY "contas_bancarias_update_segura" ON contas_bancarias
    FOR UPDATE USING (
        usuario_id = obter_uuid_proprietario()
    )
    WITH CHECK (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuarios podem excluir suas proprias contas" ON contas_bancarias;
DROP POLICY IF EXISTS "contas_bancarias_delete_segura" ON contas_bancarias;
CREATE POLICY "contas_bancarias_delete_segura" ON contas_bancarias
    FOR DELETE USING (
        usuario_id = obter_uuid_proprietario()
    );

-- RLS para cartoes_credito
-- ATUALIZADO: Usa obter_uuid_proprietario() (SECURITY DEFINER) para evitar
-- bloqueio pelo RLS da tabela usuarios quando dependente faz JOIN
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios cartões" ON cartoes_credito;
CREATE POLICY "Usuários podem ver seus próprios cartões" ON cartoes_credito
    FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "dependentes_veem_cartoes_com_permissao" ON cartoes_credito;
DROP POLICY IF EXISTS "dependentes_veem_cartoes_tipo_conta_permitido" ON cartoes_credito;
DROP POLICY IF EXISTS "dependentes_veem_cartoes_segura" ON cartoes_credito;
CREATE POLICY "dependentes_veem_cartoes_segura" ON cartoes_credito
    FOR SELECT USING (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuários podem criar seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "cartoes_credito_insert" ON cartoes_credito;
DROP POLICY IF EXISTS "cartoes_insert_segura" ON cartoes_credito;
CREATE POLICY "cartoes_insert_segura" ON cartoes_credito
    FOR INSERT WITH CHECK (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "cartoes_update_segura" ON cartoes_credito;
CREATE POLICY "cartoes_update_segura" ON cartoes_credito
    FOR UPDATE USING (
        usuario_id = obter_uuid_proprietario()
    )
    WITH CHECK (
        usuario_id = obter_uuid_proprietario()
    );

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios cartões" ON cartoes_credito;
DROP POLICY IF EXISTS "cartoes_delete_segura" ON cartoes_credito;
CREATE POLICY "cartoes_delete_segura" ON cartoes_credito
    FOR DELETE USING (
        usuario_id = obter_uuid_proprietario()
    );

-- RLS para investment_assets
ALTER TABLE investment_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_assets_select" ON investment_assets;
CREATE POLICY "investment_assets_select" ON investment_assets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "investment_assets_admin" ON investment_assets;
CREATE POLICY "investment_assets_admin" ON investment_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE auth_user = auth.uid() 
            AND is_admin = true
        )
    );

-- RLS para investment_positions
ALTER TABLE investment_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_positions_select" ON investment_positions;
CREATE POLICY "investment_positions_select" ON investment_positions
    FOR SELECT USING (usuario_id = obter_uuid_proprietario());

DROP POLICY IF EXISTS "investment_positions_insert" ON investment_positions;
CREATE POLICY "investment_positions_insert" ON investment_positions
    FOR INSERT WITH CHECK (usuario_id = obter_uuid_proprietario());

DROP POLICY IF EXISTS "investment_positions_update" ON investment_positions;
CREATE POLICY "investment_positions_update" ON investment_positions
    FOR UPDATE USING (usuario_id = obter_uuid_proprietario())
    WITH CHECK (usuario_id = obter_uuid_proprietario());

DROP POLICY IF EXISTS "investment_positions_delete" ON investment_positions;
CREATE POLICY "investment_positions_delete" ON investment_positions
    FOR DELETE USING (usuario_id = obter_uuid_proprietario());

-- RLS para investment_dividends
ALTER TABLE investment_dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_dividends_select" ON investment_dividends;
CREATE POLICY "investment_dividends_select" ON investment_dividends
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM investment_positions 
            WHERE id = investment_dividends.position_id 
            AND usuario_id = obter_uuid_proprietario()
        )
    );

DROP POLICY IF EXISTS "investment_dividends_insert" ON investment_dividends;
CREATE POLICY "investment_dividends_insert" ON investment_dividends
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM investment_positions 
            WHERE id = investment_dividends.position_id 
            AND usuario_id = obter_uuid_proprietario()
        )
    );

DROP POLICY IF EXISTS "investment_dividends_update" ON investment_dividends;
CREATE POLICY "investment_dividends_update" ON investment_dividends
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM investment_positions 
            WHERE id = investment_dividends.position_id 
            AND usuario_id = obter_uuid_proprietario()
        )
    );

DROP POLICY IF EXISTS "investment_dividends_delete" ON investment_dividends;
CREATE POLICY "investment_dividends_delete" ON investment_dividends
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM investment_positions 
            WHERE id = investment_dividends.position_id 
            AND usuario_id = obter_uuid_proprietario()
        )
    );

-- RLS para api_usage_log
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_usage_log_admin" ON api_usage_log;
CREATE POLICY "api_usage_log_admin" ON api_usage_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE auth_user = auth.uid() 
            AND is_admin = true
        )
    );

-- RLS para cdi_rates
ALTER TABLE cdi_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdi_rates_select" ON cdi_rates;
CREATE POLICY "cdi_rates_select" ON cdi_rates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "cdi_rates_admin" ON cdi_rates;
CREATE POLICY "cdi_rates_admin" ON cdi_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE auth_user = auth.uid() 
            AND is_admin = true
        )
    );

-- RLS para usuarios_dependentes
ALTER TABLE usuarios_dependentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dependentes_select_policy" ON usuarios_dependentes;
CREATE POLICY "dependentes_select_policy" ON usuarios_dependentes
    FOR SELECT USING (usuario_principal_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "dependentes_insert_policy" ON usuarios_dependentes;
CREATE POLICY "dependentes_insert_policy" ON usuarios_dependentes
    FOR INSERT WITH CHECK (usuario_principal_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "dependentes_update_policy" ON usuarios_dependentes;
CREATE POLICY "dependentes_update_policy" ON usuarios_dependentes
    FOR UPDATE USING (usuario_principal_id = verificar_proprietario_por_auth())
    WITH CHECK (usuario_principal_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "dependentes_delete_policy" ON usuarios_dependentes;
CREATE POLICY "dependentes_delete_policy" ON usuarios_dependentes
    FOR DELETE USING (usuario_principal_id = verificar_proprietario_por_auth());

-- =====================================================
-- 9. CRON JOBS (pg_cron)
-- =====================================================

-- ⚠️ IMPORTANTE: Os Cron Jobs foram movidos para um arquivo separado!
-- 
-- 📄 Arquivo: setup_cron_jobs.sql
-- 
-- 🎯 Por que um arquivo separado?
-- - Facilita a configuração das credenciais (PROJECT_URL e ANON_KEY)
-- - Evita expor chaves no arquivo principal
-- - Permite que cada aluno configure suas próprias credenciais
-- - Pode ser executado independentemente após o setup principal
-- 
-- 📋 COMO CONFIGURAR:
-- 1. Execute PRIMEIRO este arquivo (setup_differential_COMPLETO.sql)
-- 2. Abra o arquivo setup_cron_jobs.sql
-- 3. Substitua YOUR_SUPABASE_PROJECT_URL pela URL do seu projeto
-- 4. Substitua YOUR_SUPABASE_ANON_KEY pela sua chave anon
-- 5. Execute o arquivo setup_cron_jobs.sql no seu banco
-- 
-- 📊 CRON JOBS CONFIGURADOS:
-- - update-investment-prices-market (Segunda a Sexta, 12h/15h/21h UTC)
-- - update-investment-prices-crypto (A cada 4 horas, todos os dias)
-- 
-- ✅ PRÉ-REQUISITOS (já incluídos neste arquivo):
-- - Extensão pg_cron habilitada
-- - Extensão pg_net habilitada
-- - Edge Function 'update-investment-prices' deployada
-- 
-- Validado em: 12/01/2026

-- =====================================================
-- 10. EDGE FUNCTIONS (Supabase Functions)
-- =====================================================

-- Edge Functions criadas no Supabase:
-- 
-- 1. update-investment-prices (v5 - atualizada com Binance)
--    - Atualiza preços de ativos via BrAPI e Binance API
--    - Processa ativos com source='brapi' (ações, FIIs, ETFs, BDRs)
--    - Processa ativos com source='binance' (criptomoedas)
--    - Converte ticker automaticamente (BTC-BRL -> BTCBRL para Binance)
--    - Registra logs em api_usage_log
--    - Chamada pelos Cron Jobs a cada 4 horas (crypto) e 3x/dia (mercado)
--    - verify_jwt: false (chamada pelo sistema)
--    - Variáveis de ambiente necessárias:
--      * BRAPI_TOKEN: Token da API BrAPI (https://brapi.dev)
--      * SUPABASE_URL: URL do projeto Supabase
--      * SUPABASE_SERVICE_ROLE_KEY: Service role key do Supabase
-- 
-- 2. update-cdi-rates
--    - Atualiza taxas CDI do Banco Central
--    - Chamada manualmente ou via Cron
--    - verify_jwt: false (chamada pelo sistema)
--    - Variáveis de ambiente necessárias:
--      * SUPABASE_URL: URL do projeto Supabase
--      * SUPABASE_SERVICE_ROLE_KEY: Service role key do Supabase

-- =====================================================
-- 11. CONFIGURAÇÕES DE BLOQUEIO DE ASSINATURA
-- =====================================================

-- Adicionar colunas de configuração de bloqueio (se não existirem)
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS dias_aviso_expiracao INTEGER DEFAULT 3;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS dias_soft_block INTEGER DEFAULT 7;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS dias_hard_block INTEGER DEFAULT 14;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS permitir_visualizacao_bloqueado BOOLEAN DEFAULT true;

ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS whatsapp_suporte_url TEXT;

COMMENT ON COLUMN configuracoes_sistema.dias_aviso_expiracao IS 'Dias antes da expiração para mostrar aviso (banner amarelo)';
COMMENT ON COLUMN configuracoes_sistema.dias_soft_block IS 'Dias após expiração para bloqueio suave (modal, permite visualizar)';
COMMENT ON COLUMN configuracoes_sistema.dias_hard_block IS 'Dias após expiração para bloqueio total (redirect para /blocked)';
COMMENT ON COLUMN configuracoes_sistema.permitir_visualizacao_bloqueado IS 'Se true, usuário bloqueado pode visualizar dados (read-only)';
COMMENT ON COLUMN configuracoes_sistema.whatsapp_suporte_url IS 'URL do WhatsApp para suporte (diferente do WhatsApp de automação)';

-- =====================================================
-- ✅ SETUP DIFFERENTIAL COMPLETO FINALIZADO E CORRIGIDO!
-- =====================================================
-- 
-- 📊 RESUMO DAS MUDANÇAS:
-- ✅ 36 novas colunas em tabelas existentes (lancamentos_futuros: tipo_conta, conta_id | configuracoes_sistema: 13 novas colunas)
-- ✅ 8 novas tabelas completas
-- ✅ 35 funções SQL (incluindo sync_user_id, auto_set_plano_id, admin completas, pagamento de faturas, transferências, metas e configurações do sistema)
-- ✅ 14 novos triggers (incluindo sync user_id e auto plano_id)
-- ✅ 3 novas views
-- ✅ 55 novos índices (incluindo user_id indexes e lancamentos_futuros indexes)
-- ✅ 30+ novas políticas RLS
-- ✅ 2 Cron Jobs configurados
-- ✅ 2 Edge Functions
-- 
-- 🎯 MÓDULOS ADICIONADOS:
-- ✅ Internacionalização (idioma + moeda)
-- ✅ Contas Bancárias (com user_id INTEGER)
-- ✅ Cartões de Crédito (com user_id INTEGER)
-- ✅ Investimentos (Ações, FIIs, Cripto, Renda Fixa) (com user_id INTEGER)
-- ✅ Modo PJ (Pessoa Jurídica)
-- ✅ Sistema de Dependentes
-- ✅ Transferências entre Contas
-- ✅ Keywords AI para Categorias
-- ✅ Atualização Automática de Preços
-- ✅ Auto-vinculação de plano_id em cadastro de usuários
-- ✅ Sistema de Bloqueio de Assinatura (3 níveis: aviso, soft-block, hard-block)
-- ✅ Pagamento de Fatura de Cartão (Total e Parcial com categoria_id automática)
-- ✅ Funções Admin Completas (CRUD usuários, planos, estatísticas)
-- ✅ Configurações do Sistema (get/update settings para white label)
-- ✅ Transferências entre Contas (processar_transferencia_segura)
-- ✅ Sistema de Metas (calcular progresso, get metas usuário)
-- ✅ Parcelamentos (create_installments)
-- ✅ Cálculo de Dias Restantes Free
-- 
-- 🔐 SEGURANÇA:
-- ✅ RLS habilitado em todas as novas tabelas
-- ✅ Políticas específicas por operação (SELECT, INSERT, UPDATE, DELETE)
-- ✅ Funções SECURITY DEFINER com search_path fixado
-- ✅ Validações e constraints em todas as tabelas
-- 
-- 🔧 CORREÇÕES APLICADAS (07/01/2026):
-- ✅ Funções completas mescladas de missing_functions_differential.sql
-- ✅ calcular_progresso_meta: versão completa com todos os cálculos e status
-- ✅ create_installments: versão completa com tratamento correto de dias do mês
-- ✅ get_metas_usuario: versão completa com todos os campos de progresso
-- ✅ Ordem de criação corrigida: tabelas antes de funções
-- ✅ Todas as referências validadas contra o banco de dados
-- 
-- 🔧 CORREÇÕES APLICADAS (08/01/2025):
-- ✅ Unificação de configurações de cadastro (restringir_cadastro_usuarios_existentes)
-- ✅ Removida coluna bloquear_cadastro_novos_usuarios
-- ✅ Corrigida RPC admin_get_user_stats (cálculo correto de usuários premium)
-- ✅ Criada RPC admin_get_system_stats (estatísticas completas do sistema)
-- ✅ Corrigido cálculo de receita mensal estimada (conversão de planos anuais/semestrais)
-- 
-- ⚠️ PRÓXIMOS PASSOS:
-- 1. ✅ Arquivo corrigido e pronto para execução
-- 2. Executar após o setup.sql em banco limpo
-- 3. Validar todas as funcionalidades
-- 4. Configurar Cron Jobs manualmente no Supabase
-- 5. Deploy das Edge Functions
-- 
-- =====================================================

-- =====================================================
-- FUNÇÕES ADMIN - ESTATÍSTICAS (08/01/2025)
-- =====================================================

-- Função: admin_get_user_stats (CORRIGIDA)
-- Retorna estatísticas de usuários para o painel de Gestão de Usuários
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  SELECT json_build_object(
    'total_usuarios', COUNT(*),
    'usuarios_ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
    'usuarios_inativos', COUNT(*) FILTER (WHERE status != 'ativo'),
    'administradores', COUNT(*) FILTER (WHERE is_admin = true),
    'novos_30_dias', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'usuarios_free', COUNT(*) FILTER (WHERE plano_id IS NULL OR plano_id = 1),
    'usuarios_premium', COUNT(*) FILTER (WHERE plano_id IS NOT NULL AND plano_id != 1)
  ) INTO v_result
  FROM usuarios;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION admin_get_user_stats() IS 'Retorna estatísticas de usuários para o painel admin (Gestão de Usuários). Corrigido em 12/01/2026 para calcular corretamente usuários premium usando plano_id.';

-- Função: admin_get_system_stats (NOVA)
-- Retorna estatísticas completas do sistema para o painel de Estatísticas
-- Atualizada em 18/01/2026: Corrigido erro de agregação aninhada (nested aggregate)
CREATE OR REPLACE FUNCTION public.admin_get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_usuarios_por_plano json;
  v_receita_mensal numeric;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Buscar usuários por plano (usando subquery para evitar nested aggregate)
  SELECT json_agg(
    json_build_object(
      'plano', plano_nome,
      'count', user_count
    )
  )
  INTO v_usuarios_por_plano
  FROM (
    SELECT 
      COALESCE(p.nome, 'Sem Plano') as plano_nome,
      COUNT(u.id) as user_count
    FROM usuarios u
    LEFT JOIN planos_sistema p ON u.plano_id = p.id
    GROUP BY p.nome
    ORDER BY COUNT(u.id) DESC
  ) subquery;
  
  -- Calcular receita mensal estimada (convertendo planos anuais/semestrais/trimestrais para mensal)
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.tipo_periodo = 'mensal' THEN p.valor
      WHEN p.tipo_periodo = 'trimestral' THEN p.valor / 3
      WHEN p.tipo_periodo = 'semestral' THEN p.valor / 6
      WHEN p.tipo_periodo = 'anual' THEN p.valor / 12
      ELSE 0
    END
  ), 0)
  INTO v_receita_mensal
  FROM usuarios u
  INNER JOIN planos_sistema p ON u.plano_id = p.id
  WHERE u.status = 'ativo' AND p.tipo_periodo != 'free';
  
  -- Montar resultado completo
  SELECT json_build_object(
    'total_usuarios', (SELECT COUNT(*) FROM usuarios),
    'usuarios_ativos', (SELECT COUNT(*) FROM usuarios WHERE status = 'ativo'),
    'usuarios_inativos', (SELECT COUNT(*) FROM usuarios WHERE status != 'ativo'),
    'usuarios_com_senha', (SELECT COUNT(*) FROM usuarios WHERE has_password = true),
    'total_planos', (SELECT COUNT(*) FROM planos_sistema),
    'planos_ativos', (SELECT COUNT(*) FROM planos_sistema WHERE ativo = true),
    'receita_mensal_estimada', v_receita_mensal,
    'usuarios_por_plano', COALESCE(v_usuarios_por_plano, '[]'::json)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION admin_get_system_stats() IS 'Retorna estatísticas completas do sistema para o painel admin (Estatísticas do Sistema). Criada em 08/01/2025. Atualizada em 18/01/2026 para corrigir erro de agregação aninhada (código 42803).';

-- =====================================================
-- 🔧 FUNÇÃO: delete_category_safe
-- =====================================================
-- Criada em: 09/01/2025 | Atualizada em: 10/03/2026
-- Descrição: Deleta uma categoria de forma segura.
--   - Se tiver vínculos e SEM categoria destino: retorna requires_migration=true
--   - Se tiver categoria destino (p_target_category_id): migra antes de deletar
--   - Se não tiver vínculos: deleta diretamente
-- =====================================================

-- Remove assinaturas antigas para evitar erro de ambiguidade (Could not choose the best candidate function)
DROP FUNCTION IF EXISTS public.delete_category_safe(INTEGER);
DROP FUNCTION IF EXISTS public.delete_category_safe(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.delete_category_safe(
  p_category_id INTEGER,
  p_target_category_id INTEGER DEFAULT NULL,
  p_check_only BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id INTEGER;
  v_transacoes_count INTEGER;
  v_lancamentos_count INTEGER;
BEGIN
  SELECT usuario_id INTO v_user_id FROM categoria_trasacoes WHERE id = p_category_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Categoria não encontrada');
  END IF;

  IF v_user_id != (SELECT id FROM usuarios WHERE auth_user = auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Você não tem permissão para deletar esta categoria');
  END IF;

  SELECT COUNT(*) INTO v_transacoes_count FROM transacoes WHERE categoria_id = p_category_id;
  SELECT COUNT(*) INTO v_lancamentos_count FROM lancamentos_futuros WHERE categoria_id = p_category_id;

  -- Modo apenas verificacao: retorna contagens sem deletar
  IF p_check_only THEN
    IF v_transacoes_count > 0 OR v_lancamentos_count > 0 THEN
      RETURN json_build_object(
        'success', false,
        'requires_migration', true,
        'transacoes_count', v_transacoes_count,
        'lancamentos_count', v_lancamentos_count,
        'error', 'Categoria possui vínculos. Forneça uma categoria destino para migração.'
      );
    ELSE
      RETURN json_build_object(
        'success', true,
        'requires_migration', false,
        'transacoes_count', 0,
        'lancamentos_count', 0
      );
    END IF;
  END IF;

  -- Modo delecao real
  IF (v_transacoes_count > 0 OR v_lancamentos_count > 0) AND p_target_category_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 'requires_migration', true,
      'transacoes_count', v_transacoes_count,
      'lancamentos_count', v_lancamentos_count,
      'error', 'Categoria possui vínculos. Forneça uma categoria destino para migração.'
    );
  END IF;

  IF p_target_category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categoria_trasacoes WHERE id = p_target_category_id AND usuario_id = v_user_id) THEN
      RETURN json_build_object('success', false, 'error', 'Categoria destino inválida');
    END IF;
    UPDATE transacoes SET categoria_id = p_target_category_id WHERE categoria_id = p_category_id;
    UPDATE lancamentos_futuros SET categoria_id = p_target_category_id WHERE categoria_id = p_category_id;
  END IF;

  DELETE FROM categoria_trasacoes WHERE id = p_category_id;

  RETURN json_build_object('success', true, 'transacoes_migradas', v_transacoes_count, 'lancamentos_migrados', v_lancamentos_count);
END;
$$;

COMMENT ON FUNCTION public.delete_category_safe(INTEGER, INTEGER, BOOLEAN) IS 'Deleta uma categoria de forma segura. p_check_only=true: apenas verifica vinculos sem deletar. Com migração: p_target_category_id move vínculos antes de deletar. Atualizada em 10/03/2026.';


-- =====================================================
-- 🔧 FUNÇÃO: check_email_exists
-- =====================================================
-- Criada em: 19/01/2026
-- Descrição: Verifica se um email existe nas tabelas usuarios ou usuarios_dependentes.
--            Usada no fluxo de "Esqueci Senha" para validar email antes de enviar
--            link de recuperação.
-- Motivo: RLS (Row Level Security) bloqueia leitura de usuarios por usuários não
--         autenticados. Esta função usa SECURITY DEFINER para bypass do RLS.
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_email_exists(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  -- Verifica se email existe em usuarios ou usuarios_dependentes
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER(email_input)
    UNION
    SELECT 1 FROM usuarios_dependentes WHERE LOWER(email) = LOWER(email_input)
  ) INTO email_exists;
  
  RETURN email_exists;
END;
$$;

COMMENT ON FUNCTION public.check_email_exists(TEXT) IS 'Verifica se um email existe nas tabelas usuarios ou usuarios_dependentes. Usado no fluxo de esqueci senha para validar email antes de enviar link de recuperação. Roda com SECURITY DEFINER para bypass RLS.';

-- 4.29 Função: verificar_meu_acesso (CORRIGIDA - 10/01/2026)
-- Correção: Agora busca também em usuarios_dependentes para evitar bloqueio de dependentes
CREATE OR REPLACE FUNCTION public.verificar_meu_acesso()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_id INTEGER;
    acesso_info JSONB;
    dias_restantes INTEGER;
    tem_acesso BOOLEAN;
    usuario_record RECORD;
    plano_atual TEXT;
    plano_nome_atual TEXT;
    plano_detalhes JSONB;
BEGIN
    -- Buscar o ID numérico do usuário logado com informações do plano
    SELECT 
        u.id, 
        u.status, 
        u.plano as plano_legado, 
        u.plano_id,
        u.is_admin, 
        u.data_final_plano,
        p.nome::TEXT as plano_nome,
        p.tipo_periodo,
        p.valor,
        p.recursos
    INTO usuario_record
    FROM public.usuarios u
    LEFT JOIN public.planos_sistema p ON u.plano_id = p.id
    WHERE u.auth_user = auth.uid();
    
    -- Se não encontrou em usuarios, verificar se é dependente
    IF NOT FOUND THEN
        -- Buscar dependente e dados do principal
        SELECT 
            u.id, 
            u.status, 
            u.plano as plano_legado, 
            u.plano_id,
            u.is_admin, 
            u.data_final_plano,
            p.nome::TEXT as plano_nome,
            p.tipo_periodo,
            p.valor,
            p.recursos
        INTO usuario_record
        FROM public.usuarios_dependentes d
        INNER JOIN public.usuarios u ON u.id = d.usuario_principal_id
        LEFT JOIN public.planos_sistema p ON u.plano_id = p.id
        WHERE d.auth_user_id = auth.uid()
          AND d.status = 'ativo';
        
        -- Se ainda não encontrou, retornar erro
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'hasAccess', false,
                'isAdmin', false,
                'plan', null,
                'planName', null,
                'planDetails', null,
                'daysRemaining', 0,
                'needsUpgrade', true,
                'isBlocked', true,
                'dataFinalPlano', null,
                'message', 'Usuário não encontrado'
            );
        END IF;
    END IF;
    
    -- Calcular informações de acesso
    dias_restantes := calcular_dias_restantes_free(usuario_record.id);
    tem_acesso := usuario_tem_acesso_ativo(usuario_record.id);
    
    -- Determinar o plano atual (priorizar FK sobre legado)
    IF usuario_record.plano_id IS NOT NULL AND usuario_record.plano_nome IS NOT NULL THEN
        -- Usar plano vinculado via FK
        plano_atual := usuario_record.tipo_periodo;
        plano_nome_atual := usuario_record.plano_nome;
        plano_detalhes := jsonb_build_object(
            'id', usuario_record.plano_id,
            'nome', usuario_record.plano_nome,
            'valor', COALESCE(usuario_record.valor, 0),
            'recursos', COALESCE(usuario_record.recursos, '[]'::jsonb)
        );
    ELSE
        -- Fallback para plano legado
        plano_atual := COALESCE(usuario_record.plano_legado, 'free');
        plano_nome_atual := CASE 
            WHEN plano_atual = 'Premium' THEN 'Plano Premium'
            WHEN plano_atual = 'free' THEN 'Plano Free'
            ELSE plano_atual
        END;
        plano_detalhes := NULL;
    END IF;
    
    -- Montar resposta
    acesso_info := jsonb_build_object(
        'hasAccess', tem_acesso,
        'isAdmin', COALESCE(usuario_record.is_admin, false),
        'plan', plano_atual,
        'planName', plano_nome_atual,
        'planDetails', plano_detalhes,
        'daysRemaining', dias_restantes,
        'needsUpgrade', (dias_restantes >= 0 AND dias_restantes <= 3 AND NOT COALESCE(usuario_record.is_admin, false)),
        'isBlocked', (usuario_record.status != 'ativo' OR NOT tem_acesso),
        'dataFinalPlano', usuario_record.data_final_plano,
        'userId', usuario_record.id
    );
    
    -- Atualizar último acesso
    UPDATE public.usuarios 
    SET data_ultimo_acesso = NOW()
    WHERE id = usuario_record.id;
    
    RETURN acesso_info;
END;
$$;

COMMENT ON FUNCTION verificar_meu_acesso IS 'Verifica acesso do usuário (principal ou dependente) ao sistema, retornando informações do plano e bloqueios';

-- =====================================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- 5.0 Habilitar RLS na tabela categoria_trasacoes (CRÍTICO - 13/01/2026)
ALTER TABLE categoria_trasacoes ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas RLS para categoria_trasacoes - Usuários Principais (CORRIGIDO - 13/01/2026)
-- Permite que usuários principais possam criar, editar e deletar suas próprias categorias

-- Política SELECT para usuários principais
DROP POLICY IF EXISTS "categoria_select_policy" ON categoria_trasacoes;
CREATE POLICY "categoria_select_policy" ON categoria_trasacoes
FOR SELECT USING (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

-- Política INSERT para usuários principais
DROP POLICY IF EXISTS "categoria_insert_policy" ON categoria_trasacoes;
CREATE POLICY "categoria_insert_policy" ON categoria_trasacoes
FOR INSERT WITH CHECK (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

-- Política UPDATE para usuários principais
DROP POLICY IF EXISTS "categoria_update_policy" ON categoria_trasacoes;
CREATE POLICY "categoria_update_policy" ON categoria_trasacoes
FOR UPDATE USING (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
)
WITH CHECK (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

-- Política DELETE para usuários principais
DROP POLICY IF EXISTS "categoria_delete_policy" ON categoria_trasacoes;
CREATE POLICY "categoria_delete_policy" ON categoria_trasacoes
FOR DELETE USING (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

-- 5.2 Políticas RLS para categoria_trasacoes - Dependentes (RESTAURADAS - 13/01/2026)
-- Policies SEPARADAS para dependentes (igual ao banco de produção)

-- Política SELECT para dependentes
DROP POLICY IF EXISTS "dependentes_veem_categorias_sempre" ON categoria_trasacoes;
CREATE POLICY "dependentes_veem_categorias_sempre" ON categoria_trasacoes
FOR SELECT USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
  )
);

-- Política INSERT para dependentes
DROP POLICY IF EXISTS "categorias_insert_dependentes" ON categoria_trasacoes;
CREATE POLICY "categorias_insert_dependentes" ON categoria_trasacoes
FOR INSERT WITH CHECK (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid() 
      AND d.status = 'ativo'
      AND (
        (d.permissoes->>'pode_criar_transacoes')::boolean = true
        OR (d.permissoes->>'pode_ver_dados_admin')::boolean = true
      )
  )
);

-- Política UPDATE para dependentes
DROP POLICY IF EXISTS "categorias_update_dependentes" ON categoria_trasacoes;
CREATE POLICY "categorias_update_dependentes" ON categoria_trasacoes
FOR UPDATE USING (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid() 
      AND d.status = 'ativo'
      AND (
        (d.permissoes->>'pode_criar_transacoes')::boolean = true
        OR (d.permissoes->>'pode_ver_dados_admin')::boolean = true
      )
  )
)
WITH CHECK (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid() 
      AND d.status = 'ativo'
      AND (
        (d.permissoes->>'pode_criar_transacoes')::boolean = true
        OR (d.permissoes->>'pode_ver_dados_admin')::boolean = true
      )
  )
);

-- Política DELETE para dependentes
DROP POLICY IF EXISTS "categorias_delete_dependentes" ON categoria_trasacoes;
CREATE POLICY "categorias_delete_dependentes" ON categoria_trasacoes
FOR DELETE USING (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid() 
      AND d.status = 'ativo'
      AND (d.permissoes->>'pode_ver_dados_admin')::boolean = true
  )
);

-- =====================================================
-- 6. POLICIES ADICIONAIS FALTANTES (13/01/2026)
-- =====================================================
-- Policies que existem no banco de produção mas estavam faltando
-- Total: ~40 policies adicionadas para igualar ao banco de produção

-- 6.1 TRANSACOES - Policies Faltantes
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dependentes_podem_ver_transacoes_com_permissao" ON transacoes;
CREATE POLICY "dependentes_podem_ver_transacoes_com_permissao" ON transacoes
FOR SELECT USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
      AND (permissoes->>'pode_ver_dados_admin')::boolean = true
  )
);

DROP POLICY IF EXISTS "dependentes_veem_proprias_transacoes" ON transacoes;
CREATE POLICY "dependentes_veem_proprias_transacoes" ON transacoes
FOR SELECT USING (
  dependente_id IN (
    SELECT id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
  )
);

DROP POLICY IF EXISTS "dependentes_veem_transacoes_tipo_conta_permitido" ON transacoes;
CREATE POLICY "dependentes_veem_transacoes_tipo_conta_permitido" ON transacoes
FOR SELECT USING (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo'
      AND (d.permissoes->'tipos_conta_permitidos') @> to_jsonb(transacoes.tipo_conta)
      AND (
        (d.permissoes->>'pode_ver_dados_admin')::boolean = true
        OR transacoes.dependente_id = d.id
      )
  )
);

DROP POLICY IF EXISTS "principal_ve_proprias_transacoes" ON transacoes;
CREATE POLICY "principal_ve_proprias_transacoes" ON transacoes
FOR SELECT USING (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

DROP POLICY IF EXISTS "transacoes_insert_segura" ON transacoes;
CREATE POLICY "transacoes_insert_segura" ON transacoes
FOR INSERT WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "transacoes_update_segura" ON transacoes;
CREATE POLICY "transacoes_update_segura" ON transacoes
FOR UPDATE USING (
  usuario_id = verificar_proprietario_por_auth()
)
WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "transacoes_delete_segura" ON transacoes;
CREATE POLICY "transacoes_delete_segura" ON transacoes
FOR DELETE USING (
  usuario_id = verificar_proprietario_por_auth()
);

-- 6.2 LANCAMENTOS_FUTUROS - Policies Faltantes
ALTER TABLE lancamentos_futuros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dependentes_podem_ver_lancamentos_com_permissao" ON lancamentos_futuros;
CREATE POLICY "dependentes_podem_ver_lancamentos_com_permissao" ON lancamentos_futuros
FOR SELECT USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
      AND (permissoes->>'pode_ver_dados_admin')::boolean = true
  )
);

DROP POLICY IF EXISTS "dependentes_veem_proprios_lancamentos" ON lancamentos_futuros;
CREATE POLICY "dependentes_veem_proprios_lancamentos" ON lancamentos_futuros
FOR SELECT USING (
  dependente_id IN (
    SELECT id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
  )
);

DROP POLICY IF EXISTS "dependentes_veem_lancamentos_tipo_conta_permitido" ON lancamentos_futuros;
CREATE POLICY "dependentes_veem_lancamentos_tipo_conta_permitido" ON lancamentos_futuros
FOR SELECT USING (
  usuario_id IN (
    SELECT d.usuario_principal_id
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo'
      AND (d.permissoes->'tipos_conta_permitidos') @> to_jsonb(lancamentos_futuros.tipo_conta)
      AND (
        (d.permissoes->>'pode_ver_dados_admin')::boolean = true
        OR lancamentos_futuros.dependente_id = d.id
      )
  )
);

DROP POLICY IF EXISTS "principal_ve_proprios_lancamentos" ON lancamentos_futuros;
CREATE POLICY "principal_ve_proprios_lancamentos" ON lancamentos_futuros
FOR SELECT USING (
  usuario_id IN (
    SELECT id 
    FROM usuarios 
    WHERE auth_user = auth.uid()
  )
);

DROP POLICY IF EXISTS "lancamentos_insert_segura" ON lancamentos_futuros;
CREATE POLICY "lancamentos_insert_segura" ON lancamentos_futuros
FOR INSERT WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "lancamentos_update_segura" ON lancamentos_futuros;
CREATE POLICY "lancamentos_update_segura" ON lancamentos_futuros
FOR UPDATE USING (
  usuario_id = verificar_proprietario_por_auth()
)
WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "lancamentos_delete_segura" ON lancamentos_futuros;
CREATE POLICY "lancamentos_delete_segura" ON lancamentos_futuros
FOR DELETE USING (
  usuario_id = verificar_proprietario_por_auth()
);

-- 6.3 USUARIOS - Policies Faltantes
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ⚠️ IMPORTANTE (22/01/2026): A policy "dependentes_podem_ver_dados_principal" foi REMOVIDA
-- porque causava recursão infinita com as policies de usuarios_dependentes.
-- Dependentes NÃO podem mais ver dados do principal via RLS direto.
-- Use funções SECURITY DEFINER para acesso compartilhado se necessário.
--
-- DROP POLICY IF EXISTS "dependentes_podem_ver_dados_principal" ON usuarios;
-- CREATE POLICY "dependentes_podem_ver_dados_principal" ON usuarios
-- FOR SELECT USING (
--   id IN (
--     SELECT usuario_principal_id 
--     FROM usuarios_dependentes
--     WHERE auth_user_id = auth.uid()
--       AND status = 'ativo'
--   )
-- );

-- =====================================================
-- FIX 26/02/2026: Função SECURITY DEFINER para dependentes acessarem
-- dados do plano do usuário principal sem recursividade de RLS
-- =====================================================
-- Motivo: RLS da tabela usuarios bloqueava a query do use-user.ts
-- para buscar plano_id do principal, fazendo plano_id = undefined
-- e portanto permiteInvestimentos = false para dependentes.
-- Solução: Função SECURITY DEFINER (mesmo padrão de obter_uuid_proprietario)
-- que retorna os dados do plano sem passar pela RLS da tabela usuarios.

CREATE OR REPLACE FUNCTION obter_dados_plano_usuario()
RETURNS TABLE (
  plano_id INTEGER,
  plano TEXT,
  idioma TEXT,
  moeda TEXT,
  plano_nome VARCHAR,
  permite_compartilhamento BOOLEAN,
  max_usuarios_dependentes INTEGER,
  recursos JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_principal_id INTEGER;
BEGIN
  -- 1. Verificar se é usuário principal
  RETURN QUERY
  SELECT 
    u.plano_id,
    u.plano,
    u.idioma,
    u.moeda,
    ps.nome AS plano_nome,
    ps.permite_compartilhamento,
    ps.max_usuarios_dependentes,
    ps.recursos
  FROM usuarios u
  LEFT JOIN planos_sistema ps ON ps.id = u.plano_id
  WHERE u.auth_user = auth.uid()
  LIMIT 1;

  -- Se retornou algo, termina aqui
  IF FOUND THEN
    RETURN;
  END IF;

  -- 2. Se não encontrou, verificar se é dependente e buscar dados do principal
  SELECT ud.usuario_principal_id INTO v_usuario_principal_id
  FROM usuarios_dependentes ud
  WHERE ud.auth_user_id = auth.uid()
    AND ud.status = 'ativo'
  LIMIT 1;

  IF v_usuario_principal_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.plano_id,
      u.plano,
      u.idioma,
      u.moeda,
      ps.nome AS plano_nome,
      ps.permite_compartilhamento,
      ps.max_usuarios_dependentes,
      ps.recursos
    FROM usuarios u
    LEFT JOIN planos_sistema ps ON ps.id = u.plano_id
    WHERE u.id = v_usuario_principal_id
    LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION obter_dados_plano_usuario() IS 
'Retorna dados do plano do usuário atual. Para dependentes, retorna dados do plano do usuário principal. 
Usa SECURITY DEFINER para evitar recursão infinita com as policies de RLS da tabela usuarios.
Padrão idêntico a obter_uuid_proprietario().';

-- Garantir permissão de execução para authenticated
GRANT EXECUTE ON FUNCTION obter_dados_plano_usuario() TO authenticated;

-- Revogar de anon por segurança
REVOKE EXECUTE ON FUNCTION obter_dados_plano_usuario() FROM anon;

-- Nota: o campo permite_investimentos nos permissoes do dependente é gerenciado no JSONB
-- Não requer DDL adicional - é lido de usuarios_dependentes.permissoes->>'permite_investimentos'
-- Default: true (não existindo o campo = true, ou seja herda do plano)
-- Pode ser restrito a false pelo administrador via painel de gestão de dependentes
-- Exemplo de permissoes com investimentos bloqueados:
-- {"permite_investimentos": false, "tipos_conta_permitidos": ["pj"], ...}
--
-- IMPORTANTE: A função getOwnerUUID() em src/lib/get-owner-uuid.ts foi corrigida
-- para usar a RPC obter_uuid_proprietario() (já SECURITY DEFINER no banco)
-- ao invés de fazer join em usuarios!inner(auth_user) que era bloqueado por RLS.
-- Isso resolveu o erro 406 em todos os hooks de investimento quando acessados pelo dependente.
-- Não há mudança no banco para este fix - apenas frontend.
-- =====================================================

-- Policy simples sem recursão (MANTIDA)
DROP POLICY IF EXISTS "usuarios_veem_proprio_dados" ON usuarios;
CREATE POLICY "usuarios_veem_proprio_dados" ON usuarios
FOR ALL USING (
  auth_user = auth.uid()
)
WITH CHECK (
  auth_user = auth.uid()
);

-- 6.4 USUARIOS_DEPENDENTES - Policy Faltante
DROP POLICY IF EXISTS "dependentes_select_own_policy" ON usuarios_dependentes;
CREATE POLICY "dependentes_select_own_policy" ON usuarios_dependentes
FOR SELECT USING (
  auth.uid() = auth_user_id
);

-- 6.5 METAS_ORCAMENTO - Policies Faltantes
ALTER TABLE metas_orcamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dependentes_veem_metas_com_permissao" ON metas_orcamento;
CREATE POLICY "dependentes_veem_metas_com_permissao" ON metas_orcamento
FOR SELECT USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes
    WHERE auth_user_id = auth.uid()
      AND status = 'ativo'
      AND (
        (permissoes->>'pode_ver_relatorios')::boolean = true
        OR (permissoes->>'pode_ver_dados_admin')::boolean = true
      )
  )
);

DROP POLICY IF EXISTS "metas_select_segura" ON metas_orcamento;
CREATE POLICY "metas_select_segura" ON metas_orcamento
FOR SELECT USING (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "metas_insert_segura" ON metas_orcamento;
CREATE POLICY "metas_insert_segura" ON metas_orcamento
FOR INSERT WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "metas_update_segura" ON metas_orcamento;
CREATE POLICY "metas_update_segura" ON metas_orcamento
FOR UPDATE USING (
  usuario_id = verificar_proprietario_por_auth()
)
WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "metas_delete_segura" ON metas_orcamento;
CREATE POLICY "metas_delete_segura" ON metas_orcamento
FOR DELETE USING (
  usuario_id = verificar_proprietario_por_auth()
);

-- 6.6 INVESTMENT_ASSETS - Renomear e Corrigir Policies
DROP POLICY IF EXISTS "investment_assets_select" ON investment_assets;
DROP POLICY IF EXISTS "investment_assets_admin" ON investment_assets;

DROP POLICY IF EXISTS "Todos podem ver ativos" ON investment_assets;
CREATE POLICY "Todos podem ver ativos" ON investment_assets
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role pode modificar todos ativos" ON investment_assets;
CREATE POLICY "Service role pode modificar todos ativos" ON investment_assets
FOR ALL USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas service role pode deletar ativos" ON investment_assets;
CREATE POLICY "Apenas service role pode deletar ativos" ON investment_assets
FOR DELETE USING (true);

DROP POLICY IF EXISTS "Usuários podem criar ativos" ON investment_assets;
CREATE POLICY "Usuários podem criar ativos" ON investment_assets
FOR INSERT WITH CHECK (true);

-- ATENÇÃO: policy "Usuarios podem inserir ativos" com WITH CHECK (true) irrestrito
-- foi removida. A policy correta está definida abaixo na seção de CORREÇÃO DE POLICY RLS.

DROP POLICY IF EXISTS "Usuários podem atualizar ativos manuais" ON investment_assets;
CREATE POLICY "Usuários podem atualizar ativos manuais" ON investment_assets
FOR UPDATE USING (source = 'manual')
WITH CHECK (source = 'manual');

-- 6.7 INVESTMENT_POSITIONS - Renomear Policies
DROP POLICY IF EXISTS "investment_positions_select" ON investment_positions;
DROP POLICY IF EXISTS "investment_positions_insert" ON investment_positions;
DROP POLICY IF EXISTS "investment_positions_update" ON investment_positions;
DROP POLICY IF EXISTS "investment_positions_delete" ON investment_positions;

DROP POLICY IF EXISTS "Usuarios podem ver suas posicoes" ON investment_positions;
CREATE POLICY "Usuarios podem ver suas posicoes" ON investment_positions
FOR SELECT USING (obter_uuid_proprietario() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem criar suas posicoes" ON investment_positions;
CREATE POLICY "Usuarios podem criar suas posicoes" ON investment_positions
FOR INSERT WITH CHECK (obter_uuid_proprietario() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar suas posicoes" ON investment_positions;
CREATE POLICY "Usuarios podem atualizar suas posicoes" ON investment_positions
FOR UPDATE USING (obter_uuid_proprietario() = usuario_id);

DROP POLICY IF EXISTS "Usuarios podem excluir suas posicoes" ON investment_positions;
CREATE POLICY "Usuarios podem excluir suas posicoes" ON investment_positions
FOR DELETE USING (obter_uuid_proprietario() = usuario_id);

-- 6.8 INVESTMENT_DIVIDENDS - Renomear Policies
DROP POLICY IF EXISTS "investment_dividends_select" ON investment_dividends;
DROP POLICY IF EXISTS "investment_dividends_insert" ON investment_dividends;
DROP POLICY IF EXISTS "investment_dividends_update" ON investment_dividends;
DROP POLICY IF EXISTS "investment_dividends_delete" ON investment_dividends;

DROP POLICY IF EXISTS "Usuarios podem ver seus proventos" ON investment_dividends;
CREATE POLICY "Usuarios podem ver seus proventos" ON investment_dividends
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM investment_positions 
    WHERE investment_positions.id = investment_dividends.position_id 
      AND investment_positions.usuario_id = obter_uuid_proprietario()
  )
);

DROP POLICY IF EXISTS "Usuarios podem criar seus proventos" ON investment_dividends;
CREATE POLICY "Usuarios podem criar seus proventos" ON investment_dividends
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM investment_positions 
    WHERE investment_positions.id = investment_dividends.position_id 
      AND investment_positions.usuario_id = obter_uuid_proprietario()
  )
);

DROP POLICY IF EXISTS "Usuarios podem atualizar seus proventos" ON investment_dividends;
CREATE POLICY "Usuarios podem atualizar seus proventos" ON investment_dividends
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM investment_positions 
    WHERE investment_positions.id = investment_dividends.position_id 
      AND investment_positions.usuario_id = obter_uuid_proprietario()
  )
);

DROP POLICY IF EXISTS "Usuarios podem excluir seus proventos" ON investment_dividends;
CREATE POLICY "Usuarios podem excluir seus proventos" ON investment_dividends
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM investment_positions 
    WHERE investment_positions.id = investment_dividends.position_id 
      AND investment_positions.usuario_id = obter_uuid_proprietario()
  )
);

-- 6.9 API_USAGE_LOG - Renomear Policy
DROP POLICY IF EXISTS "api_usage_log_admin" ON api_usage_log;

DROP POLICY IF EXISTS "Apenas service_role pode acessar logs" ON api_usage_log;
CREATE POLICY "Apenas service_role pode acessar logs" ON api_usage_log
FOR ALL USING (auth.role() = 'service_role');

-- 6.10 CDI_RATES - Renomear Policies
DROP POLICY IF EXISTS "cdi_rates_select" ON cdi_rates;
DROP POLICY IF EXISTS "cdi_rates_admin" ON cdi_rates;

DROP POLICY IF EXISTS "CDI rates are public" ON cdi_rates;
CREATE POLICY "CDI rates are public" ON cdi_rates
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only service_role can modify CDI rates" ON cdi_rates;
CREATE POLICY "Only service_role can modify CDI rates" ON cdi_rates
FOR ALL USING (true)
WITH CHECK (true);

-- 6.11 PLANOS_SISTEMA - Policies Faltantes
ALTER TABLE planos_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar planos ativos" ON planos_sistema;
CREATE POLICY "Todos podem visualizar planos ativos" ON planos_sistema
FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Admin tem acesso total aos planos" ON planos_sistema;
CREATE POLICY "Admin tem acesso total aos planos" ON planos_sistema
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE auth_user = auth.uid() 
      AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE auth_user = auth.uid() 
      AND is_admin = true
  )
);

-- 6.12 CONFIGURACOES_SISTEMA - Policies Faltantes
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos os usuários podem visualizar configurações do sistema" ON configuracoes_sistema;
CREATE POLICY "Todos os usuários podem visualizar configurações do sistema" ON configuracoes_sistema
FOR SELECT USING (true);

DROP POLICY IF EXISTS "configuracoes_admin_segura" ON configuracoes_sistema;
CREATE POLICY "configuracoes_admin_segura" ON configuracoes_sistema
FOR UPDATE TO authenticated USING (
  verificar_admin_sem_recursao()
)
WITH CHECK (
  verificar_admin_sem_recursao()
);

-- 6.13 CONSENTIMENTOS_USUARIOS - Policies Faltantes
ALTER TABLE consentimentos_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consentimentos_select_segura" ON consentimentos_usuarios;
CREATE POLICY "consentimentos_select_segura" ON consentimentos_usuarios
FOR SELECT USING (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "consentimentos_insert_segura" ON consentimentos_usuarios;
CREATE POLICY "consentimentos_insert_segura" ON consentimentos_usuarios
FOR INSERT WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "consentimentos_update_segura" ON consentimentos_usuarios;
CREATE POLICY "consentimentos_update_segura" ON consentimentos_usuarios
FOR UPDATE USING (
  usuario_id = verificar_proprietario_por_auth()
)
WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

-- 6.14 PREFERENCIAS_NOTIFICACAO - Policy Faltante
ALTER TABLE preferencias_notificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preferencias_segura" ON preferencias_notificacao;
CREATE POLICY "preferencias_segura" ON preferencias_notificacao
FOR ALL USING (
  usuario_id = verificar_proprietario_por_auth()
)
WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

-- 6.15 SOLICITACOES_LGPD - Policies Faltantes
ALTER TABLE solicitacoes_lgpd ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitacoes_select_segura" ON solicitacoes_lgpd;
CREATE POLICY "solicitacoes_select_segura" ON solicitacoes_lgpd
FOR SELECT USING (
  usuario_id = verificar_proprietario_por_auth()
);

DROP POLICY IF EXISTS "solicitacoes_insert_segura" ON solicitacoes_lgpd;
CREATE POLICY "solicitacoes_insert_segura" ON solicitacoes_lgpd
FOR INSERT WITH CHECK (
  usuario_id = verificar_proprietario_por_auth()
);

-- =====================================================
-- 7. CORREÇÕES DE MIGRAÇÃO
-- =====================================================

-- 6.1 Correção: Categorias com tipo NULL (Migração de Bancos Antigos)
-- Atualizar categorias antigas que não têm tipo definido
UPDATE categoria_trasacoes
SET tipo = 'ambos'
WHERE tipo IS NULL;

-- =====================================================
-- 7. CONTROLE GRANULAR DE ACESSO PESSOAL/PJ PARA DEPENDENTES (10/01/2026)
-- =====================================================
-- Permite que o principal defina se dependente acessa Pessoal, PJ ou ambos
-- Implementação 100% retrocompatível - não quebra nada existente

-- 7.1 Adicionar campo tipos_conta_permitidos aos dependentes existentes
UPDATE usuarios_dependentes
SET permissoes = permissoes || '{"tipos_conta_permitidos": ["pessoal", "pj"]}'::jsonb
WHERE NOT (permissoes ? 'tipos_conta_permitidos');

-- 7.2 Criar função helper para verificar acesso por tipo_conta
CREATE OR REPLACE FUNCTION dependente_tem_acesso_tipo_conta(
  p_tipo_conta text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipos_permitidos jsonb;
BEGIN
  SELECT permissoes->'tipos_conta_permitidos'
  INTO v_tipos_permitidos
  FROM usuarios_dependentes
  WHERE auth_user_id = auth.uid()
    AND status = 'ativo';
  
  IF v_tipos_permitidos IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_tipos_permitidos @> to_jsonb(p_tipo_conta);
END;
$$;

COMMENT ON FUNCTION dependente_tem_acesso_tipo_conta IS 'Verifica se dependente logado tem acesso ao tipo_conta especificado (pessoal ou pj)';

-- 7.3 Criar NOVAS policies com filtro de tipo_conta

-- 7.3.1 TRANSACOES
DROP POLICY IF EXISTS "dependentes_veem_transacoes_tipo_conta_permitido" ON transacoes;
CREATE POLICY "dependentes_veem_transacoes_tipo_conta_permitido"
ON transacoes FOR SELECT
USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo'
      AND (
        (d.permissoes->'tipos_conta_permitidos') @> to_jsonb(transacoes.tipo_conta)
        AND (
          ((d.permissoes->>'pode_ver_dados_admin')::boolean = true)
          OR transacoes.dependente_id = d.id
        )
      )
  )
);

-- 7.3.2 LANCAMENTOS_FUTUROS
DROP POLICY IF EXISTS "dependentes_veem_lancamentos_tipo_conta_permitido" ON lancamentos_futuros;
CREATE POLICY "dependentes_veem_lancamentos_tipo_conta_permitido"
ON lancamentos_futuros FOR SELECT
USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo'
      AND (
        (d.permissoes->'tipos_conta_permitidos') @> to_jsonb(lancamentos_futuros.tipo_conta)
        AND (
          ((d.permissoes->>'pode_ver_dados_admin')::boolean = true)
          OR lancamentos_futuros.dependente_id = d.id
        )
      )
  )
);

-- 7.3.3 CATEGORIA_TRASACOES
DROP POLICY IF EXISTS "dependentes_veem_categorias_tipo_conta_permitido" ON categoria_trasacoes;
CREATE POLICY "dependentes_veem_categorias_tipo_conta_permitido"
ON categoria_trasacoes FOR SELECT
USING (
  usuario_id IN (
    SELECT usuario_principal_id 
    FROM usuarios_dependentes d
    WHERE d.auth_user_id = auth.uid()
      AND d.status = 'ativo'
      AND (d.permissoes->'tipos_conta_permitidos') @> to_jsonb(categoria_trasacoes.tipo_conta)
  )
);

-- 7.3.4 CONTAS_BANCARIAS (usa obter_uuid_proprietario para bypassar RLS de usuarios)
DROP POLICY IF EXISTS "dependentes_veem_contas_tipo_conta_permitido" ON contas_bancarias;
DROP POLICY IF EXISTS "dependentes_veem_contas_com_permissao" ON contas_bancarias;
DROP POLICY IF EXISTS "dependentes_veem_contas_segura" ON contas_bancarias;
CREATE POLICY "dependentes_veem_contas_segura"
ON contas_bancarias FOR SELECT
USING (
  usuario_id = obter_uuid_proprietario()
);

-- 7.3.5 CARTOES_CREDITO (usa obter_uuid_proprietario para bypassar RLS de usuarios)
DROP POLICY IF EXISTS "dependentes_veem_cartoes_tipo_conta_permitido" ON cartoes_credito;
DROP POLICY IF EXISTS "dependentes_veem_cartoes_com_permissao" ON cartoes_credito;
DROP POLICY IF EXISTS "dependentes_veem_cartoes_segura" ON cartoes_credito;
CREATE POLICY "dependentes_veem_cartoes_segura"
ON cartoes_credito FOR SELECT
USING (
  usuario_id = obter_uuid_proprietario()
);

-- 7.4 Atualizar default do campo permissoes
ALTER TABLE usuarios_dependentes 
ALTER COLUMN permissoes 
SET DEFAULT '{
  "nivel_acesso": "basico",
  "tipos_conta_permitidos": ["pessoal", "pj"],
  "pode_ver_relatorios": true,
  "pode_ver_dados_admin": true,
  "pode_convidar_membros": false,
  "pode_criar_transacoes": true,
  "pode_gerenciar_contas": false,
  "pode_editar_transacoes": true,
  "pode_gerenciar_cartoes": false,
  "pode_deletar_transacoes": false,
  "pode_ver_outros_membros": false
}'::jsonb;

-- =====================================================
-- FUNÇÕES FALTANTES - ADICIONADAS EM 13/01/2026
-- =====================================================

-- Função: check_team_access
-- Descrição: Verifica se o usuário autenticado tem acesso ao recurso (como owner ou membro ativo)
DROP FUNCTION IF EXISTS check_team_access(integer);
CREATE OR REPLACE FUNCTION public.check_team_access(resource_user_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    current_auth_id UUID;
    is_owner BOOLEAN;
    is_member BOOLEAN;
BEGIN
    current_auth_id := auth.uid();
    IF current_auth_id IS NULL THEN RETURN FALSE; END IF;
    SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = resource_user_id AND auth_user = current_auth_id) INTO is_owner;
    IF is_owner THEN RETURN TRUE; END IF;
    SELECT EXISTS (SELECT 1 FROM public.usuarios_dependentes ud WHERE ud.usuario_principal_id = resource_user_id AND ud.auth_user_id = current_auth_id AND ud.status = 'ativo' AND ud.convite_status = 'aceito') INTO is_member;
    RETURN is_member;
END;
$function$;

COMMENT ON FUNCTION check_team_access(integer) IS 'Verifica se o usuário autenticado tem acesso ao recurso (como owner ou membro ativo da equipe)';

-- Função: dependente_tem_acesso_tipo_conta
-- Descrição: Verifica se o dependente tem acesso ao tipo de conta especificado
DROP FUNCTION IF EXISTS dependente_tem_acesso_tipo_conta(text);
CREATE OR REPLACE FUNCTION public.dependente_tem_acesso_tipo_conta(p_tipo_conta text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tipos_permitidos jsonb;
BEGIN
  SELECT permissoes->'tipos_conta_permitidos'
  INTO v_tipos_permitidos
  FROM usuarios_dependentes
  WHERE auth_user_id = auth.uid()
    AND status = 'ativo';
  
  IF v_tipos_permitidos IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_tipos_permitidos @> to_jsonb(p_tipo_conta);
END;
$function$;

COMMENT ON FUNCTION dependente_tem_acesso_tipo_conta(text) IS 'Verifica se o dependente autenticado tem acesso ao tipo de conta especificado (pessoal ou pj)';

-- Função: get_usuario_id_from_auth
-- Descrição: Retorna o ID do usuário (integer) a partir do auth.uid() (UUID)
DROP FUNCTION IF EXISTS get_usuario_id_from_auth();
CREATE OR REPLACE FUNCTION public.get_usuario_id_from_auth()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v_usuario_id INTEGER;
BEGIN
    SELECT id INTO v_usuario_id FROM usuarios WHERE auth_user = auth.uid();
    RETURN v_usuario_id;
END;
$function$;

COMMENT ON FUNCTION get_usuario_id_from_auth() IS 'Retorna o ID do usuário (integer) a partir do auth.uid() (UUID)';

-- Função: handle_new_user_invite_link
-- Descrição: Trigger function para vincular auth_user_id ao dependente quando aceitar convite
DROP FUNCTION IF EXISTS handle_new_user_invite_link();
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.usuarios_dependentes
    SET auth_user_id = NEW.id, convite_status = 'aceito', avatar_url = NEW.raw_user_meta_data->>'avatar_url', data_ultima_modificacao = now()
    WHERE email = NEW.email AND convite_status = 'pendente';
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION handle_new_user_invite_link() IS 'Trigger function para vincular auth_user_id ao dependente quando aceitar convite via link';

-- Função: link_auth_to_dependente
-- Descrição: Trigger function para vincular auth_user_id ao dependente (versão simplificada)
DROP FUNCTION IF EXISTS link_auth_to_dependente();
CREATE OR REPLACE FUNCTION public.link_auth_to_dependente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.usuarios_dependentes
  SET auth_user_id = NEW.id, convite_status = 'aceito'
  WHERE email = NEW.email AND convite_status = 'pendente' AND auth_user_id IS NULL;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION link_auth_to_dependente() IS 'Trigger function para vincular auth_user_id ao dependente quando criar conta';

-- Função: update_contas_bancarias_updated_at
-- Descrição: Trigger function para atualizar updated_at automaticamente
DROP FUNCTION IF EXISTS update_contas_bancarias_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_contas_bancarias_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION update_contas_bancarias_updated_at() IS 'Trigger function para atualizar updated_at automaticamente na tabela contas_bancarias';

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Dependentes existentes mantêm acesso total (["pessoal", "pj"])
-- ✅ Novas policies filtram por tipo_conta
-- ✅ Policies antigas continuam funcionando (não foram removidas)
-- ✅ Principal pode editar tipos_conta_permitidos via frontend
-- ✅ Nada quebra - implementação 100% retrocompatível
-- =====================================================

-- =====================================================
-- CORREÇÕES DE SEGURANÇA: search_path em funções SECURITY DEFINER
-- Data: 14/01/2026
-- Problema: Funções sem search_path são vulneráveis a schema poisoning
-- Solução: Adicionar SET search_path = public, pg_temp em todas as funções
-- Total: 24 funções corrigidas
-- =====================================================

-- NOTA: Usando blocos DO para ignorar erros se funções não existirem
-- Isso permite que o script rode tanto em bancos novos quanto em bancos existentes

-- 1. Funções de Pagamento de Cartão
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION processar_pagamento_fatura_segura(uuid, uuid, text, date, text) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION processar_pagamento_fatura_parcial(uuid, uuid, date, text, integer[]) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 2. Funções de Sistema
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION get_system_settings() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION sync_user_id_from_auth() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION get_usuario_id_from_auth() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION update_contas_bancarias_updated_at() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 3. Funções de Investimentos
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION calculate_fixed_income_price(numeric, numeric, date, date) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION calculate_fixed_income_price(date, numeric, numeric) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 4. Funções de Convite
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION handle_public_user_invite_link() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION handle_new_user_invite_link() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION link_auth_to_dependente() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 5. Funções de Plano
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION auto_set_plano_id() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 6. Funções Admin
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_reset_user_password(integer, text) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_create_user_with_auth(text, text, text, text, integer, boolean) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_create_auth_for_user(integer, text) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_list_plans() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 7. Funções admin_create_plan (3 versões)
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer, boolean) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_create_plan(character varying, character varying, numeric, text, text, text, boolean, integer, boolean, boolean) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 8. Funções admin_update_plan (3 versões)
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer, boolean) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION admin_update_plan(integer, character varying, character varying, numeric, text, text, text, boolean, integer, boolean, integer, boolean, boolean) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 9. Funções de Acesso
DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION check_team_access() SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER FUNCTION check_team_access(integer) SET search_path = public, pg_temp';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- =====================================================
-- CORREÇÃO DE POLICY RLS: investment_assets
-- =====================================================

-- Remover todas as policies permissivas de INSERT que permitem qualquer usuário criar ativos
DROP POLICY IF EXISTS "Usuários podem criar ativos" ON investment_assets;
DROP POLICY IF EXISTS "Usuarios podem inserir ativos" ON investment_assets; -- WITH CHECK(true) irrestrito

-- Criar policy restritiva: apenas service_role pode criar ativos
-- (investment_assets é uma tabela de ativos GLOBAIS do mercado, não por usuário)
DROP POLICY IF EXISTS "Apenas service role pode criar ativos" ON investment_assets;
CREATE POLICY "Apenas service role pode criar ativos"
ON investment_assets
FOR INSERT
TO service_role
WITH CHECK (true);

-- Permitir usuários autenticados criarem ativos manuais
DROP POLICY IF EXISTS "Usuarios podem criar ativos manuais" ON investment_assets;
CREATE POLICY "Usuarios podem criar ativos manuais"
ON investment_assets
FOR INSERT
TO authenticated
WITH CHECK (source = 'manual');

-- =====================================================
-- CORREÇÕES ADICIONAIS DE RLS POLICIES
-- Data: 14/01/2026
-- Problema: Policies com USING(true) e WITH CHECK(true) são muito permissivas
-- Solução: Restringir policies para service_role apenas
-- =====================================================

-- 1. Corrigir policy de CDI_RATES
-- Problema: "Only service_role can modify CDI rates" permite acesso irrestrito
-- Solução: Especificar role service_role explicitamente
DROP POLICY IF EXISTS "Only service_role can modify CDI rates" ON cdi_rates;
CREATE POLICY "Only service_role can modify CDI rates" ON cdi_rates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Corrigir policy de INVESTMENT_ASSETS (DELETE)
-- Problema: "Apenas service role pode deletar ativos" permite acesso irrestrito
-- Solução: Especificar role service_role explicitamente
DROP POLICY IF EXISTS "Apenas service role pode deletar ativos" ON investment_assets;
CREATE POLICY "Apenas service role pode deletar ativos" ON investment_assets
FOR DELETE
TO service_role
USING (true);

-- 3. Corrigir policy de INVESTMENT_ASSETS (ALL)
-- Problema: "Service role pode modificar todos ativos" permite acesso irrestrito
-- Solução: Especificar role service_role explicitamente
DROP POLICY IF EXISTS "Service role pode modificar todos ativos" ON investment_assets;
CREATE POLICY "Service role pode modificar todos ativos" ON investment_assets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- AVISOS QUE REQUEREM CONFIGURAÇÃO MANUAL NO DASHBOARD
-- =====================================================
-- 
-- ⚠️ auth_otp_long_expiry:
--    Dashboard → Authentication → Email Auth → OTP Expiry
--    Reduzir para menos de 1 hora (recomendado: 15-30 minutos)
--
-- ⚠️ auth_leaked_password_protection:
--    Dashboard → Authentication → Policies
--    Ativar "Leaked Password Protection"
--
-- ⚠️ vulnerable_postgres_version:
--    Dashboard → Settings → Infrastructure
--    Fazer upgrade do Postgres para versão mais recente
--
-- =====================================================

-- =====================================================
-- FIM DAS CORREÇÕES DE SEGURANÇA
-- ✅ 24 funções protegidas contra schema poisoning
-- ✅ 3 policies RLS corrigidas (cdi_rates, investment_assets)
-- ✅ Todas as funções SECURITY DEFINER agora têm search_path fixado
-- ✅ Policies agora especificam roles explicitamente
-- =====================================================

-- =====================================================
-- MÓDULO DE PROVENTOS COM VINCULAÇÃO A CONTAS BANCÁRIAS
-- Data: 16/01/2026
-- Descrição: Permite vincular dividendos a contas bancárias e criar
--            transações de receita automaticamente quando proventos
--            são creditados na conta
-- =====================================================

-- 1. Adicionar campos para vincular dividendos a contas bancárias
ALTER TABLE investment_dividends
ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES contas_bancarias(id) ON DELETE SET NULL;

-- 2. Adicionar coluna transacao_id para rastrear a transação de receita criada
ALTER TABLE investment_dividends
ADD COLUMN IF NOT EXISTS transacao_id integer REFERENCES transacoes(id) ON DELETE SET NULL;

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_dividends_conta_id ON investment_dividends(conta_id);
CREATE INDEX IF NOT EXISTS idx_dividends_transacao_id ON investment_dividends(transacao_id);

-- 4. Comentários
COMMENT ON COLUMN investment_dividends.conta_id IS 'Conta bancária onde o provento foi creditado (opcional)';
COMMENT ON COLUMN investment_dividends.transacao_id IS 'ID da transação de receita criada automaticamente quando o provento é vinculado a uma conta';

-- =====================================================
-- FIM DO MÓDULO DE PROVENTOS
-- ✅ Proventos podem ser vinculados a contas bancárias
-- ✅ Transações de receita criadas automaticamente
-- ✅ Categoria padrão "Proventos de Investimentos" utilizada
-- ✅ Saldo da conta atualizado automaticamente
-- =====================================================

-- =====================================================
-- MÓDULO: GESTÃO DE USUÁRIOS DEPENDENTES (ADMIN)
-- Data: 19/01/2026
-- Descrição: Funções RPC para gerenciar usuários dependentes no painel admin
-- =====================================================

-- =====================================================
-- FUNÇÃO 1: admin_get_dependentes_stats
-- =====================================================
-- Retorna estatísticas globais de usuários dependentes
-- Apenas para administradores

CREATE OR REPLACE FUNCTION admin_get_dependentes_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  SELECT json_build_object(
    'total_dependentes', COUNT(*),
    'dependentes_ativos', COUNT(*) FILTER (WHERE status = 'ativo'),
    'dependentes_inativos', COUNT(*) FILTER (WHERE status = 'inativo'),
    'convites_pendentes', COUNT(*) FILTER (WHERE convite_status = 'pendente'),
    'convites_aceitos', COUNT(*) FILTER (WHERE convite_status = 'aceito'),
    'com_login', COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL),
    'sem_login', COUNT(*) FILTER (WHERE auth_user_id IS NULL)
  ) INTO v_result
  FROM usuarios_dependentes;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION admin_get_dependentes_stats() IS 'Retorna estatísticas globais de usuários dependentes para o painel admin. Criada em 19/01/2026.';

-- =====================================================
-- FUNÇÃO 2: admin_list_dependentes
-- =====================================================
-- Lista todos os dependentes com filtros e paginação
-- Retorna dados do dependente + dados do usuário principal

CREATE OR REPLACE FUNCTION admin_list_dependentes(
  p_search TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_convite_status TEXT[] DEFAULT NULL,
  p_has_login BOOLEAN DEFAULT NULL,
  p_usuario_principal_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id INTEGER,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  usuario_principal_id INTEGER,
  status TEXT,
  convite_status TEXT,
  auth_user_id UUID,
  data_criacao TIMESTAMPTZ,
  data_ultima_modificacao TIMESTAMPTZ,
  observacoes TEXT,
  permissoes JSONB,
  avatar_url TEXT,
  convite_enviado_em TIMESTAMPTZ,
  principal_nome TEXT,
  principal_email TEXT,
  principal_plano TEXT,
  principal_plano_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  RETURN QUERY
  SELECT 
    ud.id,
    ud.nome::TEXT,
    ud.email::TEXT,
    ud.telefone::TEXT,
    ud.usuario_principal_id,
    ud.status::TEXT,
    ud.convite_status::TEXT,
    ud.auth_user_id,
    ud.data_criacao,
    ud.data_ultima_modificacao,
    ud.observacoes::TEXT,
    ud.permissoes,
    ud.avatar_url::TEXT,
    ud.convite_enviado_em,
    u.nome::TEXT as principal_nome,
    u.email::TEXT as principal_email,
    -- Fix: usa nome do plano de planos_sistema (nome real), fallback para campo legado u.plano
    COALESCE(ps.nome, u.plano)::TEXT as principal_plano,
    u.plano_id as principal_plano_id
  FROM usuarios_dependentes ud
  LEFT JOIN usuarios u ON ud.usuario_principal_id = u.id
  LEFT JOIN planos_sistema ps ON ps.id = u.plano_id
  WHERE
    -- Filtro de busca (nome ou email)
    (p_search IS NULL OR 
     LOWER(ud.nome) LIKE LOWER('%' || p_search || '%') OR
     LOWER(ud.email) LIKE LOWER('%' || p_search || '%'))
    -- Filtro de status
    AND (p_status IS NULL OR ud.status = ANY(p_status))
    -- Filtro de convite
    AND (p_convite_status IS NULL OR ud.convite_status = ANY(p_convite_status))
    -- Filtro de login
    AND (p_has_login IS NULL OR 
         (p_has_login = true AND ud.auth_user_id IS NOT NULL) OR
         (p_has_login = false AND ud.auth_user_id IS NULL))
    -- Filtro de usuário principal
    AND (p_usuario_principal_id IS NULL OR ud.usuario_principal_id = p_usuario_principal_id)
  ORDER BY ud.data_criacao DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION admin_list_dependentes IS 'Lista todos os usuários dependentes com filtros e paginação. Retorna dados do dependente + dados do usuário principal (com nome real do plano via planos_sistema). Criada em 19/01/2026. Fix plano_nome em 26/02/2026.';

-- =====================================================
-- FUNÇÃO 3: admin_update_dependente
-- =====================================================
-- Atualiza dados de um dependente
-- Permite atualizar: nome, email, telefone, status, permissões

CREATE OR REPLACE FUNCTION admin_update_dependente(
  p_dependente_id INTEGER,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_permissoes JSONB DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Verificar se dependente existe
  IF NOT EXISTS (SELECT 1 FROM usuarios_dependentes WHERE id = p_dependente_id) THEN
    RAISE EXCEPTION 'Dependente não encontrado.';
  END IF;
  
  -- Atualizar apenas campos fornecidos
  UPDATE usuarios_dependentes
  SET
    nome = COALESCE(p_nome, nome),
    email = COALESCE(p_email, email),
    telefone = COALESCE(p_telefone, telefone),
    status = COALESCE(p_status, status),
    permissoes = COALESCE(p_permissoes, permissoes),
    observacoes = COALESCE(p_observacoes, observacoes),
    data_ultima_modificacao = NOW()
  WHERE id = p_dependente_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Dependente atualizado com sucesso'
  );
END;
$$;

COMMENT ON FUNCTION admin_update_dependente(INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Atualiza dados de um usuário dependente. Admin pode atualizar qualquer dependente. Criada em 19/01/2026.';

-- =====================================================
-- FUNÇÃO 4: admin_delete_dependente
-- =====================================================
-- Exclui um dependente do sistema
-- Opcionalmente remove da autenticação (auth.users)
-- Remove histórico de chat do WhatsApp/N8N

CREATE OR REPLACE FUNCTION admin_delete_dependente(
  p_dependente_id INTEGER,
  p_delete_auth BOOLEAN DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auth_user_id UUID;
  v_telefone TEXT;
  v_session_id TEXT;
  v_chat_deleted INTEGER := 0;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Buscar dados do dependente
  SELECT auth_user_id, telefone INTO v_auth_user_id, v_telefone
  FROM usuarios_dependentes
  WHERE id = p_dependente_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dependente não encontrado.';
  END IF;
  
  -- Deletar histórico de chat do WhatsApp/N8N se telefone existir
  IF v_telefone IS NOT NULL AND v_telefone != '' THEN
    v_session_id := v_telefone || '@s.whatsapp.net';
    
    DELETE FROM n8n_chat_histories_corporation 
    WHERE session_id = v_session_id;
    
    GET DIAGNOSTICS v_chat_deleted = ROW_COUNT;
  END IF;
  
  -- Deletar dependente
  DELETE FROM usuarios_dependentes WHERE id = p_dependente_id;
  
  -- Deletar da autenticação se solicitado
  IF p_delete_auth AND v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Dependente excluído com sucesso',
    'chat_messages_deleted', v_chat_deleted
  );
END;
$$;

COMMENT ON FUNCTION admin_delete_dependente(INTEGER, BOOLEAN) IS 'Exclui um usuário dependente. Opcionalmente remove de auth.users. Sempre remove histórico de chat do WhatsApp/N8N. Criada em 19/01/2026.';

-- =====================================================
-- FUNÇÃO 5: admin_reset_dependente_password
-- =====================================================
-- Reseta a senha de um dependente que tem conta de login
-- Apenas funciona se o dependente tiver auth_user_id

CREATE OR REPLACE FUNCTION admin_reset_dependente_password(
  p_dependente_id INTEGER,
  p_new_password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auth_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Buscar auth_user_id do dependente
  SELECT auth_user_id INTO v_auth_user_id
  FROM usuarios_dependentes
  WHERE id = p_dependente_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dependente não encontrado.';
  END IF;
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Dependente não possui conta de login. Não é possível resetar senha.';
  END IF;
  
  -- Criptografar nova senha
  SELECT extensions.crypt(p_new_password, extensions.gen_salt('bf')) INTO v_encrypted_password;
  
  -- Atualizar senha no auth.users
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_password,
    updated_at = NOW()
  WHERE id = v_auth_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Senha resetada com sucesso'
  );
END;
$$;

COMMENT ON FUNCTION admin_reset_dependente_password(INTEGER, TEXT) IS 'Reseta a senha de um usuário dependente que possui conta de login. Criada em 19/01/2026.';

-- =====================================================
-- FIM DO MÓDULO DE GESTÃO DE DEPENDENTES
-- ✅ 5 funções RPC criadas para administração de dependentes
-- ✅ Estatísticas, listagem, atualização, exclusão e reset de senha
-- ✅ Todas as funções com validação de admin (is_user_admin)
-- ✅ Exclusão inclui limpeza de histórico de chat
-- =====================================================

-- =====================================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- Data: 21/01/2026
-- Auditoria completa de segurança do Supabase
-- =====================================================

-- =====================================================
-- 1. PROTEÇÃO DO CAMPO is_admin (CRÍTICO)
-- =====================================================
-- VULNERABILIDADE: Qualquer usuário autenticado podia se tornar admin
-- através de um UPDATE no próprio registro (is_admin = true)
-- CORREÇÃO: Trigger que impede alteração do campo is_admin por não-admins

CREATE OR REPLACE FUNCTION prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Impedir que usuários não-admin alterem is_admin
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Verificar se o usuário atual é admin
    IF NOT EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user = auth.uid() 
      AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o status de admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION prevent_admin_escalation() IS 'Protege o campo is_admin contra escalação de privilégios. Apenas admins podem alterar is_admin. Criada em 21/01/2026.';

-- Criar trigger para proteger is_admin
DROP TRIGGER IF EXISTS protect_admin_field ON usuarios;
CREATE TRIGGER protect_admin_field
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_escalation();

-- =====================================================
-- 2. CORRIGIR SEARCH_PATH DAS FUNÇÕES (ALTA)
-- =====================================================
-- VULNERABILIDADE: Funções sem search_path definido são vulneráveis
-- a SQL Injection via search_path manipulation
-- CORREÇÃO: Definir search_path explicitamente

-- Usar DO blocks para verificar se a função existe antes de alterar
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prevent_delete_paid_lancamentos') THEN
        ALTER FUNCTION prevent_delete_paid_lancamentos() SET search_path = public, pg_temp;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'atualizar_saldo_conta') THEN
        ALTER FUNCTION atualizar_saldo_conta() SET search_path = public, pg_temp;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_system_settings') THEN
        ALTER FUNCTION get_system_settings() SET search_path = public, pg_temp;
    END IF;
END $$;

-- =====================================================
-- 3. PERFORMANCE: REMOVER ÍNDICE DUPLICADO
-- =====================================================
-- PROBLEMA: Índices duplicados desperdiçam espaço e degradam performance
-- CORREÇÃO: Manter apenas um índice

DROP INDEX IF EXISTS idx_categorias_usuario;
-- Mantém apenas idx_categoria_trasacoes_usuario_id

-- =====================================================
-- 4. NOTAS DE SEGURANÇA ADICIONAIS
-- =====================================================
-- 
-- PRÓXIMOS PASSOS MANUAIS (não podem ser feitos via SQL):
-- 
-- [ ] Habilitar "Leaked Password Protection" no Supabase Dashboard
--     Authentication > Settings > Password Strength
--     Ativar verificação contra HaveIBeenPwned.org
-- 
-- [ ] Otimizar políticas RLS para performance
--     Substituir auth.uid() por (SELECT auth.uid()) em todas as políticas
--     Ver SECURITY_AUDIT_REPORT.md para lista completa
-- 
-- [ ] Configurar alertas de segurança
--     Monitorar tentativas de escalação de privilégios
--     Alertas para múltiplas tentativas de login falhas
-- 
-- REFERÊNCIAS:
-- - SECURITY_AUDIT_REPORT.md: Relatório completo de auditoria
-- - SECURITY_FIX.sql: Script original de correção
-- - Supabase Docs: https://supabase.com/docs/guides/database/database-linter
-- 
-- =====================================================
-- FIM DAS CORREÇÕES DE SEGURANÇA
-- ✅ Proteção contra escalação de privilégios (admin)
-- ✅ Correção de search_path em 3 funções vulneráveis
-- ✅ Remoção de índice duplicado
-- ✅ Documentação de próximos passos manuais
-- =====================================================

-- =====================================================
-- CORREÇÃO: View de Investimentos - Adicionar asset_id
-- Data: 21/01/2026
-- Bug: Erro ao criar investimento - "column v_positions_detailed.asset_id does not exist"
-- =====================================================

-- Dropar views em cascata e recriar com asset_id
DROP VIEW IF EXISTS v_portfolio_summary CASCADE;
DROP VIEW IF EXISTS v_positions_detailed CASCADE;

-- Recriar v_positions_detailed com asset_id
CREATE VIEW v_positions_detailed AS
SELECT 
  p.id,
  p.usuario_id,
  p.asset_id,  -- ✅ ADICIONADO - Estava faltando
  p.tipo_conta,
  p.quantidade,
  p.preco_medio,
  p.data_compra,
  p.is_manual_price,
  p.manual_price,
  p.observacao,
  p.yield_percentage,
  p.use_manual_tax,
  p.manual_ir,
  p.manual_iof,
  a.ticker,
  a.name AS asset_name,
  a.type AS asset_type,
  a.current_price,
  a.previous_close,
  a.last_updated AS price_last_updated,
  a.source AS price_source,
  -- Preço calculado efetivo (manual_price ou calculado ou current_price)
  COALESCE(
    p.manual_price,
    CASE
      WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
      THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
      ELSE a.current_price
    END,
    p.preco_medio
  ) AS calculated_price,
  p.quantidade * p.preco_medio AS valor_investido,
  p.quantidade * COALESCE(
    p.manual_price,
    CASE
      WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
      THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
      ELSE a.current_price
    END,
    p.preco_medio
  ) AS valor_atual,
  p.quantidade * COALESCE(
    p.manual_price,
    CASE
      WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
      THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
      ELSE a.current_price
    END,
    p.preco_medio
  ) - p.quantidade * p.preco_medio AS lucro_prejuizo,
  CASE
    WHEN p.preco_medio > 0 THEN (
      COALESCE(
        p.manual_price,
        CASE
          WHEN a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL 
          THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
          ELSE a.current_price
        END,
        p.preco_medio
      ) - p.preco_medio
    ) / p.preco_medio * 100
    ELSE 0
  END AS rentabilidade_percentual,
  p.created_at,
  p.updated_at
FROM investment_positions p
JOIN investment_assets a ON p.asset_id = a.id
WHERE a.is_active = true;

COMMENT ON VIEW v_positions_detailed IS 'View detalhada de posições de investimento com cálculo de valores atuais e rentabilidade. Usa SECURITY DEFINER (padrão) para ignorar RLS - seguro porque filtra por usuario_id.';

-- Recriar v_portfolio_summary
CREATE VIEW v_portfolio_summary AS
SELECT 
  usuario_id,
  tipo_conta,
  COUNT(*) AS total_ativos,
  SUM(valor_investido) AS valor_investido,
  SUM(valor_atual) AS valor_atual,
  SUM(lucro_prejuizo) AS lucro_prejuizo,
  CASE 
    WHEN SUM(valor_investido) > 0 
    THEN (SUM(valor_atual) - SUM(valor_investido)) / SUM(valor_investido) * 100
    ELSE 0
  END AS rentabilidade_percentual
FROM v_positions_detailed
GROUP BY usuario_id, tipo_conta;

COMMENT ON VIEW v_portfolio_summary IS 'View resumo do portfolio por usuário e tipo de conta. Usa SECURITY DEFINER (padrão) para ignorar RLS - seguro porque agrupa por usuario_id.';

-- =====================================================
-- FIM DA CORREÇÃO DE INVESTIMENTOS
-- ✅ View v_positions_detailed recriada com asset_id
-- ✅ View v_portfolio_summary recriada
-- ✅ Erro ao criar investimento corrigido
-- ✅ SECURITY INVOKER removido (causava dados zerados no frontend)
-- =====================================================

-- =====================================================
-- ATUALIZAÇÃO: 31/01/2026 - ESTATÍSTICAS DO ADMIN
-- =====================================================
-- Melhorias na função admin_get_system_stats() para incluir:
-- - Usuários com plano vencido (data_final_plano < hoje)
-- - Usuários ativos válidos (com plano válido)
-- - Receita calculada apenas de usuários com plano válido
-- - Taxa de conversão baseada em usuários válidos
-- =====================================================

-- Atualizar função de estatísticas do admin com métricas de planos vencidos
CREATE OR REPLACE FUNCTION public.admin_get_system_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_usuarios_por_plano json;
  v_receita_mensal numeric;
  v_receita_anual_estimada numeric;
  v_usuarios_free integer;
  v_usuarios_pagos integer;
  v_usuarios_plano_vencido integer;
  v_usuarios_ativos_validos integer;
  v_taxa_conversao numeric;
  v_usuarios_ativos integer;
BEGIN
  -- Verificar se é admin
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  -- Contar usuarios ativos
  SELECT COUNT(*) INTO v_usuarios_ativos
  FROM usuarios
  WHERE status = 'ativo';
  
  -- Contar usuarios com plano vencido (status ativo mas data_final_plano < hoje)
  SELECT COUNT(*) INTO v_usuarios_plano_vencido
  FROM usuarios
  WHERE status = 'ativo' 
    AND data_final_plano IS NOT NULL 
    AND data_final_plano < CURRENT_DATE;
  
  -- Contar usuarios realmente ativos (status ativo E plano valido)
  SELECT COUNT(*) INTO v_usuarios_ativos_validos
  FROM usuarios
  WHERE status = 'ativo' 
    AND (data_final_plano IS NULL OR data_final_plano >= CURRENT_DATE);
  
  -- Buscar usuários por plano (apenas ativos)
  SELECT json_agg(
    json_build_object(
      'plano', plano_nome,
      'count', user_count
    )
  )
  INTO v_usuarios_por_plano
  FROM (
    SELECT 
      COALESCE(p.nome, 'Sem Plano') as plano_nome,
      COUNT(u.id) as user_count
    FROM usuarios u
    LEFT JOIN planos_sistema p ON u.plano_id = p.id
    WHERE u.status = 'ativo'
    GROUP BY p.nome
    ORDER BY COUNT(u.id) DESC
  ) subquery;
  
  -- Calcular receita mensal estimada (apenas usuarios com plano valido)
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.tipo_periodo = 'mensal' THEN p.valor
      WHEN p.tipo_periodo = 'trimestral' THEN p.valor / 3
      WHEN p.tipo_periodo = 'semestral' THEN p.valor / 6
      WHEN p.tipo_periodo = 'anual' THEN p.valor / 12
      ELSE 0
    END
  ), 0)
  INTO v_receita_mensal
  FROM usuarios u
  INNER JOIN planos_sistema p ON u.plano_id = p.id
  WHERE u.status = 'ativo' 
    AND p.tipo_periodo != 'free'
    AND (u.data_final_plano IS NULL OR u.data_final_plano >= CURRENT_DATE);
  
  -- Calcular receita anual estimada
  v_receita_anual_estimada := v_receita_mensal * 12;
  
  -- Contar usuários free (incluindo NULL)
  SELECT COUNT(*) INTO v_usuarios_free
  FROM usuarios u
  LEFT JOIN planos_sistema p ON u.plano_id = p.id
  WHERE u.status = 'ativo' 
    AND (p.tipo_periodo = 'free' OR p.tipo_periodo IS NULL);
  
  -- Contar usuários pagos (com plano valido)
  SELECT COUNT(*) INTO v_usuarios_pagos
  FROM usuarios u
  INNER JOIN planos_sistema p ON u.plano_id = p.id
  WHERE u.status = 'ativo' 
    AND p.tipo_periodo IS NOT NULL 
    AND p.tipo_periodo != 'free'
    AND (u.data_final_plano IS NULL OR u.data_final_plano >= CURRENT_DATE);
  
  -- Calcular taxa de conversão (baseado em usuarios ativos validos)
  IF v_usuarios_ativos_validos > 0 THEN
    v_taxa_conversao := (v_usuarios_pagos::numeric / v_usuarios_ativos_validos::numeric) * 100;
  ELSE
    v_taxa_conversao := 0;
  END IF;
  
  -- Montar resultado completo
  SELECT json_build_object(
    'total_usuarios', (SELECT COUNT(*) FROM usuarios),
    'usuarios_ativos', v_usuarios_ativos,
    'usuarios_ativos_validos', v_usuarios_ativos_validos,
    'usuarios_plano_vencido', v_usuarios_plano_vencido,
    'usuarios_inativos', (SELECT COUNT(*) FROM usuarios WHERE status != 'ativo'),
    'usuarios_com_senha', (SELECT COUNT(*) FROM usuarios WHERE has_password = true),
    'usuarios_free', v_usuarios_free,
    'usuarios_pagos', v_usuarios_pagos,
    'taxa_conversao', ROUND(v_taxa_conversao, 2),
    'total_planos', (SELECT COUNT(*) FROM planos_sistema),
    'planos_ativos', (SELECT COUNT(*) FROM planos_sistema WHERE ativo = true),
    'receita_mensal_estimada', v_receita_mensal,
    'receita_anual_estimada', v_receita_anual_estimada,
    'usuarios_por_plano', COALESCE(v_usuarios_por_plano, '[]'::json)
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION admin_get_system_stats() IS 'Retorna estatísticas completas do sistema para o painel admin. Inclui métricas de usuários ativos válidos, planos vencidos, receita real baseada em planos válidos e taxa de conversão. Atualizado em 31/01/2026.';

-- =====================================================
-- FIM DA ATUALIZAÇÃO DE ESTATÍSTICAS DO ADMIN
-- ✅ Função admin_get_system_stats() atualizada
-- ✅ Métricas de planos vencidos adicionadas
-- ✅ Receita calculada apenas de usuários com plano válido
-- ✅ Taxa de conversão baseada em usuários válidos
-- =====================================================

-- =====================================================
-- CORREÇÕES DE SEGURANÇA: REVOKE EXECUTE de anon em RPCs admin
-- Data: 09/02/2026
-- Problema: Funções admin podem ser invocadas por usuários anônimos via supabase.rpc()
-- Solução: Revogar EXECUTE de anon e public (defesa em profundidade)
-- Nota: Todas já validam is_user_admin() internamente, mas REVOKE adiciona camada extra
-- =====================================================

-- 1. Revogar EXECUTE de anon nas RPCs admin com prefixo admin_
-- Usando blocos DO para ignorar erros se funções não existirem no banco do aluno

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_clear_chat_history(integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_auth_for_user(integer, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_user_with_auth(text, text, text, text, integer, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_dependente(integer, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_plan(integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_user(integer, boolean, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_dependentes_stats() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_system_stats() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_user_stats() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_dependentes(text, text[], text[], boolean, integer, integer, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_plans() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_users_v2(text, integer[], text[], boolean, boolean, date, date, boolean, integer, integer, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_reset_dependente_password(integer, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(integer, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_dependente(integer, text, text, text, text, jsonb, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_user(integer, text, text, text, integer, text, boolean, timestamptz, timestamptz) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(varchar, varchar, numeric, text, text, text, boolean, integer, boolean, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, varchar, varchar, numeric, text, text, text, boolean, integer, boolean, integer, boolean, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.reset_user_password_admin(integer, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_transaction_stats_admin() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_user_stats_admin() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_usuarios_for_admin() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 2. Revogar EXECUTE de anon em funções admin-like SEM prefixo admin_
-- Todas validam is_user_admin() internamente, mas REVOKE adiciona defesa em profundidade

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_user_admin(text, text, text, integer, boolean, text, uuid) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_admin(integer, boolean, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_admin_v2(integer, boolean, boolean) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_user_admin(integer, text, text, text, integer, boolean, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_user_admin(integer, text, text, text, integer, boolean, text, text, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_system_settings(text, text, text, text, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_system_settings(text, text, text, text, text, text, text, boolean, integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(integer, integer, text) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_financial_stats_admin() FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_usuarios_ultimos_dias(integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.clear_user_chat_history_admin(integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- 3. Revogar EXECUTE de anon em RPCs legadas sem ownership check
-- Nenhuma é chamada no código TS, mas podem ser invocadas via supabase.rpc() direto

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calcular_dias_restantes_free(integer) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_metas_usuario(integer, date) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calcular_progresso_meta(integer, date) FROM anon, public';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- =====================================================
-- FIM DAS CORREÇÕES DE SEGURANÇA (REVOKE)
-- ✅ 28 funções admin_ com REVOKE de anon
-- ✅ 11 funções admin-like sem prefixo com REVOKE de anon
-- ✅ 3 RPCs legadas com REVOKE de anon
-- ✅ Total: 42 funções protegidas contra invocação anônima
-- ✅ Usando blocos DO para compatibilidade com bancos novos e existentes
-- =====================================================

-- =====================================================
-- FEATURE: Bloqueio Imediato (dias_acesso_free = 0)
-- Data: 09/02/2026
-- Descrição: Permite configurar 0 dias de acesso free no admin.
--   Quando dias_free = 0, o usuário é bloqueado imediatamente após
--   o cadastro (data_final_plano = ontem), forçando contratação de plano.
-- Impacto: Apenas novos cadastros. Usuários existentes não são afetados.
-- =====================================================

-- Fix 26/02/2026: verifica dependentes ANTES de criar usuario em modo livre
CREATE OR REPLACE FUNCTION public.link_existing_user_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    usuario_existente RECORD;
    dependente_existente RECORD;
    config_restricao BOOLEAN;
    plano_free_id INTEGER;
    dias_free INTEGER;
BEGIN
    -- Log para debug
    RAISE LOG 'Trigger executado para email: %', NEW.email;
    
    -- Buscar configuração de restrição
    SELECT restringir_cadastro_usuarios_existentes, dias_acesso_free
    INTO config_restricao, dias_free
    FROM public.configuracoes_sistema 
    ORDER BY id DESC 
    LIMIT 1;
    
    -- Se não há configuração, usar padrão (true = restrito, 7 dias)
    IF config_restricao IS NULL THEN
        config_restricao := true;
    END IF;
    
    IF dias_free IS NULL THEN
        dias_free := 7;
    END IF;
    
    RAISE LOG 'Configuração: restrição=%, dias_free=%', config_restricao, dias_free;
    
    -- Buscar usuário existente com este email
    SELECT * INTO usuario_existente
    FROM public.usuarios 
    WHERE LOWER(email) = LOWER(NEW.email);
    
    IF FOUND THEN
        -- CASO 1: Email em usuarios → vincula auth_user (ex: usuário do WhatsApp fazendo login)
        RAISE LOG 'Usuário existente encontrado, vinculando auth_user';
        
        UPDATE public.usuarios 
        SET auth_user = NEW.id,
            has_password = true,
            data_ultimo_acesso = NOW(),
            ultima_atualizacao = NOW()
        WHERE LOWER(email) = LOWER(NEW.email);

        RETURN NEW;
    END IF;

    -- CASO 2: Email em usuarios_dependentes SEM auth_user_id vinculado → vincula
    -- Captura 'pendente' (fluxo normal) E 'aceito' sem auth (inserção direta/manual)
    -- IMPORTANTE: este check vem ANTES de criar novo usuario no modo livre
    SELECT * INTO dependente_existente
    FROM public.usuarios_dependentes
    WHERE LOWER(email) = LOWER(NEW.email)
      AND auth_user_id IS NULL
      AND convite_status IN ('pendente', 'aceito');

    IF FOUND THEN
        RAISE LOG 'Dependente sem auth vinculado (id=%, status=%), vinculando auth_user_id', 
                  dependente_existente.id, dependente_existente.convite_status;

        UPDATE public.usuarios_dependentes
        SET auth_user_id = NEW.id,
            convite_status = 'aceito',
            data_ultima_modificacao = NOW()
        WHERE id = dependente_existente.id;

        RAISE LOG 'Dependente vinculado com sucesso';
        RETURN NEW;
    END IF;

    IF NOT config_restricao THEN
        -- CASO 3: Modo livre E não é dependente → criar novo usuario
        RAISE LOG 'Modo livre: criando usuario automaticamente para email=%', NEW.email;

        SELECT id INTO plano_free_id
        FROM public.planos_sistema 
        WHERE tipo_periodo = 'free' AND ativo = true
        ORDER BY id
        LIMIT 1;
        
        -- Se não encontrou plano free, usar null
        IF plano_free_id IS NULL THEN
            RAISE WARNING 'Plano Free não encontrado, usuário será criado sem plano';
        END IF;
        
        -- Extrair dados do raw_user_meta_data se disponível
        DECLARE
            nome_usuario TEXT;
            telefone_usuario TEXT;
        BEGIN
            nome_usuario := COALESCE(
                NEW.raw_user_meta_data->>'name',
                NEW.raw_user_meta_data->>'full_name', 
                SPLIT_PART(NEW.email, '@', 1)
            );
            
            telefone_usuario := COALESCE(
                NEW.raw_user_meta_data->>'phone',
                NEW.raw_user_meta_data->>'phone_number',
                ''
            );
            
            -- Criar usuário na tabela usuarios
            -- NOTA: Quando dias_free = 0, data_final_plano = ontem (bloqueio imediato)
            INSERT INTO public.usuarios (
                nome,
                email,
                celular,
                aceite_termos,
                data_aceite_termos,
                auth_user,
                has_password,
                plano,
                plano_id,
                status,
                data_compra,
                data_final_plano,
                dias_restantes_free,
                data_ultimo_acesso,
                created_at,
                ultima_atualizacao
            ) VALUES (
                nome_usuario,
                NEW.email,
                telefone_usuario,
                true,
                NOW(),
                NEW.id,
                true,
                'Free',
                plano_free_id,
                'ativo',
                NOW(),
                CASE WHEN dias_free = 0 THEN NOW() - INTERVAL '1 day' ELSE NOW() + INTERVAL '1 day' * dias_free END,
                dias_free,
                NOW(),
                NOW(),
                NOW()
            );
            
            RAISE LOG 'Usuario criado: nome=%, email=%, plano_id=%, dias_free=%', nome_usuario, NEW.email, plano_free_id, dias_free;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erro ao criar usuario em modo livre: %', SQLERRM;
        END;

    ELSE
        -- CASO 4: Modo restrito E não é dependente → não fazer nada
        RAISE LOG 'Modo restrito: email % nao autorizado (nao existe em usuarios nem dependentes)', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- =====================================================
-- FIM DA FEATURE: Bloqueio Imediato
-- ✅ Função link_existing_user_on_signup atualizada em 26/02/2026
-- ✅ Fix: verifica dependentes ANTES de criar usuario (modo livre e restrito)
-- ✅ Suporta dias_free = 0 (data_final_plano = ontem)
-- ✅ Prioridade: usuarios → dependentes → criar novo (modo livre) → bloquear (restrito)
-- =====================================================

-- =====================================================
-- FIX 26/02/2026: Sync usuarios.plano com planos_sistema.nome
-- =====================================================
UPDATE public.usuarios u
SET plano = ps.nome
FROM public.planos_sistema ps
WHERE u.plano_id = ps.id
  AND u.plano IS DISTINCT FROM ps.nome;

CREATE OR REPLACE FUNCTION public.sync_plano_nome_on_plano_id_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.plano_id IS NOT NULL AND (OLD.plano_id IS DISTINCT FROM NEW.plano_id) THEN
    SELECT nome INTO NEW.plano FROM public.planos_sistema WHERE id = NEW.plano_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plano_nome ON public.usuarios;
CREATE TRIGGER trg_sync_plano_nome
  BEFORE UPDATE ON public.usuarios FOR EACH ROW
  EXECUTE FUNCTION public.sync_plano_nome_on_plano_id_change();

-- =====================================================
-- FEATURE: Conciliação OFX com toggle no painel admin
-- =====================================================
-- Adicionado em: 28/02/2026
-- Descrição: Reativa a funcionalidade de conciliação de extrato OFX
--   e adiciona toggle no painel admin para habilitar/desabilitar.
--   Por padrão ATIVADO (TRUE) para manter retrocompatibilidade.
-- =====================================================

-- 1. Adicionar coluna na tabela configuracoes_sistema
ALTER TABLE public.configuracoes_sistema 
ADD COLUMN IF NOT EXISTS habilitar_conciliacao_ofx BOOLEAN DEFAULT TRUE;

UPDATE public.configuracoes_sistema 
SET habilitar_conciliacao_ofx = TRUE 
WHERE id = 1 AND habilitar_conciliacao_ofx IS NULL;

-- 2. Recriar get_system_settings() com o novo campo
-- (necessário DROP + CREATE pois adicionamos coluna no RETURNS TABLE)
DROP FUNCTION IF EXISTS public.get_system_settings();

CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS TABLE(
  app_name text, app_logo_url text, primary_color text, secondary_color text,
  support_email text, habilitar_modo_pj boolean, restringir_cadastro_usuarios_existentes boolean,
  dias_acesso_free integer, show_sidebar_logo boolean, show_sidebar_name boolean,
  show_login_logo boolean, show_login_name boolean, logo_url_sidebar text,
  logo_url_login text, favicon_url text, pwa_icon_192_url text, pwa_icon_512_url text,
  apple_touch_icon_url text, idioma_padrao_planos text, moeda_padrao_planos text,
  habilitar_toggle_periodo_planos boolean, percentual_desconto_anual integer,
  whatsapp_suporte_url text, habilitar_conciliacao_ofx boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY SELECT
    c.company_name::TEXT, c.logo_url::TEXT, c.primary_color::TEXT, c.secondary_color::TEXT,
    c.support_email::TEXT, c.habilitar_modo_pj, c.restringir_cadastro_usuarios_existentes,
    c.dias_acesso_free, c.show_sidebar_logo, c.show_sidebar_name, c.show_login_logo,
    c.show_login_name, c.logo_url_sidebar::TEXT, c.logo_url_login::TEXT, c.favicon_url::TEXT,
    c.pwa_icon_192_url::TEXT, c.pwa_icon_512_url::TEXT, c.apple_touch_icon_url::TEXT,
    c.idioma_padrao_planos::TEXT, c.moeda_padrao_planos::TEXT, c.habilitar_toggle_periodo_planos,
    c.percentual_desconto_anual, c.whatsapp_suporte_url::TEXT, c.habilitar_conciliacao_ofx
  FROM configuracoes_sistema c WHERE c.id = 1;
END;
$$;

-- 3. Recriar update_system_settings() com o novo parâmetro
DROP FUNCTION IF EXISTS public.update_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.update_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_system_settings(
  p_app_name text, p_app_logo_url text, p_primary_color text, p_secondary_color text,
  p_support_email text,
  p_whatsapp_suporte_url text DEFAULT NULL, p_idioma_padrao_planos text DEFAULT NULL,
  p_moeda_padrao_planos text DEFAULT NULL, p_habilitar_toggle_periodo_planos boolean DEFAULT NULL,
  p_percentual_desconto_anual integer DEFAULT NULL, p_habilitar_conciliacao_ofx boolean DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  is_user_admin BOOLEAN := FALSE;
BEGIN
  current_user_id := auth.uid();
  SELECT usuarios.is_admin INTO is_user_admin FROM public.usuarios WHERE usuarios.auth_user = current_user_id;
  IF NOT is_user_admin THEN RAISE EXCEPTION 'Acesso negado: usuário não é administrador'; END IF;
  
  UPDATE public.configuracoes_sistema SET
    company_name = p_app_name, logo_url = p_app_logo_url,
    primary_color = p_primary_color, secondary_color = p_secondary_color,
    support_email = p_support_email, whatsapp_suporte_url = p_whatsapp_suporte_url,
    idioma_padrao_planos = COALESCE(p_idioma_padrao_planos, idioma_padrao_planos),
    moeda_padrao_planos = COALESCE(p_moeda_padrao_planos, moeda_padrao_planos),
    habilitar_toggle_periodo_planos = COALESCE(p_habilitar_toggle_periodo_planos, habilitar_toggle_periodo_planos),
    percentual_desconto_anual = COALESCE(p_percentual_desconto_anual, percentual_desconto_anual),
    habilitar_conciliacao_ofx = COALESCE(p_habilitar_conciliacao_ofx, habilitar_conciliacao_ofx),
    updated_at = NOW()
  WHERE id = 1;
  
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Configurações não encontradas'::TEXT; RETURN; END IF;
  RETURN QUERY SELECT true, 'Configurações atualizadas com sucesso'::TEXT;
END;
$$;

-- 4. GRANT de execução
GRANT EXECUTE ON FUNCTION public.get_system_settings() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, BOOLEAN) FROM anon;

-- =====================================================
-- FIM: Feature OFX com toggle admin
-- =====================================================

-- =====================================================
-- SECURITY FIXES (Março 2026)
-- Corrige alertas de segurança detectados pelo Supabase Advisor
-- =====================================================

-- =====================================================
-- FIX 1: admin_delete_user — search_path mutável
-- =====================================================
-- Problema: Função sem SET search_path fixo é vulnerável a schema poisoning.
-- Um atacante poderia criar um schema com funções de mesmo nome e interceptar
-- chamadas internas da função (ex: is_user_admin, n8n_chat_histories_corporation).
-- Solução: Adicionar SET search_path = public à função.
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id integer,
  p_delete_auth boolean DEFAULT false,
  p_delete_transactions boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_auth_user uuid;
  v_celular text;
  v_session_id text;
  v_chat_deleted integer := 0;
BEGIN
  -- Verificações de segurança
  IF NOT is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  IF p_user_id = (SELECT id FROM usuarios WHERE auth_user = auth.uid()) THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário com ID % não encontrado.', p_user_id;
  END IF;

  -- Buscar auth_user e celular do usuário
  SELECT auth_user, celular INTO v_auth_user, v_celular
  FROM usuarios
  WHERE id = p_user_id;

  -- 1. Deletar histórico de chat do WhatsApp/N8N
  IF v_celular IS NOT NULL AND v_celular != '' THEN
    v_session_id := v_celular || '@s.whatsapp.net';
    DELETE FROM n8n_chat_histories_corporation WHERE session_id = v_session_id;
    GET DIAGNOSTICS v_chat_deleted = ROW_COUNT;
  END IF;

  -- 2. Desabilitar trigger de lançamentos pagos
  -- OBRIGATÓRIO: as FKs lancamentos_futuros -> usuarios são CASCADE,
  -- então o DELETE usuarios dispara cascade e o trigger bloquearia.
  ALTER TABLE lancamentos_futuros DISABLE TRIGGER trigger_prevent_delete_paid_lancamentos;

  -- 3. Limpar referências cruzadas (FK circular)
  UPDATE transacoes SET lancamento_futuro_id = NULL WHERE usuario_id = p_user_id;
  UPDATE lancamentos_futuros SET transacao_id = NULL WHERE usuario_id = p_user_id;

  -- 4. Limpar referência de dividendos -> transações
  UPDATE investment_dividends SET transacao_id = NULL
  WHERE transacao_id IN (SELECT id FROM transacoes WHERE usuario_id = p_user_id);

  -- 5. Deletar na ordem correta (respeitar FKs RESTRICT)
  DELETE FROM transacoes WHERE usuario_id = p_user_id;
  DELETE FROM lancamentos_futuros WHERE usuario_id = p_user_id;
  DELETE FROM metas_orcamento WHERE usuario_id = p_user_id;
  DELETE FROM categoria_trasacoes WHERE usuario_id = p_user_id;

  -- 6. Deletar registros dependentes
  DELETE FROM preferencias_notificacao WHERE usuario_id = p_user_id;
  DELETE FROM consentimentos_usuarios WHERE usuario_id = p_user_id;
  DELETE FROM solicitacoes_lgpd WHERE usuario_id = p_user_id;
  DELETE FROM lembretes WHERE usuario_id = p_user_id;
  DELETE FROM google_calendar_integrations WHERE usuario_id = p_user_id;

  -- 7. Limpar auth_user_id em usuarios_dependentes onde este usuário é dependente
  -- (FK usuarios_dependentes_auth_user_id_fkey -> auth.users com ON DELETE NO ACTION)
  -- Deve ser feito ANTES de deletar auth.users e ANTES de deletar usuarios_dependentes
  IF v_auth_user IS NOT NULL THEN
    UPDATE usuarios_dependentes
    SET auth_user_id = NULL
    WHERE auth_user_id = v_auth_user;
  END IF;

  -- 8. Deletar registros onde o usuário é o PRINCIPAL (dono dos dependentes)
  DELETE FROM usuarios_dependentes WHERE usuario_principal_id = p_user_id;

  -- 9. Deletar investimentos
  DELETE FROM investment_dividends WHERE position_id IN (
    SELECT id FROM investment_positions WHERE user_id = p_user_id
  );
  DELETE FROM investment_positions WHERE user_id = p_user_id;

  -- 10. Deletar cartões e contas bancárias
  DELETE FROM cartoes_credito WHERE user_id = p_user_id;
  DELETE FROM contas_bancarias WHERE user_id = p_user_id;

  -- 11. Deletar o usuário
  DELETE FROM usuarios WHERE id = p_user_id;

  -- 12. Reabilitar trigger
  ALTER TABLE lancamentos_futuros ENABLE TRIGGER trigger_prevent_delete_paid_lancamentos;

  -- 13. Deletar da autenticação se solicitado
  -- O auth_user_id em usuarios_dependentes já foi zerado no passo 7
  IF p_delete_auth AND v_auth_user IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Usuário excluído com sucesso',
    'chat_messages_deleted', v_chat_deleted,
    'auth_deleted', p_delete_auth AND v_auth_user IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  -- Garantir que o trigger seja reabilitado em caso de erro
  BEGIN
    ALTER TABLE lancamentos_futuros ENABLE TRIGGER trigger_prevent_delete_paid_lancamentos;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RAISE;
END;
$function$;

COMMENT ON FUNCTION public.admin_delete_user(integer, boolean, boolean) IS 
  'Deleta usuário e todos os seus dados. Apenas admins. SECURITY DEFINER com SET search_path = public para evitar schema poisoning.';

-- =====================================================
-- FIX 2: Views de investimento — SECURITY DEFINER → SECURITY INVOKER
-- =====================================================
-- Problema: v_positions_detailed e v_portfolio_summary foram criadas com
-- SECURITY DEFINER implícito (padrão do Supabase em algumas versões), o que
-- significa que executam com as permissões do criador da view e IGNORAM o RLS
-- das tabelas subjacentes (investment_positions, investment_assets).
-- Resultado: usuário autenticado poderia ver dados de investimento de outros usuários.
--
-- Solução: Recriar as views com SECURITY INVOKER (padrão seguro) para que o RLS
-- de investment_positions e investment_assets seja aplicado normalmente.
--
-- NOTA: As views dependem de calculate_fixed_income_price(), que deve existir previamente.
-- =====================================================

-- Recriar v_positions_detailed com SECURITY INVOKER
DROP VIEW IF EXISTS public.v_portfolio_summary CASCADE;
DROP VIEW IF EXISTS public.v_positions_detailed CASCADE;

CREATE OR REPLACE VIEW public.v_positions_detailed
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.usuario_id,
    p.asset_id,
    p.tipo_conta,
    p.quantidade,
    p.preco_medio,
    p.data_compra,
    p.is_manual_price,
    p.manual_price,
    p.observacao,
    p.yield_percentage,
    p.use_manual_tax,
    p.manual_ir,
    p.manual_iof,
    a.ticker,
    a.name AS asset_name,
    a.type AS asset_type,
    a.current_price,
    a.previous_close,
    a.last_updated AS price_last_updated,
    a.source AS price_source,
    COALESCE(p.manual_price,
        CASE
            WHEN (a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL)
            THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio) AS calculated_price,
    (p.quantidade * p.preco_medio) AS valor_investido,
    (p.quantidade * COALESCE(p.manual_price,
        CASE
            WHEN (a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL)
            THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio)) AS valor_atual,
    ((p.quantidade * COALESCE(p.manual_price,
        CASE
            WHEN (a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL)
            THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
            ELSE a.current_price
        END, p.preco_medio)) - (p.quantidade * p.preco_medio)) AS lucro_prejuizo,
    CASE
        WHEN p.preco_medio > 0 THEN
            (((COALESCE(p.manual_price,
                CASE
                    WHEN (a.type = 'renda_fixa' AND p.yield_percentage IS NOT NULL)
                    THEN calculate_fixed_income_price(p.data_compra, p.yield_percentage, p.preco_medio)
                    ELSE a.current_price
                END, p.preco_medio) - p.preco_medio) / p.preco_medio) * 100)
        ELSE 0
    END AS rentabilidade_percentual,
    p.created_at,
    p.updated_at
FROM investment_positions p
JOIN investment_assets a ON p.asset_id = a.id
WHERE a.is_active = true;

COMMENT ON VIEW public.v_positions_detailed IS 
  'View detalhada de posições com cálculo de valores atuais e rentabilidade. SECURITY INVOKER: respeita RLS de investment_positions e investment_assets.';

-- Recriar v_portfolio_summary (depende de v_positions_detailed)
CREATE OR REPLACE VIEW public.v_portfolio_summary
WITH (security_invoker = true)
AS
SELECT
    usuario_id,
    tipo_conta,
    COUNT(DISTINCT id) AS total_ativos,
    SUM(valor_investido) AS valor_investido,
    SUM(valor_atual) AS valor_atual,
    SUM(lucro_prejuizo) AS lucro_prejuizo,
    CASE
        WHEN SUM(valor_investido) > 0
        THEN ((SUM(lucro_prejuizo) / SUM(valor_investido)) * 100)
        ELSE 0
    END AS rentabilidade_percentual
FROM v_positions_detailed
GROUP BY usuario_id, tipo_conta;

COMMENT ON VIEW public.v_portfolio_summary IS 
  'View resumida do portfólio por usuário e tipo de conta. SECURITY INVOKER: respeita RLS das tabelas subjacentes.';

-- =====================================================
-- FIM: Security Fixes (Março 2026)
-- =====================================================

-- =====================================================
-- PERFORMANCE FIX: auth_rls_initplan (Março 2026)
-- Substitui auth.uid() por (select auth.uid()) em todas as RLS policies
-- Impacto: auth.uid() era reavaliado por linha → agora avaliado 1x por query
-- Risco: ZERO — mesma lógica, só muda quando o Postgres resolve o valor
-- Tabelas afetadas: usuarios, categoria_trasacoes, transacoes,
--   usuarios_dependentes, lancamentos_futuros, metas_orcamento,
--   n8n_chat_histories_corporation
-- =====================================================

-- =====================================================
-- TABELA: usuarios
-- =====================================================
DROP POLICY IF EXISTS "Usuarios podem ver seus proprios dados" ON usuarios;
CREATE POLICY "Usuarios podem ver seus proprios dados"
  ON usuarios FOR SELECT
  USING (auth_user = (select auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem atualizar seus proprios dados" ON usuarios;
CREATE POLICY "Usuarios podem atualizar seus proprios dados"
  ON usuarios FOR UPDATE
  USING (auth_user = (select auth.uid()));

DROP POLICY IF EXISTS usuarios_veem_proprio_dados ON usuarios;
CREATE POLICY usuarios_veem_proprio_dados
  ON usuarios FOR ALL
  USING (auth_user = (select auth.uid()))
  WITH CHECK (auth_user = (select auth.uid()));

-- =====================================================
-- TABELA: categoria_trasacoes
-- =====================================================
DROP POLICY IF EXISTS categoria_select_policy ON categoria_trasacoes;
CREATE POLICY categoria_select_policy
  ON categoria_trasacoes FOR SELECT
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS categoria_insert_policy ON categoria_trasacoes;
CREATE POLICY categoria_insert_policy
  ON categoria_trasacoes FOR INSERT
  WITH CHECK (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS categoria_update_policy ON categoria_trasacoes;
CREATE POLICY categoria_update_policy
  ON categoria_trasacoes FOR UPDATE
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS categoria_delete_policy ON categoria_trasacoes;
CREATE POLICY categoria_delete_policy
  ON categoria_trasacoes FOR DELETE
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS categorias_insert_dependentes ON categoria_trasacoes;
CREATE POLICY categorias_insert_dependentes
  ON categoria_trasacoes FOR INSERT
  WITH CHECK (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
  ));

DROP POLICY IF EXISTS categorias_update_dependentes ON categoria_trasacoes;
CREATE POLICY categorias_update_dependentes
  ON categoria_trasacoes FOR UPDATE
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->>'pode_editar_transacoes')::boolean = true
  ));

DROP POLICY IF EXISTS categorias_delete_dependentes ON categoria_trasacoes;
CREATE POLICY categorias_delete_dependentes
  ON categoria_trasacoes FOR DELETE
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->>'pode_deletar_transacoes')::boolean = true
  ));

DROP POLICY IF EXISTS dependentes_veem_categorias_sempre ON categoria_trasacoes;
CREATE POLICY dependentes_veem_categorias_sempre
  ON categoria_trasacoes FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
  ));

DROP POLICY IF EXISTS dependentes_veem_categorias_tipo_conta_permitido ON categoria_trasacoes;
CREATE POLICY dependentes_veem_categorias_tipo_conta_permitido
  ON categoria_trasacoes FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->'tipos_conta_permitidos') @> to_jsonb(categoria_trasacoes.tipo_conta)
  ));

-- =====================================================
-- TABELA: transacoes
-- =====================================================
DROP POLICY IF EXISTS principal_ve_proprias_transacoes ON transacoes;
CREATE POLICY principal_ve_proprias_transacoes
  ON transacoes FOR SELECT
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS dependentes_podem_ver_transacoes_com_permissao ON transacoes;
CREATE POLICY dependentes_podem_ver_transacoes_com_permissao
  ON transacoes FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->>'pode_ver_dados_admin')::boolean = true
  ));

DROP POLICY IF EXISTS dependentes_veem_proprias_transacoes ON transacoes;
CREATE POLICY dependentes_veem_proprias_transacoes
  ON transacoes FOR SELECT
  USING (dependente_id IN (
    SELECT id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
  ));

DROP POLICY IF EXISTS dependentes_veem_transacoes_tipo_conta_permitido ON transacoes;
CREATE POLICY dependentes_veem_transacoes_tipo_conta_permitido
  ON transacoes FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->'tipos_conta_permitidos') @> to_jsonb(transacoes.tipo_conta)
  ));

-- =====================================================
-- TABELA: usuarios_dependentes
-- =====================================================
DROP POLICY IF EXISTS "dependentes_select_policy" ON usuarios_dependentes;
CREATE POLICY dependentes_select_policy
  ON usuarios_dependentes FOR SELECT
  USING (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS "dependentes_select_own_policy" ON usuarios_dependentes;
CREATE POLICY dependentes_select_own_policy
  ON usuarios_dependentes FOR SELECT
  USING ((select auth.uid()) = auth_user_id);

DROP POLICY IF EXISTS "dependentes_veem_proprio_registro" ON usuarios_dependentes;
CREATE POLICY dependentes_veem_proprio_registro
  ON usuarios_dependentes FOR SELECT
  USING (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "principal_ve_seus_dependentes" ON usuarios_dependentes;
CREATE POLICY principal_ve_seus_dependentes
  ON usuarios_dependentes FOR SELECT
  USING (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS "dependentes_insert_policy" ON usuarios_dependentes;
CREATE POLICY dependentes_insert_policy
  ON usuarios_dependentes FOR INSERT
  WITH CHECK (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS "dependentes_update_policy" ON usuarios_dependentes;
CREATE POLICY dependentes_update_policy
  ON usuarios_dependentes FOR UPDATE
  USING (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ))
  WITH CHECK (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS "dependentes_delete_policy" ON usuarios_dependentes;
CREATE POLICY dependentes_delete_policy
  ON usuarios_dependentes FOR DELETE
  USING (usuario_principal_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

-- =====================================================
-- TABELA: lancamentos_futuros
-- =====================================================
DROP POLICY IF EXISTS principal_ve_proprios_lancamentos ON lancamentos_futuros;
CREATE POLICY principal_ve_proprios_lancamentos
  ON lancamentos_futuros FOR SELECT
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS dependentes_podem_ver_lancamentos_com_permissao ON lancamentos_futuros;
CREATE POLICY dependentes_podem_ver_lancamentos_com_permissao
  ON lancamentos_futuros FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->>'pode_ver_dados_admin')::boolean = true
  ));

DROP POLICY IF EXISTS dependentes_veem_proprios_lancamentos ON lancamentos_futuros;
CREATE POLICY dependentes_veem_proprios_lancamentos
  ON lancamentos_futuros FOR SELECT
  USING (dependente_id IN (
    SELECT id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
  ));

DROP POLICY IF EXISTS dependentes_veem_lancamentos_tipo_conta_permitido ON lancamentos_futuros;
CREATE POLICY dependentes_veem_lancamentos_tipo_conta_permitido
  ON lancamentos_futuros FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
      AND (permissoes->'tipos_conta_permitidos') @> to_jsonb(lancamentos_futuros.tipo_conta)
  ));

-- =====================================================
-- TABELA: metas_orcamento
-- =====================================================
DROP POLICY IF EXISTS metas_select_segura ON metas_orcamento;
CREATE POLICY metas_select_segura
  ON metas_orcamento FOR SELECT
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS metas_insert_segura ON metas_orcamento;
CREATE POLICY metas_insert_segura
  ON metas_orcamento FOR INSERT
  WITH CHECK (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS metas_update_segura ON metas_orcamento;
CREATE POLICY metas_update_segura
  ON metas_orcamento FOR UPDATE
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS metas_delete_segura ON metas_orcamento;
CREATE POLICY metas_delete_segura
  ON metas_orcamento FOR DELETE
  USING (usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user = (select auth.uid())
  ));

DROP POLICY IF EXISTS dependentes_veem_metas_com_permissao ON metas_orcamento;
CREATE POLICY dependentes_veem_metas_com_permissao
  ON metas_orcamento FOR SELECT
  USING (usuario_id IN (
    SELECT usuario_principal_id FROM usuarios_dependentes
    WHERE auth_user_id = (select auth.uid())
      AND status = 'ativo'
  ));

-- =====================================================
-- TABELA: n8n_chat_histories_corporation
-- =====================================================
DROP POLICY IF EXISTS n8n_chat_admin_select ON n8n_chat_histories_corporation;
CREATE POLICY n8n_chat_admin_select
  ON n8n_chat_histories_corporation FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user = (select auth.uid())
      AND is_admin = true
  ));

DROP POLICY IF EXISTS n8n_chat_admin_update ON n8n_chat_histories_corporation;
CREATE POLICY n8n_chat_admin_update
  ON n8n_chat_histories_corporation FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user = (select auth.uid())
      AND is_admin = true
  ));

DROP POLICY IF EXISTS n8n_chat_admin_delete ON n8n_chat_histories_corporation;
CREATE POLICY n8n_chat_admin_delete
  ON n8n_chat_histories_corporation FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user = (select auth.uid())
      AND is_admin = true
  ));

-- =====================================================
-- FIM: Performance Fix auth_rls_initplan (Março 2026)
-- =====================================================

-- =====================================================
-- MÓDULO DE TUTORIAIS (09/03/2026)
-- =====================================================
-- Feature: Sistema completo de tutoriais em vídeo
-- Descrição: Permite criar tutoriais organizados por módulo/tema,
--            rastrear progresso do usuário, welcome tour para novos usuários,
--            e painel admin para gerenciar todo o conteúdo
-- Arquivos relacionados:
--   - src/hooks/use-tutorials.ts
--   - src/app/dashboard/tutoriais/page.tsx
--   - src/components/dashboard/tutoriais/*
--   - src/components/dashboard/welcome-tour-modal.tsx
-- =====================================================

-- 1. CRIAR TABELA tutoriais
CREATE TABLE IF NOT EXISTS public.tutoriais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  modulo TEXT NOT NULL CHECK (modulo IN ('primeiros_passos', 'dashboard', 'receitas', 'despesas', 'transacoes', 'cartao', 'contas', 'investimentos', 'categorias', 'programados', 'metas', 'relatorios', 'tutoriais', 'configuracoes', 'ia_whats', 'instalar_app', 'compromissos', 'plano_casal')),
  ordem INTEGER NOT NULL DEFAULT 1 CHECK (ordem > 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  duracao_seg INTEGER CHECK (duracao_seg >= 0),
  nivel TEXT NOT NULL DEFAULT 'basico' CHECK (nivel IN ('basico', 'intermediario', 'avancado')),
  idioma TEXT NOT NULL DEFAULT 'pt' CHECK (idioma IN ('pt', 'es', 'en')),
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tutoriais IS 'Armazena os tutoriais em vídeo disponíveis na plataforma';
COMMENT ON COLUMN public.tutoriais.titulo IS 'Título do tutorial';
COMMENT ON COLUMN public.tutoriais.descricao IS 'Descrição curta do tutorial';
COMMENT ON COLUMN public.tutoriais.video_url IS 'URL do vídeo (YouTube embed ou link direto)';
COMMENT ON COLUMN public.tutoriais.modulo IS 'Módulo/tema: primeiros_passos, transacoes, cartao, investimentos, relatorios, configuracoes';
COMMENT ON COLUMN public.tutoriais.idioma IS 'Idioma do tutorial: pt, es, en';
COMMENT ON COLUMN public.tutoriais.is_new IS 'Flag para exibir badge "Novo" no tutorial';

CREATE INDEX IF NOT EXISTS idx_tutoriais_modulo ON public.tutoriais(modulo);
CREATE INDEX IF NOT EXISTS idx_tutoriais_ativo ON public.tutoriais(ativo);
CREATE INDEX IF NOT EXISTS idx_tutoriais_idioma ON public.tutoriais(idioma);
CREATE INDEX IF NOT EXISTS idx_tutoriais_ordem ON public.tutoriais(modulo, ordem);

-- 2. CRIAR TABELA tutoriais_progresso
CREATE TABLE IF NOT EXISTS public.tutoriais_progresso (
  usuario_id INTEGER NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.tutoriais(id) ON DELETE CASCADE,
  assistido BOOLEAN NOT NULL DEFAULT false,
  percentual INTEGER DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, tutorial_id)
);

COMMENT ON TABLE public.tutoriais_progresso IS 'Registra o progresso do usuário nos tutoriais';

CREATE INDEX IF NOT EXISTS idx_tutoriais_progresso_usuario ON public.tutoriais_progresso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tutoriais_progresso_tutorial ON public.tutoriais_progresso(tutorial_id);

-- 3. ADICIONAR COLUNA EM configuracoes_sistema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'configuracoes_sistema'
    AND column_name = 'habilitar_modulo_tutoriais'
  ) THEN
    ALTER TABLE public.configuracoes_sistema
    ADD COLUMN habilitar_modulo_tutoriais BOOLEAN DEFAULT true;

    COMMENT ON COLUMN public.configuracoes_sistema.habilitar_modulo_tutoriais IS
    'Habilita/desabilita o módulo de tutoriais para todos os usuários. Se false, o item some da sidebar e as páginas ficam inacessíveis.';
  END IF;
END $$;

-- 4. HABILITAR RLS
ALTER TABLE public.tutoriais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoriais_progresso ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS - tutoriais
DROP POLICY IF EXISTS tutoriais_select_policy ON public.tutoriais;
DROP POLICY IF EXISTS tutoriais_user_select_policy ON public.tutoriais;
DROP POLICY IF EXISTS tutoriais_admin_select_policy ON public.tutoriais;

CREATE POLICY tutoriais_user_select_policy ON public.tutoriais
  FOR SELECT
  USING (
    ativo = true
    AND (EXISTS (SELECT 1 FROM public.configuracoes_sistema WHERE habilitar_modulo_tutoriais = true))
  );

CREATE POLICY tutoriais_admin_select_policy ON public.tutoriais
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE auth_user = auth.uid()
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS tutoriais_admin_insert_policy ON public.tutoriais;
CREATE POLICY tutoriais_admin_insert_policy ON public.tutoriais
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE auth_user = auth.uid()
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS tutoriais_admin_update_policy ON public.tutoriais;
CREATE POLICY tutoriais_admin_update_policy ON public.tutoriais
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE auth_user = auth.uid()
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS tutoriais_admin_delete_policy ON public.tutoriais;
CREATE POLICY tutoriais_admin_delete_policy ON public.tutoriais
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE auth_user = auth.uid()
      AND is_admin = true
    )
  );

-- 6. POLÍTICAS RLS - tutoriais_progresso
DROP POLICY IF EXISTS progresso_select_policy ON public.tutoriais_progresso;
CREATE POLICY progresso_select_policy ON public.tutoriais_progresso
  FOR SELECT
  USING (
    usuario_id = (
      SELECT id FROM public.usuarios
      WHERE auth_user = auth.uid()
    )
  );

DROP POLICY IF EXISTS progresso_insert_policy ON public.tutoriais_progresso;
CREATE POLICY progresso_insert_policy ON public.tutoriais_progresso
  FOR INSERT
  WITH CHECK (
    usuario_id = (
      SELECT id FROM public.usuarios
      WHERE auth_user = auth.uid()
    )
  );

DROP POLICY IF EXISTS progresso_update_policy ON public.tutoriais_progresso;
CREATE POLICY progresso_update_policy ON public.tutoriais_progresso
  FOR UPDATE
  USING (
    usuario_id = (
      SELECT id FROM public.usuarios
      WHERE auth_user = auth.uid()
    )
  );

DROP POLICY IF EXISTS progresso_delete_policy ON public.tutoriais_progresso;
CREATE POLICY progresso_delete_policy ON public.tutoriais_progresso
  FOR DELETE
  USING (
    usuario_id = (
      SELECT id FROM public.usuarios
      WHERE auth_user = auth.uid()
    )
  );

-- 7. GRANTS
GRANT SELECT ON public.tutoriais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutoriais_progresso TO authenticated;



-- 8. ATUALIZAR FUNÇÃO get_system_settings()
-- NOTA: Esta função precisa ser dropada e recriada por causa da mudança no retorno
DROP FUNCTION IF EXISTS public.get_system_settings();

CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_json jsonb;
BEGIN
  -- Dividir em múltiplos jsonb_build_object para evitar o limite de 100 argumentos
  SELECT
    jsonb_build_object(
      'primary_color', primary_color,
      'secondary_color', secondary_color,
      'company_name', company_name,
      'app_name', company_name,
      'company_slogan', company_slogan,
      'white_label_active', white_label_active,
      'support_email', support_email,
      'show_header_logo', show_header_logo,
      'show_header_name', show_header_name,
      'show_sidebar_logo', show_sidebar_logo,
      'show_sidebar_name', show_sidebar_name,
      'show_login_logo', show_login_logo,
      'show_login_name', show_login_name,
      'show_index_name', show_index_name,
      'dias_acesso_free', dias_acesso_free,
      'bloquear_acesso_apos_vencimento', bloquear_acesso_apos_vencimento,
      'support_title', support_title,
      'support_description', support_description,
      'support_info_1', support_info_1,
      'support_info_2', support_info_2,
      'support_info_3', support_info_3
    ) ||
    jsonb_build_object(
      'support_contact_url', support_contact_url,
      'support_contact_text', support_contact_text,
      'whatsapp_contact_url', whatsapp_contact_url,
      'whatsapp_contact_text', whatsapp_contact_text,
      'whatsapp_enabled', whatsapp_enabled,
      'restringir_cadastro_usuarios_existentes', restringir_cadastro_usuarios_existentes,
      'login_welcome_text', login_welcome_text,
      'login_feature_1_title', login_feature_1_title,
      'login_feature_1_subtitle', login_feature_1_subtitle,
      'login_feature_2_title', login_feature_2_title,
      'login_feature_2_subtitle', login_feature_2_subtitle,
      'login_feature_3_title', login_feature_3_title,
      'login_feature_3_subtitle', login_feature_3_subtitle,
      'login_feature_4_title', login_feature_4_title,
      'login_feature_4_subtitle', login_feature_4_subtitle,
      'login_background_image_url', login_background_image_url,
      'login_use_background_image', login_use_background_image,
      'login_background_image_opacity', login_background_image_opacity,
      'login_hide_logo_on_image', login_hide_logo_on_image,
      'login_show_text_on_image', login_show_text_on_image
    ) ||
    jsonb_build_object(
      'habilitar_modo_pj', habilitar_modo_pj,
      'video_url_instalacao', video_url_instalacao,
      'whatsapp_suporte_url', whatsapp_suporte_url,
      'webhook_convite_membro', webhook_convite_membro,
      'idioma_padrao_planos', idioma_padrao_planos,
      'moeda_padrao_planos', moeda_padrao_planos,
      'habilitar_toggle_periodo_planos', habilitar_toggle_periodo_planos,
      'percentual_desconto_anual', percentual_desconto_anual,
      'google_calendar_client_id', google_calendar_client_id,
      'google_calendar_client_secret', google_calendar_client_secret,
      'habilitar_conciliacao_ofx', habilitar_conciliacao_ofx,
      'habilitar_modulo_tutoriais', habilitar_modulo_tutoriais
    )
  INTO settings_json
  FROM public.configuracoes_sistema
  LIMIT 1;

  RETURN settings_json;
END;
$$;

-- 9. ATUALIZAR FUNÇÃO update_system_settings()
-- NOTA: Precisa dropar por causa da mudança nos parâmetros
DROP FUNCTION IF EXISTS public.update_system_settings(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, NUMERIC, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_system_settings(
  p_primary_color TEXT DEFAULT NULL,
  p_secondary_color TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_company_slogan TEXT DEFAULT NULL,
  p_white_label_active BOOLEAN DEFAULT NULL,
  p_support_email TEXT DEFAULT NULL,
  p_show_header_logo BOOLEAN DEFAULT NULL,
  p_show_header_name BOOLEAN DEFAULT NULL,
  p_show_sidebar_logo BOOLEAN DEFAULT NULL,
  p_show_sidebar_name BOOLEAN DEFAULT NULL,
  p_show_login_logo BOOLEAN DEFAULT NULL,
  p_show_login_name BOOLEAN DEFAULT NULL,
  p_show_index_name BOOLEAN DEFAULT NULL,
  p_dias_acesso_free INTEGER DEFAULT NULL,
  p_bloquear_acesso_apos_vencimento BOOLEAN DEFAULT NULL,
  p_support_title TEXT DEFAULT NULL,
  p_support_description TEXT DEFAULT NULL,
  p_support_info_1 TEXT DEFAULT NULL,
  p_support_info_2 TEXT DEFAULT NULL,
  p_support_info_3 TEXT DEFAULT NULL,
  p_support_contact_url TEXT DEFAULT NULL,
  p_support_contact_text TEXT DEFAULT NULL,
  p_whatsapp_contact_url TEXT DEFAULT NULL,
  p_whatsapp_contact_text TEXT DEFAULT NULL,
  p_whatsapp_enabled BOOLEAN DEFAULT NULL,
  p_restringir_cadastro_usuarios_existentes BOOLEAN DEFAULT NULL,
  p_login_welcome_text TEXT DEFAULT NULL,
  p_login_feature_1_title TEXT DEFAULT NULL,
  p_login_feature_1_subtitle TEXT DEFAULT NULL,
  p_login_feature_2_title TEXT DEFAULT NULL,
  p_login_feature_2_subtitle TEXT DEFAULT NULL,
  p_login_feature_3_title TEXT DEFAULT NULL,
  p_login_feature_3_subtitle TEXT DEFAULT NULL,
  p_login_feature_4_title TEXT DEFAULT NULL,
  p_login_feature_4_subtitle TEXT DEFAULT NULL,
  p_login_background_image_url TEXT DEFAULT NULL,
  p_login_use_background_image BOOLEAN DEFAULT NULL,
  p_login_background_image_opacity NUMERIC DEFAULT NULL,
  p_login_hide_logo_on_image BOOLEAN DEFAULT NULL,
  p_login_show_text_on_image BOOLEAN DEFAULT NULL,
  p_habilitar_modo_pj BOOLEAN DEFAULT NULL,
  p_video_url_instalacao TEXT DEFAULT NULL,
  p_whatsapp_suporte_url TEXT DEFAULT NULL,
  p_webhook_convite_membro TEXT DEFAULT NULL,
  p_idioma_padrao_planos TEXT DEFAULT NULL,
  p_moeda_padrao_planos TEXT DEFAULT NULL,
  p_habilitar_toggle_periodo_planos BOOLEAN DEFAULT NULL,
  p_percentual_desconto_anual INTEGER DEFAULT NULL,
  p_google_calendar_client_id TEXT DEFAULT NULL,
  p_google_calendar_client_secret TEXT DEFAULT NULL,
  p_habilitar_conciliacao_ofx BOOLEAN DEFAULT NULL,
  p_habilitar_modulo_tutoriais BOOLEAN DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_user = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem atualizar configurações do sistema.';
  END IF;

  UPDATE public.configuracoes_sistema
  SET
    primary_color = COALESCE(p_primary_color, primary_color),
    secondary_color = COALESCE(p_secondary_color, secondary_color),
    company_name = COALESCE(p_company_name, company_name),
    company_slogan = COALESCE(p_company_slogan, company_slogan),
    white_label_active = COALESCE(p_white_label_active, white_label_active),
    support_email = COALESCE(p_support_email, support_email),
    show_header_logo = COALESCE(p_show_header_logo, show_header_logo),
    show_header_name = COALESCE(p_show_header_name, show_header_name),
    show_sidebar_logo = COALESCE(p_show_sidebar_logo, show_sidebar_logo),
    show_sidebar_name = COALESCE(p_show_sidebar_name, show_sidebar_name),
    show_login_logo = COALESCE(p_show_login_logo, show_login_logo),
    show_login_name = COALESCE(p_show_login_name, show_login_name),
    show_index_name = COALESCE(p_show_index_name, show_index_name),
    dias_acesso_free = COALESCE(p_dias_acesso_free, dias_acesso_free),
    bloquear_acesso_apos_vencimento = COALESCE(p_bloquear_acesso_apos_vencimento, bloquear_acesso_apos_vencimento),
    support_title = COALESCE(p_support_title, support_title),
    support_description = COALESCE(p_support_description, support_description),
    support_info_1 = COALESCE(p_support_info_1, support_info_1),
    support_info_2 = COALESCE(p_support_info_2, support_info_2),
    support_info_3 = COALESCE(p_support_info_3, support_info_3),
    support_contact_url = COALESCE(p_support_contact_url, support_contact_url),
    support_contact_text = COALESCE(p_support_contact_text, support_contact_text),
    whatsapp_contact_url = COALESCE(p_whatsapp_contact_url, whatsapp_contact_url),
    whatsapp_contact_text = COALESCE(p_whatsapp_contact_text, whatsapp_contact_text),
    whatsapp_enabled = COALESCE(p_whatsapp_enabled, whatsapp_enabled),
    restringir_cadastro_usuarios_existentes = COALESCE(p_restringir_cadastro_usuarios_existentes, restringir_cadastro_usuarios_existentes),
    login_welcome_text = COALESCE(p_login_welcome_text, login_welcome_text),
    login_feature_1_title = COALESCE(p_login_feature_1_title, login_feature_1_title),
    login_feature_1_subtitle = COALESCE(p_login_feature_1_subtitle, login_feature_1_subtitle),
    login_feature_2_title = COALESCE(p_login_feature_2_title, login_feature_2_title),
    login_feature_2_subtitle = COALESCE(p_login_feature_2_subtitle, login_feature_2_subtitle),
    login_feature_3_title = COALESCE(p_login_feature_3_title, login_feature_3_title),
    login_feature_3_subtitle = COALESCE(p_login_feature_3_subtitle, login_feature_3_subtitle),
    login_feature_4_title = COALESCE(p_login_feature_4_title, login_feature_4_title),
    login_feature_4_subtitle = COALESCE(p_login_feature_4_subtitle, login_feature_4_subtitle),
    login_background_image_url = COALESCE(p_login_background_image_url, login_background_image_url),
    login_use_background_image = COALESCE(p_login_use_background_image, login_use_background_image),
    login_background_image_opacity = COALESCE(p_login_background_image_opacity, login_background_image_opacity),
    login_hide_logo_on_image = COALESCE(p_login_hide_logo_on_image, login_hide_logo_on_image),
    login_show_text_on_image = COALESCE(p_login_show_text_on_image, login_show_text_on_image),
    habilitar_modo_pj = COALESCE(p_habilitar_modo_pj, habilitar_modo_pj),
    video_url_instalacao = COALESCE(p_video_url_instalacao, video_url_instalacao),
    whatsapp_suporte_url = COALESCE(p_whatsapp_suporte_url, whatsapp_suporte_url),
    webhook_convite_membro = COALESCE(p_webhook_convite_membro, webhook_convite_membro),
    idioma_padrao_planos = COALESCE(p_idioma_padrao_planos, idioma_padrao_planos),
    moeda_padrao_planos = COALESCE(p_moeda_padrao_planos, moeda_padrao_planos),
    habilitar_toggle_periodo_planos = COALESCE(p_habilitar_toggle_periodo_planos, habilitar_toggle_periodo_planos),
    percentual_desconto_anual = COALESCE(p_percentual_desconto_anual, percentual_desconto_anual),
    google_calendar_client_id = COALESCE(p_google_calendar_client_id, google_calendar_client_id),
    google_calendar_client_secret = COALESCE(p_google_calendar_client_secret, google_calendar_client_secret),
    habilitar_conciliacao_ofx = COALESCE(p_habilitar_conciliacao_ofx, habilitar_conciliacao_ofx),
    habilitar_modulo_tutoriais = COALESCE(p_habilitar_modulo_tutoriais, habilitar_modulo_tutoriais),
    updated_at = now()
  WHERE id = 1;

  RETURN public.get_system_settings();
END;
$$;

-- 10. INSERIR DADOS DE EXEMPLO (vazio, usuários criam seus próprios)
-- (Reservado para tutoriais básicos caso o admin queira inserir depois)

-- =====================================================
-- FIM: Módulo de Tutoriais (09/03/2026)
-- =====================================================

-- =====================================================
-- REALTIME: Habilitar atualizações em tempo real (Março 2026)
-- =====================================================
-- Feature: App atualiza automaticamente quando dados são inseridos
--          por fontes externas (n8n, API, scripts, etc.) sem precisar
--          de refresh manual. Funciona especialmente bem no modo PWA.
-- Como funciona:
--   1. Supabase usa logical replication do Postgres (WAL)
--   2. O app assina um canal WebSocket por usuário
--   3. Quando n8n insere: transacao → app dispara 'transactionsChanged'
--   4. Todos os hooks (React Query + legados) atualizam automaticamente
-- Arquivos relacionados:
--   - src/hooks/use-realtime-updates.ts
--   - src/components/providers/realtime-provider.tsx
--   - src/app/dashboard/layout.tsx
-- Risco: ZERO — operação não-destrutiva, apenas configura publicação
-- Reverter: ALTER PUBLICATION supabase_realtime REMOVE TABLE <tabela>
-- =====================================================

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'transacoes', 'lancamentos_futuros', 'contas_bancarias',
    'cartoes_credito', 'investment_positions', 'metas_orcamento',
    'investment_assets', 'categoria_trasacoes'
  ];
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', v_table);
    END IF;
  END LOOP;
END $$;
-- NOTA: lembretes é gerenciada por migrations_lembretes_google_calendar.sql

-- =====================================================
-- FIM: Realtime (Março 2026)
-- =====================================================

-- =====================================================
-- Notificações padrão: antecedencia_minutos 15 → 30 (Abril 2026)
-- =====================================================
ALTER TABLE public.google_calendar_integrations
  ALTER COLUMN antecedencia_minutos SET DEFAULT 30;

-- Renomear trigger de defaults para garantir execução após link_existing_user_on_signup
-- (Postgres dispara AFTER triggers por ordem alfabética do nome)
DROP TRIGGER IF EXISTS create_default_notification_preferences ON auth.users;
DROP TRIGGER IF EXISTS z_create_default_notification_preferences ON auth.users;
CREATE TRIGGER z_create_default_notification_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();

-- =====================================================
-- SYNC GAP: Itens presentes no banco mas ausentes do arquivo
-- Auditado em 30/03/2026 via MCP Supabase
-- =====================================================

-- =====================================================
-- A. NOVAS COLUNAS: configuracoes_sistema (Suporte WhatsApp)
-- =====================================================
-- Colunas adicionadas após 28/02/2026 para o módulo de suporte via WhatsApp.
-- Expostas em update_system_settings (3ª versão) e get_system_settings.

ALTER TABLE public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS habilitar_suporte_whatsapp BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suporte_whatsapp_text TEXT DEFAULT 'Falar com Suporte';

-- =====================================================
-- B. FUNÇÕES TRIGGER: Auto-fill de IDs
-- =====================================================

-- Preenche usuario_id automaticamente em lancamentos_futuros se não fornecido
CREATE OR REPLACE FUNCTION public.auto_fill_usuario_id_lancamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.usuario_id IS NULL OR NEW.usuario_id = 0 THEN
        BEGIN
            NEW.usuario_id := verificar_proprietario_por_auth();
        EXCEPTION WHEN OTHERS THEN
            NEW.usuario_id := NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_fill_usuario_id_lancamentos ON public.lancamentos_futuros;
CREATE TRIGGER trigger_auto_fill_usuario_id_lancamentos
  BEFORE INSERT ON public.lancamentos_futuros
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_usuario_id_lancamentos();

-- Preenche usuario_principal_id automaticamente em usuarios_dependentes se não fornecido
CREATE OR REPLACE FUNCTION public.auto_fill_usuario_principal_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.usuario_principal_id IS NULL OR NEW.usuario_principal_id = 0 THEN
        BEGIN
            NEW.usuario_principal_id := verificar_proprietario_por_auth();
        EXCEPTION WHEN OTHERS THEN
            NEW.usuario_principal_id := NULL;
        END;
        IF NEW.usuario_principal_id IS NULL OR NEW.usuario_principal_id = 0 THEN
            RAISE EXCEPTION 'Não foi possível identificar o usuário principal. Verifique se você está logado.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_fill_usuario_principal_id ON public.usuarios_dependentes;
CREATE TRIGGER trigger_auto_fill_usuario_principal_id
  BEFORE INSERT ON public.usuarios_dependentes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_usuario_principal_id();

-- =====================================================
-- C. TRIGGER: trigger_update_contas_bancarias_timestamp
-- =====================================================
-- A função update_contas_bancarias_updated_at() já está definida acima.
-- Este trigger estava ausente do arquivo mas presente no banco.

DROP TRIGGER IF EXISTS trigger_update_contas_bancarias_timestamp ON public.contas_bancarias;
CREATE TRIGGER trigger_update_contas_bancarias_timestamp
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contas_bancarias_updated_at();

-- =====================================================
-- D. FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Registra data_ultimo_acesso do usuário logado
CREATE OR REPLACE FUNCTION public.registrar_acesso_usuario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id INTEGER;
BEGIN
    SELECT id INTO user_id FROM public.usuarios WHERE auth_user = auth.uid();
    IF user_id IS NOT NULL THEN
        UPDATE public.usuarios SET data_ultimo_acesso = NOW() WHERE id = user_id;
    END IF;
END;
$$;

-- Retorna o ID numérico do usuário logado (0 se não encontrado)
CREATE OR REPLACE FUNCTION public.get_user_numeric_id_safe()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id INTEGER;
BEGIN
    SELECT id INTO user_id FROM public.usuarios WHERE auth_user = auth.uid();
    RETURN COALESCE(user_id, 0);
END;
$$;

-- Verifica se um usuário tem acesso ativo (plano válido ou free dentro do período)
CREATE OR REPLACE FUNCTION public.usuario_tem_acesso_ativo(p_usuario_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    usuario_record RECORD;
    dias_restantes INTEGER;
    config_bloquear BOOLEAN;
BEGIN
    SELECT status, plano, data_final_plano, is_admin
    INTO usuario_record
    FROM public.usuarios WHERE id = p_usuario_id;

    IF NOT FOUND THEN RETURN false; END IF;
    IF usuario_record.status != 'ativo' THEN RETURN false; END IF;
    IF usuario_record.is_admin = true THEN RETURN true; END IF;

    IF usuario_record.plano IS NOT NULL
       AND LOWER(usuario_record.plano) != 'free'
       AND (usuario_record.data_final_plano IS NULL OR usuario_record.data_final_plano > NOW()) THEN
        RETURN true;
    END IF;

    SELECT bloquear_acesso_apos_vencimento INTO config_bloquear
    FROM public.configuracoes_sistema WHERE id = 1;

    IF NOT FOUND THEN config_bloquear := true; END IF;
    IF NOT config_bloquear THEN RETURN true; END IF;

    dias_restantes := calcular_dias_restantes_free(p_usuario_id);
    RETURN dias_restantes > 0;
END;
$$;

-- Verifica se um e-mail já existe na tabela usuarios
CREATE OR REPLACE FUNCTION public.verificar_email_cadastro(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios WHERE LOWER(email) = LOWER(p_email)
    );
END;
$$;

-- Corrige transações duplicadas geradas por lançamentos futuros
CREATE OR REPLACE FUNCTION public.fix_duplicate_transactions()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    lancamento_id INTEGER;
    first_transaction_id INTEGER;
    count_fixed INTEGER := 0;
BEGIN
    FOR lancamento_id IN
        SELECT lancamento_futuro_id FROM public.transacoes
        WHERE lancamento_futuro_id IS NOT NULL
        GROUP BY lancamento_futuro_id HAVING COUNT(*) > 1
    LOOP
        SELECT id INTO first_transaction_id
        FROM public.transacoes WHERE lancamento_futuro_id = lancamento_id
        ORDER BY id LIMIT 1;

        UPDATE public.lancamentos_futuros
        SET transacao_id = first_transaction_id WHERE id = lancamento_id;

        DELETE FROM public.transacoes
        WHERE lancamento_futuro_id = lancamento_id AND id != first_transaction_id;

        count_fixed := count_fixed + 1;
    END LOOP;
    RAISE NOTICE 'Corrigidas % duplicações de transações', count_fixed;
END;
$$;

-- Cria preferências de notificação padrão ao inserir usuário (trigger de auth)
-- NOTA: dispara após link_existing_user_on_signup pois 'z_' vem depois de 'l' alfabeticamente,
-- garantindo que public.usuarios já existe quando esta função executa.
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    usuario_numerico_id integer;
BEGIN
    SELECT id INTO usuario_numerico_id
    FROM public.usuarios WHERE LOWER(email) = LOWER(NEW.email);

    IF usuario_numerico_id IS NOT NULL THEN
        INSERT INTO public.preferencias_notificacao
            (usuario_id, tipo_notificacao, habilitado, dias_antecedencia, created_at, updated_at)
        VALUES (usuario_numerico_id, 'email_geral', TRUE, NULL, NOW(), NOW())
        ON CONFLICT (usuario_id, tipo_notificacao) DO NOTHING;

        INSERT INTO public.preferencias_notificacao
            (usuario_id, tipo_notificacao, habilitado, dias_antecedencia, created_at, updated_at)
        VALUES (usuario_numerico_id, 'lembrete_vencimento', TRUE, 0, NOW(), NOW())
        ON CONFLICT (usuario_id, tipo_notificacao) DO NOTHING;

        -- Criar configurações padrão de WhatsApp (GCal não conectado ainda)
        -- is_active=false até o usuário conectar o Google Agenda
        INSERT INTO public.google_calendar_integrations
            (usuario_id, is_active, antecedencia_minutos, resumo_diario_ativo, resumo_diario_horario, resumo_diario_tipo)
        VALUES (usuario_numerico_id, false, 30, false, '22:00:00', 'AMANHA')
        ON CONFLICT (usuario_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Renomear trigger para garantir execução DEPOIS de link_existing_user_on_signup
-- (triggers disparam em ordem alfabética pelo nome; 'z_' garante execução posterior)
DROP TRIGGER IF EXISTS create_default_notification_preferences ON auth.users;
DROP TRIGGER IF EXISTS z_create_default_notification_preferences ON auth.users;
CREATE TRIGGER z_create_default_notification_preferences
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();

-- =====================================================
-- E. SEGUNDA SOBRECARGA: calculate_fixed_income_price
-- =====================================================
-- Versão que recebe valor aplicado + taxa anual + datas (para cálculo por período)
-- Complementa a versão existente que recebe purchase_date, yield_percentage, base_price

CREATE OR REPLACE FUNCTION public.calculate_fixed_income_price(
    p_valor_aplicado numeric,
    p_taxa_anual numeric,
    p_data_aplicacao date,
    p_data_vencimento date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dias_corridos INTEGER;
    v_taxa_diaria NUMERIC;
    v_valor_bruto NUMERIC;
BEGIN
    v_dias_corridos := p_data_vencimento - p_data_aplicacao;
    v_taxa_diaria := POWER(1 + (p_taxa_anual / 100), 1.0 / 252) - 1;
    v_valor_bruto := p_valor_aplicado * POWER(1 + v_taxa_diaria, v_dias_corridos);
    RETURN ROUND(v_valor_bruto, 2);
END;
$$;

-- =====================================================
-- F. NOVA VERSÃO: update_system_settings (com suporte WhatsApp)
-- =====================================================
-- Terceira sobrecarga adicionada após 28/02/2026 com os novos parâmetros:
-- p_habilitar_suporte_whatsapp e p_suporte_whatsapp_text

CREATE OR REPLACE FUNCTION public.update_system_settings(
  p_primary_color text DEFAULT NULL, p_secondary_color text DEFAULT NULL,
  p_company_name text DEFAULT NULL, p_company_slogan text DEFAULT NULL,
  p_white_label_active boolean DEFAULT NULL, p_support_email text DEFAULT NULL,
  p_show_header_logo boolean DEFAULT NULL, p_show_header_name boolean DEFAULT NULL,
  p_show_sidebar_logo boolean DEFAULT NULL, p_show_sidebar_name boolean DEFAULT NULL,
  p_show_login_logo boolean DEFAULT NULL, p_show_login_name boolean DEFAULT NULL,
  p_show_index_name boolean DEFAULT NULL, p_dias_acesso_free integer DEFAULT NULL,
  p_bloquear_acesso_apos_vencimento boolean DEFAULT NULL,
  p_support_title text DEFAULT NULL, p_support_description text DEFAULT NULL,
  p_support_info_1 text DEFAULT NULL, p_support_info_2 text DEFAULT NULL,
  p_support_info_3 text DEFAULT NULL, p_support_contact_url text DEFAULT NULL,
  p_support_contact_text text DEFAULT NULL, p_whatsapp_contact_url text DEFAULT NULL,
  p_whatsapp_contact_text text DEFAULT NULL, p_whatsapp_enabled boolean DEFAULT NULL,
  p_restringir_cadastro_usuarios_existentes boolean DEFAULT NULL,
  p_login_welcome_text text DEFAULT NULL,
  p_login_feature_1_title text DEFAULT NULL, p_login_feature_1_subtitle text DEFAULT NULL,
  p_login_feature_2_title text DEFAULT NULL, p_login_feature_2_subtitle text DEFAULT NULL,
  p_login_feature_3_title text DEFAULT NULL, p_login_feature_3_subtitle text DEFAULT NULL,
  p_login_feature_4_title text DEFAULT NULL, p_login_feature_4_subtitle text DEFAULT NULL,
  p_login_background_image_url text DEFAULT NULL,
  p_login_use_background_image boolean DEFAULT NULL,
  p_login_background_image_opacity numeric DEFAULT NULL,
  p_login_hide_logo_on_image boolean DEFAULT NULL,
  p_login_show_text_on_image boolean DEFAULT NULL,
  p_habilitar_modo_pj boolean DEFAULT NULL,
  p_video_url_instalacao text DEFAULT NULL, p_whatsapp_suporte_url text DEFAULT NULL,
  p_webhook_convite_membro text DEFAULT NULL,
  p_idioma_padrao_planos text DEFAULT NULL, p_moeda_padrao_planos text DEFAULT NULL,
  p_habilitar_toggle_periodo_planos boolean DEFAULT NULL,
  p_percentual_desconto_anual integer DEFAULT NULL,
  p_google_calendar_client_id text DEFAULT NULL,
  p_google_calendar_client_secret text DEFAULT NULL,
  p_habilitar_conciliacao_ofx boolean DEFAULT NULL,
  p_habilitar_modulo_tutoriais boolean DEFAULT NULL,
  p_habilitar_suporte_whatsapp boolean DEFAULT NULL,
  p_suporte_whatsapp_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios WHERE auth_user = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem atualizar configurações do sistema.';
  END IF;

  UPDATE public.configuracoes_sistema SET
    primary_color = COALESCE(p_primary_color, primary_color),
    secondary_color = COALESCE(p_secondary_color, secondary_color),
    company_name = COALESCE(p_company_name, company_name),
    company_slogan = COALESCE(p_company_slogan, company_slogan),
    white_label_active = COALESCE(p_white_label_active, white_label_active),
    support_email = COALESCE(p_support_email, support_email),
    show_header_logo = COALESCE(p_show_header_logo, show_header_logo),
    show_header_name = COALESCE(p_show_header_name, show_header_name),
    show_sidebar_logo = COALESCE(p_show_sidebar_logo, show_sidebar_logo),
    show_sidebar_name = COALESCE(p_show_sidebar_name, show_sidebar_name),
    show_login_logo = COALESCE(p_show_login_logo, show_login_logo),
    show_login_name = COALESCE(p_show_login_name, show_login_name),
    show_index_name = COALESCE(p_show_index_name, show_index_name),
    dias_acesso_free = COALESCE(p_dias_acesso_free, dias_acesso_free),
    bloquear_acesso_apos_vencimento = COALESCE(p_bloquear_acesso_apos_vencimento, bloquear_acesso_apos_vencimento),
    support_title = COALESCE(p_support_title, support_title),
    support_description = COALESCE(p_support_description, support_description),
    support_info_1 = COALESCE(p_support_info_1, support_info_1),
    support_info_2 = COALESCE(p_support_info_2, support_info_2),
    support_info_3 = COALESCE(p_support_info_3, support_info_3),
    support_contact_url = COALESCE(p_support_contact_url, support_contact_url),
    support_contact_text = COALESCE(p_support_contact_text, support_contact_text),
    whatsapp_contact_url = COALESCE(p_whatsapp_contact_url, whatsapp_contact_url),
    whatsapp_contact_text = COALESCE(p_whatsapp_contact_text, whatsapp_contact_text),
    whatsapp_enabled = COALESCE(p_whatsapp_enabled, whatsapp_enabled),
    restringir_cadastro_usuarios_existentes = COALESCE(p_restringir_cadastro_usuarios_existentes, restringir_cadastro_usuarios_existentes),
    login_welcome_text = COALESCE(p_login_welcome_text, login_welcome_text),
    login_feature_1_title = COALESCE(p_login_feature_1_title, login_feature_1_title),
    login_feature_1_subtitle = COALESCE(p_login_feature_1_subtitle, login_feature_1_subtitle),
    login_feature_2_title = COALESCE(p_login_feature_2_title, login_feature_2_title),
    login_feature_2_subtitle = COALESCE(p_login_feature_2_subtitle, login_feature_2_subtitle),
    login_feature_3_title = COALESCE(p_login_feature_3_title, login_feature_3_title),
    login_feature_3_subtitle = COALESCE(p_login_feature_3_subtitle, login_feature_3_subtitle),
    login_feature_4_title = COALESCE(p_login_feature_4_title, login_feature_4_title),
    login_feature_4_subtitle = COALESCE(p_login_feature_4_subtitle, login_feature_4_subtitle),
    login_background_image_url = COALESCE(p_login_background_image_url, login_background_image_url),
    login_use_background_image = COALESCE(p_login_use_background_image, login_use_background_image),
    login_background_image_opacity = COALESCE(p_login_background_image_opacity, login_background_image_opacity),
    login_hide_logo_on_image = COALESCE(p_login_hide_logo_on_image, login_hide_logo_on_image),
    login_show_text_on_image = COALESCE(p_login_show_text_on_image, login_show_text_on_image),
    habilitar_modo_pj = COALESCE(p_habilitar_modo_pj, habilitar_modo_pj),
    video_url_instalacao = COALESCE(p_video_url_instalacao, video_url_instalacao),
    whatsapp_suporte_url = COALESCE(p_whatsapp_suporte_url, whatsapp_suporte_url),
    webhook_convite_membro = COALESCE(p_webhook_convite_membro, webhook_convite_membro),
    idioma_padrao_planos = COALESCE(p_idioma_padrao_planos, idioma_padrao_planos),
    moeda_padrao_planos = COALESCE(p_moeda_padrao_planos, moeda_padrao_planos),
    habilitar_toggle_periodo_planos = COALESCE(p_habilitar_toggle_periodo_planos, habilitar_toggle_periodo_planos),
    percentual_desconto_anual = COALESCE(p_percentual_desconto_anual, percentual_desconto_anual),
    google_calendar_client_id = COALESCE(p_google_calendar_client_id, google_calendar_client_id),
    google_calendar_client_secret = COALESCE(p_google_calendar_client_secret, google_calendar_client_secret),
    habilitar_conciliacao_ofx = COALESCE(p_habilitar_conciliacao_ofx, habilitar_conciliacao_ofx),
    habilitar_modulo_tutoriais = COALESCE(p_habilitar_modulo_tutoriais, habilitar_modulo_tutoriais),
    habilitar_suporte_whatsapp = COALESCE(p_habilitar_suporte_whatsapp, habilitar_suporte_whatsapp),
    suporte_whatsapp_text = COALESCE(p_suporte_whatsapp_text, suporte_whatsapp_text),
    updated_at = now()
  WHERE id = 1;

  RETURN public.get_system_settings();
END;
$$;

-- =====================================================
-- G. ÍNDICES AUSENTES: investment_positions
-- =====================================================

-- Índice para buscar posições de renda fixa por yield_percentage
CREATE INDEX IF NOT EXISTS idx_investment_positions_yield
  ON public.investment_positions(yield_percentage)
  WHERE yield_percentage IS NOT NULL;

-- Unique constraint: um usuário não pode ter duas posições para o mesmo ativo
CREATE UNIQUE INDEX IF NOT EXISTS investment_positions_usuario_id_asset_id_key
  ON public.investment_positions(usuario_id, asset_id);

-- =====================================================
-- FIM: Sync Gap (30/03/2026)
-- =====================================================

-- =====================================================
-- SYNC GAP 2: Auditoria final exaustiva (30/03/2026)
-- =====================================================

-- =====================================================
-- H. COLUNAS AUSENTES: logo dark/light mode + modal boas-vindas
-- =====================================================

ALTER TABLE public.configuracoes_sistema
  ADD COLUMN IF NOT EXISTS logo_url_header_dark TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_header_light TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_login_dark TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url_login_light TEXT DEFAULT '';

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS exibir_modal_boas_vindas BOOLEAN DEFAULT TRUE;

-- =====================================================
-- I. FUNÇÃO CRÍTICA: verificar_admin_sem_recursao
-- =====================================================
-- Usada na policy configuracoes_admin_segura e google_oauth_secrets_admin.
-- Existia no banco mas nunca foi documentada no arquivo.

CREATE OR REPLACE FUNCTION public.verificar_admin_sem_recursao()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin_user BOOLEAN := FALSE;
BEGIN
    SELECT is_admin INTO is_admin_user
    FROM public.usuarios
    WHERE auth_user = auth.uid();
    RETURN COALESCE(is_admin_user, FALSE);
END;
$$;

-- =====================================================
-- J. POLICY AUSENTE: n8n_chat_admin_insert
-- =====================================================
-- Arquivo tinha SELECT, UPDATE, DELETE mas faltava INSERT para admins.

DROP POLICY IF EXISTS "n8n_chat_admin_insert" ON public.n8n_chat_histories_corporation;
CREATE POLICY "n8n_chat_admin_insert" ON public.n8n_chat_histories_corporation
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.auth_user = (SELECT auth.uid()) AND usuarios.is_admin = true
  ));

-- =====================================================
-- K. ÍNDICES AUSENTES
-- =====================================================

-- FK indexes em tabelas de compliance/LGPD
CREATE INDEX IF NOT EXISTS idx_consentimentos_usuarios_usuario_id
  ON public.consentimentos_usuarios(usuario_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_lgpd_usuario_id
  ON public.solicitacoes_lgpd(usuario_id);

-- FK e compostos em lancamentos_futuros
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_transacao_id
  ON public.lancamentos_futuros(transacao_id);

CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_usuario_status
  ON public.lancamentos_futuros(usuario_id, status);

CREATE INDEX IF NOT EXISTS lancamentos_futuros_mes_previsto_idx
  ON public.lancamentos_futuros(mes_previsto);

-- FK index em transacoes → lancamentos_futuros
CREATE INDEX IF NOT EXISTS idx_transacoes_lancamento_futuro_id
  ON public.transacoes(lancamento_futuro_id);

-- Nota: o banco tem idx_lancamentos_futuros_conta_id (criado diretamente)
-- O arquivo criava idx_lancamentos_futuros_conta (nome diferente, mesmo campo).
-- Ambos coexistem sem problema. Adicionamos o nome canônico do banco:
CREATE INDEX IF NOT EXISTS idx_lancamentos_futuros_conta_id
  ON public.lancamentos_futuros(conta_id);

-- =====================================================
-- L. FUNÇÃO get_system_settings() — campos suporte WhatsApp faltantes
-- =====================================================
-- A versão do arquivo (seção tutoriais) termina em habilitar_modulo_tutoriais.
-- O banco retorna também habilitar_suporte_whatsapp e suporte_whatsapp_text.

DROP FUNCTION IF EXISTS public.get_system_settings();

CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_json jsonb;
BEGIN
  SELECT
    jsonb_build_object(
      'primary_color', primary_color,
      'secondary_color', secondary_color,
      'company_name', company_name,
      'app_name', company_name,
      'company_slogan', company_slogan,
      'white_label_active', white_label_active,
      'support_email', support_email,
      'show_header_logo', show_header_logo,
      'show_header_name', show_header_name,
      'show_sidebar_logo', show_sidebar_logo,
      'show_sidebar_name', show_sidebar_name,
      'show_login_logo', show_login_logo,
      'show_login_name', show_login_name,
      'show_index_name', show_index_name,
      'dias_acesso_free', dias_acesso_free,
      'bloquear_acesso_apos_vencimento', bloquear_acesso_apos_vencimento,
      'support_title', support_title,
      'support_description', support_description,
      'support_info_1', support_info_1,
      'support_info_2', support_info_2,
      'support_info_3', support_info_3
    ) ||
    jsonb_build_object(
      'support_contact_url', support_contact_url,
      'support_contact_text', support_contact_text,
      'whatsapp_contact_url', whatsapp_contact_url,
      'whatsapp_contact_text', whatsapp_contact_text,
      'whatsapp_enabled', whatsapp_enabled,
      'restringir_cadastro_usuarios_existentes', restringir_cadastro_usuarios_existentes,
      'login_welcome_text', login_welcome_text,
      'login_feature_1_title', login_feature_1_title,
      'login_feature_1_subtitle', login_feature_1_subtitle,
      'login_feature_2_title', login_feature_2_title,
      'login_feature_2_subtitle', login_feature_2_subtitle,
      'login_feature_3_title', login_feature_3_title,
      'login_feature_3_subtitle', login_feature_3_subtitle,
      'login_feature_4_title', login_feature_4_title,
      'login_feature_4_subtitle', login_feature_4_subtitle,
      'login_background_image_url', login_background_image_url,
      'login_use_background_image', login_use_background_image,
      'login_background_image_opacity', login_background_image_opacity,
      'login_hide_logo_on_image', login_hide_logo_on_image,
      'login_show_text_on_image', login_show_text_on_image
    ) ||
    jsonb_build_object(
      'habilitar_modo_pj', habilitar_modo_pj,
      'video_url_instalacao', video_url_instalacao,
      'whatsapp_suporte_url', whatsapp_suporte_url,
      'webhook_convite_membro', webhook_convite_membro,
      'idioma_padrao_planos', idioma_padrao_planos,
      'moeda_padrao_planos', moeda_padrao_planos,
      'habilitar_toggle_periodo_planos', habilitar_toggle_periodo_planos,
      'percentual_desconto_anual', percentual_desconto_anual,
      'google_calendar_client_id', google_calendar_client_id,
      'google_calendar_client_secret', google_calendar_client_secret,
      'habilitar_conciliacao_ofx', habilitar_conciliacao_ofx,
      'habilitar_modulo_tutoriais', habilitar_modulo_tutoriais,
      'habilitar_suporte_whatsapp', habilitar_suporte_whatsapp,
      'suporte_whatsapp_text', suporte_whatsapp_text
    )
  INTO settings_json
  FROM public.configuracoes_sistema
  LIMIT 1;

  RETURN settings_json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_settings() TO authenticated, anon;

-- =====================================================
-- FIM: Sync Gap 2 (30/03/2026)
-- =====================================================
