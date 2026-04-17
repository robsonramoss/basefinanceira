import { createClient } from '@/lib/supabase/client';

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * Realiza login do usuário
 */
export async function loginUser(data: LoginData): Promise<LoginResult> {
  try {
    const supabase = createClient();

    // Fazer login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      // Traduzir erros comuns do Supabase para mensagens amigáveis
      const errorMessage = authError.message.toLowerCase();
      
      // Credenciais inválidas (senha errada ou usuário não existe)
      if (errorMessage.includes('invalid login credentials') || 
          errorMessage.includes('invalid credentials')) {
        return {
          success: false,
          error: 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.'
        };
      }

      // Email não confirmado
      if (errorMessage.includes('email not confirmed') || 
          errorMessage.includes('confirm')) {
        return {
          success: false,
          error: 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.'
        };
      }

      // Usuário não encontrado
      if (errorMessage.includes('user not found') || 
          errorMessage.includes('no user')) {
        return {
          success: false,
          error: 'Usuário não encontrado. Verifique seu email ou crie uma nova conta.'
        };
      }

      // Muitas tentativas
      if (errorMessage.includes('too many requests') || 
          errorMessage.includes('rate limit')) {
        return {
          success: false,
          error: 'Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente.'
        };
      }

      // Email inválido
      if (errorMessage.includes('invalid email')) {
        return {
          success: false,
          error: 'Email inválido. Verifique o formato do email.'
        };
      }

      // Erro genérico (não expor detalhes técnicos)
      return {
        success: false,
        error: 'Não foi possível fazer login. Verifique suas credenciais e tente novamente.'
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Erro ao fazer login'
      };
    }

    // Registrar último acesso (opcional, pode ser feito via trigger também)
    try {
      await supabase.rpc('registrar_acesso_usuario');
    } catch (error) {
      // Não falha o login se der erro
    }

    return {
      success: true,
      userId: authData.user.id
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro ao fazer login. Tente novamente.'
    };
  }
}

/**
 * Realiza logout do usuário
 */
export async function logoutUser(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (error) {
    // Ignora erro no logout
  }
}

/**
 * Verifica se o usuário está autenticado
 */
export async function getCurrentUser() {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}
