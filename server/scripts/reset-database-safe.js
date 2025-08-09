const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const databasePath = path.join(__dirname, '..', 'database.sqlite');

console.log('🗄️  Script de Reseteo Seguro de Base de Datos');
console.log('==============================================');
console.log('');

if (fs.existsSync(databasePath)) {
  const stats = fs.statSync(databasePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`📁 Base de datos encontrada: ${databasePath}`);
  console.log(`📊 Tamaño actual: ${sizeInMB} MB`);
  console.log(`📅 Última modificación: ${stats.mtime.toLocaleString()}`);
  console.log('');
  
  rl.question('⚠️  ¿Estás seguro de que quieres eliminar la base de datos? (escribe "SI" para confirmar): ', (answer) => {
    if (answer === 'SI') {
      try {
        // Crear backup antes de eliminar
        const backupPath = path.join(__dirname, '..', `database_backup_${Date.now()}.sqlite`);
        fs.copyFileSync(databasePath, backupPath);
        console.log(`💾 Backup creado en: ${backupPath}`);
        
        // Eliminar base de datos original
        fs.unlinkSync(databasePath);
        console.log('✅ Base de datos eliminada correctamente');
        console.log('🔄 Reinicia el servidor para crear una nueva base de datos vacía');
      } catch (error) {
        console.error('❌ Error al eliminar la base de datos:', error.message);
      }
    } else {
      console.log('❌ Operación cancelada');
    }
    rl.close();
  });
} else {
  console.log('ℹ️  No se encontró una base de datos existente');
  console.log('🔄 Simplemente inicia el servidor para crear una nueva');
  rl.close();
}