import { Router, Request, Response } from 'express';
import { 
  Recurso, 
  Documentacion, 
  Entidad, 
  RecursoDocumentacion 
} from '../models';
import { Op } from 'sequelize';
import sequelize from '../models/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas del dashboard
router.use(authenticateToken);

// Endpoint de estadísticas con autenticación
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalRecursos = await Recurso.count();
    const recursosActivos = await Recurso.count({
      where: sequelize.where(sequelize.col('fechaBaja'), 'IS', null)
    });
    const totalDocumentacion = await Documentacion.count();
    const totalEntidades = await Entidad.count();
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    
    const documentosPorVencer = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite]
        }
      }
    });

    const documentosVencidos = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.lt]: new Date()
        }
      }
    });

    res.json({
      totalRecursos,
      recursosActivos,
      totalDocumentacion,
      totalEntidades,
      documentosPorVencer,
      documentosVencidos
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/documentos-por-vencer', async (req: Request, res: Response) => {
  try {
    const { dias = 30 } = req.query;
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + Number(dias));
    
    const documentos = await RecursoDocumentacion.findAll({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite]
        }
      },
      include: [
        {
          model: Recurso,
          as: 'recurso',
          attributes: ['id', 'codigo', 'apellido', 'nombre']
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ],
      order: [['fechaVencimiento', 'ASC']],
      limit: 20
    });

    const documentosConDias = documentos.map(doc => {
      const hoy = new Date();
      const fechaVenc = new Date(doc.fechaVencimiento!);
      const diffTime = fechaVenc.getTime() - hoy.getTime();
      const diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...doc.toJSON(),
        diasParaVencer
      };
    });

    res.json(documentosConDias);
  } catch (error) {
    console.error('Error obteniendo documentos por vencer:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;