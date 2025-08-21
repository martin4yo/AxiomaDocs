# 🚀 Guía de Deployment - AxiomaDocs

## 📋 Resumen
Esta guía documenta el proceso completo de deployment de AxiomaDocs a producción, incluyendo todas las correcciones y configuraciones necesarias.

## 🏗️ Arquitectura de Producción

```
┌─────────────────────────────────────────┐
│              SERVIDOR LINUX             │
│          149.50.148.198                 │
├─────────────────────────────────────────┤
│  📱 FRONTEND (Puerto 80)                │
│    - React + Vite build                 │
│    - Servido por PM2 + serve            │
│    - Dominio: docs.axiomacloud.com      │
├─────────────────────────────────────────┤
│  🔌 API BACKEND (Puerto 5000)           │
│    - Node.js + Express                  │
│    - MySQL Database                     │
│    - JWT Authentication                 │
├─────────────────────────────────────────┤
│  🗄️ MYSQL (Puerto 3306)                 │
│    - Database: axiomadocs               │
│    - Charset: UTF8MB4                   │
└─────────────────────────────────────────┘
```

## ⚡ Quick Deployment

### 1. Deployment desde Windows
```bash
# Ejecutar desde la raíz del proyecto
.\deploy-new-version.bat
```

### 2. Deployment desde Git Bash/Linux
```bash
# Hacer ejecutable (primera vez)
chmod +x deploy-new-version.sh
# Ejecutar deployment
./deploy-new-version.sh
```

## 🔧 Configuración Inicial del Servidor

### Variables de Entorno Requeridas

#### Frontend (.env en cliente)
```bash
VITE_API_URL=http://149.50.148.198:5000/api
```

#### Backend (.env en servidor)
```bash
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=axiomadocs
DB_USER=root
DB_PASSWORD=Q27G4B98
```

### Configuración PM2 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'axiomadocs-server',
      cwd: '/opt/axiomadocs/server',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'axiomadocs-client',
      cwd: '/opt/axiomadocs/client',
      script: 'npx',
      args: 'serve -s dist -l 80',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## 🚨 Problemas Comunes y Soluciones

### 1. Error de CORS
**Problema**: `Access to XMLHttpRequest blocked by CORS policy`

**Solución**: Verificar que en `server/src/index.ts` estén configurados todos los orígenes:
```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000', 'http://docs.axiomacloud.com', 'http://149.50.148.198:80'] 
    : ['http://localhost:3000'],
  credentials: true,
}));
```

### 2. Error de Conexión Rechazada
**Problema**: `net::ERR_CONNECTION_REFUSED`

**Soluciones**:
- Verificar que el servidor esté escuchando en IPv4: `app.listen(Number(PORT), "0.0.0.0")`
- Verificar puerto correcto en ecosystem.config.js
- Verificar que PM2 esté ejecutando ambos servicios

### 3. Error de Puerto Incorrecto
**Problema**: Frontend accede a puerto incorrecto

**Solución**: 
- Frontend debe estar en puerto 80 (HTTP estándar)
- API debe estar en puerto 5000
- Verificar configuración de dominio DNS

### 4. Sidebar No Visible en Móvil
**Problema**: Menú hamburguesa no funciona

**Solución**: Verificar implementación en Layout.tsx, Navbar.tsx, Sidebar.tsx

## 📝 Proceso de Deployment Paso a Paso

### 1. Pre-deployment (Local)
```bash
# 1. Verificar cambios
git status
git diff

# 2. Build local (opcional, para verificar)
cd client && npm run build

# 3. Commit cambios
git add .
git commit -m "Descripción de cambios"
git push origin master
```

### 2. Deployment Automático
```bash
# Ejecutar script de deployment
.\deploy-new-version.bat  # Windows
./deploy-new-version.sh   # Linux/Git Bash
```

### 3. Verificación Post-deployment
```bash
# Conectar al servidor para verificación
ssh root@149.50.148.198

# Verificar servicios
pm2 status

# Verificar logs
pm2 logs --lines 20

# Verificar puertos
ss -tlnp | grep -E ':80|:5000'

# Test de conectividad
curl -I http://localhost:5000/api/auth/login  # Debe retornar 404
curl -I http://localhost:80                   # Debe retornar 200
```

