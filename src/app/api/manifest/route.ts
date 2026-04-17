import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Buscar configurações do sistema
    const { data, error } = await supabase.rpc('get_system_settings');
    
    if (error) {
      console.error('Error fetching system settings:', error);
      // Retornar manifest padrão em caso de erro
      return NextResponse.json(getDefaultManifest());
    }
    
    const settings = Array.isArray(data) ? data[0] : data;
    
    if (!settings) {
      return NextResponse.json(getDefaultManifest());
    }
    
    // Construir manifest dinâmico
    const manifest = {
      name: settings.company_name ? `${settings.company_name} - Gestão Financeira` : 'Gestão Financeira',
      short_name: settings.company_name || 'Finanças',
      description: settings.company_name ? `Sistema completo de gestão financeira - ${settings.company_name}` : 'Sistema completo de gestão financeira pessoal e empresarial',
      start_url: '/dashboard',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: settings.primary_color || '#22C55E',
      orientation: 'portrait-primary',
      scope: '/',
      icons: buildIcons(),
      screenshots: [
        {
          src: '/screenshot-mobile.png',
          sizes: '390x844',
          type: 'image/png',
          form_factor: 'narrow'
        },
        {
          src: '/screenshot-desktop.png',
          sizes: '1920x1080',
          type: 'image/png',
          form_factor: 'wide'
        }
      ],
      categories: ['finance', 'productivity', 'business'],
      shortcuts: [
        {
          name: 'Nova Receita',
          short_name: 'Receita',
          description: 'Adicionar nova receita',
          url: '/dashboard/receitas?action=new',
          icons: [{ 
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192' 
          }]
        },
        {
          name: 'Nova Despesa',
          short_name: 'Despesa',
          description: 'Adicionar nova despesa',
          url: '/dashboard/despesas?action=new',
          icons: [{ 
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192' 
          }]
        },
        {
          name: 'Relatórios',
          short_name: 'Relatórios',
          description: 'Ver relatórios financeiros',
          url: '/dashboard/relatorios',
          icons: [{ 
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192' 
          }]
        }
      ],
      share_target: {
        action: '/dashboard/transacoes',
        method: 'GET',
        params: {
          title: 'title',
          text: 'text'
        }
      }
    };
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
      }
    });
  } catch (error) {
    console.error('Error generating manifest:', error);
    return NextResponse.json(getDefaultManifest());
  }
}

function buildIcons() {
  // Usar apenas arquivos estáticos da pasta public/
  return [
    {
      src: '/web-app-manifest-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/web-app-manifest-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png'
    }
  ];
}

function getDefaultManifest() {
  return {
    name: 'Gestão Financeira',
    short_name: 'Finanças',
    description: 'Sistema completo de gestão financeira pessoal e empresarial',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#22C55E',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],
    categories: ['finance', 'productivity', 'business']
  };
}
