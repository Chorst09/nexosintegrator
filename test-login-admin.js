#!/usr/bin/env node

const https = require('https');

// Função para fazer requisições HTTPS
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLogin() {
  console.log('🧪 TESTANDO LOGIN ADMIN...\n');

  try {
    // 1. Testar se o site está acessível
    console.log('1️⃣ Testando acesso ao site...');
    const siteTest = await makeRequest({
      hostname: 'nexos.chorstconsult.com.br',
      port: 443,
      path: '/',
      method: 'GET'
    });
    console.log(`   Status: ${siteTest.status} ${siteTest.status === 200 ? '✅' : '❌'}`);

    // 2. Testar API de settings
    console.log('\n2️⃣ Testando API de settings...');
    const settingsTest = await makeRequest({
      hostname: 'nexos.chorstconsult.com.br',
      port: 443,
      path: '/api/settings',
      method: 'GET'
    });
    console.log(`   Status: ${settingsTest.status} ${settingsTest.status === 200 ? '✅' : '❌'}`);
    if (settingsTest.status === 200) {
      console.log(`   Data: ${JSON.stringify(settingsTest.data)}`);
    }

    // 3. Testar login do usuário ADMIN
    console.log('\n3️⃣ Testando login admin@crm.com...');
    const loginTest = await makeRequest({
      hostname: 'nexos.chorstconsult.com.br',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@crm.com',
      password: 'admin123'
    });

    console.log(`   Status: ${loginTest.status} ${loginTest.status === 200 ? '✅' : '❌'}`);
    
    if (loginTest.status === 200) {
      console.log(`   ✅ Login bem-sucedido!`);
      console.log(`   👤 Usuário: ${loginTest.data.user.name}`);
      console.log(`   📧 Email: ${loginTest.data.user.email}`);
      console.log(`   🛡️ Role: ${loginTest.data.user.role}`);
      console.log(`   🎫 Token: ${loginTest.data.token ? 'Gerado' : 'Não gerado'}`);
      
      // 4. Testar acesso com token
      console.log('\n4️⃣ Testando acesso autenticado...');
      const authTest = await makeRequest({
        hostname: 'nexos.chorstconsult.com.br',
        port: 443,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginTest.data.token}`
        }
      });
      
      console.log(`   Status: ${authTest.status} ${authTest.status === 200 ? '✅' : '❌'}`);
      if (authTest.status === 200) {
        console.log(`   ✅ Token válido! Role: ${authTest.data.role}`);
      }

    } else {
      console.log(`   ❌ Falha no login: ${JSON.stringify(loginTest.data)}`);
    }

    // 5. Resumo
    console.log('\n📋 RESUMO DO TESTE:');
    console.log(`   Site acessível: ${siteTest.status === 200 ? '✅' : '❌'}`);
    console.log(`   API Settings: ${settingsTest.status === 200 ? '✅' : '❌'}`);
    console.log(`   Login ADMIN: ${loginTest.status === 200 ? '✅' : '❌'}`);
    
    if (loginTest.status === 200) {
      console.log(`   Role correto: ${loginTest.data.user.role === 'ADMIN' ? '✅' : '❌'}`);
      console.log('\n🎯 PRÓXIMO PASSO: Verificar permissões no frontend');
    } else {
      console.log('\n❌ PROBLEMA: Login falhando - precisa corrigir antes de testar frontend');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLogin();