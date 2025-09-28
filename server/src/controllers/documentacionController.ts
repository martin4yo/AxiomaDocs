import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { nombre: { contains: search.toString(), mode: 'insensitive' as const } },
        { descripcion: { contains: search.toString(), mode: 'insensitive' as const } },
      ]
    } : {};

    const [documentacionRaw, count] = await Promise.all([
      prisma.documentacion.findMany({
        where: searchFilter,
        orderBy: { nombre: 'asc' },
        take: Number(limit),
        skip: offset,
        include: {
          estado: true,
          recursoDocumentacion: {
            include: {
              recurso: true,
              estado: true
            }
          },
          entidadDocumentacion: {
            include: {
              entidad: true,
              estado: true
            }
          }
        }
      }),
      prisma.documentacion.count({
        where: searchFilter
      })
    ]);

    // Mapear los datos para compatibilidad con el frontend
    const documentacion = documentacionRaw.map(doc => ({
      ...doc,
      entidadDocumentacion: doc.entidadDocumentacion.map(entDoc => ({
        ...entDoc,
        enviarPorMail: entDoc.notificarEmail // Mapear el campo
      }))
    }));

    res.json({
      documentacion,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      }
    });
  } catch (error) {
    console.error('Error obteniendo documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getDocumento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const documentoRaw = await prisma.documentacion.findUnique({
      where: { id: parseInt(id) },
      include: {
        estado: true,
        recursoDocumentacion: {
          include: {
            recurso: true,
            estado: true
          }
        },
        entidadDocumentacion: {
          include: {
            entidad: true,
            estado: true
          }
        }
      }
    });

    if (!documentoRaw) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Mapear los datos para compatibilidad con el frontend
    const documento = {
      ...documentoRaw,
      entidadDocumentacion: documentoRaw.entidadDocumentacion.map(entDoc => ({
        ...entDoc,
        enviarPorMail: entDoc.notificarEmail // Mapear el campo
      }))
    };

    res.json(documento);
  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      descripcion,
      diasVigencia,
      diasAnticipacion,
      esUniversal,
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
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

    // Calcular fecha de vencimiento si se proporciona fecha de emisión
    let calculatedFechaVencimiento = fechaVencimiento;
    if (fechaEmision && diasVigencia && !fechaVencimiento) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + parseInt(diasVigencia));
      calculatedFechaVencimiento = emision.toISOString().split('T')[0];
    }

    const documento = await prisma.documentacion.create({
      data: {
        nombre,
        descripcion,
        diasVigencia: parseInt(diasVigencia) || 365,
        diasAnticipacion: parseInt(diasAnticipacion) || 30,
        esUniversal: Boolean(esUniversal),
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: calculatedFechaVencimiento ? new Date(calculatedFechaVencimiento) : null,
        estadoId: parseInt(estadoId),
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        estado: true
      }
    });

    res.status(201).json(documento);
  } catch (error) {
    console.error('Error creando documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      diasVigencia,
      diasAnticipacion,
      esUniversal,
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      activo
    } = req.body;
    const userId = req.user!.id;

    // Verificar que el documento existe
    const documentoExistente = await prisma.documentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!documentoExistente) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
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

    // Calcular fecha de vencimiento si se proporciona fecha de emisión
    let calculatedFechaVencimiento = fechaVencimiento;
    if (fechaEmision && diasVigencia && !fechaVencimiento) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + parseInt(diasVigencia));
      calculatedFechaVencimiento = emision.toISOString().split('T')[0];
    }

    const documentoActualizado = await prisma.documentacion.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        descripcion,
        diasVigencia: diasVigencia ? parseInt(diasVigencia) : undefined,
        diasAnticipacion: diasAnticipacion ? parseInt(diasAnticipacion) : undefined,
        esUniversal: esUniversal !== undefined ? Boolean(esUniversal) : undefined,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : null,
        fechaVencimiento: calculatedFechaVencimiento ? new Date(calculatedFechaVencimiento) : null,
        estadoId: estadoId ? parseInt(estadoId) : undefined,
        activo: activo !== undefined ? activo : undefined,
        updatedBy: userId,
      },
      include: {
        estado: true
      }
    });

    res.json(documentoActualizado);
  } catch (error) {
    console.error('Error actualizando documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const documento = await prisma.documentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!documento) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    await prisma.documentacion.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Documentación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Recursos asignados a documentación
export const getDocumentacionRecursos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const recursos = await prisma.recursoDocumentacion.findMany({
      where: { documentacionId: parseInt(id) },
      include: {
        recurso: true,
        estado: true,
        documentacion: {
          select: {
            id: true,
            nombre: true,
            diasVigencia: true
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
    console.error('Error obteniendo recursos de la documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Entidades asignadas a documentación
export const getDocumentacionEntidades = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const entidades = await prisma.entidadDocumentacion.findMany({
      where: { documentacionId: parseInt(id) },
      include: {
        entidad: true,
        estado: true,
        documentacion: {
          select: {
            id: true,
            nombre: true,
            diasVigencia: true
          }
        }
      },
      orderBy: {
        entidad: {
          nombre: 'asc'
        }
      }
    });

    res.json(entidades);
  } catch (error) {
    console.error('Error obteniendo entidades de la documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};