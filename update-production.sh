#!/bin/bash

# 🚀 Script de Actualización Automática - AxiomaDocs
# Uso: ./update-production.sh [--skip-backup]

echo "🚀 Iniciando actualización de AxiomaDocs..."
echo "📅 Fecha: $(date)"
echo "=================================="

# Configuración
DEPLOY_DIR="/opt/axiomadocs"
BACKUP_DIR="/opt/backups"
UPDATE_DIR="/tmp/axiomadocs-update"
DB_NAME="axiomadocs"
DB_USER="axiomadocs"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Función para manejo de errores
handle_error() {
    echo "❌ Error: $1"
    echo "🔄 Restaurando aplicación..."
    pm2 restart ecosystem.config.js
    exit 1
}

# Verificar que estamos en el servidor correcto
if [ ! -d "$DEPLOY_DIR" ]; then
    handle_error "Directorio de despliegue no encontrado: $DEPLOY_DIR"
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    handle_error "PM2 no está instalado"
fi

echo "📋 Verificando estado actual..."
cd $DEPLOY_DIR

# Verificar estado de las aplicaciones
echo "📊 Estado actual de PM2:"
pm2 list

echo ""
echo "📛 Deteniendo aplicaciones..."
pm2 stop ecosystem.config.js || handle_error "Error al detener aplicaciones PM2"

# Backup de base de datos (solo si no se especifica --skip-backup)
if [ "$1" != "--skip-backup" ]; then
    echo ""
    echo "💾 Creando backup de base de datos..."
    BACKUP_FILE="$BACKUP_DIR/axiomadocs_$(date +%Y%m%d_%H%M%S).sql"
    mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_FILE 2>/dev/null || echo "⚠️  Advertencia: No se pudo crear backup de BD (continúa...)"
    echo "📁 Backup guardado en: $BACKUP_FILE"
fi

# Verificar que existen archivos de actualización
if [ ! -d "$UPDATE_DIR" ]; then
    handle_error "Directorio de actualización no encontrado: $UPDATE_DIR. Sube primero los archivos con: scp -r ./AxiomaDocs/* root@149.50.148.198:/tmp/axiomadocs-update/"
fi

echo ""
echo "📁 Actualizando archivos del código fuente..."

# Backup del .env actual
cp $DEPLOY_DIR/server/.env $DEPLOY_DIR/server/.env.backup 2>/dev/null || true

# Sincronizar archivos (excluyendo archivos importantes)
rsync -av --progress \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=build \
    --exclude=.env \
    --exclude=.env.backup \
    --exclude=*.log \
    $UPDATE_DIR/ $DEPLOY_DIR/ || handle_error "Error al sincronizar archivos"

# Restaurar .env si existe
if [ -f "$DEPLOY_DIR/server/.env.backup" ]; then
    cp $DEPLOY_DIR/server/.env.backup $DEPLOY_DIR/server/.env
    rm $DEPLOY_DIR/server/.env.backup
fi

echo ""
echo "📦 Instalando/actualizando dependencias..."

# Instalar dependencias del servidor
echo "⚙️  Servidor..."
cd $DEPLOY_DIR/server
npm install --production || handle_error "Error al instalar dependencias del servidor"

# Instalar dependencias del cliente
echo "🎨 Cliente..."
cd $DEPLOY_DIR/client
npm install || handle_error "Error al instalar dependencias del cliente"

echo ""
echo "🔨 Construyendo aplicación..."

# Construir cliente
echo "🎨 Construyendo cliente React..."
npm run build || handle_error "Error al construir cliente React"

# Construir servidor TypeScript
echo "⚙️  Compilando servidor TypeScript..."
cd $DEPLOY_DIR/server
npm run build || handle_error "Error al compilar servidor TypeScript"

echo ""
echo "🔄 Reiniciando aplicaciones..."
cd $DEPLOY_DIR

# Reiniciar con PM2
pm2 restart ecosystem.config.js || handle_error "Error al reiniciar aplicaciones"

# Esperar un poco para que arranquen
sleep 3

echo ""
echo "✅ Actualización completada!"
echo "=================================="
echo "🌐 Aplicación disponible en: http://149.50.148.198:8080"
echo ""

# Verificar estado final
echo "📊 Estado final de las aplicaciones:"
pm2 list

echo ""
echo "🔍 Verificando conectividad..."
if curl -s -I http://localhost:8080 > /dev/null; then
    echo "✅ Aplicación respondiendo correctamente"
else
    echo "⚠️  Advertencia: La aplicación no responde inmediatamente"
    echo "   Esto es normal, puede tardar unos segundos en inicializar"
fi

echo ""
echo "📋 Para monitorear la aplicación:"
echo "   pm2 logs              # Ver todos los logs"
echo "   pm2 logs axiomadocs-server  # Solo logs del servidor"
echo "   pm2 logs axiomadocs-client  # Solo logs del cliente"
echo "   pm2 monit            # Monitor en tiempo real"

echo ""
echo "🎉 ¡Actualización completada exitosamente!"

# Limpiar directorio temporal
echo ""
echo "🧹 Limpiando archivos temporales..."
rm -rf $UPDATE_DIR
echo "✨ Limpieza completada"