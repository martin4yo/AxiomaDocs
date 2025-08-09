@echo off
echo.
echo ========================================
echo 🚀 ACTUALIZACION AXIOMADOCS - WINDOWS
echo ========================================
echo.

REM Configuración
set SERVER_IP=149.50.148.198
set SERVER_USER=root
set LOCAL_DIR=%cd%
set REMOTE_TEMP=/tmp/axiomadocs-update

echo 📋 Configuración:
echo    Servidor: %SERVER_USER%@%SERVER_IP%
echo    Directorio local: %LOCAL_DIR%
echo    Directorio remoto temporal: %REMOTE_TEMP%
echo.

REM Verificar que SCP está disponible
scp -h >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: SCP no está disponible. Instala OpenSSH Client en Windows
    echo    Para instalar: Configuración ^> Aplicaciones ^> Características opcionales ^> OpenSSH Client
    pause
    exit /b 1
)

echo 📦 Paso 1: Creando directorio temporal en servidor...
ssh -o "StrictHostKeyChecking=no" %SERVER_USER%@%SERVER_IP% "mkdir -p %REMOTE_TEMP%"

echo 📦 Paso 2: Subiendo archivos al servidor...
echo.

REM Crear archivo comprimido excluyendo directorios no necesarios
tar --exclude=node_modules --exclude=dist --exclude=build --exclude=.git --exclude=*.log --exclude=.claude -czf axiomadocs-update.tar.gz .

REM Subir archivo comprimido
scp -o "StrictHostKeyChecking=no" axiomadocs-update.tar.gz %SERVER_USER%@%SERVER_IP%:%REMOTE_TEMP%/

REM Extraer en el servidor
ssh -o "StrictHostKeyChecking=no" %SERVER_USER%@%SERVER_IP% "cd %REMOTE_TEMP% && tar -xzf axiomadocs-update.tar.gz"

REM Limpiar archivo temporal local
del axiomadocs-update.tar.gz

if %errorlevel% neq 0 (
    echo ❌ Error al subir archivos al servidor
    pause
    exit /b 1
)

echo ✅ Archivos subidos exitosamente
echo.

echo 🔄 Paso 3: Ejecutando actualización en el servidor...
echo.

REM Ejecutar script de actualización en el servidor
ssh -o "StrictHostKeyChecking=no" %SERVER_USER%@%SERVER_IP% "/opt/axiomadocs/update-production.sh"

if %errorlevel% neq 0 (
    echo ❌ Error durante la actualización en el servidor
    echo 🔍 Revisa los logs en el servidor con: ssh %SERVER_USER%@%SERVER_IP% "pm2 logs"
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ ACTUALIZACION COMPLETADA EXITOSAMENTE
echo ========================================
echo.
echo 🌐 Aplicación disponible en: http://%SERVER_IP%:8080
echo.
echo 📋 Comandos útiles:
echo    ssh %SERVER_USER%@%SERVER_IP% "pm2 list"          # Ver estado de aplicaciones
echo    ssh %SERVER_USER%@%SERVER_IP% "pm2 logs"          # Ver logs
echo    ssh %SERVER_USER%@%SERVER_IP% "pm2 restart all"   # Reiniciar todo
echo.

pause