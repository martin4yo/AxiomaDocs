import { Router, Request, Response } from 'express';
import {
  Recurso,
  Documentacion,
  Entidad,
  RecursoDocumentacion,
  EntidadDocumentacion,
  Estado
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

    // Documentos vencidos (RecursoDocumentacion + EntidadDocumentacion + Universal)
    const documentosVencidosRecurso = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.lt]: new Date()
        }
      }
    });

    const documentosVencidosEntidad = await EntidadDocumentacion.count({
      where: sequelize.where(
        sequelize.col('fechaVencimiento'),
        {
          [Op.lt]: new Date(),
          [Op.ne]: null
        }
      )
    });

    const documentosVencidosUniversal = await Documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          [Op.lt]: new Date()
        }
      }
    });

    const documentosVencidos = documentosVencidosRecurso + documentosVencidosEntidad + documentosVencidosUniversal;

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

router.get('/documentos-vencidos', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    console.log('📊 Obteniendo documentos vencidos...');

    // Documentos de recursos vencidos
    const documentosRecurso = await RecursoDocumentacion.findAll({
      where: {
        fechaVencimiento: {
          [Op.lt]: new Date()
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
      order: [['fechaVencimiento', 'DESC']],
      limit: 10
    });

    // Documentos de entidades vencidos
    const documentosEntidad = await EntidadDocumentacion.findAll({
      where: sequelize.where(
        sequelize.col('EntidadDocumentacion.fechaVencimiento'),
        {
          [Op.lt]: new Date(),
          [Op.ne]: null
        }
      ),
      include: [
        {
          model: Entidad,
          as: 'entidad',
          attributes: ['id', 'razonSocial', 'cuit']
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ],
      order: [['fechaVencimiento', 'DESC']],
      limit: 10
    });

    // Documentos universales vencidos
    const documentosUniversal = await Documentacion.findAll({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: Estado,
          as: 'estado',
          attributes: ['id', 'nombre', 'color']
        }
      ],
      order: [['fechaVencimiento', 'DESC']],
      limit: 5
    });

    // Formatear documentos de recursos
    const documentosRecursoFormatted = documentosRecurso.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: doc.recurso,
      documentacion: doc.documentacion,
      estado: doc.estado,
      tipo: 'recurso'
    }));

    // Formatear documentos de entidades
    const documentosEntidadFormatted = documentosEntidad.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'ENTIDAD', nombre: (doc as any).entidad?.razonSocial || 'Sin entidad' },
      documentacion: (doc as any).documentacion,
      estado: { id: 0, nombre: 'VENCIDO', color: '#dc2626' },
      tipo: 'entidad'
    }));

    // Formatear documentos universales
    const documentosUniversalFormatted = documentosUniversal.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'UNIVERSAL', nombre: doc.codigo },
      documentacion: { codigo: doc.codigo, descripcion: doc.descripcion },
      estado: (doc as any).estado,
      tipo: 'universal'
    }));

    // Combinar todos los documentos
    const todosDocumentos = [...documentosRecursoFormatted, ...documentosEntidadFormatted, ...documentosUniversalFormatted];

    // Ordenar por fecha de vencimiento (más recientes primero) y limitar
    todosDocumentos.sort((a, b) => new Date(b.fechaVencimiento!).getTime() - new Date(a.fechaVencimiento!).getTime());
    const documentosLimitados = todosDocumentos.slice(0, Number(limit));

    // Calcular días vencidos
    const documentosConDias = documentosLimitados.map(doc => {
      const hoy = new Date();
      const fechaVenc = new Date(doc.fechaVencimiento!);
      const diffTime = hoy.getTime() - fechaVenc.getTime();
      const diasVencidos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...doc,
        diasVencidos
      };
    });

    res.json(documentosConDias);
  } catch (error) {
    console.error('Error obteniendo documentos vencidos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;