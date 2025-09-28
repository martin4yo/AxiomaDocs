# 🔍 Cómo verificar el puerto de MySQL en el servidor de producción

## Métodos para verificar el puerto de MySQL

### 1. **Desde tu máquina local (Windows)**

#### Opción A: Usar `telnet`
```bash
telnet 149.50.148.198 3306
```
- Si conecta: MySQL está escuchando en puerto 3306
- Si no conecta: Intenta otros puertos comunes (3307, 3308)

#### Opción B: Usar `nmap` (si lo tienes instalado)
```bash
nmap -p 3300-3310 149.50.148.198
```

#### Opción C: Usar PowerShell
```powershell
Test-NetConnection -ComputerName 149.50.148.198 -Port 3306
```

### 2. **Conectándote al servidor por SSH**

Si tienes acceso SSH al servidor 149.50.148.198:

```bash
ssh usuario@149.50.148.198
```

Luego ejecuta uno de estos comandos:

#### Opción A: Ver configuración de MySQL
```bash
# Ver el archivo de configuración
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep port

# O también
sudo grep "port" /etc/mysql/my.cnf
```

#### Opción B: Ver procesos escuchando
```bash
# Ver todos los puertos en uso
sudo netstat -tlnp | grep mysql

# O con ss (más moderno)
sudo ss -tlnp | grep mysql

# O con lsof
sudo lsof -i -P -n | grep mysql
```

#### Opción C: Verificar el proceso MySQL
```bash
# Ver detalles del proceso MySQL
ps aux | grep mysql

# Ver el puerto desde el servicio
sudo systemctl status mysql
```

#### Opción D: Conectarse a MySQL localmente
```bash
# Si tienes acceso a MySQL
mysql -u root -p -e "SHOW VARIABLES WHERE Variable_name = 'port';"

# O también
mysql -u root -p -e "SELECT @@port;"
```

### 3. **Verificar desde un script Node.js**

Crea este archivo para probar diferentes puertos: