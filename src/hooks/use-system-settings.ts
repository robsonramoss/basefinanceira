import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SystemSettings {
  whatsappContactUrl: string | null; // WhatsApp para automação/IA
  whatsappSuporteUrl: string | null; // WhatsApp para suporte humano
  whatsappContactText: string | null;
  whatsappEnabled: boolean;
  supportEmail: string | null;
  companyName: string | null;
  loading: boolean;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    whatsappContactUrl: null,
    whatsappSuporteUrl: null,
    whatsappContactText: null,
    whatsappEnabled: false,
    supportEmail: null,
    companyName: null,
    loading: true,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('configuracoes_sistema')
          .select('whatsapp_contact_url, whatsapp_suporte_url, whatsapp_contact_text, whatsapp_enabled, support_email, company_name')
          .eq('id', 1)
          .single();

        if (error) throw error;

        setSettings({
          whatsappContactUrl: data?.whatsapp_contact_url || null,
          whatsappSuporteUrl: data?.whatsapp_suporte_url || null,
          whatsappContactText: data?.whatsapp_contact_text || 'Falar com Suporte',
          whatsappEnabled: data?.whatsapp_enabled || false,
          supportEmail: data?.support_email || null,
          companyName: data?.company_name || null,
          loading: false,
        });
      } catch (error) {
        // Error handled - loading set to false below
        setSettings(prev => ({ ...prev, loading: false }));
      }
    }

    fetchSettings();
  }, []);

  return settings;
}
