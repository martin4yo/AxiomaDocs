#!/bin/bash

# Script para ejecutar migración en producción
# Uso: ./scripts/run-migration.sh

set -e  # Salir si hay error

echo "🚀 Iniciando migración en producción..."

# Cargar variables de entorno
if [ -f .env ]; then
    source .env
    echo "✅ Variables de entorno cargadas"
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Verificar conexión
echo "🔍 Verificando conexión a base de datos..."
node scripts/check-migration.js

# Preguntar confirmación
read -p "¿Continuar con la migración? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migración cancelada"
    exit 1
fi

# Crear backup
echo "💾 Creando backup..."
timestamp=$(date +"%Y%m%d_%H%M%S")
mysqldump -h${DB_HOST:-localhost} -u${DB_USER:-root} -p${DB_PASSWORD} ${DB_NAME:-axiomadocs} > backup_${timestamp}.sql
echo "✅ Backup creado: backup_${timestamp}.sql"

# Ejecutar migración
echo "⚙️ Ejecutando migración automática..."
DB_ALLOW_ALTER=true npm start &
SERVER_PID=$!

# Esperar que el servidor inicie
sleep 10

# Verificar que la migración fue exitosa
echo "🔍 Verificando migración..."
node scripts/check-migration.js

# Detener servidor
kill $SERVER_PID 2>/dev/null || true

echo "✅ Migración completada exitosamente!"
echo "📝 Para iniciar en producción: npm start"