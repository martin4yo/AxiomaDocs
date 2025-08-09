#!/bin/bash

echo "====================================="
echo " Axioma Docs - Database Fix Script"
echo "====================================="
echo ""
echo "Este script solucionará el problema de la base de datos."
echo ""
echo "Paso 1: Eliminando base de datos existente..."
cd server
npm run reset-db
echo ""
echo "Paso 2: Reiniciando el servidor..."
echo "El servidor recreará automáticamente la base de datos."
echo ""
echo "Ejecuta 'npm run dev' desde la raíz del proyecto para continuar."
echo ""