import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  
  // Rotas públicas que não precisam de auth ou verificação de plano
  // /planos agora é pública!
  if (!isDashboardRoute && !isAdminRoute) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Se não tem usuário, redireciona para login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Permitir acesso à página /blocked sem verificação
  if (request.nextUrl.pathname === '/blocked') {
    return response
  }

  // SEGURANÇA: Verificar se é admin ANTES de qualquer bloqueio
  const { data: adminCheck } = await supabase
    .from('usuarios')
    .select('is_admin')
    .eq('auth_user', user.id)
    .single()

  // Admin nunca é bloqueado - retornar imediatamente
  if (adminCheck?.is_admin) {
    response.cookies.delete('subscription_status')
    response.cookies.delete('days_expired')
    return response
  }

  // --- Lógica de Bloqueio por Plano Expirado (SEGURANÇA) ---
  // IMPORTANTE: Usar RPC do backend para validação segura
  const { data: accessInfo, error: accessError } = await supabase.rpc('verificar_meu_acesso')

  if (!accessError && accessInfo) {
    // Admin nunca é bloqueado (double-check)
    if (!accessInfo.isAdmin) {
      // Calcular dias expirado
      let daysExpired = 0;
      if (accessInfo.dataFinalPlano) {
        const expirationDate = new Date(accessInfo.dataFinalPlano);
        const now = new Date();
        const diffTime = now.getTime() - expirationDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          daysExpired = diffDays;
        }
      }

      // BLOQUEIO TOTAL: 14+ dias expirado OU backend retornou isBlocked
      if (daysExpired >= 14 || accessInfo.isBlocked) {
        // Redirecionar para página de bloqueio
        return NextResponse.redirect(new URL('/blocked', request.url))
      }
      
      // BLOQUEIO SUAVE: 1-13 dias expirado
      if (daysExpired >= 1 && daysExpired < 14) {
        response.cookies.set('subscription_status', 'soft-blocked')
        response.cookies.set('days_expired', daysExpired.toString())
      } else {
        // Limpar cookies se estiver ativo
        response.cookies.delete('subscription_status')
        response.cookies.delete('days_expired')
      }
    } else {
      // Admin: limpar cookies
      response.cookies.delete('subscription_status')
      response.cookies.delete('days_expired')
    }
  }

  // Se está tentando acessar rota admin, verificar se é admin
  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from('usuarios')
      .select('is_admin')
      .eq('auth_user', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
