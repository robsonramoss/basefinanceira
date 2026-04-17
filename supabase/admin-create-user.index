import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Criar cliente admin com service role (acesso total, bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar se o chamador e admin (usa o JWT do usuario logado)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado. Faça login novamente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado. Faça login novamente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se e admin
    const { data: adminCheck } = await supabaseAdmin
      .from('usuarios')
      .select('is_admin')
      .eq('auth_user', user.id)
      .single();

    if (!adminCheck?.is_admin) {
      return new Response(JSON.stringify({ error: 'Acesso negado: apenas administradores podem criar usuários.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ler body
    const { nome, email, senha, celular, plano_id, data_final_plano: dataFinalManual, is_admin: novoAdmin } = await req.json();

    if (!email || !senha || !nome) {
      return new Response(JSON.stringify({ error: 'Nome, email e senha são obrigatórios.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Limpar celular: remover máscara e garantir prefixo 55 (Brasil)
    const celularDigitos = celular ? celular.replace(/\D/g, '') : '';
    const celularLimpo = celularDigitos.length > 0
      ? (celularDigitos.startsWith('55') ? celularDigitos : '55' + celularDigitos)
      : null;

    // Buscar dados do plano para preencher plano (texto) e data_final_plano
    let planoNome = 'Free';
    let dataFinalPlano: string | null = null;
    if (plano_id) {
      const { data: planoData } = await supabaseAdmin
        .from('planos_sistema')
        .select('nome, tipo_periodo')
        .eq('id', plano_id)
        .maybeSingle();

      if (planoData) {
        planoNome = planoData.nome;
        const now = new Date();
        const tipo = planoData.tipo_periodo;
        if (tipo === 'mensal') {
          dataFinalPlano = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
        } else if (tipo === 'trimestral') {
          dataFinalPlano = new Date(now.setMonth(now.getMonth() + 3)).toISOString();
        } else if (tipo === 'semestral') {
          dataFinalPlano = new Date(now.setMonth(now.getMonth() + 6)).toISOString();
        } else if (tipo === 'anual') {
          dataFinalPlano = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
        }
      }
    }
    // Sobrescrever com data manual se fornecida
    if (dataFinalManual) dataFinalPlano = new Date(dataFinalManual).toISOString();

    // Criar usuario via API Admin oficial do GoTrue (funciona corretamente para login)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
      app_metadata: { provider: 'email', providers: ['email'] },
    });

    if (authError) {
      // Email ja cadastrado
      if (authError.message.includes('already registered') || authError.status === 422) {
        return new Response(JSON.stringify({
          error: `Email "${email}" já está cadastrado no sistema.`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authUserId = authData.user.id;

    // Inserir/atualizar em public.usuarios
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        nome,
        email,
        celular: celularLimpo,
        plano: planoNome,
        plano_id: plano_id || null,
        is_admin: novoAdmin || false,
        status: 'ativo',
        has_password: true,
        auth_user: authUserId,
        aceite_termos: true,
        data_compra: new Date().toISOString(),
        data_final_plano: dataFinalPlano,
        created_at: new Date().toISOString(),
        ultima_atualizacao: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select('id')
      .single();

    if (usuarioError) {
      // Rollback: deletar usuario do auth se nao conseguiu criar no sistema
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return new Response(JSON.stringify({ error: 'Erro ao criar usuário no sistema: ' + usuarioError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Usuário criado com sucesso com conta de login',
      user_id: usuarioData.id,
      auth_user_id: authUserId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno: ' + String(err) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
