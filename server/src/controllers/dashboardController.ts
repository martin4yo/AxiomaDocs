import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../models/database';
import { 
  Recurso, 
  Documentacion, 
  Entidad, 
  RecursoDocumentacion,
  Estado 
} from '../models';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total recursos
    const totalRecursos = await Recurso.count();
    
    // Recursos activos (sin fecha de baja)
    const recursosActivos = await Recurso.count({
      where: sequelize.where(sequelize.col('fechaBaja'), 'IS', null)
    });

    // Total documentación
    const totalDocumentacion = await Documentacion.count();

    // Total entidades
    const totalEntidades = await Entidad.count();

    // Documentos por vencer (próximos 30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    
    const documentosPorVencer = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite]
        }
      }
    });

    // Documentos vencidos
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
};

export const getDocumentosPorVencer = async (req: AuthRequest, res: Response) => {
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
        },
        {
          model: Estado,
          as: 'estado',
          attributes: ['id', 'nombre', 'color']
        }
      ],
      order: [['fechaVencimiento', 'ASC']],
      limit: 20
    });

    // Calcular días para vencer
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
};

export const getActividadReciente = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    // Por ahora retornamos actividad simulada
    // En una implementación real, tendríamos una tabla de auditoria/logs
    const actividades = [
      {
        id: 1,
        tipo: 'recurso',
        descripcion: 'Nuevo recurso creado',
        fecha: new Date().toISOString(),
        usuario: 'Sistema'
      },
      {
        id: 2,
        tipo: 'documento',
        descripcion: 'Documento asignado',
        fecha: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
        usuario: 'Sistema'
      }
    ];

    res.json(actividades.slice(0, Number(limit)));
  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};