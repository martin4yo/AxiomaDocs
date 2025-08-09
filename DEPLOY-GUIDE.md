# 📋 Guía de Despliegue - AxiomaDocs

## 🚀 Despliegue Inicial en Servidor Ubuntu

### 📋 Prerrequisitos del Servidor

#### Información del servidor de ejemplo:
- **IP:** 149.50.148.198
- **Usuario:** root
- **Password:** CachiFelix!2024
- **SO:** Ubuntu 22.04.5 LTS
- **Proveedor:** Dattaweb VPS

#### Software requerido:
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar MySQL
apt install mysql-server -y

# Instalar Nginx
apt install nginx -y

# Instalar PM2 globalmente
npm install -g pm2

# Instalar herramientas adicionales
apt install curl wget git -y
```

### 🗄️ Configuración de MySQL

```bash
# Configurar MySQL
mysql_secure_installation

# Crear base de datos
mysql -u root -p
CREATE DATABASE axiomadocs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'axiomadocs'@'localhost' IDENTIFIED BY 'tu_password_aqui';
GRANT ALL PRIVILEGES ON axiomadocs.* TO 'axiomadocs'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 📁 Despliegue de la Aplicación

#### 1. Subir archivos al servidor
```bash
# Crear directorio de la aplicación
mkdir -p /opt/axiomadocs
cd /opt/axiomadocs

# Subir archivos (usar SCP, FTP, o similar)
# Los archivos deben quedar en /opt/axiomadocs/
```

#### 2. Configurar variables de entorno
```bash
cd /opt/axiomadocs/server
cp .env.example .env
nano .env
```

**Contenido del .env:**
```env
# Base de datos
DB_HOST=localhost
DB_USER=axiomadocs
DB_PASSWORD=tu_password_mysql
DB_NAME=axiomadocs

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Puerto del servidor
PORT=5000

# Ambiente
NODE_ENV=production
```

#### 3. Instalar dependencias
```bash
cd /opt/axiomadocs

# Instalar dependencias del servidor
cd server && npm install

# Construir cliente para producción
cd ../client && npm install && npm run build

# Volver al directorio raíz
cd /opt/axiomadocs
```

#### 4. Configurar PM2
**Crear archivo `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'axiomadocs-server',
      script: './server/dist/index.js',
      cwd: '/opt/axiomadocs',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_file: '/var/log/axiomadocs-server.log',
      error_file: '/var/log/axiomadocs-server-error.log',
      out_file: '/var/log/axiomadocs-server-out.log',
      max_memory_restart: '1G'
    },
    {
      name: 'axiomadocs-client',
      script: 'serve',
      args: '-s client/build -l 3000',
      cwd: '/opt/axiomadocs',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      log_file: '/var/log/axiomadocs-client.log',
      error_file: '/var/log/axiomadocs-client-error.log',
      out_file: '/var/log/axiomadocs-client-out.log'
    }
  ]
};
```

#### 5. Instalar serve globalmente y compilar TypeScript
```bash
npm install -g serve typescript
cd /opt/axiomadocs/server && npm run build
```

#### 6. Configurar Nginx
**Crear archivo `/etc/nginx/sites-available/axiomadocs`:**
```nginx
server {
    listen 8080;
    server_name 149.50.148.198;

    # Cliente React
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 7. Habilitar sitio y reiniciar servicios
```bash
# Habilitar sitio
ln -s /etc/nginx/sites-available/axiomadocs /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl reload nginx

# Iniciar aplicaciones con PM2
cd /opt/axiomadocs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 8. Configurar firewall del proveedor
**IMPORTANTE:** Habilitar el puerto **8080** en el panel de control del proveedor VPS (Dattaweb).

### ✅ Verificación del despliegue

```bash
# Verificar PM2
pm2 list

# Verificar puertos
netstat -tlnp | grep :5000
netstat -tlnp | grep :3000
netstat -tlnp | grep :8080

# Probar aplicación
curl -I http://149.50.148.198:8080

# Ver logs si hay problemas
pm2 logs axiomadocs-server
pm2 logs axiomadocs-client
```

### 🌐 Acceso Final
**URL:** http://149.50.148.198:8080

---

## 🔄 Actualización de Versiones

### Proceso rápido de actualización:

