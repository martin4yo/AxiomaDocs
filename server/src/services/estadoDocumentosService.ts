import { Op } from 'sequelize';
import RecursoDocumentacion from '../models/RecursoDocumentacion';
import EntidadDocumentacion from '../models/EntidadDocumentacion';
import Estado from '../models/Estado';
import Documentacion from '../models/Documentacion';
import Recurso from '../models/Recurso';
import Entidad from '../models/Entidad';
import EstadoDocumentoLog from '../models/EstadoDocumentoLog';

interface UpdateResult {
  totalRevisados: number;
  actualizados: number;
  errores: number;
  detalles: Array<{
    tipo: 'recurso' | 'entidad';
    documentoId: number;
    entidadId?: number;
    recursoId?: number;
    estadoAnterior: string;
    estadoNuevo: string;
    razon: string;
  }>;
}

class EstadoDocumentosService {
  private detalles: UpdateResult['detalles'] = [];
  private usuarioId?: number;

  /**
   * Actualiza los estados de todos los documentos según sus fechas
   */
  async actualizarEstadosDocumentos(usuarioId?: number, tipoActualizacion: 'manual' | 'automatica' = 'automatica'): Promise<UpdateResult> {
    this.usuarioId = usuarioId;
    this.detalles = [];
    let totalRevisados = 0;
    let actualizados = 0;
    let errores = 0;

    try {
      // Obtener todos los estados disponibles
      const estados = await Estado.findAll();
      const estadoMap = new Map(estados.map(e => [e.codigo, e]));

      // Estados necesarios por código
      const estadoVigente = estadoMap.get('VIGENTE');
      const estadoPorVencer = estadoMap.get('POR_VENCER');
      const estadoVencido = estadoMap.get('VENCIDO');
      const estadoEnTramite = estadoMap.get('EN_TRAMITE');

      if (!estadoPorVencer || !estadoVencido) {
        throw new Error('Faltan estados necesarios en el sistema: POR_VENCER, VENCIDO. Verifique que tengan códigos asignados.');
      }

      // 1. Actualizar RecursoDocumentacion
      const recursoDocs = await RecursoDocumentacion.findAll({
        include: [
          { model: Documentacion },
          { model: Recurso },
          { model: Estado }
        ]
      });

      for (const doc of recursoDocs) {
        totalRevisados++;
        const resultado = await this.evaluarYActualizarEstado(
          doc,
          'recurso',
          estadoVigente,
          estadoPorVencer,
          estadoVencido,
          estadoEnTramite,
          tipoActualizacion
        );

        if (resultado.actualizado) {
          actualizados++;
          if (resultado.detalle) {
            this.detalles.push(resultado.detalle);
          }
        } else if (resultado.error) {
          errores++;
        }
      }

      // 2. Actualizar EntidadDocumentacion
      const entidadDocs = await EntidadDocumentacion.findAll({
        include: [
          { model: Documentacion },
          { model: Entidad },
          { model: Estado }
        ]
      });

      for (const doc of entidadDocs) {
        totalRevisados++;
        const resultado = await this.evaluarYActualizarEstado(
          doc,
          'entidad',
          estadoVigente,
          estadoPorVencer,
          estadoVencido,
          estadoEnTramite,
          tipoActualizacion
        );

        if (resultado.actualizado) {
          actualizados++;
          if (resultado.detalle) {
            this.detalles.push(resultado.detalle);
          }
        } else if (resultado.error) {
          errores++;
        }
      }

      return {
        totalRevisados,
        actualizados,
        errores,
        detalles: this.detalles
      };

    } catch (error) {
      console.error('Error en actualización de estados:', error);
      throw error;
    }
  }

  /**
   * Evalúa y actualiza el estado de un documento según sus fechas
   */
  private async evaluarYActualizarEstado(
    documento: any,
    tipo: 'recurso' | 'entidad',
    estadoVigente: Estado,
    estadoPorVencer: Estado,
    estadoVencido: Estado,
    estadoEnTramite: Estado | undefined,
    tipoActualizacion: 'manual' | 'automatica' = 'automatica'
  ): Promise<{ actualizado: boolean; detalle?: any; error?: boolean }> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener información del documento
      const fechaVencimiento = documento.fechaVencimiento ? new Date(documento.fechaVencimiento) : null;
      const fechaTramitacion = documento.fechaTramitacion ? new Date(documento.fechaTramitacion) : null;
      const estadoActual = documento.Estado;
      const documentacion = documento.Documentacion;

      // Si no hay fecha de vencimiento, mantener estado actual
      if (!fechaVencimiento) {
        return { actualizado: false };
      }

      fechaVencimiento.setHours(0, 0, 0, 0);

      // Calcular días hasta vencimiento
      const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      // Obtener días de anticipación configurados
      const diasAnticipacion = tipo === 'entidad'
        ? (documento.diasAnticipacion || documentacion?.diasAnticipacion || 30)
        : (documentacion?.diasAnticipacion || 30);

      let nuevoEstadoId: number | null = null;
      let razon = '';

      // Lógica de transición de estados (simplificada)
      if (diasHastaVencimiento <= 0) {
        // Documento vencido (incluye vence hoy)
        if (estadoActual?.id !== estadoVencido.id) {
          nuevoEstadoId = estadoVencido.id;
          razon = diasHastaVencimiento === 0
            ? 'Documento vence hoy'
            : `Documento vencido hace ${Math.abs(diasHastaVencimiento)} días`;
        }
      } else if (diasHastaVencimiento <= diasAnticipacion) {
        // Por vencer (dentro del rango de anticipación)
        if (estadoActual?.id !== estadoPorVencer.id) {
          nuevoEstadoId = estadoPorVencer.id;
          razon = `Documento por vencer en ${diasHastaVencimiento} días`;
        }
      }
      // Si no entra en ninguna condición, no se cambia el estado

      // Si hay cambio de estado, actualizar
      if (nuevoEstadoId) {
        await documento.update({ estadoId: nuevoEstadoId });

        // Crear log de auditoría
        await EstadoDocumentoLog.create({
          tipoDocumento: tipo,
          documentacionId: documento.documentacionId,
          recursoId: tipo === 'recurso' ? documento.recursoId : undefined,
          entidadId: tipo === 'entidad' ? documento.entidadId : undefined,
          estadoAnteriorId: estadoActual?.id,
          estadoNuevoId: nuevoEstadoId,
          razon,
          usuarioId: this.usuarioId,
          tipoActualizacion
        });

        const detalle = {
          tipo,
          documentoId: documento.documentacionId,
          ...(tipo === 'recurso' ? { recursoId: documento.recursoId } : { entidadId: documento.entidadId }),
          estadoAnterior: estadoActual?.nombre || 'Sin estado',
          estadoNuevo: estados.find((e: Estado) => e.id === nuevoEstadoId)?.nombre || 'Desconocido',
          razon
        };

        return { actualizado: true, detalle };
      }

      return { actualizado: false };

    } catch (error) {
      console.error(`Error actualizando estado de documento:`, error);
      return { actualizado: false, error: true };
    }
  }

  /**
   * Obtiene estadísticas de los estados actuales
   */
  async obtenerEstadisticas(): Promise<{
    recursoDocumentacion: { [key: string]: number };
    entidadDocumentacion: { [key: string]: number };
    proximosVencer: Array<any>;
    recienVencidos: Array<any>;
  }> {
    const hoy = new Date();
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    // Estadísticas de RecursoDocumentacion
    const recursoStats = await RecursoDocumentacion.findAll({
      attributes: [
        'estadoId',
        [sequelize.fn('COUNT', sequelize.col('RecursoDocumentacion.id')), 'count']
      ],
      include: [{ model: Estado, attributes: ['nombre'] }],
      group: ['estadoId', 'Estado.id', 'Estado.nombre']
    });

    // Estadísticas de EntidadDocumentacion
    const entidadStats = await EntidadDocumentacion.findAll({
      attributes: [
        'estadoId',
        [sequelize.fn('COUNT', sequelize.col('EntidadDocumentacion.id')), 'count']
      ],
      include: [{ model: Estado, attributes: ['nombre'] }],
      group: ['estadoId', 'Estado.id', 'Estado.nombre']
    });

    // Documentos próximos a vencer
    const proximosVencer = await RecursoDocumentacion.findAll({
      where: {
        fechaVencimiento: {
          [Op.between]: [hoy, en7Dias]
        }
      },
      include: [
        { model: Recurso, attributes: ['nombre', 'apellido'] },
        { model: Documentacion, attributes: ['nombre'] }
      ],
      limit: 10,
      order: [['fechaVencimiento', 'ASC']]
    });

    // Documentos recién vencidos
    const recienVencidos = await RecursoDocumentacion.findAll({
      where: {
        fechaVencimiento: {
          [Op.between]: [hace7Dias, hoy]
        }
      },
      include: [
        { model: Recurso, attributes: ['nombre', 'apellido'] },
        { model: Documentacion, attributes: ['nombre'] }
      ],
      limit: 10,
      order: [['fechaVencimiento', 'DESC']]
    });

    return {
      recursoDocumentacion: this.formatStats(recursoStats),
      entidadDocumentacion: this.formatStats(entidadStats),
      proximosVencer: proximosVencer.map(this.formatDocumento),
      recienVencidos: recienVencidos.map(this.formatDocumento)
    };
  }

  private formatStats(stats: any[]): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    stats.forEach(stat => {
      result[stat.Estado?.nombre || 'Sin estado'] = parseInt(stat.dataValues.count);
    });
    return result;
  }

  private formatDocumento(doc: any): any {
    return {
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: doc.Recurso ? `${doc.Recurso.nombre} ${doc.Recurso.apellido}` : null,
      documento: doc.Documentacion?.nombre
    };
  }
}

// Importar sequelize después de definir la clase para evitar problemas de dependencias circulares
import sequelize from '../models/database';

export default new EstadoDocumentosService();