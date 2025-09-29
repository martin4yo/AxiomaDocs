import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

// Helper function para calcular estado crítico
const calcularEstadoCritico = (documentos: any[]) => {
  if (!documentos || documentos.length === 0) return null;

  // Buscar el estado con mayor nivel (más crítico)
  let estadoMasCritico: any = null;
  let nivelMasCritico = 0;

  documentos.forEach(doc => {
    if (doc.estado && doc.estado.nivel > nivelMasCritico) {
      nivelMasCritico = doc.estado.nivel;
      estadoMasCritico = doc.estado;
    }
  });

  return estadoMasCritico;
};

// Helper function para calcular próximo vencimiento
const calcularProximoVencimiento = (documentos: any[]) => {
  if (!documentos || documentos.length === 0) return null;

  const vencimientos = documentos
    .map(doc => doc.fechaVencimiento)
    .filter(fecha => fecha)
    .map(fecha => new Date(fecha))
    .sort((a, b) => a.getTime() - b.getTime());

  return vencimientos.length > 0 ? vencimientos[0].toISOString() : null;
};

// GET /api/documentos/stats - Estadísticas del dashboard
export const getEstadisticasDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const hoy = new Date();
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Primero obtener los estados para consultar por nombres
    const estados = await prisma.estado.findMany();
    const estadoEnTramite = estados.find(e => e.nombre.toLowerCase().includes('trámite') || e.nombre.toLowerCase().includes('tramite'));
    const estadoVigente = estados.find(e => e.nombre.toLowerCase().includes('vigente'));

    // Obtener estadísticas de documentos universales por ESTADO REAL
    const [
      documentosUniversales,
      universalesVencidos,
      universalesPorVencer,
      universalesEnTramite,
      universalesVigentes
    ] = await Promise.all([
      prisma.documentacion.count({
        where: {
          AND: [
            { fechaEmision: { not: null } },
            { fechaTramitacion: { not: null } },
            { fechaVencimiento: { not: null } }
          ]
        }
      }),
      prisma.documentacion.count({
        where: {
          AND: [
            { fechaEmision: { not: null } },
            { fechaTramitacion: { not: null } },
            { fechaVencimiento: { not: null } },
            { fechaVencimiento: { lt: hoy } }
          ]
        }
      }),
      prisma.documentacion.count({
        where: {
          AND: [
            { fechaEmision: { not: null } },
            { fechaTramitacion: { not: null } },
            { fechaVencimiento: { not: null } },
            { fechaVencimiento: { gte: hoy, lte: en30Dias } }
          ]
        }
      }),
      // Contar documentos universales EN TRÁMITE por estado real
      prisma.documentacion.count({
        where: {
          AND: [
            { fechaEmision: { not: null } },
            { fechaTramitacion: { not: null } },
            { fechaVencimiento: { not: null } },
            { estadoId: estadoEnTramite?.id }
          ]
        }
      }),
      // Contar documentos universales VIGENTES por estado real
      prisma.documentacion.count({
        where: {
          AND: [
            { fechaEmision: { not: null } },
            { fechaTramitacion: { not: null } },
            { fechaVencimiento: { not: null } },
            { estadoId: estadoVigente?.id }
          ]
        }
      })
    ]);

    // Obtener estadísticas de documentos por recurso por ESTADO REAL
    const [
      recursoDocumentacionTotal,
      recursoVencidos,
      recursoPorVencer,
      recursoEnTramite,
      recursoVigentes
    ] = await Promise.all([
      prisma.recursoDocumentacion.count(),
      prisma.recursoDocumentacion.count({
        where: { fechaVencimiento: { lt: hoy } }
      }),
      prisma.recursoDocumentacion.count({
        where: { fechaVencimiento: { gte: hoy, lte: en30Dias } }
      }),
      // Contar por estado real EN TRÁMITE
      prisma.recursoDocumentacion.count({
        where: { estadoId: estadoEnTramite?.id }
      }),
      // Contar por estado real VIGENTE
      prisma.recursoDocumentacion.count({
        where: { estadoId: estadoVigente?.id }
      })
    ]);

    // Obtener estadísticas de documentos por entidad por ESTADO REAL
    const [
      entidadDocumentacionTotal,
      entidadVencidos,
      entidadPorVencer,
      entidadEnTramite,
      entidadVigentes
    ] = await Promise.all([
      prisma.entidadDocumentacion.count(),
      prisma.entidadDocumentacion.count({
        where: { fechaVencimiento: { lt: hoy } }
      }),
      prisma.entidadDocumentacion.count({
        where: { fechaVencimiento: { gte: hoy, lte: en30Dias } }
      }),
      // Contar por estado real EN TRÁMITE
      prisma.entidadDocumentacion.count({
        where: { estadoId: estadoEnTramite?.id }
      }),
      // Contar por estado real VIGENTE
      prisma.entidadDocumentacion.count({
        where: { estadoId: estadoVigente?.id }
      })
    ]);

    const stats = {
      universales: {
        total: documentosUniversales,
        vencidos: universalesVencidos,
        porVencer: universalesPorVencer,
        enTramite: universalesEnTramite || 0,
        vigentes: universalesVigentes || 0
      },
      porRecurso: {
        total: recursoDocumentacionTotal,
        vencidos: recursoVencidos,
        porVencer: recursoPorVencer,
        enTramite: recursoEnTramite || 0,
        vigentes: recursoVigentes || 0
      },
      porEntidad: {
        total: entidadDocumentacionTotal,
        vencidos: entidadVencidos,
        porVencer: entidadPorVencer,
        enTramite: entidadEnTramite || 0,
        vigentes: entidadVigentes || 0
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({
      message: 'Error obteniendo estadísticas del dashboard',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/documentos - Lista principal de documentos con estado crítico
export const getDocumentosConEstadoCritico = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      estadoSeguimiento = '',
      soloConVencimientos = 'false'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Construir filtros para documentos
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { descripcion: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Obtener documentos con todas las relaciones necesarias
    const [documentos, total] = await Promise.all([
      prisma.documentacion.findMany({
        where: whereClause,
        include: {
          createdByUser: {
            select: { nombre: true, apellido: true }
          },
          updatedByUser: {
            select: { nombre: true, apellido: true }
          },
          recursoDocumentacion: {
            include: {
              estado: true,
              recurso: true
            }
          },
          entidadDocumentacion: {
            include: {
              estado: true,
              entidad: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.documentacion.count({ where: whereClause })
    ]);

    // Mapear documentos al formato esperado por el frontend
    const documentosFormateados = documentos.map(doc => {
      // Combinar recursos y entidades para calcular estado crítico
      const todasAsignaciones = [
        ...doc.recursoDocumentacion,
        ...doc.entidadDocumentacion
      ];

      const estadoCritico = calcularEstadoCritico(todasAsignaciones);
      const proximoVencimiento = calcularProximoVencimiento(todasAsignaciones);

      // Calcular estadísticas de envíos (simplificado por ahora)
      const totalEnvios = doc.entidadDocumentacion.length;
      const enviosPendientes = totalEnvios; // Todos pendientes por defecto
      const enviosEnviados = 0;

      return {
        id: doc.id,
        codigo: doc.codigo,
        descripcion: doc.descripcion,
        diasVigencia: doc.diasVigencia,
        esUniversal: !!(doc.fechaEmision && doc.fechaTramitacion && doc.fechaVencimiento),
        fechaEmision: doc.fechaEmision?.toISOString() || null,
        fechaTramitacion: doc.fechaTramitacion?.toISOString() || null,
        fechaVencimiento: doc.fechaVencimiento?.toISOString() || null,
        estadoCritico: estadoCritico ? {
          nivel: estadoCritico.nivel,
          nombre: estadoCritico.nombre,
          color: estadoCritico.color
        } : null,
        proximaVencimiento: proximoVencimiento,
        recursosAsignados: doc.recursoDocumentacion.length,
        entidadesDestino: doc.entidadDocumentacion.length,
        totalEnvios,
        enviosPendientes,
        enviosEnviados,
        creador: {
          nombre: doc.createdByUser?.nombre || '',
          apellido: doc.createdByUser?.apellido || ''
        },
        fechaCreacion: doc.createdAt.toISOString(),
        fechaModificacion: doc.updatedAt.toISOString(),

        // Datos adicionales para la lógica de agrupación
        asignacionActual: doc.recursoDocumentacion.length > 0 ? {
          recurso: doc.recursoDocumentacion[0].recurso,
          entidad: null
        } : doc.entidadDocumentacion.length > 0 ? {
          recurso: null,
          entidad: doc.entidadDocumentacion[0].entidad
        } : null
      };
    });

    res.json({
      documentos: documentosFormateados,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos con estado crítico:', error);
    res.status(500).json({
      message: 'Error obteniendo documentos con estado crítico',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/documentos/:id/recursos - Sub-grilla de recursos asignados a un documento
export const getRecursosAsignados = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const documentoId = parseInt(id);

    const recursos = await prisma.recursoDocumentacion.findMany({
      where: { documentacionId: documentoId },
      include: {
        recurso: true,
        estado: true,
        createdByUser: {
          select: { nombre: true, apellido: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const recursosFormateados = recursos.map(rd => ({
      id: rd.id,
      recurso: {
        id: rd.recurso.id,
        nombre: `${rd.recurso.nombre} ${rd.recurso.apellido}`,
        codigo: rd.recurso.codigo,
        cuil: rd.recurso.dni
      },
      fechaEmision: rd.fechaEmision?.toISOString() || null,
      fechaTramitacion: rd.fechaTramitacion?.toISOString() || null,
      fechaVencimiento: rd.fechaVencimiento?.toISOString() || null,
      estado: rd.estado ? {
        id: rd.estado.id,
        nombre: rd.estado.nombre,
        color: rd.estado.color,
        nivel: rd.estado.nivel
      } : null,
      estadoSeguimiento: 'pendiente' as const, // Simplificado por ahora
      observaciones: '',
      creador: {
        nombre: rd.createdByUser?.nombre || '',
        apellido: rd.createdByUser?.apellido || ''
      },
      fechaCreacion: rd.createdAt.toISOString(),
      fechaModificacion: rd.updatedAt.toISOString()
    }));

    res.json({
      recursos: recursosFormateados,
      total: recursos.length
    });

  } catch (error) {
    console.error('Error obteniendo recursos asignados:', error);
    res.status(500).json({
      message: 'Error obteniendo recursos asignados',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/documentos/:id/entidades - Sub-grilla de entidades destino de un documento
export const getEntidadesDestino = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const documentoId = parseInt(id);

    const entidades = await prisma.entidadDocumentacion.findMany({
      where: { documentacionId: documentoId },
      include: {
        entidad: true,
        estado: true,
        createdByUser: {
          select: { nombre: true, apellido: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const entidadesFormateadas = entidades.map(ed => ({
      id: ed.id,
      entidad: {
        id: ed.entidad.id,
        nombre: ed.entidad.nombre,
        cuit: ed.entidad.contacto,
        urlPlataforma: ed.entidad.url
      },
      fechaEmision: ed.fechaEmision?.toISOString() || null,
      fechaTramitacion: ed.fechaTramitacion?.toISOString() || null,
      fechaVencimiento: ed.fechaVencimiento?.toISOString() || null,
      estado: ed.estado ? {
        id: ed.estado.id,
        nombre: ed.estado.nombre,
        color: ed.estado.color,
        nivel: ed.estado.nivel
      } : null,
      estadoEnvio: 'pendiente' as const, // Simplificado por ahora
      fechaEnvio: null,
      observaciones: '',
      esInhabilitante: ed.esInhabilitante,
      emailEnvio: ed.notificarEmail ? ed.entidad.email : null,
      creador: {
        nombre: ed.createdByUser?.nombre || '',
        apellido: ed.createdByUser?.apellido || ''
      },
      fechaCreacion: ed.createdAt.toISOString(),
      fechaModificacion: ed.updatedAt.toISOString()
    }));

    res.json({
      entidades: entidadesFormateadas,
      total: entidades.length
    });

  } catch (error) {
    console.error('Error obteniendo entidades destino:', error);
    res.status(500).json({
      message: 'Error obteniendo entidades destino',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/documentos/:documentoId/recursos/:recursoAsignacionId - Actualizar recurso asignado
export const updateRecursoAsignado = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, recursoAsignacionId } = req.params;
    const userId = req.user?.id;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      observaciones
    } = req.body;

    const recursoActualizado = await prisma.recursoDocumentacion.update({
      where: { id: parseInt(recursoAsignacionId) },
      data: {
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        updatedBy: userId,
        updatedAt: new Date()
      },
      include: {
        recurso: true,
        estado: true
      }
    });

    res.json({
      message: 'Recurso asignado actualizado exitosamente',
      recurso: recursoActualizado
    });

  } catch (error) {
    console.error('Error actualizando recurso asignado:', error);
    res.status(500).json({
      message: 'Error actualizando recurso asignado',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/documentos/:documentoId/entidades/:entidadAsignacionId/asignacion - Actualizar asignación de entidad
export const updateEntidadAsignada = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadAsignacionId } = req.params;
    const userId = req.user?.id;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      esInhabilitante,
      emailEnvio
    } = req.body;

    const entidadActualizada = await prisma.entidadDocumentacion.update({
      where: { id: parseInt(entidadAsignacionId) },
      data: {
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        esInhabilitante: Boolean(esInhabilitante),
        notificarEmail: Boolean(emailEnvio),
        updatedBy: userId,
        updatedAt: new Date()
      },
      include: {
        entidad: true,
        estado: true
      }
    });

    res.json({
      message: 'Entidad asignada actualizada exitosamente',
      entidad: entidadActualizada
    });

  } catch (error) {
    console.error('Error actualizando entidad asignada:', error);
    res.status(500).json({
      message: 'Error actualizando entidad asignada',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/documentos/:documentoId/entidades/:entidadId/envio - Actualizar estado de envío
export const updateEstadoEnvio = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { estadoEnvio, fechaEnvio, observaciones } = req.body;

    // Por ahora esto es un placeholder, ya que no tenemos tabla de envíos
    // En el futuro se podría crear una tabla DocumentoEnvio

    res.json({
      message: 'Estado de envío actualizado exitosamente',
      estadoEnvio,
      fechaEnvio,
      observaciones
    });

  } catch (error) {
    console.error('Error actualizando estado de envío:', error);
    res.status(500).json({
      message: 'Error actualizando estado de envío',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/documentos/:id/universal - Actualizar documento universal
export const updateDocumentoUniversal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento
    } = req.body;

    const documentoActualizado = await prisma.documentacion.update({
      where: { id: parseInt(id) },
      data: {
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        updatedBy: userId,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Documento universal actualizado exitosamente',
      documento: documentoActualizado
    });

  } catch (error) {
    console.error('Error actualizando documento universal:', error);
    res.status(500).json({
      message: 'Error actualizando documento universal',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};