# Configurar Branch de Produção no Vercel para Nexos

## Objetivo
Garantir que o domínio **nexos.chorstconsult.com.br** está usando a branch `production-nexos` com o commit 07a23d3 (que contém as correções de login).

## Passos na Vercel Dashboard

### 1. Acessar Projeto
1. Acesse: https://vercel.com/dashboard
2. Localize o projeto do **nexos.chorstconsult.com.br**
3. Clique no projeto para abrir

### 2. Verificar Branch de Produção
1. Vá em **Settings** (Configurações)
2. Clique em **Git** no menu lateral
3. Procure por **Production Branch**
4. Verifique se está configurado como: `production-nexos`
5. Se não estiver, altere para `production-nexos` e salve

### 3. Forçar Novo Deploy (se necessário)
Se o deploy automático não iniciou:

1. Vá na aba **Deployments**
2. Clique nos 3 pontinhos (...) do último deploy
3. Selecione **Redeploy**
4. Marque a opção **Use existing Build Cache** (opcional)
5. Clique em **Redeploy**

### 4. Verificar Deploy em Andamento
1. Na aba **Deployments**, você verá o status
2. Aguarde até aparecer **Ready** (verde)
3. Clique no deploy para ver os logs (opcional)

### 5. Verificar Commit Deployado
1. No deploy concluído, verifique o **Commit SHA**
2. Deve ser: `07a23d3` ou superior
3. Se for `cc6932b` (antigo), force um redeploy

## Verificação Rápida

Execute este comando para ver o histórico de commits:

```bash
git log production-nexos --oneline -5
```

Deve mostrar:
```
045be26 docs: adicionar scripts e instruções para configurar login MASTER no nexos
07a23d3 docs: adicionar script para atualizar MASTER no domínio nexos
cc6932b (commit antigo com bug)
...
```

## Após Deploy Concluído

1. Acesse: https://nexos.chorstconsult.com.br
2. Teste o login com: chorstconsult@gmail.com
3. Se der erro 401, execute o script `UPDATE_CHORSTCONSULT_PASSWORD_NEXOS.sql` no D1
4. Tente novamente com senha: admin123

## Domínios e Branches

| Domínio | Branch | Commit | Status |
|---------|--------|--------|--------|
| crmautomatizadob2g.vercel.app | main | mais recente | ✅ OK |
| crmcomercial.chorstconsult.com.br | production-crmcomercial | 07a23d3 | ✅ OK |
| nexos.chorstconsult.com.br | production-nexos | 045be26 | ⏳ Configurar |

## Troubleshooting

### Deploy não inicia automaticamente
- Vá em Settings > Git > Deploy Hooks
- Crie um novo Deploy Hook se necessário
- Use o webhook para forçar deploy via curl

### Branch não aparece nas opções
- Verifique se a branch existe no GitHub: `git branch -r | grep nexos`
- Faça push novamente: `git push origin production-nexos`
- Aguarde alguns segundos e recarregue a página da Vercel

### Erro "Branch not found"
- Confirme que a branch está no remoto: `git ls-remote origin production-nexos`
- Se não estiver, faça push: `git push origin production-nexos`
