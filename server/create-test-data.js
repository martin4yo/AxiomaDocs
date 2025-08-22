const mysql = require('mysql2/promise');

async function createTestData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Polaca3402',
    database: 'axiomadocs'
  });

  try {
    console.log('Conectado a MySQL, creando datos de prueba...');

    // Crear tablas básicas de workflows e intercambios si no existen
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS workflows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        version VARCHAR(20) DEFAULT '1.0',
        categoria VARCHAR(50) NOT NULL,
        tipo ENUM('bilateral', 'supervisado', 'circular', 'jerarquico', 'paralelo') NOT NULL,
        participantes JSON,
        pasos JSON,
        transiciones JSON,
        complejidad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
        estimacionDuracionHoras INT,
        estado ENUM('borrador', 'activo', 'pausado', 'obsoleto') DEFAULT 'borrador',
        publicado BOOLEAN DEFAULT false,
        utilizaciones INT DEFAULT 0,
        fechaUltimaModificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        creadoPor INT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS intercambios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        workflowId INT,
        workflowVersion VARCHAR(20),
        entidadOrigenId INT,
        entidadDestinoId INT,
        estado ENUM('iniciado', 'en_progreso', 'completado', 'pausado', 'cancelado') DEFAULT 'iniciado',
        prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
        fechaInicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fechaEstimadaFin DATETIME,
        progreso DECIMAL(5,2) DEFAULT 0,
        contexto JSON,
        participantesAsignados JSON,
        responsableId INT,
        supervisorId INT,
        creadoPor INT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Crear algunos workflows de ejemplo
    await connection.execute(`
      INSERT IGNORE INTO workflows (codigo, nombre, descripcion, categoria, tipo, complejidad, estimacionDuracionHoras, estado, publicado, creadoPor) VALUES
      ('WF_RENOVACION_LICENCIAS', 'Renovación de Licencias de Conducir', 'Proceso estándar para renovación de licencias entre gobierno y entidades', 'Gobierno', 'bilateral', 'media', 72, 'activo', true, 1),
      ('WF_CERTIFICADOS_MEDICOS', 'Distribución de Certificados Médicos', 'Flujo circular para distribución masiva de certificados médicos', 'Salud', 'circular', 'baja', 24, 'activo', true, 1),
      ('WF_APROBACION_CONTRATOS', 'Aprobación Jerárquica de Contratos', 'Proceso de aprobación con múltiples niveles de supervisión', 'Legal', 'jerarquico', 'alta', 120, 'borrador', false, 1)
    `);

    // Crear algunos intercambios de ejemplo
    await connection.execute(`
      INSERT IGNORE INTO intercambios (codigo, nombre, descripcion, workflowId, workflowVersion, entidadOrigenId, entidadDestinoId, prioridad, fechaEstimadaFin, progreso, responsableId, creadoPor) VALUES
      ('INT-2025-001', 'Renovación Licencias - Entidad Municipal', 'Proceso de renovación de licencias para empleados municipales', 1, '1.0', 1, 2, 'alta', '2025-09-15', 65.5, 1, 1),
      ('INT-2025-002', 'Certificados Médicos - Hospital Central', 'Intercambio de certificados médicos entre hospital y entidades', 2, '1.0', 2, 1, 'media', '2025-08-30', 25.0, 1, 1)
    `);

    console.log('✅ Datos de prueba creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createTestData();