# 🚀 Migración MySQL → PostgreSQL en PRODUCCIÓN

## 📋 Requisitos Previos

### 1. Información necesaria:
- **Password de MySQL** en servidor 149.50.148.198
- **Credenciales de PostgreSQL** del servidor de producción
  - Host/IP del servidor PostgreSQL
  - Puerto (generalmente 5432)
  - Usuario
  - Password
  - Nombre de base de datos

### 2. Verificar conectividad:
- Tu máquina debe poder conectarse al servidor MySQL (149.50.148.198:3306)
- Tu máquina debe poder conectarse al servidor PostgreSQL de producción

## 🔧 Pasos de Configuración

### Paso 1: Crear archivo de configuración

```bash
cd server
cp .env.production.example .env.production
```

### Paso 2: Editar `.env.production`

```env
# MySQL de Producción (149.50.148.198)
MYSQL_PROD_PASSWORD=tu_password_mysql_real

# PostgreSQL de Producción
# Ejemplos según tu configuración:

# Si PostgreSQL está en el mismo servidor (149.50.148.198):
POSTGRES_PROD_URL=postgresql://postgres:password@149.50.148.198:5432/axiomadocs

# Si PostgreSQL está en otro servidor:
POSTGRES_PROD_URL=postgresql://usuario:password@ip_servidor:5432/axiomadocs

# Si usas Supabase:
POSTGRES_PROD_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres

# Si usas Neon:
POSTGRES_PROD_URL=postgresql://usuario:password@ep-xxx.region.aws.neon.tech/axiomadocs
```

### Paso 3: Verificar estructura de MySQL de producción

```bash
cd server
npx ts-node check-production-mysql.ts
```

Esto mostrará:
- Tablas disponibles en MySQL
- Cantidad de registros por tabla
- Estructura de las tablas

### Paso 4: Configurar PostgreSQL de producción

Asegúrate de que en el servidor PostgreSQL:
1. La base de datos exista (ej: `axiomadocs`)
2. El usuario tenga permisos completos
3. Las tablas Prisma estén creadas:

```bash
# En el servidor donde está PostgreSQL, ejecutar:
cd /opt/axiomadocs/server
npx prisma db push
```

## 🚀 Ejecutar la Migración

### Paso 5: Ejecutar migración (IMPORTANTE)

El script tiene una protección para evitar borrar datos accidentalmente.

1. **Primero ejecuta en modo seguro (sin borrar):**

```bash
cd server
npx ts-node migrate-production-mysql-to-postgres.ts
```

Esto mostrará una advertencia y NO migrará nada.

2. **Para ejecutar la migración real:**

Edita el archivo `migrate-production-mysql-to-postgres.ts` y descomenta las líneas 175-185:

```typescript
// DESCOMENTA ESTAS LÍNEAS PARA LIMPIAR Y MIGRAR
// Cambiar de:
/*
// Limpiar tablas en PostgreSQL de producción
console.log('🧹 Limpiando tablas en PostgreSQL de producción...');
await prisma.entidadRecurso.deleteMany();
...
*/

// A:
// Limpiar tablas en PostgreSQL de producción
console.log('🧹 Limpiando tablas en PostgreSQL de producción...');
await prisma.entidadRecurso.deleteMany();
...
```

3. **Ejecutar migración completa:**

```bash
npx ts-node migrate-production-mysql-to-postgres.ts
```

## ✅ Verificación

### Paso 6: Verificar migración

1. **Conéctate al PostgreSQL de producción:**

```bash
# Usando psql
psql -h host_postgresql -U usuario -d axiomadocs

# O usando Prisma Studio
cd server
npx prisma studio
```

2. **Verifica conteos:**

```sql
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM estados;
SELECT COUNT(*) FROM documentacion;
SELECT COUNT(*) FROM recursos;
SELECT COUNT(*) FROM entidades;
```

3. **Prueba la aplicación:**
- Intenta hacer login
- Verifica que los datos aparezcan correctamente
- Revisa que las relaciones funcionen

## 🔥 Troubleshooting

### Error: "Connection refused" a MySQL
- Verifica que MySQL permita conexiones remotas
- En el servidor MySQL: `/etc/mysql/mysql.conf.d/mysqld.cnf`
- Debe tener: `bind-address = 0.0.0.0`
- Reinicia MySQL: `sudo service mysql restart`

### Error: "Access denied" en MySQL
- Verifica el password
- Asegúrate que el usuario root tenga permisos desde tu IP:
```sql
GRANT ALL PRIVILEGES ON axiomadocs.* TO 'root'@'%' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
```

### Error: "Connection timeout" a PostgreSQL
- Verifica firewall/security groups
- Confirma el puerto (generalmente 5432)
- Prueba conexión: `telnet host_postgresql 5432`

### Error: "relation does not exist" en PostgreSQL
- Las tablas no están creadas en PostgreSQL
- Ejecuta en el servidor: `npx prisma db push`

### Error: "duplicate key value"
- Ya hay datos en PostgreSQL
- Limpia primero o usa el script con las líneas de limpieza descomentadas

## 📊 Resultado Esperado

Al finalizar deberías ver:

```
🎉 ¡Migración de producción completada exitosamente!

📊 === RESUMEN DE MIGRACIÓN ===
📋 Registros migrados por tabla:
   usuarios: 3 registros
   estados: 4 registros
   documentacion: 4 registros
   recursos: 2 registros
   entidades: 2 registros
   recursoDocumentacion: 2 registros
   entidadDocumentacion: 3 registros
   entidadRecurso: 1 registros

✅ Total de registros migrados: 21
```

## 🔒 Seguridad

**IMPORTANTE**:
- NO commitees el archivo `.env.production` con passwords reales
- Agrega `.env.production` a `.gitignore`
- Después de la migración, elimina o protege el archivo con las credenciales

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs detallados del script
2. Verifica conectividad a ambos servidores
3. Confirma que las credenciales sean correctas
4. Asegúrate de que PostgreSQL tenga las tablas creadas con Prisma