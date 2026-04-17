# Features Desativadas (Aguardando Liberação para Produção)

## 1. Compromissos / Lembretes (Google Calendar)

### Arquivos existentes:
- `src/app/dashboard/lembretes/page.tsx` — Página principal
- `src/components/dashboard/reminders-page.tsx` — Componente da página
- `src/components/dashboard/reminder-modal.tsx` — Modal de criação/edição
- `src/hooks/use-lembretes.ts` — Hook com lógica de dados
- `src/lib/google-calendar.ts` — Integração com Google Calendar API
- `src/app/api/google-calendar/auth/route.ts` — Rota de autenticação OAuth
- `src/app/api/google-calendar/callback/route.ts` — Callback OAuth
- `src/app/api/google-calendar/calendars/route.ts` — Listar calendários
- `src/app/api/google-calendar/events/route.ts` — CRUD de eventos
- `src/app/api/google-calendar/sync/route.ts` — Sincronização
- `src/app/api/google-calendar/disconnect/route.ts` — Desconectar conta
- `src/components/admin/google-calendar-settings.tsx` — Config admin

### O que fazer para ativar:
1. Adicionar item "Compromissos" (ou "Lembretes") na **sidebar** do dashboard (`src/components/dashboard/sidebar.tsx` ou equivalente). Usar ícone `Calendar` do Lucide e apontar para `/dashboard/lembretes`.
2. Verificar se as migrations do banco estão aplicadas (ver `supabase/migrations_lembretes_google_calendar.sql`).
3. Configurar variáveis de ambiente do Google Calendar OAuth no Vercel:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`
4. Testar fluxo completo: conectar Google Calendar → listar calendários → criar/editar lembretes → sincronizar.

---

## 2. Integrações (Tab nas Configurações)

### Arquivos existentes:
- `src/components/dashboard/settings/integrations-settings.tsx` — Componente da tab
- `src/components/dashboard/settings/notification-settings.tsx` — Notificações (já ativo)

### O que fazer para ativar:
1. Adicionar a tab "Integrações" na **settings-sidebar** (`src/components/dashboard/settings/settings-sidebar.tsx`):
   ```tsx
   // Adicionar no array menuItems:
   { id: 'integrations', label: t('settings.integrations'), icon: Plug },
   ```
   - Importar `Plug` do Lucide: `import { ..., Plug } from "lucide-react";`
2. A página `src/app/dashboard/configuracoes/page.tsx` já tem o `case 'integrations'` funcional (linha 38-39). Não precisa alterar.
3. Verificar se o componente `IntegrationsSettings` renderiza corretamente e se as APIs de integração estão funcionando.

---

## 3. Stash pendente (Light Mode em componentes admin)

Há um stash com mudanças de light mode CSS em 3 arquivos admin:
- `src/components/admin/google-calendar-settings.tsx`
- `src/components/admin/webhook-settings.tsx`
- `src/components/admin/whatsapp-settings.tsx`

### O que fazer:
```bash
git stash pop
```
Revisar as mudanças (são apenas trocas de `border-zinc-800` para `border-[var(--border-medium)]`) e commitar se estiverem corretas.

---

## Commits que desativaram essas features (referência):
- `57a57cf` — "ocultar tab Integrações das configurações (não pronto para produção)"
- `cc6c9f6` — "remove menu Compromissos da sidebar (feature nao pronta para producao)"
- `d52d293` — "remove menu Lembretes (Compromissos) que subiu acidentalmente na sidebar"
