-- ============================================================================
-- MIGRATION: Lembretes + Google Calendar Integration
-- Execute este arquivo no SQL Editor do Supabase para criar todas as tabelas,
-- índices, políticas RLS, triggers e campos necessários.
-- ============================================================================

-- ============================================================================
-- 1. TABELA: lembretes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lembretes (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  usuario_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  data_lembrete date NOT NULL,
  hora_lembrete time WITHOUT TIME ZONE,
  status text NOT NULL DEFAULT 'ativo',
  notificado boolean DEFAULT false,
  data_notificacao timestamptz,
  recorrente boolean DEFAULT false,
  tipo_recorrencia text,
  data_ultima_alteracao timestamptz DEFAULT now(),
  hora_fim time WITHOUT TIME ZONE,
  calendar_type text DEFAULT 'pf',
  google_event_id text UNIQUE,
  last_updated_by text DEFAULT 'system',
  participantes jsonb DEFAULT '[]'::jsonb,
  cor text DEFAULT NULL
);

-- Constraints
ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_status_check;
ALTER TABLE public.lembretes ADD CONSTRAINT lembretes_status_check 
  CHECK (status = ANY (ARRAY['ativo'::text, 'executado'::text, 'cancelado'::text]));

ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_tipo_recorrencia_check;
ALTER TABLE public.lembretes ADD CONSTRAINT lembretes_tipo_recorrencia_check
  CHECK (tipo_recorrencia IS NULL OR tipo_recorrencia = ANY (ARRAY[
    'diario'::text, 'semanal'::text, 'quinzenal'::text,
    'mensal'::text, 'bimestral'::text, 'trimestral'::text,
    'semestral'::text, 'anual'::text
  ]));

ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_calendar_type_check;
ALTER TABLE public.lembretes ADD CONSTRAINT lembretes_calendar_type_check 
  CHECK (calendar_type = ANY (ARRAY['pf'::text, 'pj'::text]));

ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_last_updated_by_check;
ALTER TABLE public.lembretes ADD CONSTRAINT lembretes_last_updated_by_check 
  CHECK (last_updated_by = ANY (ARRAY['system'::text, 'google_webhook'::text, 'google_sync'::text, 'user'::text]));

