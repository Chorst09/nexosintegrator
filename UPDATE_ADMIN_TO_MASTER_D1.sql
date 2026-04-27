-- Script para atualizar admin@crm.com de ADMIN para MASTER no Cloudflare D1
-- Execute este script no dashboard do Cloudflare D1 ou via Wrangler CLI

-- Verificar o usuário atual
SELECT id, name, email, role, tenantCompanyId, accessB2B, accessB2G, accessPreSales 
FROM User 
WHERE email = 'admin@crm.com';

-- Atualizar o role para MASTER
UPDATE User 
SET 
  role = 'MASTER',
  tenantCompanyId = NULL,
  accessB2B = 1,
  accessB2G = 1,
  accessPreSales = 1,
  quota = 999999
WHERE email = 'admin@crm.com';

-- Verificar se a atualização foi bem-sucedida
SELECT id, name, email, role, tenantCompanyId, accessB2B, accessB2G, accessPreSales, quota
FROM User 
WHERE email = 'admin@crm.com';
