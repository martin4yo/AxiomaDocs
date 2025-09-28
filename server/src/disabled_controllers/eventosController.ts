import { Request, Response } from 'express';
import { DocumentoEvento, Usuario, Documentacion, RecursoDocumentacion, EntidadDocumentacion, Recurso, Entidad } from '../models';
import { AuthRequest } from '../middleware/auth';

// GET /api/eventos?documentacionId=X&recursoDocumentacionId=Y&entidadDocumentacionId=Z
export const getEventos = async (req: AuthRequest, res: Response) => {
  try {
    const { documentacionId, recursoDocumentacionId, entidadDocumentacionId } = req.query;

    if (!documentacionId) {
      return res.status(400).json({ error: 'documentacionId es requerido' });
    }

    const whereClause: any = {
      documentacionId: parseInt(documentacionId as string)
    };

    // Filtrar por asignación específica si se proporciona
    if (recursoDocumentacionId) {
      whereClause.recursoDocumentacionId = parseInt(recursoDocumentacionId as string);
    }
    if (entidadDocumentacionId) {
      whereClause.entidadDocumentacionId = parseInt(entidadDocumentacionId as string);
    }

    const eventos = await DocumentoEvento.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'modificador',
          attributes: ['id', 'nombre', 'apellido'],
          required: false
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ],
      order: [
        ['fecha', 'DESC'],
        ['hora', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({ eventos });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/eventos
export const createEvento = async (req: AuthRequest, res: Response) => {
  try {
    const {
      documentacionId,
      recursoDocumentacionId,
      entidadDocumentacionId,
      tipoEvento,
      fecha,
      hora,
      titulo,
      descripcion,
      observaciones
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Validaciones básicas
    if (!documentacionId || !tipoEvento || !fecha || !hora || !titulo || !descripcion) {
      return res.status(400).json({
        error: 'Campos requeridos: documentacionId, tipoEvento, fecha, hora, titulo, descripcion'
      });
    }

    // Validar que existe el documento
    const documento = await Documentacion.findByPk(documentacionId);
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Si se especifica recursoDocumentacionId, validar que existe
    if (recursoDocumentacionId) {
      const recursoDoc = await RecursoDocumentacion.findByPk(recursoDocumentacionId);
      if (!recursoDoc) {
        return res.status(404).json({ error: 'Asignación de recurso no encontrada' });
      }
    }

    // Si se especifica entidadDocumentacionId, validar que existe
    if (entidadDocumentacionId) {
      const entidadDoc = await EntidadDocumentacion.findByPk(entidadDocumentacionId);
      if (!entidadDoc) {
        return res.status(404).json({ error: 'Asignación de entidad no encontrada' });
      }
    }

    const nuevoEvento = await DocumentoEvento.create({
      documentacionId,
      recursoDocumentacionId: recursoDocumentacionId || null,
      entidadDocumentacionId: entidadDocumentacionId || null,
      tipoEvento,
      fecha,
      hora,
      titulo,
      descripcion,
      observaciones: observaciones || null,
      creadoPor: userId
    });

    // Obtener el evento completo con las relaciones
    const eventoCompleto = await DocumentoEvento.findByPk(nuevoEvento.id, {
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ]
    });

    res.status(201).json({
      message: 'Evento creado exitosamente',
      evento: eventoCompleto
    });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/eventos/:id
export const updateEvento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tipoEvento,
      fecha,
      hora,
      titulo,
      descripcion,
      observaciones
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const evento = await DocumentoEvento.findByPk(id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await evento.update({
      tipoEvento: tipoEvento || evento.tipoEvento,
      fecha: fecha || evento.fecha,
      hora: hora || evento.hora,
      titulo: titulo || evento.titulo,
      descripcion: descripcion || evento.descripcion,
      observaciones: observaciones !== undefined ? observaciones : evento.observaciones,
      modificadoPor: userId
    });

    // Obtener el evento actualizado con las relaciones
    const eventoActualizado = await DocumentoEvento.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'modificador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ]
    });

    res.json({
      message: 'Evento actualizado exitosamente',
      evento: eventoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /api/eventos/:id
export const deleteEvento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const evento = await DocumentoEvento.findByPk(id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await evento.destroy();

    res.json({ message: 'Evento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /api/eventos/:id
export const getEventoById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const evento = await DocumentoEvento.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'modificador',
          attributes: ['id', 'nombre', 'apellido'],
          required: false
        },
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion']
        }
      ]
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json({ evento });
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};