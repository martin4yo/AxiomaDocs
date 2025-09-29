import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

// GET /api/seguimiento/stats - Estadísticas generales de seguimiento
export const getEstadisticas = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalDocumentos,
      totalEntidades,
      totalPosiblesEnvios,
      enviosRealizados,
      enviosRecibidos
    ] = await Promise.all([
      prisma.documentacion.count(),
      prisma.entidad.count(),
      prisma.entidadDocumentacion.count(), // Total de combinaciones documento-entidad posibles
      prisma.documentoEnvio.count(), // Total de envíos realizados
      prisma.documentoEnvio.count({
        where: {
          fechaRecepcion: {
            not: null
          }
        }
      }) // Envíos que tienen fecha de recepción
    ]);

    // Para envíos enviados, simplemente usar el total de envíos realizados
    const enviosEnviados = enviosRealizados;

    const enviosPendientes = totalPosiblesEnvios - enviosRealizados;

    const eficiencia = totalPosiblesEnvios > 0
      ? Math.round((enviosRealizados / totalPosiblesEnvios) * 100)
      : 100;

    res.json({
      totalDocumentos,
      totalEntidades,
      totalEnvios: totalPosiblesEnvios,
      pendientes: enviosPendientes,
      enviados: enviosEnviados,
      recibidos: enviosRecibidos,
      eficiencia
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de seguimiento:', error);
    res.status(500).json({
      message: 'Error obteniendo estadísticas de seguimiento',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/seguimiento/por-documento - Vista agrupada por documento
export const getPorDocumento = async (req: AuthRequest, res: Response) => {
  try {
    const {
      search = '',
      estadoEnvio = '',
      entidadId = ''
    } = req.query;

    // Construir filtros
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { codigo: { contains: search as string, mode: 'insensitive' } },
        { descripcion: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Obtener documentos con sus entidades y envíos
    const documentos = await prisma.documentacion.findMany({
      where: whereClause,
      include: {
        entidadDocumentacion: {
          include: {
            entidad: true,
            estado: true
          },
          where: entidadId ? { entidadId: parseInt(entidadId as string) } : undefined
        },
        documentoEnvios: {
          include: {
            entidad: true,
            recurso: true,
            estado: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Mapear documentos al formato esperado
    const documentosFormateados = documentos.map(doc => {
      const entidades = doc.entidadDocumentacion.map(ed => {
        // Buscar si hay un envío para esta entidad
        const envio = doc.documentoEnvios.find(e => e.entidadId === ed.entidadId);

        // Determinar estado de envío
        let estadoEnvio: 'pendiente' | 'enviado' | 'recibido' = 'pendiente';
        if (envio) {
          if (envio.fechaRecepcion) {
            estadoEnvio = 'recibido';
          } else if (envio.fechaEnvio) {
            estadoEnvio = 'enviado';
          }
        }

        return {
          entidadId: ed.entidad.id,
          entidadNombre: ed.entidad.nombre,
          entidadCuit: ed.entidad.contacto,
          estadoEnvio,
          fechaEnvio: envio?.fechaEnvio?.toISOString() || null,
          destino: ed.entidad.url || '',
          observaciones: envio?.observaciones || '',
          tieneAdjuntos: false, // TODO: Implementar conteo de adjuntos
          totalEventos: 0, // TODO: Implementar conteo de eventos
          urlPlataforma: ed.entidad.url,
          emailContacto: ed.entidad.email,
          recursoNombre: envio?.recurso ? `${envio.recurso.nombre} ${envio.recurso.apellido}` : null,
          recursoId: envio?.recursoId || null
        };
      });

      // Calcular estadísticas
      const totalEntidades = entidades.length;
      const pendientes = entidades.filter(e => e.estadoEnvio === 'pendiente').length;
      const enviados = entidades.filter(e => e.estadoEnvio === 'enviado').length;
      const recibidos = entidades.filter(e => e.estadoEnvio === 'recibido').length;

      return {
        id: doc.id,
        codigo: doc.codigo,
        descripcion: doc.descripcion,
        totalEntidades,
        pendientes,
        enviados: enviados + recibidos, // Los recibidos también cuentan como enviados
        entidades
      };
    });

    // Filtrar por estado de envío si se especifica
    const documentosFiltrados = estadoEnvio
      ? documentosFormateados.filter(doc => {
          return doc.entidades.some(e => e.estadoEnvio === estadoEnvio);
        })
      : documentosFormateados;

    res.json({
      documentos: documentosFiltrados
    });

  } catch (error) {
    console.error('Error obteniendo seguimiento por documento:', error);
    res.status(500).json({
      message: 'Error obteniendo seguimiento por documento',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/seguimiento/por-entidad - Vista agrupada por entidad
export const getPorEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const {
      search = '',
      estadoEnvio = '',
      documentoId = ''
    } = req.query;

    // Construir filtros
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { contacto: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Obtener entidades con sus documentos y envíos
    const entidades = await prisma.entidad.findMany({
      where: whereClause,
      include: {
        entidadDocumentacion: {
          include: {
            documentacion: true,
            estado: true
          },
          where: documentoId ? { documentacionId: parseInt(documentoId as string) } : undefined
        },
        documentoEnvios: {
          include: {
            documentacion: true,
            recurso: true,
            estado: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    // Mapear entidades al formato esperado
    const entidadesFormateadas = entidades.map(ent => {
      const documentos = ent.entidadDocumentacion.map(ed => {
        // Buscar si hay un envío para este documento
        const envio = ent.documentoEnvios.find(e => e.documentacionId === ed.documentacionId);

        // Determinar estado de envío
        let estadoEnvio: 'pendiente' | 'enviado' | 'recibido' = 'pendiente';
        if (envio) {
          if (envio.fechaRecepcion) {
            estadoEnvio = 'recibido';
          } else if (envio.fechaEnvio) {
            estadoEnvio = 'enviado';
          }
        }

        return {
          id: ed.documentacion.id,
          codigo: ed.documentacion.codigo,
          descripcion: ed.documentacion.descripcion,
          estadoEnvio,
          fechaEnvio: envio?.fechaEnvio?.toISOString() || null,
          destino: ent.url || '',
          observaciones: envio?.observaciones || '',
          recursoId: envio?.recursoId || null,
          recursoNombre: envio?.recurso ? `${envio.recurso.nombre} ${envio.recurso.apellido}` : null,
          entidadDocumentacionId: ed.id,
          tieneAdjuntos: false, // TODO: Implementar conteo de adjuntos
          totalEventos: 0 // TODO: Implementar conteo de eventos
        };
      });

      // Calcular estadísticas
      const totalDocumentos = documentos.length;
      const pendientes = documentos.filter(d => d.estadoEnvio === 'pendiente').length;
      const enviados = documentos.filter(d => d.estadoEnvio === 'enviado').length;
      const recibidos = documentos.filter(d => d.estadoEnvio === 'recibido').length;

      return {
        id: ent.id,
        nombre: ent.nombre,
        cuit: ent.contacto,
        totalDocumentos,
        pendientes,
        enviados: enviados + recibidos, // Los recibidos también cuentan como enviados
        documentos,
        urlPlataforma: ent.url,
        emailContacto: ent.email
      };
    });

    // Filtrar por estado de envío si se especifica
    const entidadesFiltradas = estadoEnvio
      ? entidadesFormateadas.filter(ent => {
          return ent.documentos.some(d => d.estadoEnvio === estadoEnvio);
        })
      : entidadesFormateadas;

    res.json({
      entidades: entidadesFiltradas
    });

  } catch (error) {
    console.error('Error obteniendo seguimiento por entidad:', error);
    res.status(500).json({
      message: 'Error obteniendo seguimiento por entidad',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/seguimiento/eventos/:documentoId/:entidadId/:recursoId? - Obtener eventos de seguimiento
export const getEventos = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadId, recursoId } = req.params;

    // Por ahora devolver eventos vacíos, en el futuro se podría implementar
    // una tabla de eventos de seguimiento
    const eventos = [
      {
        id: 1,
        tipo: 'creacion',
        descripcion: 'Documento asignado a entidad',
        fecha: new Date().toISOString(),
        usuario: 'Sistema',
        observaciones: ''
      }
    ];

    res.json({ eventos });

  } catch (error) {
    console.error('Error obteniendo eventos de seguimiento:', error);
    res.status(500).json({
      message: 'Error obteniendo eventos de seguimiento',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// GET /api/seguimiento/adjuntos/:documentoId/:entidadId/:recursoId? - Obtener adjuntos
export const getAdjuntos = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadId, recursoId } = req.params;

    // Por ahora devolver adjuntos vacíos, en el futuro se podría integrar
    // con el sistema de archivos
    const adjuntos: any[] = [];

    res.json({ adjuntos });

  } catch (error) {
    console.error('Error obteniendo adjuntos:', error);
    res.status(500).json({
      message: 'Error obteniendo adjuntos',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// PUT /api/seguimiento/cambiar-estado/:documentoId/:entidadId - Cambiar estado de envío
export const cambiarEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const {
      estadoEnvio,
      destino,
      observaciones,
      recursoId
    } = req.body;

    const documentoIdNum = parseInt(documentoId);
    const entidadIdNum = parseInt(entidadId);
    const recursoIdNum = recursoId ? parseInt(recursoId) : null;

    // Buscar o crear estado "Enviado"
    let estadoEnviado = await prisma.estado.findFirst({
      where: { nombre: { contains: 'Enviado', mode: 'insensitive' } }
    });

    // Si no existe, buscar estado "Vigente" como fallback
    if (!estadoEnviado) {
      estadoEnviado = await prisma.estado.findFirst({
        where: { nombre: { contains: 'Vigente', mode: 'insensitive' } }
      });
    }

    // Si aún no existe, usar el primer estado disponible
    if (!estadoEnviado) {
      estadoEnviado = await prisma.estado.findFirst();
    }

    if (!estadoEnviado) {
      return res.status(400).json({
        message: 'No se encontró un estado válido para el envío'
      });
    }

    // Verificar que el recurso existe si se proporciona
    if (recursoIdNum) {
      const recursoExists = await prisma.recurso.findUnique({
        where: { id: recursoIdNum }
      });
      if (!recursoExists) {
        return res.status(400).json({
          message: 'El recurso especificado no existe'
        });
      }
    }

    // Buscar si ya existe un envío para esta combinación
    const whereClause: any = {
      documentacionId: documentoIdNum,
      entidadId: entidadIdNum
    };

    // Si se proporciona recursoId, incluirlo en la búsqueda
    if (recursoIdNum) {
      whereClause.recursoId = recursoIdNum;
    } else {
      // Si no se proporciona recursoId, buscar envíos sin recurso
      whereClause.recursoId = null;
    }

    const envioExistente = await prisma.documentoEnvio.findFirst({
      where: whereClause
    });

    let envio;

    if (envioExistente) {
      // Actualizar el envío existente
      envio = await prisma.documentoEnvio.update({
        where: { id: envioExistente.id },
        data: {
          fechaEnvio: new Date(),
          ...(estadoEnvio === 'recibido' && { fechaRecepcion: new Date() }),
          observaciones: observaciones || envioExistente.observaciones,
          estadoId: estadoEnviado.id,
          updatedBy: req.user!.id
        },
        include: {
          estado: true,
          documentacion: true,
          entidad: true,
          recurso: true
        }
      });
    } else {
      // Crear un nuevo envío
      envio = await prisma.documentoEnvio.create({
        data: {
          documentacionId: documentoIdNum,
          entidadId: entidadIdNum,
          recursoId: recursoIdNum || null,
          fechaEnvio: new Date(),
          ...(estadoEnvio === 'recibido' && { fechaRecepcion: new Date() }),
          observaciones: observaciones || null,
          estadoId: estadoEnviado.id,
          createdBy: req.user!.id
        },
        include: {
          estado: true,
          documentacion: true,
          entidad: true,
          recurso: true
        }
      });
    }

    res.json({
      message: 'Estado de envío actualizado exitosamente',
      envio: {
        id: envio.id,
        documentoId: envio.documentacionId,
        entidadId: envio.entidadId,
        recursoId: envio.recursoId,
        estadoEnvio: estadoEnvio,
        fechaEnvio: envio.fechaEnvio.toISOString(),
        fechaRecepcion: envio.fechaRecepcion?.toISOString() || null,
        observaciones: envio.observaciones,
        estado: envio.estado.nombre,
        documento: envio.documentacion.codigo,
        entidad: envio.entidad.nombre,
        recurso: envio.recurso?.nombre || null
      }
    });

  } catch (error) {
    console.error('Error cambiando estado de envío:', error);
    res.status(500).json({
      message: 'Error cambiando estado de envío',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// POST /api/seguimiento/subir-adjunto - Subir adjunto
export const subirAdjunto = async (req: AuthRequest, res: Response) => {
  try {
    const {
      documentoId,
      entidadId,
      recursoId,
      nombreArchivo,
      tipoArchivo
    } = req.body;

    // Por ahora esto es un placeholder
    // En el futuro se integraría con el sistema de archivos

    res.json({
      message: 'Adjunto subido exitosamente',
      archivoId: Date.now(), // ID temporal
      nombreArchivo,
      fechaSubida: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error subiendo adjunto:', error);
    res.status(500).json({
      message: 'Error subiendo adjunto',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};