"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAdminSettings(data: {
  restringir_cadastro_usuarios_existentes: boolean;
  dias_acesso_free?: number;
}) {
  const supabase = await createClient();


  // Verificar usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  // Preparar dados para atualização
  const updateData: any = {
    restringir_cadastro_usuarios_existentes: data.restringir_cadastro_usuarios_existentes,
    updated_at: new Date().toISOString()
  };

  // Adicionar dias_acesso_free se fornecido
  if (data.dias_acesso_free !== undefined) {
    updateData.dias_acesso_free = data.dias_acesso_free;
  }

  const { data: result, error } = await supabase
    .from("configuracoes_sistema")
    .update(updateData)
    .eq("id", 1)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateTutorialSettings(data: {
  habilitar_modulo_tutoriais: boolean;
}) {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("configuracoes_sistema")
    .update({
      habilitar_modulo_tutoriais: data.habilitar_modulo_tutoriais,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { success: true };
}



export async function updateLogoSettings(data: {
  show_sidebar_logo: boolean;
  show_sidebar_name: boolean;
  show_login_logo: boolean;
  show_login_name: boolean;
  logo_url_sidebar?: string;
  logo_url_login?: string;
  favicon_url?: string;
  pwa_icon_192_url?: string;
  pwa_icon_512_url?: string;
  apple_touch_icon_url?: string;
}) {
  const supabase = await createClient();


  const { data: result, error } = await supabase
    .from("configuracoes_sistema")
    .update({
      show_sidebar_logo: data.show_sidebar_logo,
      show_sidebar_name: data.show_sidebar_name,
      show_login_logo: data.show_login_logo,
      show_login_name: data.show_login_name,
      logo_url_sidebar: data.logo_url_sidebar,
      logo_url_login: data.logo_url_login,
      favicon_url: data.favicon_url,
      pwa_icon_192_url: data.pwa_icon_192_url,
      pwa_icon_512_url: data.pwa_icon_512_url,
      apple_touch_icon_url: data.apple_touch_icon_url,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
