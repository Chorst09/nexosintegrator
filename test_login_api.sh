#!/bin/bash

# Testar login da API do nexos
echo "Testando login com admin@crm.com no nexos..."

curl -X POST https://nexos.chorstconsult.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.com","password":"admin123"}' \
  | jq '.'
