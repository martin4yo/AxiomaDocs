const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 5003;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Configuración de conexión MySQL
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Polaca3402',
  database: 'axiomadocs'
};

// Middleware de autenticación simplificado (para testing)
const authenticateToken = (req, res, next) => {
  // Para testing: siempre permitir acceso
  req.user = { id: 1, username: 'admin' };
  next();
};

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Para testing, aceptamos cualquier credencial
    if (username && password) {
      res.json({
        token: 'test-token',
        user: {
          id: 1,
          username: username,
          email: 'admin@test.com',
          nombre: 'Admin',
          apellido: 'Sistema'
        }
      });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, nombre, apellido } = req.body;
    
    // Para testing, siempre permitimos registro
    res.status(201).json({
      token: 'test-token',
      user: {
        id: 2,
        username,
        email,
        nombre,
        apellido
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: 'admin@test.com',
    nombre: 'Admin',
    apellido: 'Sistema'
  });
});

// GET /api/intercambios
app.get('/api/intercambios', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [intercambios] = await connection.execute(`
      SELECT 
        i.*,
        w.codigo as workflow_codigo,
        w.nombre as workflow_nombre,
        w.tipo as workflow_tipo,
        w.categoria as workflow_categoria
      FROM intercambios i
      LEFT JOIN workflows w ON i.workflowId = w.id
      ORDER BY i.createdAt DESC
      LIMIT 10
    `);
    
    // Formatear los datos para el frontend
    const formattedIntercambios = intercambios.map(i => ({
      id: i.id,
      codigo: i.codigo,
      nombre: i.nombre,
      descripcion: i.descripcion,
      workflowId: i.workflowId,
      workflowVersion: i.workflowVersion,
      entidadOrigenId: i.entidadOrigenId,
      entidadDestinoId: i.entidadDestinoId,
      estado: i.estado,
      prioridad: i.prioridad,
      fechaInicio: i.fechaInicio,
      fechaEstimadaFin: i.fechaEstimadaFin,
      progreso: parseFloat(i.progreso),
      responsableId: i.responsableId,
      supervisorId: i.supervisorId,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      workflow: {
        id: i.workflowId,
        codigo: i.workflow_codigo,
        nombre: i.workflow_nombre,
        tipo: i.workflow_tipo,
        categoria: i.workflow_categoria
      },
      entidadOrigen: {
        id: i.entidadOrigenId,
        nombre: `Entidad ${i.entidadOrigenId}`
      },
      entidadDestino: {
        id: i.entidadDestinoId,
        nombre: `Entidad ${i.entidadDestinoId}`
      },
      responsable: {
        id: i.responsableId,
        nombre: 'Usuario',
        apellido: 'Prueba'
      }
    }));
    
    await connection.end();
    
    res.json({
      intercambios: formattedIntercambios,
      pagination: {
        page: 1,
        limit: 10,
        total: formattedIntercambios.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/intercambios/estadisticas
app.get('/api/intercambios/estadisticas', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
        SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completados,
        SUM(CASE WHEN fechaEstimadaFin < NOW() AND estado NOT IN ('completado', 'cancelado') THEN 1 ELSE 0 END) as con_retrasos
      FROM intercambios
    `);
    
    await connection.end();
    
    const row = stats[0];
    res.json({
      resumen: {
        totalIntercambios: parseInt(row.total),
        enProgreso: parseInt(row.en_progreso),
        completados: parseInt(row.completados),
        conRetrasos: parseInt(row.con_retrasos),
        tiempoPromedioComplecion: 4.2,
        eficienciaPromedio: 87.5
      },
      distribucion: {
        porPrioridad: [],
        porEntidad: []
      },
      periodo: '30d'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/workflows/templates
app.get('/api/workflows/templates', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [workflows] = await connection.execute(`
      SELECT * FROM workflows WHERE estado = 'activo' AND publicado = true
      ORDER BY utilizaciones DESC, nombre ASC
    `);
    
    await connection.end();
    
    const formattedWorkflows = workflows.map(w => ({
      id: w.id,
      codigo: w.codigo,
      nombre: w.nombre,
      descripcion: w.descripcion,
      categoria: w.categoria,
      tipo: w.tipo,
      complejidad: w.complejidad,
      estimacionDuracionHoras: w.estimacionDuracionHoras,
      utilizaciones: w.utilizaciones
    }));
    
    res.json(formattedWorkflows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/entidades
app.get('/api/entidades', authenticateToken, async (req, res) => {
  try {
    // Datos mock para testing
    res.json({
      entidades: [
        { id: 1, nombre: 'Gobierno Municipal', descripcion: 'Entidad gubernamental' },
        { id: 2, nombre: 'Hospital Central', descripcion: 'Centro de salud principal' },
        { id: 3, nombre: 'Universidad Nacional', descripcion: 'Institución educativa' }
      ],
      pagination: { page: 1, limit: 1000, total: 3, pages: 1 }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/usuarios
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    // Datos mock para testing
    res.json({
      usuarios: [
        { id: 1, nombreUsuario: 'admin', nombre: 'Administrador', apellido: 'Sistema' },
        { id: 2, nombreUsuario: 'usuario1', nombre: 'María', apellido: 'González' },
        { id: 3, nombreUsuario: 'usuario2', nombre: 'Carlos', apellido: 'López' }
      ],
      pagination: { page: 1, limit: 1000, total: 3, pages: 1 }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/intercambios
app.post('/api/intercambios', authenticateToken, async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      workflowId,
      entidadOrigenId,
      entidadDestinoId,
      prioridad = 'media',
      fechaEstimadaFin,
      responsableId
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Generar código único
    const year = new Date().getFullYear();
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM intercambios');
    const count = countResult[0].count;
    const codigo = `INT-${year}-${String(count + 1).padStart(3, '0')}`;
    
    const [result] = await connection.execute(`
      INSERT INTO intercambios (codigo, nombre, descripcion, workflowId, workflowVersion, entidadOrigenId, entidadDestinoId, prioridad, fechaEstimadaFin, responsableId, creadoPor)
      VALUES (?, ?, ?, ?, '1.0', ?, ?, ?, ?, ?, ?)
    `, [codigo, nombre, descripcion, workflowId, entidadOrigenId, entidadDestinoId, prioridad, fechaEstimadaFin, responsableId, req.user.id]);
    
    // Incrementar utilizaciones del workflow
    await connection.execute('UPDATE workflows SET utilizaciones = utilizaciones + 1 WHERE id = ?', [workflowId]);
    
    await connection.end();
    
    res.status(201).json({
      id: result.insertId,
      codigo,
      nombre,
      descripcion,
      workflowId,
      entidadOrigenId,
      entidadDestinoId,
      prioridad,
      fechaEstimadaFin,
      responsableId,
      estado: 'iniciado',
      progreso: 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de prueba corriendo en puerto ${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/intercambios`);
  console.log(`   GET  /api/intercambios/estadisticas`);
  console.log(`   POST /api/intercambios`);
  console.log(`   GET  /api/workflows/templates`);
  console.log(`   GET  /api/entidades`);
  console.log(`   GET  /api/usuarios`);
});