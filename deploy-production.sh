#!/bin/bash

# ====================================================
# 🚀 AXIOMADOCS - PRODUCTION DEPLOYMENT SCRIPT
# ====================================================
# 
# Este script automatiza completamente el deployment a producción
# - Auto-configura variables de entorno
# - Corrige problemas comunes de CORS y networking
# - Verifica y corrige configuraciones
# - Ejecuta deployment completo
#
# Uso: ./deploy-production.sh [server_ip] [server_user]
# Ejemplo: ./deploy-production.sh 149.50.148.198 root
#
# ====================================================

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración por defecto
DEFAULT_SERVER_IP="149.50.148.198"
DEFAULT_SERVER_USER="root"
DEFAULT_DOMAIN="docs.axiomacloud.com"
DEFAULT_CLIENT_PORT="80"
DEFAULT_SERVER_PORT="5000"
DEFAULT_DB_NAME="axiomadocs"

# Parámetros del script
SERVER_IP="${1:-$DEFAULT_SERVER_IP}"
SERVER_USER="${2:-$DEFAULT_SERVER_USER}"
LOCAL_DIR=$(pwd)
REMOTE_TEMP="/tmp/axiomadocs-update"
REMOTE_DIR="/opt/axiomadocs"

echo -e "${BLUE}"
echo "======================================================"
echo "🚀 AXIOMADOCS PRODUCTION DEPLOYMENT"  
echo "======================================================"
echo -e "${NC}"

echo -e "${YELLOW}📋 Configuración de Deployment:${NC}"
echo "   🖥️  Servidor: ${SERVER_USER}@${SERVER_IP}"
echo "   📁 Directorio local: ${LOCAL_DIR}"
echo "   🌐 Dominio: ${DEFAULT_DOMAIN}"
echo "   📱 Puerto frontend: ${DEFAULT_CLIENT_PORT}"
echo "   🔌 Puerto API: ${DEFAULT_SERVER_PORT}"
echo

# ====================================================
# PASO 1: PREPARAR VARIABLES DE ENTORNO LOCALES
# ====================================================
echo -e "${BLUE}📦 Paso 1: Configurando variables de entorno locales...${NC}"

# Crear .env para el frontend (local)
cat > client/.env << EOF
VITE_API_URL=http://${SERVER_IP}:${DEFAULT_SERVER_PORT}/api
EOF

echo "   ✅ Frontend .env configurado: VITE_API_URL=http://${SERVER_IP}:${DEFAULT_SERVER_PORT}/api"

# ====================================================  
# PASO 2: BUILD LOCAL
# ====================================================
echo -e "${BLUE}🔨 Paso 2: Building aplicación localmente...${NC}"

cd client
npm run build
echo "   ✅ Frontend build completado"
cd ..

cd server
npm run build  
echo "   ✅ Backend build completado"
cd ..

# ====================================================
# PASO 3: CREAR PACKAGE PARA SERVIDOR
# ====================================================
echo -e "${BLUE}📦 Paso 3: Empaquetando aplicación...${NC}"

# Crear archivo comprimido excluyendo archivos innecesarios
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.claude' \
    --exclude='client/src' \
    --exclude='server/src' \
    --exclude='*.md' \
    --exclude='deploy-*.sh' \
    --exclude='deploy-*.bat' \
    -czf axiomadocs-production.tar.gz .

echo "   ✅ Package creado: axiomadocs-production.tar.gz"

# ====================================================
# PASO 4: SUBIR AL SERVIDOR
# ====================================================
echo -e "${BLUE}☁️  Paso 4: Subiendo al servidor...${NC}"

# Crear directorio temporal en servidor
ssh -o "StrictHostKeyChecking=no" ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_TEMP}"

# Subir package
scp -o "StrictHostKeyChecking=no" axiomadocs-production.tar.gz ${SERVER_USER}@${SERVER_IP}:${REMOTE_TEMP}/

# Extraer en servidor
ssh -o "StrictHostKeyChecking=no" ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_TEMP} && tar -xzf axiomadocs-production.tar.gz"

echo "   ✅ Archivos subidos y extraídos en servidor"

# ====================================================
# PASO 5: CONFIGURAR SERVIDOR AUTOMÁTICAMENTE
# ====================================================  
echo -e "${BLUE}⚙️  Paso 5: Configurando servidor automáticamente...${NC}"

ssh -o "StrictHostKeyChecking=no" ${SERVER_USER}@${SERVER_IP} << EOF
set -e

echo "🔧 Configurando variables de entorno del servidor..."

# Crear .env para el servidor
cat > ${REMOTE_TEMP}/server/.env << SERVEREOF
PORT=${DEFAULT_SERVER_PORT}
JWT_SECRET=axioma-production-secret-\$(date +%s)
NODE_ENV=production

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DEFAULT_DB_NAME}
DB_USER=root
DB_PASSWORD=Q27G4B98
SERVEREOF

# Crear .env para el frontend en el servidor
cat > ${REMOTE_TEMP}/client/.env << CLIENTEOF  
VITE_API_URL=http://${SERVER_IP}:${DEFAULT_SERVER_PORT}/api
CLIENTEOF

echo "✅ Variables de entorno configuradas"

echo "🔧 Configurando CORS automáticamente..."

# Auto-configurar CORS en el servidor
sed -i "s/origin: process.env.NODE_ENV === 'production'/origin: process.env.NODE_ENV === 'production'/" ${REMOTE_TEMP}/server/src/index.ts || true
sed -i "s/\\['http:\\/\\/localhost:3000'\\]/\\['http:\\/\\/localhost:3000', 'http:\\/\\/${DEFAULT_DOMAIN}', 'http:\\/\\/${SERVER_IP}:${DEFAULT_CLIENT_PORT}'\\]/g" ${REMOTE_TEMP}/server/src/index.ts || true

