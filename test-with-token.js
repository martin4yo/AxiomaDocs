const axios = require('./server/node_modules/axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testWithValidToken() {
  try {
    // Intentar hacer login con credenciales que sabemos que existen
    console.log('🔐 Intentando login...');

    // Primero intentar obtener un token JWT válido desde el localStorage
    // En un entorno real, usaríamos las credenciales correctas

    // Como alternativa, voy a usar un JWT temporal válido que genere el servidor
    // o intentar registrar un usuario de prueba

    const testCredentials = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'admin123' },
      { username: 'testuser2', password: 'password123' },
      { username: 'testuser', password: 'password' }
    ];

    let token = null;

    for (const cred of testCredentials) {
      try {
        console.log(`Probando login con: ${cred.username}`);
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, cred);

        if (loginResponse.status === 200) {
          token = loginResponse.data.token;
          console.log(`✅ Login exitoso con ${cred.username}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Falló login con ${cred.username}: ${error.response?.data?.message || error.message}`);
      }
    }

    if (!token) {
      console.log('🆕 Creando nuevo usuario de prueba...');
      try {
        const newUser = {
          username: 'testdashboard',
          email: 'test@dashboard.com',
          password: 'test123'
        };

        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, newUser);
        console.log('Usuario creado:', registerResponse.data);

        // Hacer login con el nuevo usuario
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          username: newUser.username,
          password: newUser.password
        });

        token = loginResponse.data.token;
        console.log('✅ Login exitoso con nuevo usuario');

      } catch (error) {
        console.error('❌ Error creando usuario:', error.response?.data || error.message);
        return;
      }
    }

    if (token) {
      console.log('\n📊 Probando dashboard stats...');
      const statsResponse = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Stats Response:', JSON.stringify(statsResponse.data, null, 2));

      console.log('\n📅 Probando documentos por vencer...');
      const docsResponse = await axios.get(`${API_BASE_URL}/dashboard/documentos-por-vencer?dias=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Documentos por vencer:', JSON.stringify(docsResponse.data, null, 2));

      console.log('\n🔴 Probando documentos vencidos...');
      const vencidosResponse = await axios.get(`${API_BASE_URL}/dashboard/documentos-vencidos?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Documentos vencidos:', JSON.stringify(vencidosResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error general:', error.response?.data || error.message);
  }
}

testWithValidToken();