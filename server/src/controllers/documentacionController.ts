import { Response } from 'express';
import { Op } from 'sequelize';
import { Documentacion, Estado, RecursoDocumentacion, Recurso } from '../models';
import { AuthRequest } from '../middleware/auth';
import { calcularFechaVencimiento } from '../utils/documentHelpers';

export const getDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = search ? {
      [Op.or]: [
        { codigo: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } },
      ]
    } : {};

    const { rows: documentacion, count } = await Documentacion.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Estado,
          as: 'estadoVencimiento',
        },
        {
          model: Estado,
          as: 'estado',
        },
        {
          model: RecursoDocumentacion,
          as: 'recursoDocumentacion',
          include: [
            {
              model: Recurso,
              as: 'recurso',
            },
            {
              model: Estado,
              as: 'estado',
            }
          ]
        }
      ],
      order: [['descripcion', 'ASC']],
      limit: Number(limit),
      offset,
    });

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

export const getDocumentacionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const documentacion = await Documentacion.findByPk(id, {
      include: [
        {
          model: Estado,
          as: 'estadoVencimiento',
        },
        {
          model: Estado,
          as: 'estado',
        },
        {
          model: RecursoDocumentacion,
          as: 'recursoDocumentacion',
          include: [
            {
              model: Recurso,
              as: 'recurso',
            },
            {
              model: Estado,
              as: 'estado',
            }
          ]
        }
      ]
    });

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    res.json(documentacion);
  } catch (error) {
    console.error('Error obteniendo documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo, descripcion, diasVigencia, diasAnticipacion, esObligatorio, esUniversal, estadoVencimientoId, estadoId, fechaEmision, fechaTramitacion } = req.body;
    const userId = req.user!.id;

    // Calcular fecha de vencimiento si es universal y se proporciona fecha de emisión
    let fechaVencimiento = null;
    if (esUniversal && fechaEmision) {
      fechaVencimiento = calcularFechaVencimiento(new Date(fechaEmision), diasVigencia);
    }

    const documentacion = await Documentacion.create({
      codigo,
      descripcion,
      diasVigencia,
      diasAnticipacion,
      esObligatorio,
      esUniversal: esUniversal || false,
      estadoVencimientoId,
      estadoId: (esUniversal && estadoId) ? estadoId : null,
      fechaEmision: (esUniversal && fechaEmision) ? fechaEmision : undefined,
      fechaTramitacion: (esUniversal && fechaTramitacion) ? fechaTramitacion : undefined,
      fechaVencimiento: fechaVencimiento || undefined,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const result = await Documentacion.findByPk(documentacion.id, {
      include: [
        {
          model: Estado,
          as: 'estadoVencimiento',
        },
        {
          model: Estado,
          as: 'estado',
        }
      ]
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creando documentación:', error);
    
    // Manejar error de código duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe una documentación con este código' 
      });
    }
    
    // Manejar errores de validación
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { codigo, descripcion, diasVigencia, diasAnticipacion, esObligatorio, esUniversal, estadoVencimientoId, estadoId, fechaEmision, fechaTramitacion } = req.body;
    const userId = req.user!.id;

    const documentacion = await Documentacion.findByPk(id);

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Calcular fecha de vencimiento si es universal y se proporciona fecha de emisión
    let fechaVencimiento = documentacion.fechaVencimiento;
    if (esUniversal && fechaEmision) {
      fechaVencimiento = calcularFechaVencimiento(new Date(fechaEmision), diasVigencia);
    } else if (!esUniversal || !fechaEmision) {
      // Si ya no es universal o se removió la fecha de emisión, limpiar vencimiento
      fechaVencimiento = undefined;
    }

    await documentacion.update({
      codigo,
      descripcion,
      diasVigencia,
      diasAnticipacion,
      esObligatorio,
      esUniversal: esUniversal || false,
      estadoVencimientoId,
      estadoId: (esUniversal && estadoId) ? estadoId : null,
      fechaEmision: (esUniversal && fechaEmision) ? fechaEmision : undefined,
      fechaTramitacion: (esUniversal && fechaTramitacion) ? fechaTramitacion : undefined,
      fechaVencimiento: fechaVencimiento || undefined,
      modificadoPor: userId,
    });

    const result = await Documentacion.findByPk(id, {
      include: [
        {
          model: Estado,
          as: 'estadoVencimiento',
        },
        {
          model: Estado,
          as: 'estado',
        }
      ]
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error actualizando documentación:', error);
    
    // Manejar error de código duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe una documentación con este código' 
      });
    }
    
    // Manejar errores de validación
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Datos inválidos', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const documentacion = await Documentacion.findByPk(id);

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    await documentacion.destroy();
    res.json({ message: 'Documentación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const addRecursoToDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recursoId, fechaEmision, fechaTramitacion, estadoId } = req.body;
    const userId = req.user!.id;

    // Verificar que el recurso no esté dado de baja
    const recurso = await Recurso.findByPk(recursoId);
    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }
    
    if (recurso.fechaBaja) {
      return res.status(400).json({ message: 'No se pueden asignar documentos a recursos dados de baja' });
    }

    // Obtener la documentación para calcular fecha de vencimiento
    const documentacion = await Documentacion.findByPk(id);
    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Verificar si ya existe la asociación
    const existingAssociation = await RecursoDocumentacion.findOne({
      where: {
        recursoId: recursoId,
        documentacionId: Number(id)
      }
    });

    if (existingAssociation) {
      return res.status(400).json({ 
        message: 'Este recurso ya está asignado a la documentación. Use la opción de editar para modificarlo.' 
      });
    }

    // Calcular fecha de vencimiento
    let fechaVencimiento = null;
    if (fechaEmision) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + documentacion.diasVigencia);
      fechaVencimiento = emision;
    }

    const recursoDoc = await RecursoDocumentacion.create({
      recursoId,
      documentacionId: Number(id),
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento: fechaVencimiento || undefined,
      estadoId,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const result = await RecursoDocumentacion.findByPk(recursoDoc.id, {
      include: [
        {
          model: Recurso,
          as: 'recurso',
        },
        {
          model: Estado,
          as: 'estado',
        }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error agregando recurso a la documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};