-- Índices
CREATE INDEX IF NOT EXISTS idx_lembretes_usuario_id ON public.lembretes USING btree (usuario_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_data_status ON public.lembretes USING btree (data_lembrete, status);
CREATE INDEX IF NOT EXISTS idx_lembretes_notificacao ON public.lembretes USING btree (notificado, status) WHERE (status = 'ativo'::text);
CREATE INDEX IF NOT EXISTS idx_lembretes_google_id ON public.lembretes USING btree (google_event_id) WHERE (google_event_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_lembretes_participantes ON public.lembretes USING gin (participantes);

-- Trigger: auto-update updated_at e data_ultima_alteracao
CREATE OR REPLACE FUNCTION public.update_lembretes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.data_ultima_alteracao = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_lembretes_updated_at ON public.lembretes;
CREATE TRIGGER trigger_lembretes_updated_at
  BEFORE UPDATE ON public.lembretes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lembretes_updated_at();

-- RLS
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lembretes_select_segura" ON public.lembretes;
CREATE POLICY "lembretes_select_segura" ON public.lembretes
  FOR SELECT USING (usuario_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "lembretes_insert_segura" ON public.lembretes;
CREATE POLICY "lembretes_insert_segura" ON public.lembretes
  FOR INSERT WITH CHECK (usuario_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "lembretes_update_segura" ON public.lembretes;
CREATE POLICY "lembretes_update_segura" ON public.lembretes
  FOR UPDATE USING (usuario_id = verificar_proprietario_por_auth());

DROP POLICY IF EXISTS "lembretes_delete_segura" ON public.lembretes;
CREATE POLICY "lembretes_delete_segura" ON public.lembretes
  FOR DELETE USING (usuario_id = verificar_proprietario_por_auth());


-- ============================================================================
-- 2. TABELA: google_calendar_integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_calendar_integrations (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  scope text,
  expires_at timestamptz,
  calendar_id_pf text DEFAULT 'primary',
  calendar_name_pf text,
  calendar_id_pj text DEFAULT 'primary',
  calendar_name_pj text,
  is_active boolean DEFAULT true,
  sync_enabled_pf boolean DEFAULT true,
  sync_enabled_pj boolean DEFAULT true,
  google_email text,
  google_user_id text,
  connected_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  antecedencia_minutos integer DEFAULT 30,
  resumo_diario_ativo boolean DEFAULT false,
  resumo_diario_horario time WITHOUT TIME ZONE DEFAULT '22:00:00',
  resumo_diario_tipo text DEFAULT 'AMANHA'
);

-- Constraint: um registro por usuário
ALTER TABLE public.google_calendar_integrations DROP CONSTRAINT IF EXISTS unique_usuario_google;
ALTER TABLE public.google_calendar_integrations ADD CONSTRAINT unique_usuario_google UNIQUE (usuario_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_google_calendar_usuario ON public.google_calendar_integrations USING btree (usuario_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_email ON public.google_calendar_integrations USING btree (google_email);
CREATE INDEX IF NOT EXISTS idx_google_calendar_active ON public.google_calendar_integrations USING btree (is_active) WHERE (is_active = true);

-- RLS
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role acesso total google calendar" ON public.google_calendar_integrations;
CREATE POLICY "Service role acesso total google calendar" ON public.google_calendar_integrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario ve apenas sua integracao" ON public.google_calendar_integrations;
DROP POLICY IF EXISTS "google_cal_select" ON public.google_calendar_integrations;
DROP POLICY IF EXISTS "google_cal_insert" ON public.google_calendar_integrations;
DROP POLICY IF EXISTS "google_cal_update" ON public.google_calendar_integrations;
DROP POLICY IF EXISTS "google_cal_delete" ON public.google_calendar_integrations;

-- Secure RLS: user can only access their own integration
CREATE POLICY "google_cal_select_segura" ON public.google_calendar_integrations
  FOR SELECT TO authenticated
  USING (usuario_id = verificar_proprietario_por_auth());

CREATE POLICY "google_cal_insert_segura" ON public.google_calendar_integrations
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = verificar_proprietario_por_auth());

CREATE POLICY "google_cal_update_segura" ON public.google_calendar_integrations
  FOR UPDATE TO authenticated
  USING (usuario_id = verificar_proprietario_por_auth())
  WITH CHECK (usuario_id = verificar_proprietario_por_auth());

CREATE POLICY "google_cal_delete_segura" ON public.google_calendar_integrations
  FOR DELETE TO authenticated
  USING (usuario_id = verificar_proprietario_por_auth());


-- ============================================================================
-- 3. CAMPOS NOVOS: configuracoes_sistema (Google Calendar credentials - legacy)
-- ============================================================================
ALTER TABLE public.configuracoes_sistema 
  ADD COLUMN IF NOT EXISTS google_calendar_client_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_calendar_client_secret text DEFAULT '';


-- ============================================================================
-- 4. TABELA SEGURA: google_oauth_secrets (secrets isolados com RLS restrita)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.google_oauth_secrets (
    id serial PRIMARY KEY,
    client_id text DEFAULT '',
    client_secret text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.google_oauth_secrets ENABLE ROW LEVEL SECURITY;

-- Only service_role can access directly
CREATE POLICY "google_oauth_secrets_service_role" ON public.google_oauth_secrets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin users can manage secrets
CREATE POLICY "google_oauth_secrets_admin" ON public.google_oauth_secrets
    FOR ALL TO authenticated
    USING (verificar_admin_sem_recursao())
    WITH CHECK (verificar_admin_sem_recursao());

-- Secure RPC to read credentials (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_google_calendar_credentials()
RETURNS TABLE(client_id TEXT, client_secret TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.client_id::TEXT,
        s.client_secret::TEXT
    FROM google_oauth_secrets s
    WHERE s.id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_google_calendar_credentials() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_google_calendar_credentials() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_google_calendar_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_google_calendar_credentials() TO service_role;


-- ============================================================================
-- 5. FIX: search_path em funcoes (previne search_path injection)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_lembretes_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_google_calendar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trigger_google_calendar_updated_at ON public.google_calendar_integrations;
CREATE TRIGGER trigger_google_calendar_updated_at
  BEFORE UPDATE ON public.google_calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_google_calendar_updated_at();

CREATE OR REPLACE FUNCTION public.is_google_token_valid(p_usuario_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_expires_at TIMESTAMPTZ; v_refresh_token TEXT;
BEGIN
    SELECT expires_at, refresh_token INTO v_expires_at, v_refresh_token
    FROM public.google_calendar_integrations
    WHERE usuario_id = p_usuario_id AND is_active = true;
    IF v_refresh_token IS NULL THEN RETURN false; END IF;
    IF v_expires_at IS NULL OR v_expires_at < NOW() THEN RETURN false; END IF;
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_google_calendar_id(p_usuario_id integer, p_tipo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calendar_id TEXT;
BEGIN
    IF p_tipo = 'PF' THEN
        SELECT calendar_id_pf INTO v_calendar_id FROM public.google_calendar_integrations
        WHERE usuario_id = p_usuario_id AND is_active = true AND sync_enabled_pf = true;
    ELSIF p_tipo = 'PJ' THEN
        SELECT calendar_id_pj INTO v_calendar_id FROM public.google_calendar_integrations
        WHERE usuario_id = p_usuario_id AND is_active = true AND sync_enabled_pj = true;
    END IF;
    RETURN COALESCE(v_calendar_id, 'primary');
END; $$;

CREATE OR REPLACE FUNCTION public.log_google_calendar_error(p_usuario_id integer, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.google_calendar_integrations
    SET last_error = p_error, last_error_at = NOW()
    WHERE usuario_id = p_usuario_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_google_tokens(p_usuario_id integer, p_access_token text, p_expires_in integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.google_calendar_integrations
    SET access_token = p_access_token,
        expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
        last_sync_at = NOW(), last_error = NULL, last_error_at = NULL
    WHERE usuario_id = p_usuario_id;
END; $$;


-- ============================================================================
-- 6. FIX: Views SECURITY INVOKER (respeitar RLS das tabelas subjacentes)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_google_calendar_status
WITH (security_invoker = true) AS
SELECT usuario_id, google_email, is_active, sync_enabled_pf, sync_enabled_pj,
    calendar_name_pf, calendar_name_pj, connected_at, last_sync_at,
    CASE
        WHEN refresh_token IS NULL THEN 'disconnected'
        WHEN expires_at IS NULL OR expires_at < now() THEN 'token_expired'
        WHEN is_active = false THEN 'paused'
        ELSE 'connected'
    END AS status,
    last_error, last_error_at
FROM google_calendar_integrations;

REVOKE ALL ON public.v_google_calendar_status FROM anon;


-- ============================================================================
-- 7. FIX #7: Validacao de ownership nas RPCs Google Calendar
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_google_token_valid(p_usuario_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_expires_at TIMESTAMPTZ; v_refresh_token TEXT;
BEGIN
    IF p_usuario_id != verificar_proprietario_por_auth() THEN RETURN false; END IF;
    SELECT expires_at, refresh_token INTO v_expires_at, v_refresh_token
    FROM public.google_calendar_integrations
    WHERE usuario_id = p_usuario_id AND is_active = true;
    IF v_refresh_token IS NULL THEN RETURN false; END IF;
    IF v_expires_at IS NULL OR v_expires_at < NOW() THEN RETURN false; END IF;
    RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_google_calendar_id(p_usuario_id integer, p_tipo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calendar_id TEXT;
BEGIN
    IF p_usuario_id != verificar_proprietario_por_auth() THEN RETURN NULL; END IF;
    IF p_tipo = 'PF' THEN
        SELECT calendar_id_pf INTO v_calendar_id FROM public.google_calendar_integrations
        WHERE usuario_id = p_usuario_id AND is_active = true AND sync_enabled_pf = true;
    ELSIF p_tipo = 'PJ' THEN
        SELECT calendar_id_pj INTO v_calendar_id FROM public.google_calendar_integrations
        WHERE usuario_id = p_usuario_id AND is_active = true AND sync_enabled_pj = true;
    END IF;
    RETURN COALESCE(v_calendar_id, 'primary');
END; $$;

CREATE OR REPLACE FUNCTION public.log_google_calendar_error(p_usuario_id integer, p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_usuario_id != verificar_proprietario_por_auth() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
    UPDATE public.google_calendar_integrations
    SET last_error = p_error, last_error_at = NOW()
    WHERE usuario_id = p_usuario_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_google_tokens(p_usuario_id integer, p_access_token text, p_expires_in integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_usuario_id != verificar_proprietario_por_auth() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
    UPDATE public.google_calendar_integrations
    SET access_token = p_access_token,
        expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
        last_sync_at = NOW(), last_error = NULL, last_error_at = NULL
    WHERE usuario_id = p_usuario_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.is_google_token_valid(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_google_calendar_id(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_google_calendar_error(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_google_tokens(integer, text, integer) FROM anon;


-- ============================================================================
-- 8. FIX #11: Revogar EXECUTE de anon nas RPCs admin (defesa em profundidade)
-- Nota: Usamos blocos DO para tolerar erros se as funções ainda não existirem
--       (ex: rodar esta migration antes do setup_differential_COMPLETO.sql)
-- ============================================================================

DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_clear_chat_history(integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_auth_for_user(integer, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_user_with_auth(text, text, text, text, integer, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_dependente(integer, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_plan(integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_delete_user(integer, boolean, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_dependentes_stats() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_system_stats() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_get_user_stats() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_dependentes(text, text[], text[], boolean, integer, integer, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_plans() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_list_users_v2(text, integer[], text[], boolean, boolean, date, date, boolean, integer, integer, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_reset_dependente_password(integer, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(integer, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_dependente(integer, text, text, text, text, jsonb, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_user(integer, text, text, text, integer, text, boolean, timestamptz, timestamptz) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(text, text, numeric, text, text, jsonb, boolean, integer, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_plan(varchar, varchar, numeric, text, text, text, boolean, integer, boolean, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, text, text, numeric, text, text, jsonb, boolean, integer, boolean, integer, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_update_plan(integer, varchar, varchar, numeric, text, text, text, boolean, integer, boolean, integer, boolean, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.reset_user_password_admin(integer, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_transaction_stats_admin() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_user_stats_admin() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_usuarios_for_admin() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- 9. FIX: Revogar EXECUTE de anon em funcoes admin-like SEM prefixo admin_
-- ============================================================================

DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_user_admin(text, text, text, integer, boolean, text, uuid) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_admin(integer, boolean, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_admin_v2(integer, boolean, boolean) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_user_admin(integer, text, text, text, integer, boolean, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_user_admin(integer, text, text, text, integer, boolean, text, text, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_system_settings(text, text, text, text, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_system_settings(text, text, text, text, text, text, text, boolean, integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_all_users_admin(integer, integer, text) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_financial_stats_admin() FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_usuarios_ultimos_dias(integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.clear_user_chat_history_admin(integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- 10. FIX: Revogar EXECUTE de anon em RPCs legadas sem ownership check
-- ============================================================================

DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calcular_dias_restantes_free(integer) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_metas_usuario(integer, date) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calcular_progresso_meta(integer, date) FROM anon, public'; EXCEPTION WHEN undefined_function THEN NULL; END $$;


-- ============================================================================
-- 11. SYNC BIDIRECIONAL: Novos campos para webhooks e sync tokens
-- ============================================================================
-- Permite receber notificações do Google Calendar quando eventos são
-- criados/editados/deletados diretamente no Google.

-- Campos para gerenciamento de webhooks (PF e PJ separados)
ALTER TABLE public.google_calendar_integrations 
  ADD COLUMN IF NOT EXISTS webhook_channel_id_pf TEXT,
  ADD COLUMN IF NOT EXISTS webhook_resource_id_pf TEXT,
  ADD COLUMN IF NOT EXISTS webhook_expiration_pf TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_token_pf TEXT,
  ADD COLUMN IF NOT EXISTS webhook_channel_id_pj TEXT,
  ADD COLUMN IF NOT EXISTS webhook_resource_id_pj TEXT,
  ADD COLUMN IF NOT EXISTS webhook_expiration_pj TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_token_pj TEXT,
  ADD COLUMN IF NOT EXISTS sync_token_pf TEXT,
  ADD COLUMN IF NOT EXISTS sync_token_pj TEXT,
  ADD COLUMN IF NOT EXISTS last_incoming_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enable_bidirectional_sync BOOLEAN DEFAULT FALSE;

-- Campo para identificar lembretes originados do Google Calendar
ALTER TABLE public.lembretes 
  ADD COLUMN IF NOT EXISTS synced_from_google BOOLEAN DEFAULT FALSE;

-- Melhorar UNIQUE de google_event_id para suporte multi-user
-- Antes: UNIQUE global (impede calendários compartilhados entre usuários)
-- Depois: UNIQUE por (google_event_id, usuario_id)
ALTER TABLE public.lembretes DROP CONSTRAINT IF EXISTS lembretes_google_event_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lembretes_google_event_usuario 
  ON public.lembretes(google_event_id, usuario_id) 
  WHERE google_event_id IS NOT NULL;

-- Índices para performance de webhook lookup
CREATE INDEX IF NOT EXISTS idx_gcal_webhook_channel_pf 
  ON public.google_calendar_integrations(webhook_channel_id_pf) 
  WHERE webhook_channel_id_pf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gcal_webhook_channel_pj 
  ON public.google_calendar_integrations(webhook_channel_id_pj) 
  WHERE webhook_channel_id_pj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gcal_bidirectional_active
  ON public.google_calendar_integrations(enable_bidirectional_sync)
  WHERE enable_bidirectional_sync = TRUE AND is_active = TRUE;


-- ============================================================================
-- 12. REALTIME: Habilitar Realtime na tabela lembretes
-- ============================================================================
-- Necessário para que o frontend receba atualizações em tempo real
-- (ex: lembretes criados/atualizados via webhook do Google Calendar)
-- Nota: google_calendar_integrations NÃO está no realtime (dados sensíveis de tokens)

ALTER PUBLICATION supabase_realtime ADD TABLE public.lembretes;


-- ============================================================================
-- 13. EDGE FUNCTIONS: Documentação das funções implantadas no Supabase
-- ============================================================================
-- As Edge Functions abaixo são parte deste módulo e devem ser mantidas no Supabase.
-- Os arquivos-fonte estão em: granazap/supabase/functions/
--
-- google-calendar-cron  (verify_jwt: false)
--   Função executada via cron para sincronização periódica de eventos do Google Calendar.
--   Renova tokens expirados, faz push de lembretes pendentes e reconcilia o estado.
--
-- google-calendar-webhook  (verify_jwt: false)
--   Recebe notificações push do Google Calendar (canal de webhook registrado via Watch API).
--   Processa criações, edições e exclusões de eventos feitas diretamente no Google Calendar
--   e espelha as mudanças na tabela lembretes (sync bidirecional).
--
-- IMPORTANTE: verify_jwt=false nessas funções é intencional — o Google não envia JWT
-- Supabase. A autenticação é feita via webhook_token armazenado em google_calendar_integrations.
