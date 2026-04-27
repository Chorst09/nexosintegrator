#!/bin/bash

echo "🔧 Configurando variáveis de ambiente na Vercel..."
echo ""

# Mercado Pago - Teste
vercel env add MERCADO_PAGO_PUBLIC_KEY production preview development << EOF
TEST-ea423066-0567-48a7-800c-f1a39833ce5e
EOF

vercel env add MERCADO_PAGO_ACCESS_TOKEN production preview development << EOF
TEST-295373260675697-121217-6e2dd435f6708fc53d0de81b5627652a-606002420
EOF

vercel env add MERCADO_PAGO_WEBHOOK_TOKEN production preview development << EOF
webhook_secure_token_2026_mp_crm_b2g_production
EOF

# URLs
vercel env add FRONTEND_URL production << EOF
https://crmautomatizadob2g.vercel.app
EOF

vercel env add API_URL production << EOF
https://crmautomatizadob2g.vercel.app/api
EOF

echo ""
echo "✅ Variáveis configuradas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Fazer novo deploy: vercel --prod"
echo "2. Configurar webhook no Mercado Pago:"
echo "   URL: https://crmautomatizadob2g.vercel.app/api/checkout/webhook"
echo "3. Testar o checkout com cartão de teste"
