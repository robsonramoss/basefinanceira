'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ResetPasswordPageContent } from '@/components/auth/reset-password-page-content';

export function ResetPasswordWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const supabase = createClient();

    // Check for errors in URL query params
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    console.log('=== REDEFINIR SENHA PAGE ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash ? 'PRESENT' : 'EMPTY');

    if (error || errorCode) {
      if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
        router.push('/esqueci-senha?error=link_expirado');
        return;
      }
      router.push('/esqueci-senha?error=link_invalido');
      return;
    }

    const handleSession = async () => {
      // STEP 1: Check if URL hash contains tokens from implicit flow redirect
      // When Supabase uses implicit flow, it redirects with:
      // /redefinir-senha#access_token=...&refresh_token=...&type=recovery
      const hash = window.location.hash.substring(1); // remove #
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('Hash fragment detected, access_token:', accessToken ? 'PRESENT' : 'ABSENT');

        if (accessToken && refreshToken) {
          console.log('Setting session from hash fragment tokens...');

          const { data, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          // Clean hash from URL to avoid re-processing
          window.history.replaceState(null, '', window.location.pathname);

          if (setError) {
            console.error('Failed to set session from hash:', setError);
            router.push('/esqueci-senha?error=sessao_invalida');
            return;
          }

          if (data.session) {
            console.log('Session established from hash fragment');
            setHasSession(true);
            setIsLoading(false);
            return;
          }
        }
      }

      // STEP 2: Check if URL has PKCE code (desktop, same browser)
      const code = searchParams.get('code');
      if (code) {
        console.log('PKCE code found, exchanging for session...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange failed:', exchangeError);
          router.push('/esqueci-senha?error=link_expirado');
          return;
        }

        console.log('PKCE code exchanged successfully');
        setHasSession(true);
        setIsLoading(false);
        return;
      }

      // STEP 3: Check for existing session (user already authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Existing session found');
        setHasSession(true);
        setIsLoading(false);
        return;
      }

      // No session found
      console.log('No session found by any method');
      setIsLoading(false);
    };

    // Listen for auth events as fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setHasSession(true);
        setIsLoading(false);
      }
    });

    handleSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  // Redirect if no session after loading
  useEffect(() => {
    if (!isLoading && !hasSession) {
      router.push('/esqueci-senha?error=sessao_invalida');
    }
  }, [isLoading, hasSession, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return <ResetPasswordPageContent />;
}
