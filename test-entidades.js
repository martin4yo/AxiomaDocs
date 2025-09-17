const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testEntidades() {
  try {
    // Login
    console.log('🔐 Intentando login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'testuser2',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');

    // Probar endpoint de entidades
    console.log('\n🏢 Probando endpoint de entidades...');
    const entidadesResponse = await axios.get(`${API_BASE_URL}/entidades?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Entidades Response:', JSON.stringify(entidadesResponse.data, null, 2));

    // Verificar si tiene estadoCritico
    if (entidadesResponse.data.entidades && entidadesResponse.data.entidades.length > 0) {
      const primeraEntidad = entidadesResponse.data.entidades[0];
      console.log('\n🔍 Primera entidad:', JSON.stringify(primeraEntidad, null, 2));

      if (primeraEntidad.estadoCritico) {
        console.log('✅ Campo estadoCritico encontrado:', primeraEntidad.estadoCritico);
      } else {
        console.log('❌ Campo estadoCritico NO encontrado');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEntidades();