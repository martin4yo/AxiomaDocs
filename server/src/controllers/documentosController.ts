import { Response } from 'express';
import { Op } from 'sequelize';
import {
  Documentacion,
  RecursoDocumentacion,
  EntidadDocumentacion,
  DocumentoEnvio,
  Recurso,
  Entidad,
  Estado,
  Usuario
} from '../models';
import { AuthRequest } from '../middleware/auth';

// Función helper para calcular el estado crítico de un documento
const calculateEstadoCritico = (asignaciones: any[]) => {
  if (!asignaciones || asignaciones.length === 0) {
    return { id: null, nivel: 1, nombre: 'Sin asignaciones', color: '#gray' };
  }

  let estadoMasCritico = { id: null, nivel: 0, nombre: '', color: '#00FF00' };

  asignaciones.forEach(asignacion => {
    const estado = asignacion.estado;
    if (estado && estado.nivel > estadoMasCritico.nivel) {
      estadoMasCritico = {
        id: estado.id,
        nivel: estado.nivel,
        nombre: estado.nombre,
        color: estado.color
      };
    }
  });

  return estadoMasCritico;
};

// GET /api/documentos - Lista principal de documentos con estado crítico
export const getDocumentosConEstadoCritico = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      estadoSeguimiento, // 'pendiente' | 'enviado'
      soloConVencimientos = false
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Construir filtros para documentación
    const whereClauseDocumentacion: any = {};

    if (search) {
      whereClauseDocumentacion[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } }
      ];
    }

    // Obtener todos los documentos
    const documentos = await Documentacion.findAndCountAll({
      where: whereClauseDocumentacion,
      include: [
        { model: Estado, as: 'estado' },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellido'] }
      ],
      limit: Number(limit),
      offset,
      order: [['codigo', 'ASC']]
    });

    // Para cada documento, calcular estado crítico y estadísticas
    const documentosConEstado = await Promise.all(
      documentos.rows.map(async (doc: any) => {
        // Obtener asignaciones de recursos
        const recursosAsignaciones = await RecursoDocumentacion.findAll({
          where: { documentacionId: doc.id },
          include: [
            { model: Estado, as: 'estado' },
            { model: Recurso, as: 'recurso', where: { fechaBaja: null } }
          ]
        });

        // Obtener asignaciones de entidades
        const entidadesAsignaciones = await EntidadDocumentacion.findAll({
          where: { documentacionId: doc.id },
          include: [
            { model: Estado, as: 'estado' },
            { model: Entidad, as: 'entidad' }
          ]
        });

        // Combinar todas las asignaciones para calcular estado crítico
        const todasAsignaciones = [
          ...recursosAsignaciones.map(ra => ({
            estado: doc.esUniversal ? doc.estado : ra.estado,
            fechaVencimiento: ra.fechaVencimiento
          })),
          ...entidadesAsignaciones.map(ea => ({
            estado: doc.esUniversal ? doc.estado : ea.estado,
            fechaVencimiento: ea.fechaVencimiento
          }))
        ];

        // Si es documento universal, usar su estado
        let estadoCritico;
        if (doc.esUniversal && doc.estado) {
          estadoCritico = {
            id: doc.estado.id,
            nivel: doc.estado.nivel,
            nombre: doc.estado.nombre,
            color: doc.estado.color
          };
        } else {
          estadoCritico = calculateEstadoCritico(todasAsignaciones);
        }

        // Calcular fecha de vencimiento más próxima
        const fechasVencimiento = todasAsignaciones
          .map(a => a.fechaVencimiento)
          .filter(f => f)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const proximaVencimiento = fechasVencimiento.length > 0 ? fechasVencimiento[0] : null;

        // Obtener estadísticas de envíos
        const totalEnvios = await DocumentoEnvio.count({
          where: { documentacionId: doc.id }
        });

        const enviosPendientes = await DocumentoEnvio.count({
          where: {
            documentacionId: doc.id,
            estadoEnvio: 'pendiente'
          }
        });

        const enviosEnviados = await DocumentoEnvio.count({
          where: {
            documentacionId: doc.id,
            estadoEnvio: 'enviado'
          }
        });

        // Filtrar por estado de seguimiento si se especifica
        if (estadoSeguimiento) {
          const tieneSeguimiento = estadoSeguimiento === 'pendiente' ?
            enviosPendientes > 0 : enviosEnviados > 0;

          if (!tieneSeguimiento) {
            return null; // Filtrar este documento
          }
        }

        // Filtrar solo documentos con vencimientos si se especifica
        if (soloConVencimientos === 'true' && !proximaVencimiento) {
          return null;
        }

        return {
          id: doc.id,
          codigo: doc.codigo,
          descripcion: doc.descripcion,
          diasVigencia: doc.diasVigencia,
          esUniversal: doc.esUniversal,
          // Agregar campos de fechas del documento universal
          fechaEmision: doc.fechaEmision,
          fechaTramitacion: doc.fechaTramitacion,
          fechaVencimiento: doc.fechaVencimiento,
          estadoCritico,
          proximaVencimiento,
          recursosAsignados: recursosAsignaciones.length,
          entidadesDestino: entidadesAsignaciones.length,
          totalEnvios,
          enviosPendientes,
          enviosEnviados,
          creador: doc.creador,
          fechaCreacion: doc.createdAt,
          fechaModificacion: doc.updatedAt
        };
      })
    );

    // Filtrar documentos null (que no pasaron los filtros)
    const documentosFiltrados = documentosConEstado.filter(doc => doc !== null);

    res.json({
      documentos: documentosFiltrados,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(documentos.count / Number(limit)),
        totalItems: documentos.count,
        itemsPerPage: Number(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos con estado crítico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/documentos/:id/recursos - Sub-grilla de recursos asignados
export const getRecursosAsignados = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const recursos = await RecursoDocumentacion.findAll({
      where: { documentacionId: id },
      include: [
        {
          model: Recurso,
          as: 'recurso',
          where: { fechaBaja: null },
          required: true
        },
        {
          model: Documentacion,
          as: 'documentacion'
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

    const recursosFormateados = recursos.map(ra => ({
      id: ra.id,
      recurso: {
        id: ra.recurso.id,
        nombre: `${ra.recurso.apellido}, ${ra.recurso.nombre}`,
        codigo: ra.recurso.codigo,
        cuil: ra.recurso.cuil
      },
      fechaEmision: ra.fechaEmision,
      fechaTramitacion: ra.fechaTramitacion,
      fechaVencimiento: ra.fechaVencimiento,
      estado: ra.documentacion.esUniversal ? ra.documentacion.estado : ra.estado,
      estadoSeguimiento: ra.estadoSeguimiento || 'pendiente',
      observaciones: ra.observaciones,
      creador: ra.creador,
      fechaCreacion: ra.createdAt,
      fechaModificacion: ra.updatedAt
    }));

    res.json({ recursos: recursosFormateados });

  } catch (error) {
    console.error('Error obteniendo recursos asignados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/documentos/:id/entidades - Sub-grilla de entidades destino
export const getEntidadesDestino = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Obtener información del documento para determinar si es universal
    const documento = await Documentacion.findByPk(id, {
      include: [{ model: Estado, as: 'estado' }]
    });

    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Obtener entidades asociadas directamente al documento
    const entidadesDirectas = await EntidadDocumentacion.findAll({
      where: { documentacionId: id },
      include: [
        { model: Entidad, as: 'entidad' },
        { model: Estado, as: 'estado' }
      ]
    });

    // Obtener entidades asociadas a través de recursos
    const entidadesPorRecursos = await RecursoDocumentacion.findAll({
      where: { documentacionId: id },
      include: [
        {
          model: Recurso,
          as: 'recurso',
          where: { fechaBaja: null },
          include: [
            {
              model: Entidad,
              as: 'entidades',
              through: { attributes: [] }
            }
          ]
        },
        { model: Estado, as: 'estado' }
      ]
    });

    // Combinar y obtener envíos para cada entidad
    const entidadesConEnvios = await Promise.all([
      // Entidades directas
      ...entidadesDirectas.map(async (ed) => {
        const envio = await DocumentoEnvio.findOne({
          where: {
            documentacionId: id,
            entidadId: ed.entidad.id,
            recursoId: null // Envío directo
          },
          include: [
            { model: Usuario, as: 'creador', attributes: ['nombre', 'apellido'] },
            { model: Usuario, as: 'modificador', attributes: ['nombre', 'apellido'] }
          ]
        });

        return {
          id: `direct-${ed.entidad.id}`,
          entidadDocumentacionId: ed.id, // ID de la relación EntidadDocumentacion
          entidad: {
            id: ed.entidad.id,
            nombre: ed.entidad.razonSocial,
            cuit: ed.entidad.cuit
          },
          motivo: 'Directo',
          destino: ed.entidad.email || ed.entidad.urlPlataformaDocumentacion || ed.entidad.telefono,
          tipoDestino: ed.entidad.urlPlataformaDocumentacion ? 'url' : 'email',
          // Agregar las fechas de la relación EntidadDocumentacion
          fechaEmision: ed.fechaEmision,
          fechaTramitacion: ed.fechaTramitacion,
          fechaVencimiento: ed.fechaVencimiento,
          estado: documento.esUniversal ? documento.estado : ed.estado,
          estadoEnvio: envio?.estadoEnvio || 'pendiente',
          fechaEnvio: envio?.fechaEnvio,
          observaciones: envio?.observaciones,
          ultimaAccion: envio?.updatedAt,
          responsable: envio?.modificador
        };
      }),
      // Entidades por recursos
      ...entidadesPorRecursos.flatMap(rd =>
        rd.recurso.entidades.map(async (entidad: any) => {
          const envio = await DocumentoEnvio.findOne({
            where: {
              documentacionId: id,
              entidadId: entidad.id,
              recursoId: rd.recurso.id
            },
            include: [
              { model: Usuario, as: 'creador', attributes: ['nombre', 'apellido'] },
              { model: Usuario, as: 'modificador', attributes: ['nombre', 'apellido'] }
            ]
          });

          return {
            id: `resource-${rd.recurso.id}-${entidad.id}`,
            entidad: {
              id: entidad.id,
              nombre: entidad.razonSocial,
              cuit: entidad.cuit
            },
            motivo: `Recurso: ${rd.recurso.apellido}, ${rd.recurso.nombre}`,
            destino: entidad.email || entidad.urlPlataformaDocumentacion || entidad.telefono,
            tipoDestino: entidad.urlPlataformaDocumentacion ? 'url' : 'email',
            estado: documento.esUniversal ? documento.estado : rd.estado,
            estadoEnvio: envio?.estadoEnvio || 'pendiente',
            fechaEnvio: envio?.fechaEnvio,
            observaciones: envio?.observaciones,
            ultimaAccion: envio?.updatedAt,
            responsable: envio?.modificador
          };
        })
      )
    ]);

    const entidades = await Promise.all(entidadesConEnvios);

    // Eliminar duplicados basados en entidad.id
    const entidadesUnicas = entidades.filter((entidad, index, self) =>
      index === self.findIndex(e => e.entidad.id === entidad.entidad.id)
    );

    res.json({ entidades: entidadesUnicas });

  } catch (error) {
    console.error('Error obteniendo entidades destino:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/documentos/:documentoId/recursos/:recursoAsignacionId - Actualizar recurso asignado
export const updateRecursoAsignado = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, recursoAsignacionId } = req.params;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      estadoSeguimiento,
      observaciones
    } = req.body;
    const userId = req.user!.id;

    // Función helper para validar y convertir fechas
    const parseDate = (dateString: any) => {
      if (!dateString || dateString === '' || dateString === 'Invalid date') {
        return null;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    const asignacion = await RecursoDocumentacion.findByPk(recursoAsignacionId);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de recurso no encontrada' });
    }

    await asignacion.update({
      fechaEmision: parseDate(fechaEmision),
      fechaTramitacion: parseDate(fechaTramitacion),
      fechaVencimiento: parseDate(fechaVencimiento),
      estadoId: estadoId || null,
      estadoSeguimiento: estadoSeguimiento || asignacion.estadoSeguimiento,
      observaciones: observaciones || asignacion.observaciones,
      modificadoPor: userId
    });

    res.json({
      message: 'Recurso asignado actualizado correctamente',
      asignacion
    });

  } catch (error) {
    console.error('Error actualizando recurso asignado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/documentos/:documentoId/entidades/:entidadAsignacionId/asignacion - Actualizar asignación de entidad
export const updateEntidadAsignada = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadAsignacionId } = req.params;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId,
      observaciones
    } = req.body;
    const userId = req.user!.id;

    // Función helper para validar y convertir fechas
    const parseDate = (dateString: any) => {
      if (!dateString || dateString === '' || dateString === 'Invalid date') {
        return null;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    const asignacion = await EntidadDocumentacion.findByPk(entidadAsignacionId);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación de entidad no encontrada' });
    }

    await asignacion.update({
      fechaEmision: parseDate(fechaEmision),
      fechaTramitacion: parseDate(fechaTramitacion),
      fechaVencimiento: parseDate(fechaVencimiento),
      estadoId: estadoId || null,
      observaciones: observaciones || asignacion.observaciones,
      modificadoPor: userId
    });

    res.json({
      message: 'Entidad asignada actualizada correctamente',
      asignacion
    });

  } catch (error) {
    console.error('Error actualizando entidad asignada:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/documentos/stats - Obtener estadísticas optimizadas del dashboard
export const getEstadisticasDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Función helper para clasificar por estado
    const clasificarPorEstado = (estado: any) => {
      if (!estado) return 'vigentes';

      const nombreEstado = estado.nombre?.toLowerCase();

      if (nombreEstado?.includes('vencid')) return 'vencidos';
      if (nombreEstado?.includes('vencer')) return 'porVencer';
      if (nombreEstado?.includes('tramite') || nombreEstado?.includes('trámite')) return 'enTramite';
      if (nombreEstado?.includes('vigente')) return 'vigentes';

      // Clasificar por nivel si no coincide el nombre
      if (estado.nivel >= 8) return 'vencidos';
      if (estado.nivel >= 6) return 'porVencer';
      if (estado.nivel >= 4) return 'enTramite';
      return 'vigentes';
    };

    const stats = {
      universales: { total: 0, vencidos: 0, porVencer: 0, enTramite: 0, vigentes: 0 },
      porRecurso: { total: 0, vencidos: 0, porVencer: 0, enTramite: 0, vigentes: 0 },
      porEntidad: { total: 0, vencidos: 0, porVencer: 0, enTramite: 0, vigentes: 0 }
    };

    // Obtener documentos universales
    const documentosUniversales = await Documentacion.findAll({
      where: { esUniversal: true },
      include: [{ model: Estado, as: 'estado' }]
    });

    documentosUniversales.forEach(doc => {
      stats.universales.total++;
      const categoria = clasificarPorEstado(doc.estado);
      if (categoria === 'vencidos') stats.universales.vencidos++;
      else if (categoria === 'porVencer') stats.universales.porVencer++;
      else if (categoria === 'enTramite') stats.universales.enTramite++;
      else if (categoria === 'vigentes') stats.universales.vigentes++;
    });

    // Obtener asignaciones de recursos
    const asignacionesRecursos = await RecursoDocumentacion.findAll({
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
          where: { esUniversal: false }
        },
        { model: Estado, as: 'estado' },
        {
          model: Recurso,
          as: 'recurso',
          where: { fechaBaja: null }
        }
      ]
    });

    asignacionesRecursos.forEach(asignacion => {
      stats.porRecurso.total++;
      const categoria = clasificarPorEstado(asignacion.estado);
      if (categoria === 'vencidos') stats.porRecurso.vencidos++;
      else if (categoria === 'porVencer') stats.porRecurso.porVencer++;
      else if (categoria === 'enTramite') stats.porRecurso.enTramite++;
      else if (categoria === 'vigentes') stats.porRecurso.vigentes++;
    });

    // Obtener asignaciones de entidades
    const asignacionesEntidades = await EntidadDocumentacion.findAll({
      include: [
        {
          model: Documentacion,
          as: 'documentacion',
          where: { esUniversal: false }
        },
        { model: Estado, as: 'estado' },
        { model: Entidad, as: 'entidad' }
      ]
    });

    asignacionesEntidades.forEach(asignacion => {
      stats.porEntidad.total++;
      const categoria = clasificarPorEstado(asignacion.estado);
      if (categoria === 'vencidos') stats.porEntidad.vencidos++;
      else if (categoria === 'porVencer') stats.porEntidad.porVencer++;
      else if (categoria === 'enTramite') stats.porEntidad.enTramite++;
      else if (categoria === 'vigentes') stats.porEntidad.vigentes++;
    });

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/documentos/:documentoId/entidades/:entidadId/envio - Actualizar estado de envío
export const updateEstadoEnvio = async (req: AuthRequest, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const {
      recursoId,
      estadoEnvio,
      destino,
      observaciones
    } = req.body;
    const userId = req.user!.id;

    // Buscar o crear el registro de envío
    const [envio] = await DocumentoEnvio.findOrCreate({
      where: {
        documentacionId: documentoId,
        entidadId: entidadId,
        recursoId: recursoId || null
      },
      defaults: {
        documentacionId: documentoId,
        entidadId: entidadId,
        recursoId: recursoId || null,
        estadoEnvio: estadoEnvio || 'pendiente',
        destino: destino,
        observaciones: observaciones,
        creadoPor: userId
      }
    });

    // Si ya existe, actualizar
    if (estadoEnvio || destino || observaciones) {
      await envio.update({
        estadoEnvio: estadoEnvio || envio.estadoEnvio,
        destino: destino || envio.destino,
        observaciones: observaciones || envio.observaciones,
        fechaEnvio: estadoEnvio === 'enviado' ? new Date() : envio.fechaEnvio,
        modificadoPor: userId
      });
    }

    res.json({
      message: 'Estado de envío actualizado correctamente',
      envio
    });

  } catch (error) {
    console.error('Error actualizando estado de envío:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/documentos/:id/universal - Actualizar documento universal
export const updateDocumentoUniversal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      fechaEmision,
      fechaTramitacion,
      fechaVencimiento,
      estadoId
    } = req.body;
    const userId = req.user!.id;

    // Función helper para validar y convertir fechas
    const parseDate = (dateString: any) => {
      if (!dateString || dateString === '' || dateString === 'Invalid date') {
        return null;
      }
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    const documento = await Documentacion.findByPk(id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    await documento.update({
      fechaEmision: parseDate(fechaEmision),
      fechaTramitacion: parseDate(fechaTramitacion),
      fechaVencimiento: parseDate(fechaVencimiento),
      estadoId: estadoId || null,
      modificadoPor: userId
    });

    res.json({
      message: 'Documento universal actualizado correctamente',
      documento
    });

  } catch (error) {
    console.error('Error actualizando documento universal:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};