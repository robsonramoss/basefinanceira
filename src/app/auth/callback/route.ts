import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const rawNext = requestUrl.searchParams.get('next') || '/dashboard';
  // Prevent open redirect: only allow relative paths starting with /
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/dashboard';

  // Handle Vercel reverse proxy: use x-forwarded-host for the real origin
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost ? `https://${forwardedHost}` : requestUrl.origin;

  // Debug logging
  console.log('=== AUTH CALLBACK DEBUG ===');
  console.log('Full URL:', request.url);
  console.log('Code:', code);
  console.log('Token Hash:', tokenHash);
  console.log('Type:', type);
  console.log('Next:', next);
  console.log('Origin:', origin);

  // Token hash flow: works cross-browser/device (no code_verifier cookie needed)
  if (tokenHash && type) {
    try {
      const cookieStore = await cookies();
      const newCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              newCookies.push(...cookiesToSet);
            },
          },
        }
      );

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change',
      });

      if (error) {
        console.error('Token verification error:', error);
        return NextResponse.redirect(`${origin}/esqueci-senha?error=link_expirado`);
      }

      // For password recovery, always redirect to redefinir-senha page
      const redirectPath = type === 'recovery' ? '/redefinir-senha' : next;
      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      newCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
      });

      return response;
    } catch (err) {
      console.error('Callback error:', err);
      return NextResponse.redirect(`${origin}/esqueci-senha?error=callback_error`);
    }
  }

  // PKCE code flow: works when link is opened in same browser where reset was requested
  if (code) {
    try {
      const cookieStore = await cookies();

      // Capture session cookies that Supabase wants to set
      const newCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              // Read via next/headers — required for PKCE code_verifier access
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              // Capture what Supabase wants to set (don't write to cookieStore)
              newCookies.push(...cookiesToSet);
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Code exchange error:', error);
        return NextResponse.redirect(`${origin}/esqueci-senha?error=link_expirado`);
      }

      // For password recovery (when type=recovery in URL), redirect to redefinir-senha
      const redirectPath = type === 'recovery' ? '/redefinir-senha' : next;
      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      newCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
      });

      return response;
    } catch (err) {
      console.error('Callback error:', err);
      return NextResponse.redirect(`${origin}/esqueci-senha?error=callback_error`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