#### 1. Script de actualización automática
**Crear archivo `update-production.sh`:**
```bash
#!/bin/bash
echo "🚀 Iniciando actualización de AxiomaDocs..."

# Detener aplicaciones
echo "📛 Deteniendo aplicaciones..."
pm2 stop ecosystem.config.js

# Backup de la base de datos (opcional)
echo "💾 Creando backup de base de datos..."
mysqldump -u axiomadocs -p axiomadocs > /opt/backups/axiomadocs_$(date +%Y%m%d_%H%M%S).sql

# Actualizar archivos (asume que los nuevos archivos están en /tmp/axiomadocs-update/)
echo "📁 Actualizando archivos..."
rsync -av --exclude=node_modules --exclude=.env /tmp/axiomadocs-update/ /opt/axiomadocs/

# Instalar nuevas dependencias
echo "📦 Instalando dependencias..."
cd /opt/axiomadocs/server && npm install
cd /opt/axiomadocs/client && npm install

# Construir nueva versión
echo "🔨 Construyendo aplicación..."
cd /opt/axiomadocs/client && npm run build
cd /opt/axiomadocs/server && npm run build

# Reiniciar aplicaciones
echo "🔄 Reiniciando aplicaciones..."
cd /opt/axiomadocs
pm2 restart ecosystem.config.js

echo "✅ Actualización completada!"
echo "🌐 Aplicación disponible en: http://149.50.148.198:8080"

# Verificar estado
pm2 list
```

#### 2. Hacer ejecutable el script
```bash
chmod +x /opt/axiomadocs/update-production.sh
```

#### 3. Proceso de actualización paso a paso

```bash
# 1. Subir nuevos archivos a /tmp/axiomadocs-update/
scp -r ./AxiomaDocs/* root@149.50.148.198:/tmp/axiomadocs-update/

# 2. Ejecutar script de actualización
ssh root@149.50.148.198 "/opt/axiomadocs/update-production.sh"

# 3. Verificar que todo funciona
curl -I http://149.50.148.198:8080
```

### 🛠️ Actualización manual rápida (solo código)

```bash
# Conectar al servidor
ssh root@149.50.148.198

# Ir al directorio de la aplicación
cd /opt/axiomadocs

# Detener aplicaciones
pm2 stop ecosystem.config.js

# Construir nueva versión (si solo cambiaste frontend)
cd client && npm run build

# O construir backend (si cambiaste backend)
cd server && npm run build

# Reiniciar aplicaciones
cd /opt/axiomadocs && pm2 restart ecosystem.config.js

# Verificar estado
pm2 list
```

---

## 🔧 Troubleshooting Común

### Problemas de conexión externa
```bash
# Verificar que nginx esté escuchando
netstat -tlnp | grep :8080

# Verificar logs de nginx
tail -f /var/log/nginx/error.log

# Reiniciar nginx si es necesario
systemctl restart nginx
```

### Problemas con PM2
```bash
# Ver logs detallados
pm2 logs

# Reiniciar proceso específico
pm2 restart axiomadocs-server
pm2 restart axiomadocs-client

# Recargar configuración
pm2 reload ecosystem.config.js
```

### Problemas de base de datos
```bash
# Verificar conexión MySQL
mysql -u axiomadocs -p axiomadocs

# Ver logs del servidor para errores MySQL
pm2 logs axiomadocs-server | grep -i mysql
```

### Limpiar y reiniciar todo
```bash
# Script de reinicio completo
cd /opt/axiomadocs
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
systemctl restart nginx
```

---

## 📋 Checklist de Despliegue

### ✅ Despliegue inicial:
- [ ] Servidor Ubuntu configurado
- [ ] Node.js 18.x instalado
- [ ] MySQL instalado y configurado
- [ ] Nginx instalado
- [ ] PM2 instalado globalmente
- [ ] Base de datos creada
- [ ] Archivos subidos a /opt/axiomadocs
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas
- [ ] Aplicación construida (build)
- [ ] Configuración de Nginx creada
- [ ] PM2 configurado y aplicaciones iniciadas
- [ ] Puerto 8080 habilitado en firewall del proveedor
- [ ] Aplicación accesible desde http://IP:8080

### ✅ Actualización:
- [ ] Backup de base de datos realizado
- [ ] Nuevos archivos subidos
- [ ] Aplicaciones detenidas
- [ ] Dependencias actualizadas
- [ ] Aplicación reconstruida
- [ ] Aplicaciones reiniciadas
- [ ] Funcionalidad verificada

---

## 📞 Información de contacto del servidor

- **IP:** 149.50.148.198
- **Puerto aplicación:** 8080
- **Usuario SSH:** root
- **Directorio:** /opt/axiomadocs
- **URL:** http://149.50.148.198:8080

**¡Documentación completada!** 🎉