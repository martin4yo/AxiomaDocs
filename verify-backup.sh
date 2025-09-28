#!/bin/bash

# Script para verificar la integridad del backup de MySQL
# Ejecutar en el servidor después del backup

echo "🔍 Verificando integridad del backup MySQL..."

BACKUP_DIR="/opt/backups/mysql"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/axiomadocs_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No se encontró ningún backup!"
    exit 1
fi

echo "📄 Verificando backup: $LATEST_BACKUP"

# Verificar que el archivo no esté corrupto
echo "🔧 Verificando compresión..."
if gzip -t "$LATEST_BACKUP"; then
    echo "✅ Archivo comprimido está íntegro"
else
    echo "❌ El archivo comprimido está corrupto!"
    exit 1
fi

# Verificar contenido SQL
echo "🔍 Verificando contenido SQL..."
zcat "$LATEST_BACKUP" | head -50 | grep -E "(CREATE TABLE|INSERT INTO|MySQL dump)" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Contenido SQL válido detectado"
else
    echo "❌ El contenido SQL parece inválido!"
    exit 1
fi

# Contar tablas en el backup
echo "📊 Analizando contenido del backup..."
TABLES_COUNT=$(zcat "$LATEST_BACKUP" | grep "CREATE TABLE" | wc -l)
INSERTS_COUNT=$(zcat "$LATEST_BACKUP" | grep "INSERT INTO" | wc -l)

echo "   📋 Tablas encontradas: $TABLES_COUNT"
echo "   📝 Statements INSERT: $INSERTS_COUNT"

# Mostrar tablas incluidas
echo "📋 Tablas incluidas en el backup:"
zcat "$LATEST_BACKUP" | grep "CREATE TABLE" | sed 's/.*`\([^`]*\)`.*/   • \1/' | sort

# Tamaño del backup
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
echo "📊 Tamaño del backup: $BACKUP_SIZE"

echo ""
echo "🎉 ¡Verificación del backup completada exitosamente!"
echo "✅ El backup está listo y es confiable para usar"