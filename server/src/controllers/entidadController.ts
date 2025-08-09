import { Response } from 'express';
import { Op } from 'sequelize';
import { 
  Entidad, 
  EntidadDocumentacion, 
  EntidadRecurso, 
  Documentacion, 
  Recurso, 
  RecursoDocumentacion,
  Estado 
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { isDocumentoUniversal, getFechasForAsignacion } from '../utils/documentHelpers';

export const getEntidades = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause = search ? {
      [Op.or]: [
        { razonSocial: { [Op.like]: `%${search}%` } },
        { cuit: { [Op.like]: `%${search}%` } },
      ]
    } : {};

    const { rows: entidades, count } = await Entidad.findAndCountAll({
      where: whereClause,
      order: [['razonSocial', 'ASC']],
      limit: Number(limit),
      offset,
      include: [
        {
          model: EntidadDocumentacion,
          as: 'entidadDocumentacion',
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
            }
          ]
        },
        {
          model: EntidadRecurso,
          as: 'entidadRecurso',
          include: [
            {
              model: Recurso,
              as: 'recurso',
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
            }
          ]
        }
      ]
    });

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
    const entidad = await Entidad.findByPk(id, {
      include: [
        {
          model: EntidadDocumentacion,
          as: 'entidadDocumentacion',
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
            }
          ]
        },
        {
          model: EntidadRecurso,
          as: 'entidadRecurso',
          include: [
            {
              model: Recurso,
              as: 'recurso',
            }
          ]
        }
      ]
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
    const { razonSocial, cuit, domicilio, telefono, localidad, urlPlataformaDocumentacion } = req.body;
    const userId = req.user!.id;

    const entidad = await Entidad.create({
      razonSocial,
      cuit,
      domicilio,
      telefono,
      localidad,
      urlPlataformaDocumentacion,
      creadoPor: userId,
      modificadoPor: userId,
    });

    res.status(201).json(entidad);
  } catch (error: any) {
    console.error('Error creando entidad:', error);
    
    // Manejar error de CUIT duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe una entidad con este CUIT' 
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

export const updateEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { razonSocial, cuit, domicilio, telefono, localidad, urlPlataformaDocumentacion } = req.body;
    const userId = req.user!.id;

    const entidad = await Entidad.findByPk(id);

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    await entidad.update({
      razonSocial,
      cuit,
      domicilio,
      telefono,
      localidad,
      urlPlataformaDocumentacion,
      modificadoPor: userId,
    });

    res.json(entidad);
  } catch (error: any) {
    console.error('Error actualizando entidad:', error);
    
    // Manejar error de CUIT duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe una entidad con este CUIT' 
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

export const deleteEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const entidad = await Entidad.findByPk(id);

    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    await entidad.destroy();
    res.json({ message: 'Entidad eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const addDocumentacionToEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { documentacionId, esInhabilitante, enviarPorMail, mailDestino, fechaEmision, fechaTramitacion } = req.body;
    const userId = req.user!.id;

    // Obtener la documentación para validar si es universal
    const documentacion = await Documentacion.findByPk(documentacionId);
    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    // Determinar qué fechas usar (universales o específicas)
    const fechasParaAsignacion = getFechasForAsignacion(documentacion, {
      fechaEmision: fechaEmision ? new Date(fechaEmision) : undefined,
      fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : undefined
    });

    const entidadDoc = await EntidadDocumentacion.create({
      entidadId: Number(id),
      documentacionId,
      esInhabilitante,
      enviarPorMail,
      mailDestino,
      fechaEmision: fechasParaAsignacion.fechaEmision ? new Date(fechasParaAsignacion.fechaEmision) : undefined,
      fechaTramitacion: fechasParaAsignacion.fechaTramitacion ? new Date(fechasParaAsignacion.fechaTramitacion) : undefined,
      fechaVencimiento: fechasParaAsignacion.fechaVencimiento ? new Date(fechasParaAsignacion.fechaVencimiento) : undefined,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const result = await EntidadDocumentacion.findByPk(entidadDoc.id, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error agregando documentación a la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEntidadDocumentacion = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadDocId } = req.params;
    const { esInhabilitante, enviarPorMail, mailDestino, fechaEmision, fechaTramitacion } = req.body;
    const userId = req.user!.id;

    const entidadDoc = await EntidadDocumentacion.findByPk(entidadDocId, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        }
      ]
    });

    if (!entidadDoc) {
      return res.status(404).json({ message: 'Documentación de la entidad no encontrada' });
    }

    // Verificar si el documento es universal (no se pueden editar fechas)
    const esUniversal = isDocumentoUniversal(entidadDoc.documentacion!);
    
    if (esUniversal) {
      // Si es universal, solo permitir cambiar propiedades de la entidad
      await entidadDoc.update({
        esInhabilitante,
        enviarPorMail,
        mailDestino,
        modificadoPor: userId,
      });
    } else {
      // Si no es universal, permitir editar fechas
      const fechasParaAsignacion = getFechasForAsignacion(entidadDoc.documentacion!, {
        fechaEmision: fechaEmision ? new Date(fechaEmision) : undefined,
        fechaTramitacion: fechaTramitacion ? new Date(fechaTramitacion) : undefined
      });

      await entidadDoc.update({
        esInhabilitante,
        enviarPorMail,
        mailDestino,
        fechaEmision: fechasParaAsignacion.fechaEmision || undefined,
        fechaTramitacion: fechasParaAsignacion.fechaTramitacion || undefined,
        fechaVencimiento: fechasParaAsignacion.fechaVencimiento || undefined,
        modificadoPor: userId,
      });
    }

    const result = await EntidadDocumentacion.findByPk(entidadDocId, {
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
        }
      ]
    });

    res.json(result);
  } catch (error) {
    console.error('Error actualizando documentación de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const removeDocumentacionFromEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadDocId } = req.params;

    const entidadDoc = await EntidadDocumentacion.findByPk(entidadDocId);

    if (!entidadDoc) {
      return res.status(404).json({ message: 'Documentación de la entidad no encontrada' });
    }

    await entidadDoc.destroy();
    res.json({ message: 'Documentación removida de la entidad correctamente' });
  } catch (error) {
    console.error('Error removiendo documentación de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const addRecursoToEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recursoId, fechaInicio, fechaFin } = req.body;
    const userId = req.user!.id;

    const entidadRecurso = await EntidadRecurso.create({
      entidadId: Number(id),
      recursoId,
      fechaInicio,
      fechaFin,
      activo: true,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const result = await EntidadRecurso.findByPk(entidadRecurso.id, {
      include: [
        {
          model: Recurso,
          as: 'recurso',
        }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error agregando recurso a la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEntidadRecurso = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadRecursoId } = req.params;
    const { fechaInicio, fechaFin, activo } = req.body;
    const userId = req.user!.id;

    const entidadRecurso = await EntidadRecurso.findByPk(entidadRecursoId);

    if (!entidadRecurso) {
      return res.status(404).json({ message: 'Recurso de la entidad no encontrado' });
    }

    await entidadRecurso.update({
      fechaInicio,
      fechaFin,
      activo,
      modificadoPor: userId,
    });

    const result = await EntidadRecurso.findByPk(entidadRecursoId, {
      include: [
        {
          model: Recurso,
          as: 'recurso',
        }
      ]
    });

    res.json(result);
  } catch (error) {
    console.error('Error actualizando recurso de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const removeRecursoFromEntidad = async (req: AuthRequest, res: Response) => {
  try {
    const { entidadRecursoId } = req.params;

    const entidadRecurso = await EntidadRecurso.findByPk(entidadRecursoId);

    if (!entidadRecurso) {
      return res.status(404).json({ message: 'Recurso de la entidad no encontrado' });
    }

    await entidadRecurso.destroy();
    res.json({ message: 'Recurso removido de la entidad correctamente' });
  } catch (error) {
    console.error('Error removiendo recurso de la entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};