import prisma from '../lib/prisma';

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
      const estados = await prisma.estado.findMany();
      const estadoMap = new Map(estados.map(e => [e.nombre, e]));

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
      const recursoDocs = await prisma.recursoDocumentacion.findMany({
        include: {
          documentacion: true,
          recurso: true,
          estado: true
        }
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
      const universalDocs = await prisma.documentacion.findMany({
        where: {
          esUniversal: true,
          fechaVencimiento: { not: null }
        },
        include: {
          estado: true
        }
      });

      console.log(`[DEBUG] Encontrados ${universalDocs.length} documentos universales para evaluar`);

      for (const doc of universalDocs) {
        totalRevisados++;
        console.log(`[DEBUG] Evaluando documento universal ${doc.codigo} - ID: ${doc.id}`);

        // Para documentos universales, usamos el estado del documento directamente
        const docWithState = {
          ...doc,
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
    estadoPorVencer: any,
    estadoVencido: any,
    estadosMap: Map<number, any>,
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
      console.log(`[DEBUG] Evaluando documento ${documentacion?.nombre || 'SIN_NOMBRE'} - ID: ${documento.id}`);
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
        await prisma.recursoDocumentacion.update({
          where: { id: documento.id },
          data: { estadoId: nuevoEstadoId }
        });

        // Crear log de auditoría
        await prisma.estadoDocumentoLog.create({
          data: {
            tipoDocumento: tipo,
            documentacionId: documento.documentacionId,
            recursoId: tipo === 'recurso' ? documento.recursoId : undefined,
            entidadId: tipo === 'entidad' ? documento.entidadId : undefined,
            estadoAnteriorId: estadoActual?.id,
            estadoNuevoId: nuevoEstadoId,
            razon,
            usuarioId: this.usuarioId,
            tipoActualizacion
          }
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
    const recursoStats = await prisma.recursoDocumentacion.groupBy({
      by: ['estadoId'],
      _count: {
        id: true
      },
      where: {
        estado: {
          isNot: null
        }
      }
    });

    // Obtener nombres de estados para las estadísticas
    const estados = await prisma.estado.findMany();
    const estadosMap = new Map(estados.map(e => [e.id, e.nombre]));

    const recursoStatsFormatted: { [key: string]: number } = {};
    recursoStats.forEach(stat => {
      const estadoNombre = estadosMap.get(stat.estadoId) || 'Sin estado';
      recursoStatsFormatted[estadoNombre] = stat._count.id;
    });

    // Nota: EntidadDocumentacion no tiene estados, por lo tanto no hay estadísticas de estado
    const entidadStats: { [key: string]: number } = {};

    // Documentos próximos a vencer
    const proximosVencer = await prisma.recursoDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          gte: hoy,
          lte: en7Dias
        }
      },
      include: {
        recurso: {
          select: { nombre: true, apellido: true }
        },
        documentacion: {
          select: { descripcion: true }
        }
      },
      take: 10,
      orderBy: { fechaVencimiento: 'asc' }
    });

    // Documentos recién vencidos
    const recienVencidos = await prisma.recursoDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          gte: hace7Dias,
          lte: hoy
        }
      },
      include: {
        recurso: {
          select: { nombre: true, apellido: true }
        },
        documentacion: {
          select: { descripcion: true }
        }
      },
      take: 10,
      orderBy: { fechaVencimiento: 'desc' }
    });

    return {
      recursoDocumentacion: recursoStatsFormatted,
      entidadDocumentacion: entidadStats,
      proximosVencer: proximosVencer.map(this.formatDocumento),
      recienVencidos: recienVencidos.map(this.formatDocumento)
    };
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
    estadoPorVencer: any,
    estadoVencido: any,
    estadosMap: Map<number, any>,
    tipoActualizacion: 'manual' | 'automatica' = 'automatica'
  ): Promise<{ actualizado: boolean; detalle?: any; error?: boolean }> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener información del documento
      const fechaVencimiento = documento.fechaVencimiento ? new Date(documento.fechaVencimiento) : null;
      const estadoActual = documento.estado;

      // Debug logging
      console.log(`[DEBUG UNIVERSAL] Evaluando documento universal ${documento.nombre} - ID: ${documento.id}`);
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
        // Para documentos universales, actualizamos el estado general
        await prisma.documentacion.update({
          where: { id: documento.id },
          data: {
            estadoId: nuevoEstadoId
          }
        });

        console.log(`[DEBUG UNIVERSAL] Estado actualizado en base de datos`);

        // Crear log de auditoría (usando 'recurso' como workaround temporal para enum)
        await prisma.estadoDocumentoLog.create({
          data: {
            tipoDocumento: 'recurso', // Temporal: usar valor existente del enum
            documentacionId: documento.id,
            estadoAnteriorId: estadoActual?.id,
            estadoNuevoId: nuevoEstadoId,
            razon: `[UNIVERSAL] ${razon}`, // Marcar como universal en la razón
            usuarioId: this.usuarioId,
            tipoActualizacion
          }
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

export default new EstadoDocumentosService();