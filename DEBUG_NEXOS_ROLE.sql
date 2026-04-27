-- Debug: Verificar como o role está salvo no banco D1 do nexos

-- 1. Ver o tipo de dado da coluna role
PRAGMA table_info(users);

-- 2. Ver todos os roles únicos no banco
SELECT DISTINCT role FROM users ORDER BY role;

-- 3. Ver detalhes do usuário admin@crm.com
SELECT 
  id,
  name,
  email,
  role,
  typeof(role) as role_type,
  length(role) as role_length,
  hex(role) as role_hex,
  company_id,
  active
FROM users 
WHERE email = 'admin@crm.com';

-- 4. Tentar atualizar forçando o tipo TEXT
UPDATE users 
SET role = CAST('MASTER' AS TEXT)
WHERE email = 'admin@crm.com';

-- 5. Verificar novamente
SELECT id, name, email, role, typeof(role) as role_type
FROM users 
WHERE email = 'admin@crm.com';
