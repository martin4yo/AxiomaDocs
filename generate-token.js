const jwt = require('./server/node_modules/jsonwebtoken');

// Usar el mismo secret que el servidor
const JWT_SECRET = 'your-secret-key-change-in-production';

// Crear un token válido para el usuario admin (ID: 1)
const payload = {
  userId: 1,
  username: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

console.log('🔐 Token JWT generado:');
console.log(token);

// Ahora hacer la prueba con curl
console.log('\n📊 Comando curl para probar dashboard stats:');
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:5000/api/dashboard/stats"`);

console.log('\n📅 Comando curl para probar documentos por vencer:');
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:5000/api/dashboard/documentos-por-vencer?dias=30"`);