import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from './models';
import authRoutes from './routes/authRoutes';
import estadoRoutes from './routes/estadoRoutes';
import recursoRoutes from './routes/recursoRoutes';
import documentacionRoutes from './routes/documentacionRoutes';
import entidadRoutes from './routes/entidadRoutes';
import dashboardRoutes from './routes/dashboard-simple';
import reportesRoutes from './routes/reportes';
import usuarioRoutes from './routes/usuarioRoutes';
import intercambioRoutes from './routes/intercambioRoutes';
import workflowRoutes from './routes/workflowRoutes';
import estadoDocumentosRoutes from './routes/estadoDocumentos';
import cronService from './services/cronService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Configurar CORS origins desde variables de entorno
const getCorsOrigins = () => {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    return corsOrigins.split(',').map(origin => origin.trim());
  }
  
  // Fallback a configuración por defecto
  return process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000', 'http://docs.axiomacloud.com', 'http://149.50.148.198:80']
    : ['http://localhost:3000'];
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/estados', estadoRoutes);
app.use('/api/recursos', recursoRoutes);
app.use('/api/documentacion', documentacionRoutes);
app.use('/api/entidades', entidadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/intercambios', intercambioRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/estado-documentos', estadoDocumentosRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(Number(PORT), HOST, () => {
      console.log(`Servidor corriendo en ${HOST}:${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS habilitado para: ${getCorsOrigins().join(', ')}`);

      // Iniciar servicios de cron
      cronService.iniciar();
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();