#!/bin/bash

echo ""
echo "========================================"
echo "🚀 ACTUALIZACION AXIOMADOCS - GIT BASH"
echo "========================================"
echo ""

# Configuración
SERVER_IP="149.50.148.198"
SERVER_USER="root"
LOCAL_DIR=$(pwd)
REMOTE_TEMP="/tmp/axiomadocs-update"

echo "📋 Configuración:"
echo "   Servidor: $SERVER_USER@$SERVER_IP"
echo "   Directorio local: $LOCAL_DIR"
echo "   Directorio remoto temporal: $REMOTE_TEMP"
echo ""

echo "📦 Paso 1: Creando directorio temporal en servidor..."
ssh -o "StrictHostKeyChecking=no" $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_TEMP"

echo "📦 Paso 2: Subiendo archivos al servidor..."
echo ""

# Crear archivo temporal excluyendo directorios/archivos no necesarios
tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.claude' \
    -czf axiomadocs-update.tar.gz .

# Subir archivo comprimido
scp -o "StrictHostKeyChecking=no" axiomadocs-update.tar.gz $SERVER_USER@$SERVER_IP:$REMOTE_TEMP/

# Extraer en el servidor
ssh -o "StrictHostKeyChecking=no" $SERVER_USER@$SERVER_IP "cd $REMOTE_TEMP && tar -xzf axiomadocs-update.tar.gz"

# Limpiar archivo temporal local
rm axiomadocs-update.tar.gz

if [ $? -ne 0 ]; then
    echo "❌ Error al subir archivos al servidor"
    read -p "Presiona Enter para continuar..."
    exit 1
fi

echo "✅ Archivos subidos exitosamente"
echo ""

echo "🔄 Paso 3: Ejecutando actualización en el servidor..."
echo ""

# Ejecutar script de actualización en el servidor
ssh -o "StrictHostKeyChecking=no" $SERVER_USER@$SERVER_IP "/opt/axiomadocs/update-production.sh"

if [ $? -ne 0 ]; then
    echo "❌ Error durante la actualización en el servidor"
    echo "🔍 Revisa los logs en el servidor con: ssh $SERVER_USER@$SERVER_IP \"pm2 logs\""
    read -p "Presiona Enter para continuar..."
    exit 1
fi

echo ""
echo "========================================"
echo "✅ ACTUALIZACION COMPLETADA EXITOSAMENTE"
echo "========================================"
echo ""
echo "🌐 Aplicación disponible en: http://$SERVER_IP:8080"
echo ""
echo "📋 Comandos útiles:"
echo "   ssh $SERVER_USER@$SERVER_IP \"pm2 list\"          # Ver estado de aplicaciones"
echo "   ssh $SERVER_USER@$SERVER_IP \"pm2 logs\"          # Ver logs"
echo "   ssh $SERVER_USER@$SERVER_IP \"pm2 restart all\"   # Reiniciar todo"
echo ""

read -p "Presiona Enter para continuar..."