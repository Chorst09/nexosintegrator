# Estrutura de Versionamento e Deploy - NexosIntegrator

## 📊 Status Atual

### ✅ v2-producao (PRODUÇÃO - PROTEGIDA)
- **Branch**: `main`
- **Tag**: `v2-producao`
- **Commit**: `87f60df`
- **Servidor**: 209.50.241.25
- **URL**: https://nexos.chorstconsult.com.br
- **Status**: Sistema funcionando 100%
- **Backup**: 
  - Servidor: `/var/www/backups/v2-producao-20260910.tar.gz` (279MB)
  - Local: `.backups/backup-v2-producao-20260910.dump` (240KB)

### 🧪 v3-teste (DESENVOLVIMENTO)
- **Branch**: `v3-teste`
- **Commit**: `2c4ecda` (HEAD)
- **Uso**: Todos os deploys futuros
- **Status**: Pronto para desenvolvimento

---

## 🚨 Regra de Ouro

**QUALQUER solicitação de "deploy" ou "fazer deploy em produção" deve ir automaticamente para `v3-teste`, NUNCA para `v2-producao`.**

Apenas com confirmação EXPLÍCITA do usuário dizendo "quero atualizar v2-producao" é que se deve tocar na versão em produção.

---

## 🔄 Fluxo de Trabalho

```
┌─────────────────┐
│   v3-teste      │  ← Desenvolvimento ativo
│  (branch ativo) │  ← Deploy automático aqui
└────────┬────────┘
         │
         │ (após testes e aprovação)
         ↓
┌─────────────────┐
│   v2-producao   │  ← Produção protegida
│  (main + tag)   │  ← Apenas com backup + confirmação
└─────────────────┘
```

---

## ✅ Verificação

Execute para confirmar estrutura:

```bash
# Ver tags
git tag | grep v2

# Ver branches
git branch -v

# Ver commit atual
git log --oneline -3

# Ver arquivo de regras do Kiro
cat .kiro/steering/deploy-rules.md
```

---

## 📝 Histórico de Versões

| Versão | Data | Commit | Descrição |
|--------|------|--------|-----------|
| v2-producao | 2026-09-10 | 87f60df | Sistema funcionando - dashboards B2B/B2G OK, portal buscas OK |
| v1-funcional | 2026-09-10 | 0dda50c | Backup anterior - filtro vigentes corrigido |

---

**Criado em**: 10 de Setembro de 2026  
**Última atualização**: 10 de Setembro de 2026
