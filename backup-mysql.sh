#!/bin/bash

# Script para crear backup completo de MySQL AxiomaDocs
# Ejecutar en el servidor: 149.50.148.198

echo "🔒 Creando backup de MySQL AxiomaDocs..."

# Configuración
DB_NAME="axiomadocs"
DB_USER="root"  # Ajustar según tu configuración
BACKUP_DIR="/opt/backups/mysql"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="axiomadocs_backup_${DATE}.sql"

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

echo "📅 Fecha del backup: $(date)"
echo "📁 Directorio: $BACKUP_DIR"
echo "📄 Archivo: $BACKUP_FILE"

# Crear backup completo con estructura y datos
echo "🚀 Iniciando backup..."
mysqldump -u $DB_USER -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --complete-insert \
  --extended-insert \
  --comments \
  --dump-date \
  $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Verificar que el backup se creó correctamente
if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente!"

    # Mostrar información del backup
    echo "📊 Información del backup:"
    echo "   Tamaño: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
    echo "   Ubicación: $BACKUP_DIR/$BACKUP_FILE"

    # Crear compresión opcional
    echo "🗜️  Comprimiendo backup..."
    gzip "$BACKUP_DIR/$BACKUP_FILE"

    echo "✅ Backup comprimido: $BACKUP_DIR/$BACKUP_FILE.gz"
    echo "📊 Tamaño comprimido: $(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)"

    # Verificar contenido del backup
    echo "🔍 Verificando contenido del backup..."
    zcat "$BACKUP_DIR/$BACKUP_FILE.gz" | head -20

    echo ""
    echo "🎉 ¡Backup completado exitosamente!"
    echo "📋 Resumen:"
    echo "   • Base de datos: $DB_NAME"
    echo "   • Archivo: $BACKUP_FILE.gz"
    echo "   • Ubicación: $BACKUP_DIR"
    echo "   • Fecha: $(date)"

else
    echo "❌ Error creando el backup!"
    echo "   Verifica las credenciales de MySQL"
    echo "   Asegúrate de que la base de datos existe"
    exit 1
fi

echo ""
echo "📝 Para restaurar este backup usa:"
echo "   gunzip $BACKUP_DIR/$BACKUP_FILE.gz"
echo "   mysql -u $DB_USER -p $DB_NAME < $BACKUP_DIR/$BACKUP_FILE"