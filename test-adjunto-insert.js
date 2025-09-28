const mysql = require('mysql2/promise');

async function insertTestAdjunto() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Q27G4B98', // contraseña desde .env
      database: 'axiomadocs'
    });

    console.log('✅ Conectado a la base de datos');

    // Insertar adjunto de prueba para VTV (documentoId=2) y entidadDocumentacion con id=3 (CLIBA)
    const insertQuery = `
      INSERT INTO documento_archivos
      (filename, storedFilename, mimeType, size, descripcion, version, documentacionId, entidadDocumentacionId, creadoPor, createdAt, updatedAt)
      VALUES
      ('vtv_certificado_cliba.pdf', 'stored_vtv_cert_20250918.pdf', 'application/pdf', 2048000, 'Certificado VTV para CLIBA S.A.', 1, 2, 3, 3, NOW(), NOW())
    `;

    const result = await connection.execute(insertQuery);

    console.log('✅ Adjunto de prueba insertado:', result[0]);

    // Verificar que se insertó correctamente
    const [rows] = await connection.execute('SELECT * FROM documento_archivos WHERE documentacionId = 2 AND entidadDocumentacionId = 3');

    console.log('📎 Adjuntos encontrados para VTV-CLIBA:', rows);

    await connection.end();
    console.log('✅ Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

insertTestAdjunto();