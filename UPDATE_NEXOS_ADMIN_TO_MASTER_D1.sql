-- Script para atualizar admin@crm.com para MASTER no domínio nexos.chorstconsult.com.br
-- Execute este script no banco de dados D1 do domínio NEXOS

-- 1. Verificar o usuário atual
SELECT id, name, email, role, tenantCompanyId, accessB2B, accessB2G, accessPreSales 
FROM User 
WHERE email = 'admin@crm.com';

-- 2. Atualizar o role para MASTER
UPDATE User 
SET 
  role = 'MASTER',
  tenantCompanyId = NULL,
  accessB2B = 1,
  accessB2G = 1,
  accessPreSales = 1,
  quota = 999999
WHERE email = 'admin@crm.com';

-- 3. Verificar se a atualização foi bem-sucedida
SELECT id, name, email, role, tenantCompanyId, accessB2B, accessB2G, accessPreSales, quota
FROM User 
WHERE email = 'admin@crm.com';

-- 4. Listar todos os usuários MASTER (para confirmar)
SELECT id, name, email, role 
FROM User 
WHERE role = 'MASTER';
