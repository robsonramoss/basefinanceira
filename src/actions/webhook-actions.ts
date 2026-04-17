"use server";

import { createClient } from "@/lib/supabase/server";

interface WebhookInviteData {
  memberId: number;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
}

export async function sendWebhookInvite(data: WebhookInviteData) {
  const supabase = await createClient();

  try {
    // 1. Verificar Usuário Atual
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // 2. Buscar dados completos do admin
    const { data: adminProfile } = await supabase
      .from("usuarios")
      .select("id, nome, email, celular")
      .eq("auth_user", user.id)
      .single();

    if (!adminProfile) {
      return { success: false, error: "Perfil do admin não encontrado" };
    }

    // 3. Buscar URL do webhook
    const { data: config } = await supabase
      .from("configuracoes_sistema")
      .select("webhook_convite_membro")
      .eq("id", 1)
      .single();

    if (!config?.webhook_convite_membro) {
      return {
        success: false,
        error: "Webhook não configurado. Configure em Admin > Settings.",
      };
    }

    // 4. Preparar payload para o webhook
    const payload = {
      admin: {
        id: adminProfile.id,
        nome: adminProfile.nome,
        email: adminProfile.email,
        celular: adminProfile.celular,
      },
      membro: {
        id: data.memberId,
        nome: data.memberName,
        email: data.memberEmail,
        telefone: data.memberPhone,
      },
      timestamp: new Date().toISOString(),
    };

    // 5. Enviar para o webhook N8N
    const response = await fetch(config.webhook_convite_membro, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }

    // 6. Atualizar status do convite para "enviado"
    await supabase
      .from("usuarios_dependentes")
      .update({
        convite_status: "enviado",
        convite_enviado_em: new Date().toISOString(),
      })
      .eq("id", data.memberId);

    return {
      success: true,
      message: "Convite enviado via WhatsApp com sucesso!",
    };
  } catch (error: any) {
    console.error("Erro ao enviar webhook:", error);
    return {
      success: false,
      error: error.message || "Erro ao enviar convite via webhook",
    };
  }
}
