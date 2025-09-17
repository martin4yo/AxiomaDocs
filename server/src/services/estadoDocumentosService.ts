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

      // Crear un mapa de estados para búsquedas rápidas
      const estadosMap = new Map(estados.map(e => [e.id, e]));

      // 1. Actualizar RecursoDocumentacion
      const recursoDocs = await RecursoDocumentacion.findAll({
        include: [
          { model: Documentacion, as: 'documentacion' },
          { model: Recurso, as: 'recurso' },
          { model: Estado, as: 'estado' }
        ]
      });

      for (const doc of recursoDocs) {
        totalRevisados++;
        const resultado = await this.evaluarYActualizarEstado(
          doc,
          'recurso',
          estadoPorVencer,
          estadoVencido,
          estadosMap,
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

      // 2. Actualizar documentos universales en la tabla Documentacion
      const universalDocs = await Documentacion.findAll({
        where: {
          esUniversal: true,
          fechaVencimiento: { [Op.ne]: null } as any // Solo documentos con fecha de vencimiento
        },
        include: [
          { model: Estado, as: 'estado', foreignKey: 'estadoVencimientoId' }
        ]
      });

      console.log(`[DEBUG] Encontrados ${universalDocs.length} documentos universales para evaluar`);

      for (const doc of universalDocs) {
        totalRevisados++;
        console.log(`[DEBUG] Evaluando documento universal ${doc.codigo} - ID: ${doc.id}`);

        // Para documentos universales, usamos el estado del documento directamente
        const docWithState = {
          ...doc.toJSON(),
          estado: (doc as any).estado, // El estado está en la relación estado
          documentacion: doc // Para mantener compatibilidad con la función evaluarYActualizarEstado
        };

        const resultado = await this.evaluarYActualizarEstadoUniversal(
          docWithState,
          estadoPorVencer,
          estadoVencido,
          estadosMap,
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

      // Nota: EntidadDocumentacion no maneja estados automáticos
      // Solo RecursoDocumentacion y Documentacion universal tienen estados que se actualizan automáticamente

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
    estadoPorVencer: Estado,
    estadoVencido: Estado,
    estadosMap: Map<number, Estado>,
    tipoActualizacion: 'manual' | 'automatica' = 'automatica'
  ): Promise<{ actualizado: boolean; detalle?: any; error?: boolean }> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener información del documento
      const fechaVencimiento = documento.fechaVencimiento ? new Date(documento.fechaVencimiento) : null;
      const fechaTramitacion = documento.fechaTramitacion ? new Date(documento.fechaTramitacion) : null;
      const estadoActual = documento.estado;
      const documentacion = documento.documentacion;

      // Debug logging
      console.log(`[DEBUG] Evaluando documento ${documentacion?.codigo || 'SIN_CODIGO'} - ID: ${documento.id}`);
      console.log(`[DEBUG] Fecha vencimiento: ${fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : 'null'}`);
      console.log(`[DEBUG] Hoy: ${hoy.toISOString().split('T')[0]}`);
      console.log(`[DEBUG] Estado actual: ${estadoActual?.nombre || 'Sin estado'} (ID: ${estadoActual?.id || 'null'})`);

      // Si no hay fecha de vencimiento, mantener estado actual
      if (!fechaVencimiento) {
        console.log(`[DEBUG] No hay fecha de vencimiento, no se actualiza`);
        return { actualizado: false };
      }

      fechaVencimiento.setHours(0, 0, 0, 0);

      // Calcular días hasta vencimiento
      const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[DEBUG] Días hasta vencimiento: ${diasHastaVencimiento}`);

      // Obtener días de anticipación configurados
      const diasAnticipacion = tipo === 'entidad'
        ? (documento.diasAnticipacion || documentacion?.diasAnticipacion || 30)
        : (documentacion?.diasAnticipacion || 30);

      let nuevoEstadoId: number | null = null;
      let razon = '';

      // Lógica de transición de estados (simplificada)
      console.log(`[DEBUG] Días anticipación: ${diasAnticipacion}`);
      console.log(`[DEBUG] Estado vencido ID: ${estadoVencido.id}, Estado por vencer ID: ${estadoPorVencer.id}`);

      if (diasHastaVencimiento <= 0) {
        // Documento vencido (incluye vence hoy)
        console.log(`[DEBUG] Documento debería estar VENCIDO (días: ${diasHastaVencimiento})`);
        if (estadoActual?.id !== estadoVencido.id) {
          console.log(`[DEBUG] Cambiando estado de ${estadoActual?.nombre} a VENCIDO`);
          nuevoEstadoId = estadoVencido.id;
          razon = diasHastaVencimiento === 0
            ? 'Documento vence hoy'
            : `Documento vencido hace ${Math.abs(diasHastaVencimiento)} días`;
        } else {
          console.log(`[DEBUG] Ya está en estado VENCIDO, no se cambia`);
        }
      } else if (diasHastaVencimiento <= diasAnticipacion) {
        // Por vencer (dentro del rango de anticipación)
        console.log(`[DEBUG] Documento debería estar POR VENCER (días: ${diasHastaVencimiento})`);
        if (estadoActual?.id !== estadoPorVencer.id) {
          console.log(`[DEBUG] Cambiando estado de ${estadoActual?.nombre} a POR VENCER`);
          nuevoEstadoId = estadoPorVencer.id;
          razon = `Documento por vencer en ${diasHastaVencimiento} días`;
        } else {
          console.log(`[DEBUG] Ya está en estado POR VENCER, no se cambia`);
        }
      } else {
        console.log(`[DEBUG] Documento está VIGENTE (días: ${diasHastaVencimiento}), no requiere cambio`);
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
          estadoNuevo: estadosMap.get(nuevoEstadoId)?.nombre || 'Desconocido',
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
      include: [{ model: Estado, as: 'estado', attributes: ['nombre'] }],
      group: ['estadoId', 'estado.id', 'estado.nombre']
    });

    // Nota: EntidadDocumentacion no tiene estados, por lo tanto no hay estadísticas de estado
    const entidadStats: any[] = [];

    // Documentos próximos a vencer
    const proximosVencer = await RecursoDocumentacion.findAll({
      where: {
        fechaVencimiento: {
          [Op.between]: [hoy, en7Dias]
        }
      },
      include: [
        { model: Recurso, as: 'recurso', attributes: ['nombre', 'apellido'] },
        { model: Documentacion, as: 'documentacion', attributes: ['descripcion'] }
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
        { model: Recurso, as: 'recurso', attributes: ['nombre', 'apellido'] },
        { model: Documentacion, as: 'documentacion', attributes: ['descripcion'] }
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
      recurso: doc.recurso ? `${doc.recurso.nombre} ${doc.recurso.apellido}` : null,
      documento: doc.documentacion?.descripcion
    };
  }

  /**
   * Evalúa y actualiza el estado de un documento universal según sus fechas
   */
  private async evaluarYActualizarEstadoUniversal(
    documento: any,
    estadoPorVencer: Estado,
    estadoVencido: Estado,
    estadosMap: Map<number, Estado>,
    tipoActualizacion: 'manual' | 'automatica' = 'automatica'
  ): Promise<{ actualizado: boolean; detalle?: any; error?: boolean }> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener información del documento
      const fechaVencimiento = documento.fechaVencimiento ? new Date(documento.fechaVencimiento) : null;
      const estadoActual = documento.estado;

      // Debug logging
      console.log(`[DEBUG UNIVERSAL] Evaluando documento universal ${documento.codigo} - ID: ${documento.id}`);
      console.log(`[DEBUG UNIVERSAL] Fecha vencimiento: ${fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : 'null'}`);
      console.log(`[DEBUG UNIVERSAL] Hoy: ${hoy.toISOString().split('T')[0]}`);
      console.log(`[DEBUG UNIVERSAL] Estado actual: ${estadoActual?.nombre || 'Sin estado'} (ID: ${estadoActual?.id || 'null'})`);

      // Si no hay fecha de vencimiento, mantener estado actual
      if (!fechaVencimiento) {
        console.log(`[DEBUG UNIVERSAL] No hay fecha de vencimiento, no se actualiza`);
        return { actualizado: false };
      }

      fechaVencimiento.setHours(0, 0, 0, 0);

      // Calcular días hasta vencimiento
      const diasHastaVencimiento = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[DEBUG UNIVERSAL] Días hasta vencimiento: ${diasHastaVencimiento}`);

      // Obtener días de anticipación configurados
      const diasAnticipacion = documento.diasAnticipacion || 30;
      console.log(`[DEBUG UNIVERSAL] Días anticipación: ${diasAnticipacion}`);

      let nuevoEstadoId: number | null = null;
      let razon = '';

      // Lógica de transición de estados
      if (diasHastaVencimiento <= 0) {
        // Documento vencido (incluye vence hoy)
        console.log(`[DEBUG UNIVERSAL] Documento debería estar VENCIDO (días: ${diasHastaVencimiento})`);
        if (estadoActual?.id !== estadoVencido.id) {
          console.log(`[DEBUG UNIVERSAL] Cambiando estado de ${estadoActual?.nombre} a VENCIDO`);
          nuevoEstadoId = estadoVencido.id;
          razon = diasHastaVencimiento === 0
            ? 'Documento vence hoy'
            : `Documento vencido hace ${Math.abs(diasHastaVencimiento)} días`;
        } else {
          console.log(`[DEBUG UNIVERSAL] Ya está en estado VENCIDO, no se cambia`);
        }
      } else if (diasHastaVencimiento <= diasAnticipacion) {
        // Por vencer (dentro del rango de anticipación)
        console.log(`[DEBUG UNIVERSAL] Documento debería estar POR VENCER (días: ${diasHastaVencimiento})`);
        if (estadoActual?.id !== estadoPorVencer.id) {
          console.log(`[DEBUG UNIVERSAL] Cambiando estado de ${estadoActual?.nombre} a POR VENCER`);
          nuevoEstadoId = estadoPorVencer.id;
          razon = `Documento por vencer en ${diasHastaVencimiento} días`;
        } else {
          console.log(`[DEBUG UNIVERSAL] Ya está en estado POR VENCER, no se cambia`);
        }
      } else {
        console.log(`[DEBUG UNIVERSAL] Documento está VIGENTE (días: ${diasHastaVencimiento}), no requiere cambio`);
      }

      // Si hay cambio de estado, actualizar el documento universal
      if (nuevoEstadoId) {
        // Para documentos universales, actualizamos AMBOS campos de estado en la tabla documentacion
        // estadoVencimientoId es para el vencimiento automático
        // estadoId es el estado general que se muestra en la interfaz
        await Documentacion.update(
          {
            estadoVencimientoId: nuevoEstadoId,
            estadoId: nuevoEstadoId // También actualizar el estado general
          },
          { where: { id: documento.id } }
        );

        console.log(`[DEBUG UNIVERSAL] Estado actualizado en base de datos (ambos campos: estadoId y estadoVencimientoId)`);

        // Crear log de auditoría (usando 'recurso' como workaround temporal para enum)
        await EstadoDocumentoLog.create({
          tipoDocumento: 'recurso', // Temporal: usar valor existente del enum
          documentacionId: documento.id,
          estadoAnteriorId: estadoActual?.id,
          estadoNuevoId: nuevoEstadoId,
          razon: `[UNIVERSAL] ${razon}`, // Marcar como universal en la razón
          usuarioId: this.usuarioId,
          tipoActualizacion
        });

        const detalle = {
          tipo: 'universal' as any,
          documentoId: documento.id,
          estadoAnterior: estadoActual?.nombre || 'Sin estado',
          estadoNuevo: estadosMap.get(nuevoEstadoId)?.nombre || 'Desconocido',
          razon
        };

        return { actualizado: true, detalle };
      }

      return { actualizado: false };

    } catch (error) {
      console.error(`[DEBUG UNIVERSAL] Error actualizando estado de documento universal:`, error);
      return { actualizado: false, error: true };
    }
  }
}

// Importar sequelize después de definir la clase para evitar problemas de dependencias circulares
import sequelize from '../models/database';

export default new EstadoDocumentosService();