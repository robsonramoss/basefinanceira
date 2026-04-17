# 🚀 SETUP INICIAL - GRANAZAP

## 📝 INSTRUÇÕES PARA O ALUNO

**PASSO 1:** Preencha os dados abaixo com suas informações

**PASSO 2:** Arraste este arquivo para o chat do Windsurf/Claude

**PASSO 3:** Digite: "Execute o setup do SETUP_ALUNO.md"

**PRONTO!** A IA vai configurar tudo automaticamente para você.

---

## ⚙️ PREENCHA SEUS DADOS AQUI:

```
MEU_GITHUB_URL=https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
GITHUB_TOKEN=ghp_seu_token_aqui

SUPABASE_PROJECT_URL=https://sua_url_do_supabase.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...sua_chave_anon_aqui
```

**Exemplo de preenchimento:**
```
MEU_GITHUB_URL=https://github.com/joaosilva/granazap-app.git
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz

SUPABASE_PROJECT_URL=https://xyzabc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```

**Onde encontrar suas credenciais:**

📌 **GitHub Token:**
1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" > "Generate new token (classic)"
3. Nome: "GranaZap Setup"
4. Marque: ✅ repo (acesso total aos repositórios)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (você só verá uma vez!)

📌 **Supabase:**
- PROJECT_URL: Supabase Dashboard > Settings > API > Project URL
- ANON_KEY: Supabase Dashboard > Settings > API > Project API keys > anon public

---

## 🤖 COMANDOS PARA A IA EXECUTAR:

Quando o aluno arrastar este arquivo e pedir para executar, a IA deve:

1. **Configurar GitHub:**
   - Executar: `git remote remove origin`
   - Executar: `git remote add origin https://[GITHUB_TOKEN]@github.com/[USUARIO]/[REPOSITORIO].git`
     (Extrair usuário e repositório do MEU_GITHUB_URL e inserir o GITHUB_TOKEN)
   - Executar: `git branch -M main`
   - Executar: `git push -u origin main`
   
   **Exemplo:** Se MEU_GITHUB_URL = `https://github.com/joaosilva/granazap-app.git`
   E GITHUB_TOKEN = `ghp_abc123`
   Então: `git remote add origin https://ghp_abc123@github.com/joaosilva/granazap-app.git`

2. **Configurar arquivo SQL (supabase/setup_cron_jobs.sql):**
   - Abrir arquivo: `supabase/setup_cron_jobs.sql`
   - Substituir linha 27: `\set PROJECT_URL 'YOUR_SUPABASE_PROJECT_URL'`
     Por: `\set PROJECT_URL '[SUPABASE_PROJECT_URL]'`
   - Substituir linha 31: `\set ANON_KEY 'YOUR_SUPABASE_ANON_KEY'`
     Por: `\set ANON_KEY '[SUPABASE_ANON_KEY]'`
   - Salvar arquivo

3. **Instalar dependências:**
   - Executar: `npm install`

4. **Confirmar sucesso:**
   - Mostrar mensagem: "✅ Setup concluído!"
   - Instruir: "Agora configure o arquivo .env manualmente e execute o setup_cron_jobs.sql no Supabase."

---

## 📌 PRÓXIMOS PASSOS (MANUAL):

Após a IA executar o setup:

1. **Configurar arquivo .env:**
   - Copie o arquivo `.env.example` para `.env`
   - Preencha com as mesmas credenciais do Supabase:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
     ```

2. **Configurar Cron Jobs (IMPORTANTE):**
   
   **Opção A: Automatizado (Recomendado) 🤖**
   
   a) Abra o arquivo: `supabase/CONFIG_ALUNO.md`
   b) Preencha com seu **Project Reference ID** (encontre em: Dashboard > Settings > General > Reference ID)
   c) Copie o arquivo preenchido e cole no chat do Windsurf
   d) Digite: "Gere o script SQL personalizado para mim"
   e) A IA vai gerar o script pronto com suas informações
   f) Copie o script gerado
   g) Cole no SQL Editor do Supabase e execute
   
   **Opção B: Manual**
   
   a) Abra o arquivo: `supabase/setup_cron_jobs.sql`
   b) Procure por `v_project_ref TEXT := 'YOUR_PROJECT_REF';` (aparece 2 vezes)
   c) Substitua `YOUR_PROJECT_REF` pelo seu Project Reference ID
   d) Salve o arquivo
   e) Copie todo o conteúdo
   f) Cole no SQL Editor do Supabase e execute
   
   **Isso vai configurar os Cron Jobs para atualizar preços de investimentos automaticamente**

3. **Rodar localmente:**
   ```bash
   npm run dev
   ```
   Acesse: http://localhost:3000

4. **Deploy na Vercel:**
   - Acesse: https://vercel.com
   - Faça login com seu GitHub
   - Clique em "New Project"
   - Selecione seu repositório
   - Configure as variáveis de ambiente (mesmas do .env)
   - Deploy automático!
