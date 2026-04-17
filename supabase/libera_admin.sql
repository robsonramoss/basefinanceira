-- 1. Desabilita temporariamente a trava de segurança
ALTER TABLE public.usuarios DISABLE TRIGGER protect_admin_field;

-- 2. Define seu usuário como administrador (Substitua pelo seu e-mail)
UPDATE public.usuarios 
SET is_admin = true 
WHERE email = 'COLOCAR SEU EMAIL DO ADMIN';

-- 3. Reabilita a trava de segurança para manter o sistema protegido
ALTER TABLE public.usuarios ENABLE TRIGGER protect_admin_field;

--  Rode no seu SQL EDITOR 
