import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getEntidades = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { nombre: { contains: search.toString(), mode: 'insensitive' as const } },
        { descripcion: { contains: search.toString(), mode: 'insensitive' as const } },
        { email: { contains: search.toString(), mode: 'insensitive' as const } },
      ]
    } : {};

    const [entidades, count] = await Promise.all([
      prisma.entidad.findMany({
        where: searchFilter,
        orderBy: { nombre: 'asc' },
        take: Number(limit),
        skip: offset,
        include: {
          estado: true,
          entidadDocumentacion: {
            include: {
              documentacion: true,
              estado: true
            }
          },
          entidadRecurso: {
            include: {
              recurso: true
            }
          }
        }
      }),
      prisma.entidad.count({
        where: searchFilter
      })
    ]);

    res.json({
      entidades,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      }
    });
  } catch (error) {
    console.error('Error obteniendo entidades:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const entidad = await prisma.entidad.findUnique({
      where: { id: parseInt(id) },
      include: {
        estado: true,
        entidadDocumentacion: {
          include: {
            documentacion: true,
            estado: true
          }
        },
        entidadRecurso: {
          include: {
            recurso: true
          }
        }
      }
    });

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    res.json(entidad);
  } catch (error) {
    console.error('Error obteniendo entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      descripcion,
      url,
      contacto,
      email,
      telefono,
      direccion,
      fechaIngreso,
      observaciones,
      estadoId
    } = req.body;
    const userId = req.user!.id;

    // Verificar que el estado existe
    const estado = await prisma.estado.findUnique({
      where: { id: parseInt(estadoId) }
    });

    if (!estado) {
      return res.status(400).json({ message: 'Estado no válido' });
    }

    const entidad = await prisma.entidad.create({
      data: {
        nombre,
        descripcion,
        url,
        contacto,
        email,
        telefono,
        direccion,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
        observaciones,
        estadoId: parseInt(estadoId),
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        estado: true
      }
    });

    res.status(201).json(entidad);
  } catch (error) {
    console.error('Error creando entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      url,
      contacto,
      email,
      telefono,
      direccion,
      fechaIngreso,
      observaciones,
      estadoId,
      activo
    } = req.body;
    const userId = req.user!.id;

    // Verificar que la entidad existe
    const entidadExistente = await prisma.entidad.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entidadExistente) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    // Verificar que el estado existe si se proporciona
    if (estadoId) {
      const estado = await prisma.estado.findUnique({
        where: { id: parseInt(estadoId) }
      });

      if (!estado) {
        return res.status(400).json({ message: 'Estado no válido' });
      }
    }

    const entidadActualizada = await prisma.entidad.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        descripcion,
        url,
        contacto,
        email,
        telefono,
        direccion,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
        observaciones,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        activo: activo !== undefined ? activo : undefined,
        updatedBy: userId,
      },
      include: {
        estado: true
      }
    });

    res.json(entidadActualizada);
  } catch (error) {
    console.error('Error actualizando entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const entidad = await prisma.entidad.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    await prisma.entidad.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Entidad eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Documentación de entidades
export const getEntidadDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const documentos = await prisma.entidadDocumentacion.findMany({
      where: { entidadId: parseInt(id) },
      include: {
        documentacion: true,
        estado: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        documentacion: {
          nombre: 'asc'
        }
      }
    });

    res.json(documentos);
  } catch (error) {
    console.error('Error obteniendo documentación de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const assignDocumentacionToEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadId, documentacionId } = req.params;
    const {
      esInhabilitante,
      notificarEmail,
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      observaciones,
      estadoId
    } = req.body;
    const userId = req.user!.id;

    // Verificar que la entidad existe
    const entidad = await prisma.entidad.findUnique({
      where: { id: parseInt(entidadId) }
    });

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    // Verificar que la documentación existe
    const documentacion = await prisma.documentacion.findUnique({
      where: { id: parseInt(documentacionId) }
    });

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await prisma.entidadDocumentacion.findUnique({
      where: {
        entidadId_documentacionId: {
          entidadId: parseInt(entidadId),
          documentacionId: parseInt(documentacionId)
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'La documentación ya está asignada a esta entidad' });
    }

    const asignacion = await prisma.entidadDocumentacion.create({
      data: {
        entidadId: parseInt(entidadId),
        documentacionId: parseInt(documentacionId),
        esInhabilitante: Boolean(esInhabilitante),
        notificarEmail: Boolean(notificarEmail),
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        observaciones,
        estadoId: parseInt(estadoId),
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        documentacion: true,
        estado: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error asignando documentación a entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEntidadDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      esInhabilitante,
      notificarEmail,
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      observaciones,
      estadoId
    } = req.body;
    const userId = req.user!.id;

    const asignacion = await prisma.entidadDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de documentación no encontrada' });
    }

    const asignacionActualizada = await prisma.entidadDocumentacion.update({
      where: { id: parseInt(id) },
      data: {
        esInhabilitante: esInhabilitante !== undefined ? Boolean(esInhabilitante) : undefined,
        notificarEmail: notificarEmail !== undefined ? Boolean(notificarEmail) : undefined,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        observaciones,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        updatedBy: userId,
      },
      include: {
        documentacion: true,
        estado: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    res.json(asignacionActualizada);
  } catch (error) {
    console.error('Error actualizando documentación de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteEntidadDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const asignacion = await prisma.entidadDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de documentación no encontrada' });
    }

    await prisma.entidadDocumentacion.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Asignación de documentación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando documentación de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Recursos de entidades
export const getEntidadRecursos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const recursos = await prisma.entidadRecurso.findMany({
      where: { entidadId: parseInt(id) },
      include: {
        recurso: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        recurso: {
          apellido: 'asc'
        }
      }
    });

    res.json(recursos);
  } catch (error) {
    console.error('Error obteniendo recursos de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const assignRecursoToEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadId, recursoId } = req.params;
    const { fechaInicio, fechaFin, observaciones } = req.body;
    const userId = req.user!.id;

    // Verificar que la entidad existe
    const entidad = await prisma.entidad.findUnique({
      where: { id: parseInt(entidadId) }
    });

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    // Verificar que el recurso existe
    const recurso = await prisma.recurso.findUnique({
      where: { id: parseInt(recursoId) }
    });

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await prisma.entidadRecurso.findUnique({
      where: {
        entidadId_recursoId: {
          entidadId: parseInt(entidadId),
          recursoId: parseInt(recursoId)
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'El recurso ya está asignado a esta entidad' });
    }

    const asignacion = await prisma.entidadRecurso.create({
      data: {
        entidadId: parseInt(entidadId),
        recursoId: parseInt(recursoId),
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        observaciones,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        recurso: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error asignando recurso a entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEntidadRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fechaInicio, fechaFin, observaciones, activo } = req.body;
    const userId = req.user!.id;

    const asignacion = await prisma.entidadRecurso.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de recurso no encontrada' });
    }

    const asignacionActualizada = await prisma.entidadRecurso.update({
      where: { id: parseInt(id) },
      data: {
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        observaciones,
        activo: activo !== undefined ? activo : undefined,
        updatedBy: userId,
      },
      include: {
        recurso: true,
        entidad: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    res.json(asignacionActualizada);
  } catch (error) {
    console.error('Error actualizando asignación de recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteEntidadRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const asignacion = await prisma.entidadRecurso.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de recurso no encontrada' });
    }

    await prisma.entidadRecurso.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Asignación de recurso eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando asignación de recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};