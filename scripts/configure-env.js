#!/usr/bin/env node

/**
 * 🔧 AXIOMADOCS - ENVIRONMENT CONFIGURATOR
 * 
 * Este script lee la configuración de production.env y genera
 * los archivos .env correspondientes para cliente y servidor
 * basándose en la configuración centralizada.
 */

const fs = require('fs');
const path = require('path');

// Colores para console
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(color + message + colors.reset);
}

function loadConfig(configPath) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = {};
    
    configContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...values] = line.split('=');
        config[key.trim()] = values.join('=').trim();
      }
    });
    
    return config;
  } catch (error) {
    log(colors.red, `❌ Error al leer configuración: ${error.message}`);
    process.exit(1);
  }
}

function createClientEnv(config) {
  const clientEnv = `# ====================================================
# 🎯 AXIOMADOCS CLIENT - AUTO GENERATED ENVIRONMENT
# ====================================================
# 
# Este archivo fue generado automáticamente por configure-env.js
# No editar manualmente. Modificar config/production.env
#
# Generado: ${new Date().toISOString()}
# ====================================================

VITE_API_URL=http://${config.SERVER_IP}:${config.API_PORT}/api
`;

  const clientEnvPath = path.join(__dirname, '../client/.env');
  fs.writeFileSync(clientEnvPath, clientEnv);
  log(colors.green, `✅ Cliente .env creado: ${clientEnvPath}`);
  log(colors.blue, `   📡 API URL: http://${config.SERVER_IP}:${config.API_PORT}/api`);
}

function createServerEnv(config) {
  const serverEnv = `# ====================================================
# ⚙️ AXIOMADOCS SERVER - AUTO GENERATED ENVIRONMENT  
# ====================================================
#
# Este archivo fue generado automáticamente por configure-env.js
# No editar manualmente. Modificar config/production.env
#
# Generado: ${new Date().toISOString()}
# ====================================================

# SERVIDOR
PORT=${config.API_PORT}
HOST=0.0.0.0
NODE_ENV=${config.NODE_ENV}

# SEGURIDAD
JWT_SECRET=${config.JWT_SECRET}

# BASE DE DATOS
DB_HOST=${config.DB_HOST}
DB_PORT=${config.DB_PORT}
DB_NAME=${config.DB_NAME}
DB_USER=${config.DB_USER}
DB_PASSWORD=${config.DB_PASSWORD}

# CORS - Origins permitidos (separados por coma)
CORS_ORIGINS=${config.CORS_ORIGINS}

# LOGS
LOG_LEVEL=${config.LOG_LEVEL}
`;

  const serverEnvPath = path.join(__dirname, '../server/.env');
  fs.writeFileSync(serverEnvPath, serverEnv);
  log(colors.green, `✅ Servidor .env creado: ${serverEnvPath}`);
  log(colors.blue, `   🔌 Puerto: ${config.API_PORT}`);
  log(colors.blue, `   🌐 CORS: ${config.CORS_ORIGINS}`);
}

function createPM2Config(config) {
  const pm2Config = `// ====================================================
// 🚀 AXIOMADOCS PM2 - AUTO GENERATED CONFIGURATION
// ====================================================
//
// Este archivo fue generado automáticamente por configure-env.js
// No editar manualmente. Modificar config/production.env
//
// Generado: ${new Date().toISOString()}
// ====================================================

module.exports = {
  apps: [
    {
      name: 'axiomadocs-server',
      cwd: '${config.REMOTE_DIR}/server',
      script: './dist/index.js',
      instances: ${config.PM2_INSTANCES},
      autorestart: true,
      watch: false,
      max_memory_restart: '${config.PM2_MAX_MEMORY}',
      env: {
        NODE_ENV: '${config.NODE_ENV}',
        PORT: ${config.API_PORT}
      },
      error_file: '${config.LOG_DIR}/axiomadocs-server-error.log',
      out_file: '${config.LOG_DIR}/axiomadocs-server-out.log',
      log_file: '${config.LOG_DIR}/axiomadocs-server.log'
    },
    {
      name: 'axiomadocs-client',
      cwd: '${config.REMOTE_DIR}/client',
      script: 'npx',
      args: 'serve -s dist -l ${config.FRONTEND_PORT}',
      instances: ${config.PM2_INSTANCES},
      autorestart: true,
      watch: false,
      max_memory_restart: '${config.PM2_CLIENT_MEMORY}',
      env: {
        NODE_ENV: '${config.NODE_ENV}'
      },
      error_file: '${config.LOG_DIR}/axiomadocs-client-error.log',
      out_file: '${config.LOG_DIR}/axiomadocs-client-out.log',
      log_file: '${config.LOG_DIR}/axiomadocs-client.log'
    }
  ]
};
`;

  const pm2ConfigPath = path.join(__dirname, '../ecosystem.config.js');
  fs.writeFileSync(pm2ConfigPath, pm2Config);
  log(colors.green, `✅ PM2 config creado: ${pm2ConfigPath}`);
  log(colors.blue, `   📱 Frontend: puerto ${config.FRONTEND_PORT}`);
  log(colors.blue, `   🔌 API: puerto ${config.API_PORT}`);
}

function main() {
  log(colors.blue, '🔧 AXIOMADOCS - Environment Configurator');
  log(colors.blue, '=========================================');
  
  const configPath = path.join(__dirname, '../config/production.env');
  
  if (!fs.existsSync(configPath)) {
    log(colors.red, `❌ Archivo de configuración no encontrado: ${configPath}`);
    log(colors.yellow, '💡 Crear el archivo config/production.env primero');
    process.exit(1);
  }
  
  log(colors.yellow, `📖 Leyendo configuración desde: ${configPath}`);
  const config = loadConfig(configPath);
  
  // Verificar configuraciones requeridas
  const requiredFields = ['SERVER_IP', 'API_PORT', 'FRONTEND_PORT', 'DB_NAME'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    log(colors.red, `❌ Campos requeridos faltantes: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  
  log(colors.blue, '📦 Generando archivos de configuración...');
  
  // Crear directorios si no existen
  const clientDir = path.join(__dirname, '../client');
  const serverDir = path.join(__dirname, '../server');
  
  if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
  if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
  
  // Generar archivos
  createClientEnv(config);
  createServerEnv(config);
  createPM2Config(config);
  
  log(colors.green, '');
  log(colors.green, '🎉 ¡Configuración completada exitosamente!');
  log(colors.green, '==========================================');
  log(colors.yellow, '');
  log(colors.yellow, '📋 Próximos pasos:');
  log(colors.yellow, '   1. cd client && npm run build');
  log(colors.yellow, '   2. cd server && npm run build');
  log(colors.yellow, '   3. ./deploy-production.sh');
  log(colors.yellow, '');
}

if (require.main === module) {
  main();
}

module.exports = { loadConfig, createClientEnv, createServerEnv, createPM2Config };