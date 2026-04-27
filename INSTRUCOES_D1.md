# Instruções para Criar Usuário MASTER no Cloudflare D1

## Credenciais do Usuário MASTER
- **Email**: chorstconsult@gmail.com
- **Senha**: Double@@2026
- **Role**: MASTER (acesso completo)

## Opção 1: Via Cloudflare Dashboard (Recomendado)

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** → **D1**
3. Selecione seu banco de dados
4. Clique em **Console** ou **Query**
5. Cole e execute o SQL do arquivo `CREATE_MASTER_USER_D1.sql`

## Opção 2: Via Wrangler CLI

```bash
# Execute no terminal (na raiz do projeto)
wrangler d1 execute <SEU_DATABASE_NAME> --file=CREATE_MASTER_USER_D1.sql
```

Substitua `<SEU_DATABASE_NAME>` pelo nome do seu banco D1.

## Opção 3: Via Wrangler CLI (comando direto)

```bash
wrangler d1 execute <SEU_DATABASE_NAME> --command="INSERT INTO User (id, name, email, password, role, accessB2B, accessB2G, accessPreSales, isCompanyOwner, quota, createdAt) VALUES (lower(hex(randomblob(16))), 'Master Admin', 'chorstconsult@gmail.com', '\$2a\$10\$lEFTEG7UgssVpXdXZateveMCXj.sptPgchR3NPZezkDaRZRIUACBq', 'MASTER', 1, 1, 1, 0, 999999, datetime('now'));"
```

## Verificar se o usuário foi criado

```bash
wrangler d1 execute <SEU_DATABASE_NAME> --command="SELECT id, name, email, role FROM User WHERE email = 'chorstconsult@gmail.com';"
```

## Observações Importantes

1. **Hash da Senha**: O hash `$2a$10$lEFTEG7UgssVpXdXZateveMCXj.sptPgchR3NPZezkDaRZRIUACBq` corresponde à senha `Double@@2026`

2. **UUID no D1**: O D1 (SQLite) não tem `gen_random_uuid()` como PostgreSQL, por isso usamos `lower(hex(randomblob(16)))` para gerar um ID único

3. **Booleanos no D1**: O D1 usa `1` para `true` e `0` para `false`

4. **Data/Hora no D1**: Usamos `datetime('now')` ao invés de `NOW()`

## Após Criar o Usuário

1. Acesse o sistema em produção
2. Faça login com:
   - Email: chorstconsult@gmail.com
   - Senha: Double@@2026
3. Vá em **Administração** → **Gestão de Empresas**
4. Agora você pode cadastrar empresas manualmente!

## Troubleshooting

Se o login não funcionar:

1. Verifique se o usuário foi criado:
   ```sql
   SELECT * FROM User WHERE email = 'chorstconsult@gmail.com';
   ```

2. Verifique se a senha está correta (o hash deve ser exatamente):
   ```
   $2a$10$lEFTEG7UgssVpXdXZateveMCXj.sptPgchR3NPZezkDaRZRIUACBq
   ```

3. Verifique se o role está como 'MASTER':
   ```sql
   SELECT role FROM User WHERE email = 'chorstconsult@gmail.com';
   ```
