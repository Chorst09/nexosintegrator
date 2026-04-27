-- Script para criar usuário MASTER no Cloudflare D1
-- Execute este script no dashboard do Cloudflare D1 ou via Wrangler CLI

-- Criar usuário MASTER
INSERT INTO User (
  id, 
  name, 
  email, 
  password, 
  role, 
  accessB2B, 
  accessB2G, 
  accessPreSales, 
  isCompanyOwner, 
  quota, 
  createdAt
) VALUES (
  lower(hex(randomblob(16))), 
  'Master Admin', 
  'chorstconsult@gmail.com', 
  '$2a$10$lEFTEG7UgssVpXdXZateveMCXj.sptPgchR3NPZezkDaRZRIUACBq', 
  'MASTER', 
  1, 
  1, 
  1, 
  0, 
  999999, 
  datetime('now')
);

-- Verificar se o usuário foi criado
SELECT id, name, email, role, tenantCompanyId, accessB2B, accessB2G, accessPreSales 
FROM User 
WHERE email = 'chorstconsult@gmail.com';
