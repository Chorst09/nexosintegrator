---
title: Regras de Deploy NexosIntegrator
description: Instruções obrigatórias sobre versionamento e deploy em produção
inclusion: auto
---

# 🚨 REGRAS DE DEPLOY - LEIA ANTES DE QUALQUER DEPLOY

## ⚠️ IMPORTANTE: Versão em Produção Protegida

### Versão v2 (PRODUÇÃO)
- **Tag Git**: `v2-producao`
- **Branch**: `main`
- **Status**: ✅ EM PRODUÇÃO - **NÃO MODIFICAR**
- **Servidor**: 209.50.241.25 (https://nexos.chorstconsult.com.br)
- **Backup**: `/var/www/backups/v2-producao-20260910.tar.gz` (279MB)
- **Database Dump**: `.backups/backup-v2-producao-20260910.dump`

**🔒 ESTA VERSÃO JAMAIS DEVE RECEBER DEPLOY DIRETO**

### Versão v3 (TESTE/DESENVOLVIMENTO)
- **Branch**: `v3-teste`
- **Status**: 🧪 AMBIENTE DE TESTES
- **Uso**: Todos os deploys futuros devem ir para esta branch

---

## 📋 Regras Obrigatórias

### Quando o usuário pedir "faça deploy" ou "deploy em produção":

1. ✅ **SEMPRE perguntar**: "Este deploy deve ir para v3-teste ou você realmente precisa atualizar v2-produção?"

2. ✅ **Se for v3-teste**:
   - Confirmar que está na branch `v3-teste`
   - Fazer commit das mudanças
   - Executar o deploy

3. ⛔ **Se for v2-produção**:
   - **AVISAR**: "v2-producao está protegida. Você tem certeza? Isso vai sobrescrever a versão em produção."
   - Esperar confirmação explícita do usuário
   - Criar backup antes de qualquer mudança
   - Documentar o motivo da alteração

4. ✅ **Comportamento padrão (sem especificação)**:
   - **SEMPRE assumir v3-teste**
   - Nunca fazer deploy em v2-producao sem confirmação explícita

---

## 🔄 Fluxo de Trabalho Recomendado

```
Desenvolvimento → v3-teste → Testes → (aprovação manual) → v2-producao
```

### Para desenvolvimento normal:
```bash
git checkout v3-teste
# fazer alterações
git add -A
git commit -m "feat: nova funcionalidade"
# deploy em ambiente de teste
```

### Para atualizar produção (raro):
```bash
# 1. Backup obrigatório
ssh root@209.50.241.25 "backup-v2.sh"

# 2. Merge de v3-teste para main
git checkout main
git merge v3-teste

# 3. Tag de versão
git tag -a "v2.1-producao" -m "Descrição da atualização"

# 4. Deploy
# ... comandos de deploy
```

---

## 🗂️ Backups Existentes

| Versão | Data | Tamanho | Localização |
|--------|------|---------|-------------|
| v2-producao | 2026-09-10 | 279MB | `/var/www/backups/v2-producao-20260910.tar.gz` |
| v2-producao-local | 2026-09-10 | 240KB | `.backups/backup-v2-producao-20260910.dump` |
| v1-funcional | 2026-09-10 | - | Tag `v-backup-funcional-20260910-084933` |

---

## 🔐 Credenciais de Produção (SSH)

```
Host: 209.50.241.25
User: root
Porta: 22
Senha: tq6vJPwtZbOCW3kj
```

**Container de produção**: `nexoscrm-backend`, `nexoscrm-frontend`, `nexoscrm-postgres`

---

## ✅ Verificação Pós-Deploy

Sempre testar após deploy:
- [ ] Login funciona
- [ ] Dashboard B2B e B2G carregam
- [ ] Portal de buscas B2G sem erros 401/404/500
- [ ] API responde: `/api/b2g/licitacoes-gerenciadas`, `/api/b2g-search/fontes`, `/api/filtros-ti/categorias`

---

**Última atualização**: 10 de Setembro de 2026
**Responsável**: Kiro AI Assistant
