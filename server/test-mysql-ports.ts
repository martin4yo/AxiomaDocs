import mysql from 'mysql2/promise';
import * as net from 'net';

// Script para probar diferentes puertos de MySQL
const HOST = '149.50.148.198';
const PORTS_TO_TEST = [3306, 3307, 3308, 33060]; // Puertos comunes de MySQL
const TIMEOUT = 5000; // 5 segundos de timeout

async function testPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(TIMEOUT);

    socket.on('connect', () => {
      console.log(`✅ Puerto ${port}: ABIERTO`);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      console.log(`❌ Puerto ${port}: CERRADO o no accesible`);
      resolve(false);
    });

    socket.on('timeout', () => {
      console.log(`⏱️ Puerto ${port}: TIMEOUT`);
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function testMySQLConnection(port: number, password: string) {
  const config = {
    host: HOST,
    port: port,
    user: 'root',
    password: password,
    database: 'axiomadocs',
    connectTimeout: 10000
  };

  try {
    console.log(`\n🔌 Intentando conectar a MySQL en puerto ${port}...`);
    const connection = await mysql.createConnection(config);

    // Obtener información del servidor
    const [versionResult] = await connection.execute('SELECT VERSION() as version');
    const version = (versionResult as any[])[0].version;

    const [portResult] = await connection.execute('SHOW VARIABLES WHERE Variable_name = "port"');
    const serverPort = (portResult as any[])[0]?.Value;

    console.log(`✅ CONEXIÓN EXITOSA en puerto ${port}`);
    console.log(`   MySQL Version: ${version}`);
    console.log(`   Puerto confirmado por servidor: ${serverPort}`);

    // Contar tablas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`   Tablas en axiomadocs: ${(tables as any[]).length}`);

    await connection.end();
    return true;

  } catch (error: any) {
    console.log(`❌ No se pudo conectar a MySQL en puerto ${port}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Probando puertos MySQL en servidor de producción');
  console.log(`📍 Host: ${HOST}`);
  console.log(`🔢 Puertos a probar: ${PORTS_TO_TEST.join(', ')}`);
  console.log('');

  // Primero verificar qué puertos están abiertos
  console.log('=== FASE 1: Verificación de puertos abiertos ===');
  const openPorts: number[] = [];

  for (const port of PORTS_TO_TEST) {
    const isOpen = await testPort(HOST, port);
    if (isOpen) {
      openPorts.push(port);
    }
  }

  if (openPorts.length === 0) {
    console.log('\n❌ No se encontraron puertos MySQL abiertos');
    console.log('Posibles causas:');
    console.log('1. MySQL está configurado solo para localhost (bind-address = 127.0.0.1)');
    console.log('2. El firewall bloquea los puertos');
    console.log('3. MySQL está en un puerto diferente');
    return;
  }

  console.log(`\n✅ Puertos abiertos encontrados: ${openPorts.join(', ')}`);

  // Si se proporciona password, intentar conectar
  const password = process.env.MYSQL_PROD_PASSWORD || process.argv[2];

  if (password) {
    console.log('\n=== FASE 2: Intentando conexión MySQL ===');

    for (const port of openPorts) {
      const connected = await testMySQLConnection(port, password);
      if (connected) {
        console.log(`\n🎉 MySQL está funcionando en el puerto ${port}`);
        console.log('\nActualiza tu configuración con:');
        console.log(`MYSQL_PROD_HOST=${HOST}`);
        console.log(`MYSQL_PROD_PORT=${port}`);
        console.log(`MYSQL_PROD_PASSWORD=tu_password`);
        break;
      }
    }
  } else {
    console.log('\n💡 Para probar la conexión MySQL, ejecuta:');
    console.log('   npx ts-node test-mysql-ports.ts tu_password_mysql');
    console.log('   O configura MYSQL_PROD_PASSWORD en .env.production');
  }
}

main().catch(console.error);