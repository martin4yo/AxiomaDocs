# Configuración MySQL para AxiomaDocs

Este documento describe cómo configurar MySQL para el sistema AxiomaDocs.

## Requisitos Previos

1. **MySQL Server** instalado y ejecutándose
2. **Cliente MySQL** (MySQL Workbench, phpMyAdmin, o línea de comandos)
3. **Node.js** con npm

## Pasos de Configuración

### 1. Instalar MySQL Server

Si no tienes MySQL instalado:
- Descarga desde: https://dev.mysql.com/downloads/mysql/
- O usa XAMPP/WAMP que incluye MySQL

### 2. Crear la Base de Datos

Opción A - **MySQL Workbench/phpMyAdmin**:
```sql
CREATE DATABASE axiomadocs 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

Opción B - **Línea de comandos**:
```bash
mysql -u root -p
CREATE DATABASE axiomadocs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

Opción C - **Script incluido**:
```bash
# Ejecutar el script SQL incluido
mysql -u root -p < server/scripts/create-mysql-database.sql
```

### 3. Configurar Variables de Entorno

Edita el archivo `server/.env`:

```env
# Configuración de base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=axiomadocs
DB_USER=root
DB_PASSWORD=tu_password_mysql
```

### 4. Instalar Dependencias

```bash
cd server
npm install
# mysql2 ya está incluido en las dependencias
```

### 5. Probar la Conexión

```bash
cd server
npm run test-mysql
```

### 6. Ejecutar la Aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Solución de Problemas

### Error: "Access denied for user"
- Verifica usuario y password en `.env`
- Asegúrate que el usuario tenga permisos en la BD

### Error: "Database 'axiomadocs' doesn't exist"
- Ejecuta el paso 2 para crear la base de datos

### Error: "Connection refused"
- Verifica que MySQL esté ejecutándose
- Verifica host y puerto en `.env`

### Error: "Too many connections"
- Reinicia el servidor MySQL
- Ajusta `max_connections` en MySQL

## Características de la Implementación

### Configuración de Charset
- **UTF8MB4**: Soporte completo para caracteres Unicode
- **Collation**: `utf8mb4_unicode_ci` para comparaciones correctas

### Timezone
- Configurado para **Argentina** (`-03:00`)
- Puedes cambiarlo en `server/src/models/database.ts`

### Opciones de Sync
- **DB_FORCE_RESET=true**: Recrea todas las tablas (⚠️ BORRA DATOS)
- **DB_ALLOW_ALTER=false**: Previene cambios automáticos de esquema

## Migración desde SQLite

Si tenías datos en SQLite, necesitarás:

1. **Exportar datos** de SQLite
2. **Crear la estructura** en MySQL con `sync({ force: true })`
3. **Importar datos** a MySQL
4. **Cambiar configuración** a `DB_ALLOW_ALTER=false`

## Usuario MySQL Específico (Opcional)

Para mayor seguridad, crea un usuario específico:

```sql
CREATE USER 'axioma_user'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON axiomadocs.* TO 'axioma_user'@'localhost';
FLUSH PRIVILEGES;
```

Luego actualiza el `.env`:
```env
DB_USER=axioma_user
DB_PASSWORD=password_seguro
```

## Respaldo y Restauración

### Respaldo
```bash
mysqldump -u root -p axiomadocs > backup_axiomadocs.sql
```

### Restauración
```bash
mysql -u root -p axiomadocs < backup_axiomadocs.sql
```

## Monitoreo

### Verificar conexiones activas
```sql
SHOW PROCESSLIST;
```

### Ver tablas creadas
```sql
USE axiomadocs;
SHOW TABLES;
```

### Verificar charset de las tablas
```sql
SELECT TABLE_NAME, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'axiomadocs';
```