## 🔄 Comandos Útiles de Mantenimiento

### PM2 Commands
```bash
pm2 status                    # Ver estado de aplicaciones
pm2 logs                      # Ver logs de todas las apps
pm2 logs axiomadocs-server    # Ver logs específicos del servidor
pm2 logs axiomadocs-client    # Ver logs específicos del cliente
pm2 restart all               # Reiniciar todas las aplicaciones
pm2 restart axiomadocs-server # Reiniciar solo el servidor
pm2 stop all                  # Detener todas las aplicaciones
pm2 start ecosystem.config.js # Iniciar aplicaciones
```

### Database Commands
```bash
# Resetear base de datos (CUIDADO - BORRA TODO)
cd /opt/axiomadocs/server && npm run reset-db

# Verificar conexión MySQL
cd /opt/axiomadocs/server && npm run test-mysql
```

### Build Commands
```bash
# Rebuild completo
cd /opt/axiomadocs/client && rm -rf dist && npm run build
cd /opt/axiomadocs/server && npm run build

# Reiniciar servicios después del build
pm2 restart all
```

## 📊 Monitoreo y Logs

### Ubicación de Logs
```
/var/log/axiomadocs-server-error.log  # Errores del servidor
/var/log/axiomadocs-server-out.log    # Salida del servidor
/var/log/axiomadocs-client-error.log  # Errores del cliente  
/var/log/axiomadocs-client-out.log    # Salida del cliente
```

### Comandos de Monitoreo
```bash
# Ver logs en tiempo real
tail -f /var/log/axiomadocs-server-out.log

# Ver errores recientes
tail -50 /var/log/axiomadocs-server-error.log

# Monitor de recursos
top -p $(pgrep -f "axiomadocs")
```

## 🔐 Configuración de Seguridad

### Firewall (si es necesario)
```bash
# Abrir puertos necesarios
ufw allow 80/tcp    # Frontend
ufw allow 5000/tcp  # API (solo si necesario desde exterior)
ufw allow 22/tcp    # SSH
```

### SSL/HTTPS (Futuro)
Para implementar HTTPS, será necesario:
1. Certificado SSL (Let's Encrypt)
2. Configurar Nginx como proxy reverso
3. Actualizar URLs a HTTPS en variables de entorno

## 📚 Troubleshooting Avanzado

### 1. Verificar Configuración CORS
```bash
# Test CORS desde servidor
curl -H "Origin: http://docs.axiomacloud.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:5000/api/auth/login
```

### 2. Debug de Variables de Entorno
```bash
# Verificar variables compiladas en frontend
cd /opt/axiomadocs/client/dist/assets
grep -o 'http://[^"]*api' *.js

# Verificar variables de servidor
cd /opt/axiomadocs/server
node -e "require('dotenv').config(); console.log(process.env)"
```

### 3. Verificar Procesos de Red
```bash
# Ver qué proceso está usando cada puerto
lsof -i :80
lsof -i :5000

# Verificar conexiones activas
netstat -tulpn | grep -E ':80|:5000'
```

## 📅 Historial de Cambios Importantes

### v1.1 - Deployment Fixes (Agosto 2025)
- ✅ Corregido problema de sidebar móvil
- ✅ Configurado CORS para múltiples dominios
- ✅ Solucionado binding IPv4 del servidor
- ✅ Ajustado puerto frontend de 8080 a 80
- ✅ Mejorado proceso de deployment automático

### v1.0 - Initial Release
- ✅ Sistema completo de gestión de documentación
- ✅ Frontend React + Backend Node.js
- ✅ Base de datos MySQL
- ✅ Authentication JWT
- ✅ Sistema de exportación Excel/PDF

---

## ⚠️ Notas Importantes

1. **Siempre hacer backup** de la base de datos antes de deployments importantes
2. **Verificar logs** después de cada deployment
3. **Probar funcionalidad crítica** post-deployment
4. **Documentar cualquier cambio** en configuración
5. **Mantener variables de entorno actualizadas**

## 🆘 Contacto de Soporte
Para problemas técnicos, revisar logs y seguir los pasos de troubleshooting. Si el problema persiste, documentar el error específico y las condiciones que lo reproducen.