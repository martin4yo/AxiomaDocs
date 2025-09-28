# Migración usando túnel SSH

Si tienes acceso SSH al servidor pero no puedes configurar MySQL para acceso remoto, puedes usar un túnel SSH:

## 1. Crear el túnel SSH (en una terminal separada)

```bash
# Windows PowerShell o Git Bash
ssh -L 3307:localhost:3306 usuario@149.50.148.198

# Esto crea un túnel:
# - Puerto local 3307 → Puerto remoto 3306
# Mantén esta terminal abierta durante la migración
```

## 2. Modificar el script de migración

En `migrate-production-mysql-to-postgres.ts`, cambia:

```typescript
const mysqlConfig = {
  host: 'localhost',  // Cambiar a localhost
  port: 3307,         // Usar el puerto del túnel
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs',
  connectTimeout: 60000
};
```

## 3. Ejecutar la migración

```bash
cd server
npx ts-node migrate-production-mysql-to-postgres.ts
```

Esta opción es más segura ya que no requiere abrir MySQL al mundo exterior.