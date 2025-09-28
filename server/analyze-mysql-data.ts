import mysql from 'mysql2/promise';

// Script para analizar datos problemáticos en MySQL antes de la migración
const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs'
};

async function analyzeMySQLData() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔍 Conectando a MySQL para análisis de datos...');
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL\n');

    // Analizar tabla documentacion
    console.log('📋 === ANÁLISIS TABLA DOCUMENTACION ===');
    const [docRows] = await connection.execute(`
      SELECT
        id,
        codigo,
        nombre,
        descripcion,
        estado_id,
        activo,
        created_at
      FROM documentacion
      ORDER BY id
    `);

    const docs = docRows as any[];
    console.log(`📊 Total registros en documentacion: ${docs.length}`);

    if (docs.length > 0) {
      console.log('\n🔍 Análisis de campos faltantes:');

      // Verificar registros sin nombre
      const docsWithoutName = docs.filter(doc => !doc.nombre || doc.nombre.trim() === '');
      console.log(`   ❌ Registros sin NOMBRE: ${docsWithoutName.length}`);
      if (docsWithoutName.length > 0) {
        docsWithoutName.forEach(doc => {
          console.log(`      ID: ${doc.id}, CODIGO: ${doc.codigo || 'NULL'}, NOMBRE: "${doc.nombre || 'NULL'}"`);
        });
      }

      // Verificar registros sin estado_id válido
      const docsWithoutStateId = docs.filter(doc => !doc.estado_id || doc.estado_id === 0);
      console.log(`   ❌ Registros sin ESTADO_ID válido: ${docsWithoutStateId.length}`);
      if (docsWithoutStateId.length > 0) {
        docsWithoutStateId.forEach(doc => {
          console.log(`      ID: ${doc.id}, NOMBRE: ${doc.nombre || 'NULL'}, ESTADO_ID: ${doc.estado_id || 'NULL'}`);
        });
      }

      // Mostrar primeros registros válidos como ejemplo
      const validDocs = docs.filter(doc => doc.nombre && doc.nombre.trim() !== '' && doc.estado_id);
      console.log(`   ✅ Registros válidos: ${validDocs.length}`);
      if (validDocs.length > 0) {
        console.log('   📋 Ejemplos de registros válidos:');
        validDocs.slice(0, 3).forEach(doc => {
          console.log(`      ID: ${doc.id}, CODIGO: ${doc.codigo}, NOMBRE: "${doc.nombre}", ESTADO_ID: ${doc.estado_id}`);
        });
      }
    }

    // Analizar tabla recursos
    console.log('\n🧑 === ANÁLISIS TABLA RECURSOS ===');
    const [resourceRows] = await connection.execute(`
      SELECT
        id,
        codigo,
        nombre,
        apellido,
        dni,
        estado_id,
        activo,
        created_at
      FROM recursos
      ORDER BY id
    `);

    const recursos = resourceRows as any[];
    console.log(`📊 Total registros en recursos: ${recursos.length}`);

    if (recursos.length > 0) {
      console.log('\n🔍 Análisis de campos faltantes:');

      // Verificar registros sin nombre
      const recursosWithoutName = recursos.filter(rec => !rec.nombre || rec.nombre.trim() === '');
      console.log(`   ❌ Registros sin NOMBRE: ${recursosWithoutName.length}`);
      if (recursosWithoutName.length > 0) {
        recursosWithoutName.forEach(rec => {
          console.log(`      ID: ${rec.id}, CODIGO: ${rec.codigo || 'NULL'}, NOMBRE: "${rec.nombre || 'NULL'}", APELLIDO: "${rec.apellido || 'NULL'}"`);
        });
      }

      // Verificar registros sin estado_id válido
      const recursosWithoutStateId = recursos.filter(rec => !rec.estado_id || rec.estado_id === 0);
      console.log(`   ❌ Registros sin ESTADO_ID válido: ${recursosWithoutStateId.length}`);
      if (recursosWithoutStateId.length > 0) {
        recursosWithoutStateId.forEach(rec => {
          console.log(`      ID: ${rec.id}, NOMBRE: ${rec.nombre || 'NULL'}, APELLIDO: ${rec.apellido || 'NULL'}, ESTADO_ID: ${rec.estado_id || 'NULL'}`);
        });
      }

      // Mostrar primeros registros válidos
      const validRecursos = recursos.filter(rec => rec.nombre && rec.nombre.trim() !== '' && rec.estado_id);
      console.log(`   ✅ Registros válidos: ${validRecursos.length}`);
      if (validRecursos.length > 0) {
        console.log('   📋 Ejemplos de registros válidos:');
        validRecursos.slice(0, 3).forEach(rec => {
          console.log(`      ID: ${rec.id}, CODIGO: ${rec.codigo}, NOMBRE: "${rec.nombre}", APELLIDO: "${rec.apellido}", ESTADO_ID: ${rec.estado_id}`);
        });
      }
    }

    // Analizar tabla entidades
    console.log('\n🏢 === ANÁLISIS TABLA ENTIDADES ===');
    const [entityRows] = await connection.execute(`
      SELECT
        id,
        nombre,
        descripcion,
        url,
        contacto,
        estado_id,
        activo,
        created_at
      FROM entidades
      ORDER BY id
    `);

    const entidades = entityRows as any[];
    console.log(`📊 Total registros en entidades: ${entidades.length}`);

    if (entidades.length > 0) {
      console.log('\n🔍 Análisis de campos faltantes:');

      // Verificar registros sin nombre
      const entidadesWithoutName = entidades.filter(ent => !ent.nombre || ent.nombre.trim() === '');
      console.log(`   ❌ Registros sin NOMBRE: ${entidadesWithoutName.length}`);
      if (entidadesWithoutName.length > 0) {
        entidadesWithoutName.forEach(ent => {
          console.log(`      ID: ${ent.id}, NOMBRE: "${ent.nombre || 'NULL'}", DESCRIPCION: "${ent.descripcion || 'NULL'}"`);
        });
      }

      // Verificar registros sin estado_id válido
      const entidadesWithoutStateId = entidades.filter(ent => !ent.estado_id || ent.estado_id === 0);
      console.log(`   ❌ Registros sin ESTADO_ID válido: ${entidadesWithoutStateId.length}`);
      if (entidadesWithoutStateId.length > 0) {
        entidadesWithoutStateId.forEach(ent => {
          console.log(`      ID: ${ent.id}, NOMBRE: ${ent.nombre || 'NULL'}, ESTADO_ID: ${ent.estado_id || 'NULL'}`);
        });
      }

      // Mostrar primeros registros válidos
      const validEntidades = entidades.filter(ent => ent.nombre && ent.nombre.trim() !== '' && ent.estado_id);
      console.log(`   ✅ Registros válidos: ${validEntidades.length}`);
      if (validEntidades.length > 0) {
        console.log('   📋 Ejemplos de registros válidos:');
        validEntidades.slice(0, 3).forEach(ent => {
          console.log(`      ID: ${ent.id}, NOMBRE: "${ent.nombre}", ESTADO_ID: ${ent.estado_id}`);
        });
      }
    }

    // Verificar estados disponibles para usar como estado_id por defecto
    console.log('\n📊 === ESTADOS DISPONIBLES ===');
    const [stateRows] = await connection.execute(`
      SELECT id, nombre, nivel, activo
      FROM estados
      WHERE activo = 1
      ORDER BY nivel ASC
    `);

    const estados = stateRows as any[];
    console.log(`📊 Estados activos disponibles: ${estados.length}`);
    if (estados.length > 0) {
      console.log('   Estados disponibles para asignar:');
      estados.forEach(estado => {
        console.log(`      ID: ${estado.id}, NOMBRE: "${estado.nombre}", NIVEL: ${estado.nivel}`);
      });
    }

    // Generar recomendaciones de corrección
    console.log('\n💡 === RECOMENDACIONES DE CORRECCIÓN ===');

    const defaultStateId = estados.length > 0 ? estados[0].id : 1;
    console.log(`🔧 Estado por defecto a usar: ID ${defaultStateId} (${estados[0]?.nombre || 'En Trámite'})`);

    console.log('\n📝 SQL de corrección recomendado:');

    // SQL para documentacion
    if (docs.some(doc => !doc.nombre || doc.nombre.trim() === '')) {
      console.log('\n-- Corregir documentación sin nombre:');
      docs.filter(doc => !doc.nombre || doc.nombre.trim() === '').forEach(doc => {
        const newName = doc.codigo ? `Documento ${doc.codigo}` : `Documento ID-${doc.id}`;
        console.log(`UPDATE documentacion SET nombre = '${newName}' WHERE id = ${doc.id};`);
      });
    }

    if (docs.some(doc => !doc.estado_id || doc.estado_id === 0)) {
      console.log('\n-- Corregir documentación sin estado_id:');
      docs.filter(doc => !doc.estado_id || doc.estado_id === 0).forEach(doc => {
        console.log(`UPDATE documentacion SET estado_id = ${defaultStateId} WHERE id = ${doc.id};`);
      });
    }

    // SQL para recursos
    if (recursos.some(rec => !rec.nombre || rec.nombre.trim() === '')) {
      console.log('\n-- Corregir recursos sin nombre:');
      recursos.filter(rec => !rec.nombre || rec.nombre.trim() === '').forEach(rec => {
        const newName = rec.codigo ? `Recurso ${rec.codigo}` :
                       rec.apellido ? `Recurso ${rec.apellido}` :
                       rec.dni ? `Recurso DNI-${rec.dni}` :
                       `Recurso ID-${rec.id}`;
        console.log(`UPDATE recursos SET nombre = '${newName}' WHERE id = ${rec.id};`);
      });
    }

    if (recursos.some(rec => !rec.estado_id || rec.estado_id === 0)) {
      console.log('\n-- Corregir recursos sin estado_id:');
      recursos.filter(rec => !rec.estado_id || rec.estado_id === 0).forEach(rec => {
        console.log(`UPDATE recursos SET estado_id = ${defaultStateId} WHERE id = ${rec.id};`);
      });
    }

    // SQL para entidades
    if (entidades.some(ent => !ent.nombre || ent.nombre.trim() === '')) {
      console.log('\n-- Corregir entidades sin nombre:');
      entidades.filter(ent => !ent.nombre || ent.nombre.trim() === '').forEach(ent => {
        const newName = ent.descripcion ? `Entidad ${ent.descripcion.substring(0, 30)}` :
                       ent.contacto ? `Entidad ${ent.contacto}` :
                       `Entidad ID-${ent.id}`;
        console.log(`UPDATE entidades SET nombre = '${newName}' WHERE id = ${ent.id};`);
      });
    }

    if (entidades.some(ent => !ent.estado_id || ent.estado_id === 0)) {
      console.log('\n-- Corregir entidades sin estado_id:');
      entidades.filter(ent => !ent.estado_id || ent.estado_id === 0).forEach(ent => {
        console.log(`UPDATE entidades SET estado_id = ${defaultStateId} WHERE id = ${ent.id};`);
      });
    }

    console.log('\n🎯 === RESUMEN DEL ANÁLISIS ===');
    console.log(`📋 Documentación: ${docs.length} registros, problemas detectados en campos faltantes`);
    console.log(`🧑 Recursos: ${recursos.length} registros, problemas detectados en campos faltantes`);
    console.log(`🏢 Entidades: ${entidades.length} registros, problemas detectados en campos faltantes`);
    console.log(`📊 Estados disponibles: ${estados.length} para usar como referencia`);
    console.log('\n✅ Análisis completado. Puedes ejecutar los SQL de corrección recomendados.');

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📪 Conexión MySQL cerrada');
    }
  }
}

analyzeMySQLData().catch(console.error);