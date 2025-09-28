import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getRecursos = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { nombre: { contains: search.toString(), mode: 'insensitive' as const } },
        { apellido: { contains: search.toString(), mode: 'insensitive' as const } },
        { dni: { contains: search.toString(), mode: 'insensitive' as const } },
        { email: { contains: search.toString(), mode: 'insensitive' as const } },
      ]
    } : {};

    const [recursos, count] = await Promise.all([
      prisma.recurso.findMany({
        where: searchFilter,
        orderBy: [
          { apellido: 'asc' },
          { nombre: 'asc' }
        ],
        take: Number(limit),
        skip: offset,
        include: {
          estado: true,
          recursoDocumentacion: {
            include: {
              documentacion: true,
              estado: true
            }
          },
          entidadRecurso: {
            include: {
              entidad: true
            }
          }
        }
      }),
      prisma.recurso.count({
        where: searchFilter
      })
    ]);

    res.json({
      recursos,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      }
    });
  } catch (error) {
    console.error('Error obteniendo recursos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const recurso = await prisma.recurso.findUnique({
      where: { id: parseInt(id) },
      include: {
        estado: true,
        recursoDocumentacion: {
          include: {
            documentacion: true,
            estado: true
          }
        },
        entidadRecurso: {
          include: {
            entidad: true
          }
        }
      }
    });

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    res.json(recurso);
  } catch (error) {
    console.error('Error obteniendo recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      apellido,
      dni,
      email,
      telefono,
      direccion,
      fechaNacimiento,
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

    // Verificar DNI único si se proporciona
    if (dni) {
      const existingRecurso = await prisma.recurso.findUnique({
        where: { dni }
      });

      if (existingRecurso) {
        return res.status(400).json({ message: 'Ya existe un recurso con ese DNI' });
      }
    }

    const recurso = await prisma.recurso.create({
      data: {
        nombre,
        apellido,
        dni,
        email,
        telefono,
        direccion,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
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

    res.status(201).json(recurso);
  } catch (error) {
    console.error('Error creando recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      dni,
      email,
      telefono,
      direccion,
      fechaNacimiento,
      fechaIngreso,
      fechaBaja,
      observaciones,
      estadoId,
      activo
    } = req.body;
    const userId = req.user!.id;

    // Verificar que el recurso existe
    const recursoExistente = await prisma.recurso.findUnique({
      where: { id: parseInt(id) }
    });

    if (!recursoExistente) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar DNI único si se cambia
    if (dni && dni !== recursoExistente.dni) {
      const existingRecurso = await prisma.recurso.findUnique({
        where: { dni }
      });

      if (existingRecurso) {
        return res.status(400).json({ message: 'Ya existe un recurso con ese DNI' });
      }
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

    const recursoActualizado = await prisma.recurso.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        apellido,
        dni,
        email,
        telefono,
        direccion,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        fechaIngreso: fechaIngreso ? new Date(fechaIngreso) : null,
        fechaBaja: fechaBaja ? new Date(fechaBaja) : null,
        observaciones,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        activo: activo !== undefined ? activo : undefined,
        updatedBy: userId,
      },
      include: {
        estado: true
      }
    });

    res.json(recursoActualizado);
  } catch (error) {
    console.error('Error actualizando recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const recurso = await prisma.recurso.findUnique({
      where: { id: parseInt(id) }
    });

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    await prisma.recurso.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Recurso eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Documentación de recursos
export const getRecursoDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const documentos = await prisma.recursoDocumentacion.findMany({
      where: { recursoId: parseInt(id) },
      include: {
        documentacion: true,
        estado: true,
        recurso: {
          select: {
            id: true,
            nombre: true,
            apellido: true
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
    console.error('Error obteniendo documentación del recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const assignDocumentacionToRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { recursoId, documentacionId } = req.params;
    const { fechaEmision, fechaTramitacion, fechaVencimiento, observaciones, estadoId } = req.body;
    const userId = req.user!.id;

    // Verificar que el recurso existe
    const recurso = await prisma.recurso.findUnique({
      where: { id: parseInt(recursoId) }
    });

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Verificar que la documentación existe
    const documentacion = await prisma.documentacion.findUnique({
      where: { id: parseInt(documentacionId) }
    });

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await prisma.recursoDocumentacion.findUnique({
      where: {
        recursoId_documentacionId: {
          recursoId: parseInt(recursoId),
          documentacionId: parseInt(documentacionId)
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ message: 'La documentación ya está asignada a este recurso' });
    }

    const asignacion = await prisma.recursoDocumentacion.create({
      data: {
        recursoId: parseInt(recursoId),
        documentacionId: parseInt(documentacionId),
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
        recurso: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error asignando documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateRecursoDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fechaEmision, fechaTramitacion, fechaVencimiento, observaciones, estadoId } = req.body;
    const userId = req.user!.id;

    const asignacion = await prisma.recursoDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de documentación no encontrada' });
    }

    const asignacionActualizada = await prisma.recursoDocumentacion.update({
      where: { id: parseInt(id) },
      data: {
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
        recurso: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.json(asignacionActualizada);
  } catch (error) {
    console.error('Error actualizando documentación del recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteRecursoDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const asignacion = await prisma.recursoDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de documentación no encontrada' });
    }

    await prisma.recursoDocumentacion.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Asignación de documentación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando documentación del recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};