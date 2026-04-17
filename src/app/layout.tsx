import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/language-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { BrandingProvider } from "@/contexts/branding-context";
import { BrandingStyleInjector } from "@/components/branding-style-injector";
import { ThemeProvider } from "@/contexts/theme-context";
import { PWARegister } from "@/components/pwa-register";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();

  try {
    const { data } = await supabase.rpc('get_system_settings').single();

    const appName = (data as any)?.app_name || 'Gestão Financeira';
    const primaryColor = (data as any)?.primary_color || '#22C55E';

    // Usar apenas arquivos estáticos da pasta public/
    const faviconUrl = '/favicon.ico';
    const favicon96Url = '/favicon-96x96.png';
    const appleTouchUrl = '/apple-touch-icon.png';

    return {
      title: appName,
      description: `Sistema de gestão financeira - ${appName}`,
      manifest: '/api/manifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: appName,
      },
      formatDetection: {
        telephone: false,
      },
      icons: {
        icon: [
          { url: favicon96Url, sizes: '96x96', type: 'image/png' },
          { url: faviconUrl, type: 'image/x-icon' },
        ],
        shortcut: faviconUrl,
        apple: [
          { url: appleTouchUrl, sizes: '180x180', type: 'image/png' },
        ],
      },
    };
  } catch (error) {
    return {
      title: 'Gestão Financeira',
      description: 'Sistema de gestão financeira',
      manifest: '/api/manifest',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Gestão Financeira',
      },
    };
  }
}

export async function generateViewport(): Promise<Viewport> {
  const supabase = await createClient();
  let themeColor = '#22C55E';
  try {
    const { data } = await supabase.rpc('get_system_settings').single();
    themeColor = (data as any)?.primary_color || '#22C55E';
  } catch { }
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="hzXkIrbT7p1751ve6pVflwT8_QLNFBKXVsL-YWlGzaI" />
        <BrandingStyleInjector />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <BrandingProvider>
                  <PWARegister />
                  {children}
                </BrandingProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
