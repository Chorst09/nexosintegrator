-- Criar novo usuário MASTER no D1 do nexos
-- Email: master@master.com
-- Senha: admin123

INSERT INTO users (
  id,
  email,
  name,
  password,
  role,
  active,
  last_login,
  created_at,
  updated_at,
  company_id
) VALUES (
  lower(hex(randomblob(16))),
  'master@master.com',
  'Master User',
  '$2b$10$lTKAs0VqeitQZRE5/t5ZtuLnZ83pcXURoJAmtBgB/zUlqaa4BnvTw.',
  'MASTER',
  1,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  NULL
);

-- Verificar se foi criado
SELECT id, name, email, role, company_id, active 
FROM users 
WHERE email = 'master@master.com';
