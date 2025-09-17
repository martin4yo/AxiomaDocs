const { Sequelize, DataTypes } = require('./server/node_modules/sequelize');

// Configuración de la base de datos
const sequelize = new Sequelize('axiomadocs', 'root', 'Q27G4B98', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: DataTypes.STRING,
  email: DataTypes.STRING,
  password: DataTypes.STRING
}, { tableName: 'usuarios' });

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    const usuarios = await Usuario.findAll({
      attributes: ['id', 'username', 'email', 'createdAt']
    });

    console.log('\n👥 USUARIOS EN LA BASE DE DATOS:');
    usuarios.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Creado: ${user.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsers();