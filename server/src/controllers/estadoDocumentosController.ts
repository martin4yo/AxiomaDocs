import { Request, Response } from 'express';
import estadoDocumentosService from '../services/estadoDocumentosService';
import cronService from '../services/cronService';
import EstadoDocumentoLog from '../models/EstadoDocumentoLog';
import { Op } from 'sequelize';
import Usuario from '../models/Usuario';
import Documentacion from '../models/Documentacion';
import Recurso from '../models/Recurso';
import Entidad from '../models/Entidad';
import Estado from '../models/Estado';

class EstadoDocumentosController {
  /**
   * Ejecuta la actualización manual de estados
   */
  async actualizarEstados(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.id;
      console.log(`Iniciando actualización manual de estados por usuario ${usuarioId || 'desconocido'}...`);

      const resultado = await estadoDocumentosService.actualizarEstadosDocumentos(usuarioId, 'manual');

      console.log(`Actualización completada: ${resultado.actualizados} documentos actualizados de ${resultado.totalRevisados} revisados`);

      res.json({
        success: true,
        mensaje: 'Actualización de estados completada',
        resultado
      });
    } catch (error: any) {
      console.error('Error en actualización de estados:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al actualizar estados',
        error: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas de los estados actuales
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const estadisticas = await estadoDocumentosService.obtenerEstadisticas();

      res.json({
        success: true,
        estadisticas
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  /**
   * Obtiene el último log de actualización
   */
  async obtenerUltimaActualizacion(req: Request, res: Response) {
    try {
      const ultimaActualizacion = cronService.obtenerUltimaActualizacion();
      const estadoJobs = cronService.obtenerEstadoJobs();

      res.json({
        success: true,
        ultimaActualizacion,
        tareasProgamadas: estadoJobs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener última actualización',
        error: error.message
      });
    }
  }

  /**
   * Obtiene los logs de auditoría de cambios de estado
   */
  async obtenerLogs(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        tipoDocumento,
        tipoActualizacion,
        fechaDesde,
        fechaHasta,
        usuarioId
      } = req.query;

      const where: any = {};

      if (tipoDocumento) {
        where.tipoDocumento = tipoDocumento;
      }

      if (tipoActualizacion) {
        where.tipoActualizacion = tipoActualizacion;
      }

      if (usuarioId) {
        where.usuarioId = usuarioId;
      }

      if (fechaDesde || fechaHasta) {
        where.createdAt = {};
        if (fechaDesde) {
          where.createdAt[Op.gte] = new Date(fechaDesde as string);
        }
        if (fechaHasta) {
          const fechaHastaDate = new Date(fechaHasta as string);
          fechaHastaDate.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = fechaHastaDate;
        }
      }

      const offset = (Number(page) - 1) * Number(limit);

      const { rows: logs, count: total } = await EstadoDocumentoLog.findAndCountAll({
        where,
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'username', 'nombre', 'apellido']
          },
          {
            model: Documentacion,
            as: 'documentacion',
            attributes: ['id', 'nombre', 'codigo']
          },
          {
            model: Recurso,
            as: 'recurso',
            attributes: ['id', 'nombre', 'apellido', 'dni']
          },
          {
            model: Entidad,
            as: 'entidad',
            attributes: ['id', 'nombre']
          },
          {
            model: Estado,
            as: 'estadoAnterior',
            attributes: ['id', 'nombre', 'color']
          },
          {
            model: Estado,
            as: 'estadoNuevo',
            attributes: ['id', 'nombre', 'color']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        success: true,
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error obteniendo logs:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener logs de auditoría',
        error: error.message
      });
    }
  }
}

export default new EstadoDocumentosController();