import { Response } from 'express';
import { Op } from 'sequelize';
import {
  RecursoDocumentacion,
  EntidadDocumentacion,
  Documentacion,
  Recurso,
  Entidad,
  Estado,
  Usuario
} from '../models';
import { AuthRequest } from '../middleware/auth';

export const getAsignacionesDocumentos = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      estadoId,
      entidadId,
      recursoId,
      documentacionId,
      diasVencimiento,
      estadoSeguimiento
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Construir filtros dinámicos
    const whereClauseRecurso: any = {};
    const whereClauseEntidad: any = {};
    const whereClauseDocumentacion: any = {};

    if (search) {
      whereClauseDocumentacion[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } }
      ];
    }

    if (estadoId) {
      whereClauseRecurso.estadoId = estadoId;
      whereClauseEntidad.estadoId = estadoId;
    }

    if (entidadId) {
      whereClauseEntidad.entidadId = entidadId;
    }

    if (recursoId) {
      whereClauseRecurso.recursoId = recursoId;
    }

    if (documentacionId) {
      whereClauseRecurso.documentacionId = documentacionId;
      whereClauseEntidad.documentacionId = documentacionId;
    }

    // Filtro por días hasta vencimiento
    if (diasVencimiento) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + Number(diasVencimiento));

      whereClauseRecurso.fechaVencimiento = {
        [Op.lte]: fechaLimite
      };
      whereClauseEntidad.fechaVencimiento = {
        [Op.lte]: fechaLimite
      };
    }

    // Determinar qué tipo de asignaciones traer basado en los filtros
    let recursosAsignaciones: any[] = [];
    let entidadesAsignaciones: any[] = [];

    // Si se filtra por recurso específico, solo traer asignaciones de recursos
    if (recursoId) {
      recursosAsignaciones = await RecursoDocumentacion.findAll({
        where: whereClauseRecurso,
        include: [
          {
            model: Recurso,
            as: 'recurso',
            where: { fechaBaja: null }, // Solo recursos activos
            required: true
          },
          {
            model: Documentacion,
            as: 'documentacion',
            where: whereClauseDocumentacion,
            include: [
              { model: Estado, as: 'estadoVencimiento' }
            ]
          },
          {
            model: Estado,
            as: 'estado'
          },
          {
            model: Usuario,
            as: 'creador',
            attributes: ['nombre', 'apellido']
          }
        ],
        order: [['fechaVencimiento', 'ASC']]
      });
    }
    // Si se filtra por entidad específica, solo traer asignaciones de entidades
    else if (entidadId) {
      entidadesAsignaciones = await EntidadDocumentacion.findAll({
        where: whereClauseEntidad,
        include: [
          {
            model: Entidad,
            as: 'entidad',
            required: true
          },
          {
            model: Documentacion,
            as: 'documentacion',
            where: whereClauseDocumentacion,
            include: [
              { model: Estado, as: 'estadoVencimiento' },
              { model: Estado, as: 'estado' }
            ]
          },
          {
            model: Estado,
            as: 'estado'
          },
          {
            model: Usuario,
            as: 'creador',
            attributes: ['nombre', 'apellido']
          }
        ],
        order: [['fechaVencimiento', 'ASC']]
      });
    }
    // Si no se filtra por recurso ni entidad específicos, traer ambos tipos
    else {
      recursosAsignaciones = await RecursoDocumentacion.findAll({
        where: whereClauseRecurso,
        include: [
          {
            model: Recurso,
            as: 'recurso',
            where: { fechaBaja: null }, // Solo recursos activos
            required: true
          },
          {
            model: Documentacion,
            as: 'documentacion',
            where: whereClauseDocumentacion,
            include: [
              { model: Estado, as: 'estadoVencimiento' }
            ]
          },
          {
            model: Estado,
            as: 'estado'
          },
          {
            model: Usuario,
            as: 'creador',
            attributes: ['nombre', 'apellido']
          }
        ],
        order: [['fechaVencimiento', 'ASC']]
      });

      entidadesAsignaciones = await EntidadDocumentacion.findAll({
        where: whereClauseEntidad,
        include: [
          {
            model: Entidad,
            as: 'entidad',
            required: true
          },
          {
            model: Documentacion,
            as: 'documentacion',
            where: whereClauseDocumentacion,
            include: [
              { model: Estado, as: 'estadoVencimiento' },
              { model: Estado, as: 'estado' }
            ]
          },
          {
            model: Estado,
            as: 'estado'
          },
          {
            model: Usuario,
            as: 'creador',
            attributes: ['nombre', 'apellido']
          }
        ],
        order: [['fechaVencimiento', 'ASC']]
      });
    }

    // Combinar y formatear resultados
    const asignacionesFormateadas = [
      ...recursosAsignaciones.map(ra => ({
        id: `recurso-${ra.id}`,
        tipo: 'recurso' as const,
        asignacionId: ra.id,
        documento: {
          id: ra.documentacion.id,
          codigo: ra.documentacion.codigo,
          descripcion: ra.documentacion.descripcion,
          diasVigencia: ra.documentacion.diasVigencia,
          diasAnticipacion: ra.documentacion.diasAnticipacion,
          esUniversal: ra.documentacion.esUniversal
        },
        asignadoA: {
          id: ra.recurso.id,
          nombre: `${ra.recurso.apellido}, ${ra.recurso.nombre}`,
          codigo: ra.recurso.codigo,
          tipo: 'recurso' as const
        },
        entidadDestino: null,
        fechaEmision: ra.fechaEmision,
        fechaTramitacion: ra.fechaTramitacion,
        fechaVencimiento: ra.fechaVencimiento,
        estado: ra.documentacion.esUniversal ? ra.documentacion.estado : ra.estado,
        estadoSeguimiento: ra.estadoSeguimiento || 'pendiente',
        creador: ra.creador,
        fechaCreacion: ra.createdAt,
        fechaModificacion: ra.updatedAt
      })),
      ...entidadesAsignaciones.map(ea => ({
        id: `entidad-${ea.id}`,
        tipo: 'entidad' as const,
        asignacionId: ea.id,
        documento: {
          id: ea.documentacion.id,
          codigo: ea.documentacion.codigo,
          descripcion: ea.documentacion.descripcion,
          diasVigencia: ea.documentacion.diasVigencia,
          diasAnticipacion: ea.documentacion.diasAnticipacion,
          esUniversal: ea.documentacion.esUniversal
        },
        asignadoA: {
          id: ea.entidad.id,
          nombre: ea.entidad.razonSocial,
          codigo: ea.entidad.cuit || ea.entidad.razonSocial,
          tipo: 'entidad' as const
        },
        entidadDestino: {
          id: ea.entidad.id,
          nombre: ea.entidad.razonSocial,
          urlPlataforma: ea.entidad.urlPlataformaDocumentacion,
          emailContacto: ea.entidad.telefono
        },
        fechaEmision: ea.fechaEmision,
        fechaTramitacion: ea.fechaTramitacion,
        fechaVencimiento: ea.fechaVencimiento,
        estado: ea.documentacion.esUniversal ? ea.documentacion.estado : ea.estado,
        estadoSeguimiento: ea.estadoSeguimiento || 'pendiente',
        enviarPorMail: ea.enviarPorMail,
        inhabilitante: ea.esInhabilitante,
        creador: ea.creador,
        fechaCreacion: ea.createdAt,
        fechaModificacion: ea.updatedAt
      }))
    ];

    // Ordenar por fecha de vencimiento
    asignacionesFormateadas.sort((a, b) => {
      if (!a.fechaVencimiento && !b.fechaVencimiento) return 0;
      if (!a.fechaVencimiento) return 1;
      if (!b.fechaVencimiento) return -1;
      return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
    });

    // Aplicar paginación después del ordenamiento
    const total = asignacionesFormateadas.length;
    const paginatedResults = asignacionesFormateadas.slice(offset, offset + Number(limit));

    res.json({
      asignaciones: paginatedResults,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo asignaciones de documentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateAsignacionDocumento = async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, id } = req.params;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      estadoSeguimiento
    } = req.body;
    const userId = req.user!.id;

    let asignacion;
    let documentacion;

    // Función helper para validar y convertir fechas
    const parseDate = (dateString: any) => {
      if (!dateString || dateString === '' || dateString === 'Invalid date') {
        return null;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    if (tipo === 'recurso') {
      asignacion = await RecursoDocumentacion.findByPk(id);
      if (!asignacion) {
        return res.status(404).json({ message: 'Asignación de recurso no encontrada' });
      }

      await asignacion.update({
        fechaEmision: parseDate(fechaEmision),
        fechaTramitacion: parseDate(fechaTramitacion),
        fechaVencimiento: parseDate(fechaVencimiento),
        estadoId: estadoId || null,
        estadoSeguimiento: estadoSeguimiento || asignacion.estadoSeguimiento,
        modificadoPor: userId
      });

      // Recargar con asociaciones para devolver datos actualizados
      await asignacion.reload({
        include: [
          { model: Estado, as: 'estado' },
          { model: Documentacion, as: 'documentacion' }
        ]
      });

    } else if (tipo === 'entidad') {
      asignacion = await EntidadDocumentacion.findByPk(id);
      if (!asignacion) {
        return res.status(404).json({ message: 'Asignación de entidad no encontrada' });
      }

      await asignacion.update({
        fechaEmision: parseDate(fechaEmision),
        fechaTramitacion: parseDate(fechaTramitacion),
        fechaVencimiento: parseDate(fechaVencimiento),
        estadoId: estadoId || null,
        estadoSeguimiento: estadoSeguimiento || asignacion.estadoSeguimiento,
        modificadoPor: userId
      });

      // Recargar con asociaciones para devolver datos actualizados
      await asignacion.reload({
        include: [
          { model: Estado, as: 'estado' },
          { model: Documentacion, as: 'documentacion' }
        ]
      });
    } else {
      return res.status(400).json({ message: 'Tipo de asignación inválido' });
    }

    // TODO: Aquí se podría actualizar el estadoSeguimiento cuando se implemente

    res.json({
      message: 'Asignación actualizada correctamente',
      asignacion
    });

  } catch (error) {
    console.error('Error actualizando asignación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getEstadisticasGestion = async (req: AuthRequest, res: Response) => {
  try {
    // Estadísticas de recursos
    const recursosStats = await RecursoDocumentacion.findAll({
      include: [
        { model: Estado, as: 'estado' },
        { model: Recurso, as: 'recurso', where: { fechaBaja: null } }
      ]
    });

    // Estadísticas de entidades
    const entidadesStats = await EntidadDocumentacion.findAll({
      include: [
        { model: Estado, as: 'estado' },
        { model: Entidad, as: 'entidad' }
      ]
    });

    const totalAsignaciones = recursosStats.length + entidadesStats.length;

    // Calcular próximos a vencer (30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const proximosVencer = [
      ...recursosStats.filter(rs => rs.fechaVencimiento && new Date(rs.fechaVencimiento) <= fechaLimite),
      ...entidadesStats.filter(es => es.fechaVencimiento && new Date(es.fechaVencimiento) <= fechaLimite)
    ].length;

    res.json({
      totalAsignaciones,
      proximosVencer,
      pendientesEnvio: 0, // TODO: implementar cuando se agregue seguimiento
      enviados: 0, // TODO: implementar cuando se agregue seguimiento
      porEstado: {
        // Agrupar por estado
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};