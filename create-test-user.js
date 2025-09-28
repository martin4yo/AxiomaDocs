const axios = require('axios');

async function createTestUser() {
  console.log('👤 Creating test user...\n');

  const testUser = {
    username: 'testuser',
    password: 'test123',
    email: 'test@test.com',
    nombre: 'Test',
    apellido: 'User'
  };

  try {
    // Try to register a new user
    const response = await axios.post('http://localhost:5000/api/auth/register', testUser);

    console.log('✅ Test user created successfully!');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Password: ${testUser.password}`);
    console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
    console.log(`   User ID: ${response.data.user.id}\n`);

    return testUser;
  } catch (error) {
    if (error.response?.status === 400 && error.response.data?.message?.includes('ya existe')) {
      console.log('ℹ️  Test user already exists, trying to login...');

      try {
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          username: testUser.username,
          password: testUser.password
        });

        console.log('✅ Login successful with existing test user!');
        console.log(`   Token: ${loginResponse.data.token.substring(0, 50)}...`);
        return testUser;
      } catch (loginError) {
        console.log('❌ Failed to login with test user credentials');
        console.log('   Error:', loginError.response?.data?.message || loginError.message);
        return null;
      }
    } else {
      console.log('❌ Failed to create test user');
      console.log('   Error:', error.response?.data?.message || error.message);
      return null;
    }
  }
}

createTestUser().then(user => {
  if (user) {
    console.log('🎉 Test user ready! You can now run the comprehensive tests.');
    console.log(`   Use credentials: ${user.username}/${user.password}`);
  } else {
    console.log('❌ Could not set up test user. Manual setup may be required.');
  }
}).catch(console.error);