"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hexToHSL } from "@/lib/colors";

interface BrandingSettings {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  habilitar_modo_pj?: boolean;
  restringir_cadastro_usuarios_existentes?: boolean;
  dias_acesso_free?: number;
  show_sidebar_logo?: boolean;
  show_sidebar_name?: boolean;
  show_login_logo?: boolean;
  show_login_name?: boolean;
  idioma_padrao_planos?: 'pt' | 'es' | 'en';
  moeda_padrao_planos?: 'BRL' | 'USD' | 'EUR' | 'PYG' | 'ARS';
  habilitar_toggle_periodo_planos?: boolean;
  percentual_desconto_anual?: number;
  habilitar_conciliacao_ofx?: boolean;
  habilitar_modulo_tutoriais?: boolean;
  // Removido: appLogoUrl, logo_url_*, favicon_url, pwa_icon_*, apple_touch_icon_url
  // Logos agora são gerenciados apenas via arquivos estáticos na pasta public/
}

const defaultSettings: BrandingSettings = {
  appName: "Gestão Financeira",
  primaryColor: "#22C55E",
  secondaryColor: "#0A0F1C",
  supportEmail: "",
  habilitar_modo_pj: true,
  restringir_cadastro_usuarios_existentes: false,
  habilitar_modulo_tutoriais: true,
};

interface BrandingContextType {
  settings: BrandingSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => { },
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Carregar settings ANTES do primeiro render (evita hydration mismatch)
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Tentar window.__BRANDING__ primeiro (blocking script)
        if (window.__BRANDING__) {
          setSettings(window.__BRANDING__);
          setLoading(false);
          return;
        }

        // Fallback: localStorage
        const cached = localStorage.getItem('branding_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings(parsed);
          setLoading(false);
        }
      } catch (e) {
      }
    }
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_settings');

      if (!error && data) {
        // A RPC retorna um array, pegar o primeiro item
        const settingsData = Array.isArray(data) ? data[0] : data;

        if (settingsData) {
          const newSettings = {
            appName: settingsData.company_name || settingsData.app_name || defaultSettings.appName,
            primaryColor: settingsData.primary_color || defaultSettings.primaryColor,
            secondaryColor: settingsData.secondary_color || defaultSettings.secondaryColor,
            supportEmail: settingsData.support_email || defaultSettings.supportEmail,
            habilitar_modo_pj: settingsData.habilitar_modo_pj !== false, // Default true
            restringir_cadastro_usuarios_existentes: settingsData.restringir_cadastro_usuarios_existentes === true, // Default false
            dias_acesso_free: settingsData.dias_acesso_free, // Usar valor direto do banco, sem fallback
            show_sidebar_logo: settingsData.show_sidebar_logo || false,
            show_sidebar_name: settingsData.show_sidebar_name !== false, // Default true
            show_login_logo: settingsData.show_login_logo || false,
            show_login_name: settingsData.show_login_name !== false, // Default true
            idioma_padrao_planos: settingsData.idioma_padrao_planos || 'pt',
            moeda_padrao_planos: settingsData.moeda_padrao_planos || 'BRL',
            habilitar_toggle_periodo_planos: settingsData.habilitar_toggle_periodo_planos !== false, // Default true
            percentual_desconto_anual: settingsData.percentual_desconto_anual || 15, // Default 15%
            habilitar_conciliacao_ofx: settingsData.habilitar_conciliacao_ofx !== false, // Default true
            habilitar_modulo_tutoriais: settingsData.habilitar_modulo_tutoriais !== false, // Default true
            // Removido: Todos os campos *_url não são mais carregados
          };

          // Só atualiza se realmente mudou (evita re-renders desnecessários)
          setSettings(prev => {
            if (JSON.stringify(prev) === JSON.stringify(newSettings)) {
              return prev; // Não atualiza se for igual
            }
            return newSettings;
          });

          // Aplicar cores CSS dinamicamente
          if (typeof document !== 'undefined') {
            const primaryColor = settingsData.primary_color || defaultSettings.primaryColor;

            // Tailwind 4 suporta HEX diretamente em variáveis CSS
            document.documentElement.style.setProperty('--primary', primaryColor);
            document.documentElement.style.setProperty('--ring', primaryColor);

            // Salvar TODAS as configurações no localStorage para evitar flash
            try {
              localStorage.setItem('branding_settings', JSON.stringify(newSettings));
            } catch (e) {
            }

            // Opcional: Atualizar meta theme-color
            // const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            // if (metaThemeColor) metaThemeColor.setAttribute('content', primaryColor);
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Aplicar cores CSS do cache imediatamente (antes do primeiro paint)
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('branding_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          document.documentElement.style.setProperty('--primary', parsed.primaryColor);
          document.documentElement.style.setProperty('--ring', parsed.primaryColor);
        } else if (settings.primaryColor) {
          // Fallback: usar settings atual
          document.documentElement.style.setProperty('--primary', settings.primaryColor);
          document.documentElement.style.setProperty('--ring', settings.primaryColor);
        }
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <BrandingContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
