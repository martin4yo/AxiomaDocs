#!/usr/bin/env node

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Iniciando migración manual...');

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'axiomadocs',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: console.log
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida');

    // 1. Agregar campo codigo si no existe
    try {
      await sequelize.query(`
        ALTER TABLE estados
        ADD COLUMN codigo VARCHAR(20) NULL UNIQUE
        COMMENT 'Código único del estado para identificación del sistema'
      `);
      console.log('✅ Campo codigo agregado a tabla estados');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Campo codigo ya existe en tabla estados');
      } else {
        throw error;
      }
    }

    // 2. Actualizar códigos de estados existentes
    const updates = [
      { codigo: 'EN_TRAMITE', nombre: 'En Trámite' },
      { codigo: 'VIGENTE', nombre: 'Vigente' },
      { codigo: 'VENCIDO', nombre: 'Vencido' },
      { codigo: 'POR_VENCER', nombre: 'Por Vencer' }
    ];

    for (const update of updates) {
      const [results] = await sequelize.query(`
        UPDATE estados SET codigo = :codigo
        WHERE nombre = :nombre AND (codigo IS NULL OR codigo = '')
      `, {
        replacements: update
      });

      if (results.affectedRows > 0) {
        console.log(`✅ Estado "${update.nombre}" actualizado con código "${update.codigo}"`);
      } else {
        console.log(`ℹ️  Estado "${update.nombre}" ya tenía código asignado`);
      }
    }

    // 3. Crear tabla de logs si no existe
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS estado_documento_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tipoDocumento ENUM('recurso', 'entidad') NOT NULL,
          documentacionId INT NOT NULL,
          recursoId INT NULL,
          entidadId INT NULL,
          estadoAnteriorId INT NULL,
          estadoNuevoId INT NOT NULL,
          razon VARCHAR(255) NOT NULL,
          fechaActualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          usuarioId INT NULL,
          tipoActualizacion ENUM('manual', 'automatica') NOT NULL DEFAULT 'automatica',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (documentacionId) REFERENCES documentacion(id),
          FOREIGN KEY (recursoId) REFERENCES recursos(id),
          FOREIGN KEY (entidadId) REFERENCES entidades(id),
          FOREIGN KEY (estadoAnteriorId) REFERENCES estados(id),
          FOREIGN KEY (estadoNuevoId) REFERENCES estados(id),
          FOREIGN KEY (usuarioId) REFERENCES usuarios(id),

          INDEX idx_tipo_documento (tipoDocumento),
          INDEX idx_fecha_actualizacion (fechaActualizacion),
          INDEX idx_tipo_actualizacion (tipoActualizacion)
        ) COMMENT = 'Log de auditoría para cambios de estado de documentos'
      `);
      console.log('✅ Tabla estado_documento_logs creada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Tabla estado_documento_logs ya existe');
      } else {
        throw error;
      }
    }

    // 4. Verificar migración
    const [estadosCount] = await sequelize.query(`
      SELECT COUNT(*) as cantidad FROM estados WHERE codigo IS NOT NULL
    `);

    const [logsCount] = await sequelize.query(`
      SELECT COUNT(*) as registros FROM estado_documento_logs
    `);

    console.log('\n📊 Verificación:');
    console.log(`Estados con códigos: ${estadosCount[0].cantidad}`);
    console.log(`Tabla logs: ${logsCount[0].registros} registros`);

    // 5. Mostrar estados actuales
    const [estados] = await sequelize.query(`
      SELECT nombre, codigo, color, nivel FROM estados ORDER BY nivel
    `);

    console.log('\n📋 Estados actuales:');
    estados.forEach(estado => {
      console.log(`  • ${estado.nombre}: ${estado.codigo || '(sin código)'} - Nivel ${estado.nivel}`);
    });

    console.log('\n🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

runMigration().catch(console.error);