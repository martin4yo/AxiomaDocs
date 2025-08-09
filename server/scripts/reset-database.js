const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Base de datos eliminada correctamente.');
  console.log('Ejecuta "npm run dev" para recrear la base de datos.');
} else {
  console.log('No se encontró base de datos para eliminar.');
}