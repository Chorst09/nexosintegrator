// Teste de login simulando o navegador
const API_URL = 'http://localhost:3002/api';

async function testLogin() {
  console.log('🧪 Testando login no ambiente local...\n');
  
  try {
    console.log('1️⃣ Enviando requisição de login...');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        email: 'admin@crm.com',
        password: 'admin123'
      })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Login bem-sucedido!');
      console.log(`   Usuário: ${data.user.name} (${data.user.email})`);
      console.log(`   Perfil: ${data.user.role}`);
      console.log(`   Token: ${data.token.substring(0, 50)}...`);
      
      // Testar acesso autenticado
      console.log('\n2️⃣ Testando acesso autenticado ao dashboard...');
      const dashResponse = await fetch(`${API_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      if (dashResponse.ok) {
        const dashData = await dashResponse.json();
        console.log('✅ Dashboard acessado com sucesso!');
        console.log(`   Total de empresas: ${dashData.kpis.totalCompanies}`);
        console.log(`   Total de oportunidades: ${dashData.kpis.totalOpportunities}`);
        console.log(`   Valor do pipeline: R$ ${dashData.kpis.pipelineValue.toLocaleString('pt-BR')}`);
      } else {
        console.log('❌ Erro ao acessar dashboard:', dashResponse.status);
      }
      
    } else {
      console.log('\n❌ Falha no login!');
      console.log(`   Erro: ${data.error || 'Erro desconhecido'}`);
    }
    
  } catch (error) {
    console.log('\n❌ Erro de conexão!');
    console.log(`   Mensagem: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testLogin();
