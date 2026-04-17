"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateWhatsAppConfig(data: {
  whatsapp_enabled: boolean;
  whatsapp_contact_url: string;
  whatsapp_contact_text: string;
  video_url_instalacao?: string;
  // Suporte WhatsApp
  habilitar_suporte_whatsapp: boolean;
  suporte_whatsapp_text: string;
  whatsapp_suporte_url: string;
  support_email: string;
}) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("configuracoes_sistema")
    .update({
      whatsapp_enabled: data.whatsapp_enabled,
      whatsapp_contact_url: data.whatsapp_contact_url,
      whatsapp_contact_text: data.whatsapp_contact_text,
      video_url_instalacao: data.video_url_instalacao,
      habilitar_suporte_whatsapp: data.habilitar_suporte_whatsapp,
      suporte_whatsapp_text: data.suporte_whatsapp_text,
      whatsapp_suporte_url: data.whatsapp_suporte_url || null,
      support_email: data.support_email,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
