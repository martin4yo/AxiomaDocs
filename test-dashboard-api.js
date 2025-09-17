const http = require('http');

// Primero necesitamos obtener un token de login válido
function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDashboardAPI() {
  try {
    console.log('🔐 Intentando hacer login...');

    // Primero hacer login para obtener un token
    const loginResponse = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'admin123'
    });

    console.log('Login response:', loginResponse);

    if (loginResponse.status !== 200) {
      console.log('❌ Error en login, intentando crear usuario admin...');

      // Si no existe, crear usuario admin
      const registerResponse = await makeRequest('/api/auth/register', 'POST', {
        username: 'admin',
        email: 'admin@test.com',
        password: 'admin123'
      });

      console.log('Register response:', registerResponse);

      if (registerResponse.status === 201) {
        console.log('✅ Usuario admin creado, haciendo login...');
        const newLoginResponse = await makeRequest('/api/auth/login', 'POST', {
          username: 'admin',
          password: 'admin123'
        });
        console.log('New login response:', newLoginResponse);

        if (newLoginResponse.status === 200) {
          const token = newLoginResponse.data.token;
          await testDashboardEndpoints(token);
        }
      }
    } else {
      const token = loginResponse.data.token;
      await testDashboardEndpoints(token);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testDashboardEndpoints(token) {
  try {
    console.log('\n📊 Probando endpoint /api/dashboard/stats...');
    const statsResponse = await makeRequest('/api/dashboard/stats', 'GET', null, token);
    console.log('Stats response:', JSON.stringify(statsResponse, null, 2));

    console.log('\n📊 Probando endpoint /api/dashboard/documentos-por-vencer...');
    const docsPorVencerResponse = await makeRequest('/api/dashboard/documentos-por-vencer?dias=30', 'GET', null, token);
    console.log('Documentos por vencer response:', JSON.stringify(docsPorVencerResponse, null, 2));

  } catch (error) {
    console.error('❌ Error en endpoints:', error.message);
  }
}

testDashboardAPI();