# Migración MySQL → PostgreSQL

## **📋 Instrucciones para migrar datos**

### **1. Configurar credenciales MySQL**

Edita el archivo `server/migrate-mysql-to-postgres.ts` en las líneas 8-14:

```typescript
const mysqlConfig = {
  host: 'localhost',        // Cambiar si MySQL está en otro servidor
  port: 3306,              // Puerto de MySQL (normalmente 3306)
  user: 'root',            // Tu usuario de MySQL
  password: 'tu_password', // Tu contraseña de MySQL
  database: 'axiomadocs'   // Nombre de tu base de datos MySQL
};
```

### **2. Verificar base de datos MySQL**

Asegúrate de que la base de datos MySQL `axiomadocs` esté accesible:

```sql
-- Conectar a MySQL y verificar tablas
SHOW TABLES;
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM estados;
SELECT COUNT(*) FROM documentacion;
-- etc.
```

### **3. Ejecutar la migración**

```bash
cd server
npx ts-node migrate-mysql-to-postgres.ts
```

### **4. Verificar migración exitosa**

El script mostrará el progreso así:

```
🚀 Iniciando migración MySQL → PostgreSQL
✅ Conectado a MySQL
✅ Conectado a PostgreSQL

🔄 Migrando tabla: usuarios
📊 Encontrados 5 registros en usuarios
✅ Migración de usuarios completada

🔄 Migrando tabla: estados
📊 Encontrados 4 registros en estados
✅ Migración de estados completada

... (continúa con todas las tablas)

🔄 Reiniciando secuencias de PostgreSQL...
✅ Secuencias reiniciadas

🎉 ¡Migración completada exitosamente!
```

### **5. Verificar datos en PostgreSQL**

```bash
# Verificar que los datos se migraron correctamente
cd server
npx prisma studio
# O usar consultas SQL directas
```

## **🔧 Tablas que se migrarán**

El script migrará estas tablas en este orden (respetando dependencias):

1. **usuarios** (independiente)
2. **estados** (depende de usuarios)
3. **documentacion** (depende de estados y usuarios)
4. **recursos** (depende de estados y usuarios)
5. **entidades** (depende de estados y usuarios)
6. **recurso_documentacion** (depende de recursos y documentacion)
7. **entidad_documentacion** (depende de entidades y documentacion)
8. **entidad_recurso** (depende de entidades y recursos)

## **⚠️ Consideraciones importantes**

- **Backup**: Haz backup de tu base PostgreSQL antes de ejecutar
- **IDs**: Los IDs se regenerarán automáticamente en PostgreSQL
- **Fechas**: Las fechas se convertirán al formato PostgreSQL
- **Booleans**: Los valores se normalizarán a true/false
- **Duplicados**: Los registros duplicados se saltarán automáticamente

## **🚨 En caso de errores**

### Error de conexión MySQL:
```
❌ Error conectando a MySQL: Error: connect ECONNREFUSED
```
**Solución**: Verificar que MySQL esté ejecutándose y las credenciales sean correctas.

### Error de tablas no encontradas:
```
❌ Error migrando tabla usuarios: Error: Table 'axiomadocs.usuarios' doesn't exist
```
**Solución**: Verificar que la base de datos MySQL tenga las tablas correctas.

### Error de duplicados:
```
⚠️ Registro duplicado en usuarios, saltando...
```
**Esto es normal**: El script salta registros que ya existen.

## **✅ Después de la migración**

1. Verificar que todos los datos estén presentes
2. Probar login en la aplicación
3. Verificar que las funcionalidades principales funcionen
4. Considerar eliminar la base MySQL una vez confirmado que todo funciona

## **📞 Soporte**

Si encuentras algún problema:
1. Revisa los logs detallados del script
2. Verifica las credenciales de MySQL
3. Asegúrate de que PostgreSQL esté funcionando
4. Consulta este archivo para soluciones comunes