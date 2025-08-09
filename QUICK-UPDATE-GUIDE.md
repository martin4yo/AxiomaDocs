# 🚀 Guía Rápida de Actualización - AxiomaDocs

## ⚡ Actualización en 2 pasos (Método más rápido)

### 📋 Información del servidor:
- **IP:** 149.50.148.198
- **Usuario:** root  
- **URL:** http://149.50.148.198:8080

---

## 🖥️ Desde Windows (Automático)

### 1️⃣ Ejecutar script automático
```batch
# En el directorio de AxiomaDocs
deploy-new-version.bat
```

**¡Listo!** El script hace todo automáticamente:
- Sube los archivos nuevos
- Ejecuta la actualización en el servidor
- Reinicia las aplicaciones
- Verifica que todo funcione

---

## 🐧 Desde Linux/Manual (Comando por comando)

### 1️⃣ Subir archivos nuevos
```bash
# Desde tu directorio local de AxiomaDocs
scp -r ./* root@149.50.148.198:/tmp/axiomadocs-update/
```

### 2️⃣ Ejecutar actualización en servidor
```bash
ssh root@149.50.148.198 "/opt/axiomadocs/update-production.sh"
```

---

## 🔧 Actualización súper rápida (solo cambios menores)

Si solo cambiaste código y no dependencias:

```bash
# Conectar al servidor
ssh root@149.50.148.198

# Ir al directorio
cd /opt/axiomadocs

# Detener apps
pm2 stop ecosystem.config.js

# Construir (frontend)
cd client && npm run build

# Construir (backend)  
cd ../server && npm run build

# Reiniciar
cd .. && pm2 restart ecosystem.config.js
```

---

## ✅ Verificación rápida

```bash
# Verificar que funciona
curl -I http://149.50.148.198:8080

# Ver estado PM2
ssh root@149.50.148.198 "pm2 list"
```

---

## 🆘 Si algo sale mal

```bash
# Ver logs de errores
ssh root@149.50.148.198 "pm2 logs"

# Reiniciar todo
ssh root@149.50.148.198 "cd /opt/axiomadocs && pm2 restart ecosystem.config.js"

# Reiniciar nginx (si es necesario)
ssh root@149.50.148.198 "systemctl restart nginx"
```

---

## 📁 Estructura de archivos en servidor

```
/opt/axiomadocs/
├── client/          # React app
├── server/          # Node.js API
├── ecosystem.config.js  # Configuración PM2
└── update-production.sh # Script de actualización
```

---

## 💡 Consejos

1. **Siempre prueba localmente** antes de subir
2. **El script hace backup automático** de la base de datos
3. **Los .env no se sobrescriben** (configuración preserved)
4. **La primera actualización puede tardar más** (dependencias)
5. **Usa --skip-backup** para actualizaciones rápidas sin backup de BD

### Ejemplo con skip backup:
```bash
ssh root@149.50.148.198 "/opt/axiomadocs/update-production.sh --skip-backup"
```

---

## ⏱️ Tiempos estimados

- **Script automático completo:** 3-5 minutos
- **Actualización manual:** 2-3 minutos  
- **Actualización súper rápida:** 30 segundos

---

## 🎯 Resumen de comandos esenciales

```bash
# Windows - Actualización completa
deploy-new-version.bat

# Linux - Actualización completa
scp -r ./* root@149.50.148.198:/tmp/axiomadocs-update/
ssh root@149.50.148.198 "/opt/axiomadocs/update-production.sh"

# Verificar estado
ssh root@149.50.148.198 "pm2 list"

# Ver logs si hay problemas
ssh root@149.50.148.198 "pm2 logs"
```

**¡Actualización documentada y automatizada!** 🎉