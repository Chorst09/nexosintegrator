#!/bin/bash

echo "🔧 Configurando variáveis de ambiente na Vercel..."
echo ""

# Mercado Pago
echo "📦 Configurando Mercado Pago..."
vercel env add MERCADO_PAGO_PUBLIC_KEY production <<< "TEST-ea423066-0567-48a7-800c-f1a39833ce5e"
vercel env add MERCADO_PAGO_ACCESS_TOKEN production <<< "TEST-295373260675697-121217-6e2dd435f6708fc53d0de81b5627652a-606002420"
vercel env add MERCADO_PAGO_WEBHOOK_TOKEN production <<< "webhook_secure_token_2026_mp_crm_b2g_production"

# URLs
echo "🌐 Configurando URLs..."
vercel env add FRONTEND_URL production <<< "https://crmautomatizadob2g.vercel.app"
vercel env add API_URL production <<< "https://crmautomatizadob2g.vercel.app/api"

echo ""
echo "✅ Variáveis configuradas!"
echo ""
echo "🚀 Agora execute um novo deploy:"
echo "   vercel --prod"
echo ""
echo "Ou aguarde o próximo push para o GitHub disparar o deploy automático."
