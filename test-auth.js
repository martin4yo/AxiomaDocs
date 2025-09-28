const axios = require('axios');

// Test different credential combinations
const credentialTests = [
  { username: 'admin', password: 'admin123' },
  { username: 'admin', password: 'admin' },
  { username: 'axioma', password: 'axioma123' },
  { username: 'martin', password: 'martin123' }
];

async function testCredentials() {
  console.log('🔐 Testing authentication credentials...\n');

  for (const creds of credentialTests) {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', creds);
      console.log(`✅ SUCCESS: ${creds.username}/${creds.password}`);
      console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
      console.log(`   User: ${response.data.user.nombre} ${response.data.user.apellido}\n`);
      return creds; // Return first working credentials
    } catch (error) {
      console.log(`❌ FAILED: ${creds.username}/${creds.password} - ${error.response?.data?.message || error.message}`);
    }
  }

  return null;
}

testCredentials().then(workingCreds => {
  if (workingCreds) {
    console.log(`\n🎉 Found working credentials: ${workingCreds.username}/${workingCreds.password}`);
    console.log('You can now update the test script with these credentials.');
  } else {
    console.log('\n❌ No working credentials found. You may need to register a user first.');
  }
}).catch(console.error);