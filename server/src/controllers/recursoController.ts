import { Response } from 'express';
import { Op } from 'sequelize';
import { Recurso, RecursoDocumentacion, Documentacion, Estado } from '../models';
import { AuthRequest } from '../middleware/auth';
import { isDocumentoUniversal, getFechasForAsignacion, parseFechaLocal } from '../utils/documentHelpers';

export const getRecursos = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = search ? {
      [Op.or]: [
        { codigo: { [Op.like]: `%${search}%` } },
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { cuil: { [Op.like]: `%${search}%` } },
      ]
    } : {};

    const { rows: recursos, count } = await Recurso.findAndCountAll({
      where: whereClause,
      order: [['apellido', 'ASC'], ['nombre', 'ASC']],
      limit: Number(limit),
      offset,
      include: [
        {
          model: RecursoDocumentacion,
          as: 'recursoDocumentacion',
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
            },
            {
              model: Estado,
              as: 'estado',
            }
          ]
        }
      ]
    });

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
    const recurso = await Recurso.findByPk(id, {
      include: [
        {
          model: RecursoDocumentacion,
          as: 'recursoDocumentacion',
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
            },
            {
              model: Estado,
              as: 'estado',
            }
          ]
        }
      ]
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
    const { codigo, apellido, nombre, telefono, cuil, direccion, localidad, fechaAlta } = req.body;
    const userId = req.user!.id;

    // Validar fecha de alta - usar fecha actual si no se proporciona o es inválida
    const fechaAltaValid = fechaAlta && fechaAlta !== '' && fechaAlta !== 'Invalid date' && !isNaN(Date.parse(fechaAlta)) 
      ? parseFechaLocal(fechaAlta) 
      : new Date();

    const recurso = await Recurso.create({
      codigo,
      apellido,
      nombre,
      telefono,
      cuil,
      direccion,
      localidad,
      fechaAlta: fechaAltaValid,
      creadoPor: userId,
      modificadoPor: userId,
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
    const { codigo, apellido, nombre, telefono, cuil, direccion, localidad, fechaAlta, fechaBaja } = req.body;
    const userId = req.user!.id;

    const recurso = await Recurso.findByPk(id);

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    // Validar fechas - manejar fechas inválidas y valores especiales
    let fechaAltaValid: Date | null | undefined;
    if (fechaAlta === null || fechaAlta === '' || fechaAlta === undefined) {
      fechaAltaValid = undefined; // No actualizar si no se envía o está vacío
    } else if (fechaAlta === 'Invalid date' || isNaN(Date.parse(fechaAlta))) {
      fechaAltaValid = undefined; // No actualizar si es inválida
    } else {
      fechaAltaValid = parseFechaLocal(fechaAlta);
    }
    
    let fechaBajaValid: Date | null | undefined;
    if (fechaBaja === null || fechaBaja === '') {
      fechaBajaValid = null; // Explícitamente limpiar la fecha
    } else if (fechaBaja === undefined || fechaBaja === 'Invalid date' || isNaN(Date.parse(fechaBaja))) {
      fechaBajaValid = undefined; // No actualizar si es inválida o no se envía
    } else {
      fechaBajaValid = parseFechaLocal(fechaBaja);
    }

    const updateData: any = {
      codigo,
      apellido,
      nombre,
      telefono,
      cuil,
      direccion,
      localidad,
      modificadoPor: userId,
    };

    // Solo incluir fechaAlta si se debe actualizar
    if (fechaAltaValid !== undefined) {
      updateData.fechaAlta = fechaAltaValid;
    }

    // Solo incluir fechaBaja si se debe actualizar (incluye null para limpiar)
    if (fechaBajaValid !== undefined) {
      updateData.fechaBaja = fechaBajaValid;
    }

    await recurso.update(updateData);

    res.json(recurso);
  } catch (error) {
    console.error('Error actualizando recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const recurso = await Recurso.findByPk(id);

    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    await recurso.destroy();
    res.json({ message: 'Recurso eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const addDocumentToRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { documentacionId, fechaEmision, fechaTramitacion, estadoId } = req.body;
    const userId = req.user!.id;

    // Verificar que el recurso no esté dado de baja
    const recurso = await Recurso.findByPk(id);
    if (!recurso) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }
    
    if (recurso.fechaBaja) {
      return res.status(400).json({ message: 'No se pueden asignar documentos a recursos dados de baja' });
    }

    // Obtener la documentación para validar si es universal
    const documentacion = await Documentacion.findByPk(documentacionId);
    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Verificar si ya existe la asociación
    const existingAssociation = await RecursoDocumentacion.findOne({
      where: {
        recursoId: Number(id),
        documentacionId: documentacionId
      }
    });

    if (existingAssociation) {
      return res.status(400).json({ 
        message: 'Este documento ya está asignado al recurso. Use la opción de editar para modificarlo.' 
      });
    }

    // Determinar qué fechas usar (universales o específicas)
    const fechasParaAsignacion = getFechasForAsignacion(documentacion, {
      fechaEmision: fechaEmision ? parseFechaLocal(fechaEmision) : undefined,
      fechaTramitacion: fechaTramitacion ? parseFechaLocal(fechaTramitacion) : undefined
    });

    const recursoDoc = await RecursoDocumentacion.create({
      recursoId: Number(id),
      documentacionId,
      fechaEmision: fechasParaAsignacion.fechaEmision || undefined,
      fechaTramitacion: fechasParaAsignacion.fechaTramitacion || undefined,
      fechaVencimiento: fechasParaAsignacion.fechaVencimiento || undefined,
      estadoId,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const result = await RecursoDocumentacion.findByPk(recursoDoc.id, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        },
        {
          model: Estado,
          as: 'estado',
        }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error agregando documento al recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateRecursoDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { recursoDocId } = req.params;
    const { fechaEmision, fechaTramitacion, estadoId } = req.body;
    const userId = req.user!.id;

    const recursoDoc = await RecursoDocumentacion.findByPk(recursoDocId, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        }
      ]
    });

    if (!recursoDoc) {
      return res.status(404).json({ message: 'Documento del recurso no encontrado' });
    }

    // Verificar si el documento es universal (no se pueden editar fechas)
    const esUniversal = isDocumentoUniversal(recursoDoc.documentacion!);
    
    if (esUniversal) {
      // Si es universal, solo permitir cambiar el estado
      await recursoDoc.update({
        estadoId,
        modificadoPor: userId,
      });
    } else {
      // Si no es universal, permitir editar fechas
      const fechasParaAsignacion = getFechasForAsignacion(recursoDoc.documentacion!, {
        fechaEmision: fechaEmision ? new Date(fechaEmision) : undefined,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : undefined
      });

      await recursoDoc.update({
        fechaEmision: fechasParaAsignacion.fechaEmision || undefined,
        fechaTramitacion: fechasParaAsignacion.fechaTramitacion || undefined,
        fechaVencimiento: fechasParaAsignacion.fechaVencimiento || undefined,
        estadoId,
        modificadoPor: userId,
      });
    }

    const result = await RecursoDocumentacion.findByPk(recursoDocId, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        },
        {
          model: Estado,
          as: 'estado',
        }
      ]
    });

    res.json(result);
  } catch (error) {
    console.error('Error actualizando documento del recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const removeDocumentFromRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { recursoDocId } = req.params;

    const recursoDoc = await RecursoDocumentacion.findByPk(recursoDocId);

    if (!recursoDoc) {
      return res.status(404).json({ message: 'Documento del recurso no encontrado' });
    }

    await recursoDoc.destroy();
    res.json({ message: 'Documento removido del recurso correctamente' });
  } catch (error) {
    console.error('Error removiendo documento del recurso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};