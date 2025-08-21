# 🔧 Configuration Directory

Este directorio contiene archivos de configuración para diferentes entornos del proyecto AxiomaDocs.

## 📁 Archivos

### `production.env`
Archivo de configuración principal para el entorno de producción. Contiene todas las variables necesarias para el deployment.

**Modificar este archivo** para cambiar:
- IP del servidor
- Puertos de aplicación
- Configuración de base de datos
- Dominios y CORS
- Configuración de PM2

## 🚀 Uso

Para aplicar la configuración:

```bash
# Generar archivos .env automáticamente
npm run configure

# Ver qué se genera
node scripts/configure-env.js

# Deploy completo con nueva configuración
npm run deploy:prod
```

## ⚠️ Importante

- **NO commitear** archivos que contengan passwords reales
- **Hacer backup** de configuraciones funcionales antes de cambios
- **Probar localmente** después de cambios de configuración

## 🔄 Para Otros Entornos

Crear archivos similares para otros entornos:
- `staging.env` 
- `development.env`
- `testing.env`

Y modificar el script `configure-env.js` para soportar múltiples entornos.