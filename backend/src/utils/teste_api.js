/**
 * LINKA — Script de Teste Manual da API
 * Este script pode ser usado para validar os fluxos principais.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testarAPI() {
  console.log('🧪 Iniciando testes da API Linka...');

  try {
    // 1. Teste de Registo
    console.log('\n[1] Testando Registo...');
    const resRegisto = await axios.post(`${API_URL}/auth/registar`, {
      nome: 'Utilizador Teste',
      email: `teste${Date.now()}@linka.com`,
      telefone: `${Math.floor(100000000 + Math.random() * 900000000)}`,
      senha: 'Password123!'
    });
    console.log('✅ Registo concluído:', resRegisto.data.mensagem);

    // 2. Teste de Login
    console.log('\n[2] Testando Login...');
    const resLogin = await axios.post(`${API_URL}/auth/login`, {
      email: resRegisto.data.dados.email || resRegisto.config.data.email, // Mock dependendo da resposta
      senha: 'Password123!'
    });
    console.log('✅ Login concluído. Token recebido.');

    // 3. Teste de Categorias
    console.log('\n[3] Testando Listagem de Categorias...');
    const resCategorias = await axios.get(`${API_URL}/categorias`);
    console.log(`✅ Categorias encontradas: ${resCategorias.data.dados.length}`);

    console.log('\n🚀 Todos os testes básicos passaram!');
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.response ? error.response.data : error.message);
  }
}

// Para correr: node src/utils/test_api.js
// Nota: Requer que o servidor esteja a correr (npm run dev)
// testarAPI();