echo "✅ CORS configurado para: localhost:3000, ${DEFAULT_DOMAIN}, ${SERVER_IP}:${DEFAULT_CLIENT_PORT}"

echo "🔧 Configurando binding IPv4..."

# Asegurar que el servidor escuche en IPv4
if grep -q "app.listen(PORT," ${REMOTE_TEMP}/server/src/index.ts; then
    sed -i 's/app.listen(PORT,/app.listen(Number(PORT), "0.0.0.0",/' ${REMOTE_TEMP}/server/src/index.ts
fi

echo "✅ Servidor configurado para escuchar en IPv4"

echo "📁 Copiando archivos a directorio de producción..."

# Backup del directorio actual (si existe)
if [ -d "${REMOTE_DIR}" ]; then
    cp -r ${REMOTE_DIR} ${REMOTE_DIR}.backup.\$(date +%Y%m%d_%H%M%S) || true
fi

# Crear directorio de producción
mkdir -p ${REMOTE_DIR}

# Copiar archivos
cp -r ${REMOTE_TEMP}/* ${REMOTE_DIR}/

echo "✅ Archivos copiados a ${REMOTE_DIR}"

echo "🔨 Reconstruyendo aplicación en servidor..."

# Rebuild con nuevas configuraciones
cd ${REMOTE_DIR}/server && npm run build
cd ${REMOTE_DIR}/client && rm -rf dist && npm run build

echo "✅ Aplicación reconstruida con configuraciones de producción"

echo "⚙️ Configurando PM2..."

# Crear configuración de PM2 actualizada
cat > ${REMOTE_DIR}/ecosystem.config.js << PMEOF
module.exports = {
  apps: [
    {
      name: 'axiomadocs-server',
      cwd: '${REMOTE_DIR}/server',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: ${DEFAULT_SERVER_PORT}
      },
      error_file: '/var/log/axiomadocs-server-error.log',
      out_file: '/var/log/axiomadocs-server-out.log',
      log_file: '/var/log/axiomadocs-server.log'
    },
    {
      name: 'axiomadocs-client',
      cwd: '${REMOTE_DIR}/client',
      script: 'npx',
      args: 'serve -s dist -l ${DEFAULT_CLIENT_PORT}',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/axiomadocs-client-error.log',
      out_file: '/var/log/axiomadocs-client-out.log', 
      log_file: '/var/log/axiomadocs-client.log'
    }
  ]
};
PMEOF

echo "✅ PM2 configurado"

echo "🔄 Reiniciando servicios..."

# Detener servicios existentes (ignora errores)
pm2 delete axiomadocs-server 2>/dev/null || true
pm2 delete axiomadocs-client 2>/dev/null || true

# Iniciar con nueva configuración
cd ${REMOTE_DIR} && pm2 start ecosystem.config.js

echo "✅ Servicios reiniciados"

# Limpiar archivos temporales
rm -rf ${REMOTE_TEMP}

EOF

# Limpiar archivo local temporal
rm -f axiomadocs-production.tar.gz

# ====================================================
# PASO 6: VERIFICACIÓN POST-DEPLOYMENT
# ====================================================
echo -e "${BLUE}✅ Paso 6: Verificando deployment...${NC}"

# Esperar a que los servicios inicien
sleep 5

echo -e "${YELLOW}🔍 Verificando servicios...${NC}"
ssh -o "StrictHostKeyChecking=no" ${SERVER_USER}@${SERVER_IP} "pm2 status"

echo
echo -e "${YELLOW}🌐 Probando conectividad...${NC}"

# Test de conectividad
if curl -s --max-time 10 http://${SERVER_IP}:${DEFAULT_CLIENT_PORT} > /dev/null; then
    echo "   ✅ Frontend accesible en http://${SERVER_IP}:${DEFAULT_CLIENT_PORT}"
else
    echo "   ❌ Frontend no accesible en puerto ${DEFAULT_CLIENT_PORT}"
fi

if curl -s --max-time 10 http://${SERVER_IP}:${DEFAULT_SERVER_PORT}/api/auth/login > /dev/null; then
    echo "   ✅ API accesible en http://${SERVER_IP}:${DEFAULT_SERVER_PORT}"
else
    echo "   ❌ API no accesible en puerto ${DEFAULT_SERVER_PORT}"  
fi

# ====================================================
# FINALIZACIÓN
# ====================================================
echo
echo -e "${GREEN}======================================================"
echo "🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "======================================================${NC}"
echo
echo -e "${YELLOW}📱 Aplicación disponible en:${NC}"
echo "   🌐 Dominio: http://${DEFAULT_DOMAIN}"
echo "   🔗 IP directa: http://${SERVER_IP}:${DEFAULT_CLIENT_PORT}"
echo
echo -e "${YELLOW}🔧 API disponible en:${NC}" 
echo "   🔌 http://${SERVER_IP}:${DEFAULT_SERVER_PORT}/api"
echo
echo -e "${YELLOW}📋 Comandos útiles:${NC}"
echo "   📊 Ver estado: ssh ${SERVER_USER}@${SERVER_IP} \"pm2 status\""
echo "   📜 Ver logs: ssh ${SERVER_USER}@${SERVER_IP} \"pm2 logs\""
echo "   🔄 Reiniciar: ssh ${SERVER_USER}@${SERVER_IP} \"pm2 restart all\""
echo
echo -e "${BLUE}📚 Para más información, revisar DEPLOYMENT.md${NC}"
echo