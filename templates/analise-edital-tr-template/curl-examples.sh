#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3333}"
COMPANY_ID="${COMPANY_ID:-empresa-demo}"
USER_ID="${USER_ID:-user-demo}"
USER_ROLE="${USER_ROLE:-admin}"

echo "Health check"
curl -sS "${API_BASE_URL}/health" | jq .

echo
echo "Listar salvos (escopo)"
curl -sS "${API_BASE_URL}/api/analyses/saved" \
  -H "x-company-id: ${COMPANY_ID}" \
  -H "x-user-id: ${USER_ID}" \
  -H "x-user-role: ${USER_ROLE}" | jq .

echo
echo "Exemplo analise edital (payload fake para demonstracao)"
curl -sS "${API_BASE_URL}/api/ai-analysis/edital" \
  -H "Content-Type: application/json" \
  -d '{
    "fileDataUri": "data:application/pdf;base64,SEVMTE8="
  }' | jq .
