import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Intercambio, Workflow, Entidad, Usuario } from '../models';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const intercambioController = {
  // GET /api/intercambios
  async listar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        estado,
        prioridad,
        entidadOrigenId,
        entidadDestinoId,
        workflowId
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      
      // Construir filtros
      const whereClause: any = {};
      
      if (search) {
        whereClause[Op.or] = [
          { codigo: { [Op.iLike]: `%${search}%` } },
          { nombre: { [Op.iLike]: `%${search}%` } },
          { descripcion: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (estado) {
        whereClause.estado = estado;
      }
      
      if (prioridad) {
        whereClause.prioridad = prioridad;
      }
      
      if (entidadOrigenId) {
        whereClause.entidadOrigenId = entidadOrigenId;
      }
      
      if (entidadDestinoId) {
        whereClause.entidadDestinoId = entidadDestinoId;
      }
      
      if (workflowId) {
        whereClause.workflowId = workflowId;
      }

      const { rows: intercambios, count: total } = await Intercambio.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Workflow,
            as: 'workflow',
            attributes: ['id', 'codigo', 'nombre', 'tipo', 'categoria']
          },
          {
            model: Entidad,
            as: 'entidadOrigen',
            attributes: ['id', 'nombre', 'descripcion']
          },
          {
            model: Entidad,
            as: 'entidadDestino',
            attributes: ['id', 'nombre', 'descripcion']
          },
          {
            model: Usuario,
            as: 'responsable',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          },
          {
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ],
        order: [['fechaInicio', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        intercambios,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al listar intercambios:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // GET /api/intercambios/:id
  async obtenerPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const intercambio = await Intercambio.findByPk(id, {
        include: [
          {
            model: Workflow,
            as: 'workflow',
            attributes: ['id', 'codigo', 'nombre', 'tipo', 'categoria', 'pasos', 'transiciones']
          },
          {
            model: Entidad,
            as: 'entidadOrigen',
            attributes: ['id', 'nombre', 'descripcion', 'email', 'telefono']
          },
          {
            model: Entidad,
            as: 'entidadDestino',
            attributes: ['id', 'nombre', 'descripcion', 'email', 'telefono']
          },
          {
            model: Usuario,
            as: 'responsable',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido', 'email']
          },
          {
            model: Usuario,
            as: 'supervisor',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido', 'email']
          },
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      if (!intercambio) {
        res.status(404).json({ error: 'Intercambio no encontrado' });
        return;
      }

      res.json(intercambio);
    } catch (error) {
      console.error('Error al obtener intercambio:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // POST /api/intercambios
  async crear(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        nombre,
        descripcion,
        workflowId,
        entidadOrigenId,
        entidadDestinoId,
        prioridad = 'media',
        fechaEstimadaFin,
        responsableId,
        supervisorId,
        parametrosIniciales = {},
        documentosRequeridos = [],
        observaciones
      } = req.body;

      const usuarioId = req.user?.id;

      // Validaciones
      if (!nombre || !workflowId || !entidadOrigenId || !entidadDestinoId || !responsableId) {
        res.status(400).json({ 
          error: 'Campos requeridos faltantes', 
          campos: ['nombre', 'workflowId', 'entidadOrigenId', 'entidadDestinoId', 'responsableId'] 
        });
        return;
      }

      // Verificar que el workflow existe y está activo
      const workflow = await Workflow.findByPk(workflowId);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow no encontrado' });
        return;
      }

      if (workflow.estado !== 'activo') {
        res.status(400).json({ error: 'El workflow no está activo' });
        return;
      }

      // Verificar que las entidades existen
      const entidadOrigen = await Entidad.findByPk(entidadOrigenId);
      const entidadDestino = await Entidad.findByPk(entidadDestinoId);
      
      if (!entidadOrigen || !entidadDestino) {
        res.status(404).json({ error: 'Una o ambas entidades no existen' });
        return;
      }

      // Verificar que el responsable existe
      const responsable = await Usuario.findByPk(responsableId);
      if (!responsable) {
        res.status(404).json({ error: 'Usuario responsable no encontrado' });
        return;
      }

      // Calcular fecha estimada de fin si no se proporciona
      let fechaFin = fechaEstimadaFin;
      if (!fechaFin && workflow.estimacionDuracionHoras) {
        const fechaInicio = new Date();
        fechaFin = new Date(fechaInicio.getTime() + (workflow.estimacionDuracionHoras * 60 * 60 * 1000));
      }

      // Generar código único si no se proporciona
      const year = new Date().getFullYear();
      const count = await Intercambio.count({
        where: {
          codigo: {
            [Op.like]: `INT-${year}-%`
          }
        }
      });
      const codigo = `INT-${year}-${String(count + 1).padStart(3, '0')}`;

      // Crear el intercambio
      const nuevoIntercambio = await Intercambio.create({
        codigo,
        nombre,
        descripcion,
        workflowId,
        workflowVersion: workflow.version,
        entidadOrigenId,
        entidadDestinoId,
        prioridad,
        fechaInicio: new Date(),
        fechaEstimadaFin: fechaFin || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días por defecto
        responsableId,
        supervisorId,
        contexto: {},
        parametrosIniciales,
        participantesAsignados: [
          { rol: 'responsable', usuarioId: responsableId },
          ...(supervisorId ? [{ rol: 'supervisor', usuarioId: supervisorId }] : [])
        ],
        documentosRequeridos,
        documentosSubidos: [],
        observaciones,
        creadoPor: usuarioId
      });

      // Incrementar utilizaciones del workflow
      await workflow.increment('utilizaciones');

      // Obtener el intercambio creado con las relaciones
      const intercambioCompleto = await Intercambio.findByPk(nuevoIntercambio.id, {
        include: [
          {
            model: Workflow,
            as: 'workflow',
            attributes: ['id', 'codigo', 'nombre', 'tipo', 'categoria']
          },
          {
            model: Entidad,
            as: 'entidadOrigen',
            attributes: ['id', 'nombre']
          },
          {
            model: Entidad,
            as: 'entidadDestino',
            attributes: ['id', 'nombre']
          },
          {
            model: Usuario,
            as: 'responsable',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      res.status(201).json(intercambioCompleto);
    } catch (error) {
      console.error('Error al crear intercambio:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // PUT /api/intercambios/:id
  async actualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        nombre,
        descripcion,
        estado,
        prioridad,
        fechaEstimadaFin,
        progreso,
        pasoActualId,
        responsableId,
        supervisorId,
        observaciones
      } = req.body;

      const usuarioId = req.user?.id;

      const intercambio = await Intercambio.findByPk(id);
      if (!intercambio) {
        res.status(404).json({ error: 'Intercambio no encontrado' });
        return;
      }

      // Validar que el usuario tiene permisos para modificar
      if (intercambio.responsableId !== usuarioId && intercambio.supervisorId !== usuarioId && intercambio.creadoPor !== usuarioId) {
        res.status(403).json({ error: 'Sin permisos para modificar este intercambio' });
        return;
      }

      // Validar transición de estado
      const estadosValidos = ['iniciado', 'en_progreso', 'completado', 'pausado', 'cancelado'];
      if (estado && !estadosValidos.includes(estado)) {
        res.status(400).json({ error: 'Estado no válido' });
        return;
      }

      // Validar progreso
      if (progreso !== undefined && (progreso < 0 || progreso > 100)) {
        res.status(400).json({ error: 'El progreso debe estar entre 0 y 100' });
        return;
      }

      // Si se está completando, establecer progreso en 100 y fecha fin real
      const updateData: any = {
        ...(nombre && { nombre }),
        ...(descripcion && { descripcion }),
        ...(prioridad && { prioridad }),
        ...(fechaEstimadaFin && { fechaEstimadaFin }),
        ...(progreso !== undefined && { progreso }),
        ...(pasoActualId && { pasoActualId }),
        ...(responsableId && { responsableId }),
        ...(supervisorId !== undefined && { supervisorId }),
        ...(observaciones !== undefined && { observaciones }),
        modificadoPor: usuarioId
      };

      if (estado) {
        updateData.estado = estado;
        if (estado === 'completado') {
          updateData.progreso = 100;
          updateData.fechaFinReal = new Date();
        }
      }

      await intercambio.update(updateData);

      // Obtener el intercambio actualizado con las relaciones
      const intercambioActualizado = await Intercambio.findByPk(id, {
        include: [
          {
            model: Workflow,
            as: 'workflow',
            attributes: ['id', 'codigo', 'nombre', 'tipo', 'categoria']
          },
          {
            model: Entidad,
            as: 'entidadOrigen',
            attributes: ['id', 'nombre']
          },
          {
            model: Entidad,
            as: 'entidadDestino',
            attributes: ['id', 'nombre']
          },
          {
            model: Usuario,
            as: 'responsable',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      res.json(intercambioActualizado);
    } catch (error) {
      console.error('Error al actualizar intercambio:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // DELETE /api/intercambios/:id
  async eliminar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;

      const intercambio = await Intercambio.findByPk(id);
      if (!intercambio) {
        res.status(404).json({ error: 'Intercambio no encontrado' });
        return;
      }

      // Validar que el usuario tiene permisos para eliminar
      if (intercambio.creadoPor !== usuarioId && intercambio.supervisorId !== usuarioId) {
        res.status(403).json({ error: 'Sin permisos para eliminar este intercambio' });
        return;
      }

      // No permitir eliminar intercambios completados
      if (intercambio.estado === 'completado') {
        res.status(400).json({ error: 'No se puede eliminar un intercambio completado' });
        return;
      }

      await intercambio.destroy();

      res.json({ message: 'Intercambio eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar intercambio:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // GET /api/intercambios/estadisticas
  async obtenerEstadisticas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { periodo = '30d' } = req.query;
      
      // Calcular fecha de inicio basada en el período
      const fechaInicio = new Date();
      switch (periodo) {
        case '7d':
          fechaInicio.setDate(fechaInicio.getDate() - 7);
          break;
        case '30d':
          fechaInicio.setDate(fechaInicio.getDate() - 30);
          break;
        case '90d':
          fechaInicio.setDate(fechaInicio.getDate() - 90);
          break;
        case '1y':
          fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
          break;
        default:
          fechaInicio.setDate(fechaInicio.getDate() - 30);
      }

      const whereClause = {
        createdAt: {
          [Op.gte]: fechaInicio
        }
      };

      // Estadísticas básicas
      const [
        totalIntercambios,
        enProgreso,
        completados,
        conRetrasos,
        porPrioridad
      ] = await Promise.all([
        Intercambio.count({ where: whereClause }),
        Intercambio.count({ where: { ...whereClause, estado: 'en_progreso' } }),
        Intercambio.count({ where: { ...whereClause, estado: 'completado' } }),
        Intercambio.count({ 
          where: { 
            ...whereClause, 
            fechaEstimadaFin: { [Op.lt]: new Date() },
            estado: { [Op.notIn]: ['completado', 'cancelado'] }
          } 
        }),
        Intercambio.findAll({
          where: whereClause,
          attributes: [
            'prioridad',
            [Intercambio.sequelize!.fn('COUNT', Intercambio.sequelize!.col('id')), 'count']
          ],
          group: ['prioridad']
        })
      ]);

      // Calcular tiempo promedio de completación
      const intercambiosCompletados = await Intercambio.findAll({
        where: {
          ...whereClause,
          estado: 'completado',
          fechaFinReal: { [Op.not]: null }
        },
        attributes: ['fechaInicio', 'fechaFinReal']
      });

      let tiempoPromedioComplecion = 0;
      if (intercambiosCompletados.length > 0) {
        const tiempoTotal = intercambiosCompletados.reduce((acc, intercambio) => {
          const inicio = new Date(intercambio.fechaInicio).getTime();
          const fin = new Date(intercambio.fechaFinReal!).getTime();
          return acc + (fin - inicio);
        }, 0);
        
        tiempoPromedioComplecion = tiempoTotal / intercambiosCompletados.length / (1000 * 60 * 60 * 24); // días
      }

      // Estadísticas por entidad
      const porEntidad = await Intercambio.findAll({
        where: whereClause,
        include: [
          {
            model: Entidad,
            as: 'entidadOrigen',
            attributes: ['id', 'nombre']
          }
        ],
        attributes: [
          'entidadOrigenId',
          [Intercambio.sequelize!.fn('COUNT', Intercambio.sequelize!.col('Intercambio.id')), 'count']
        ],
        group: ['entidadOrigenId', 'entidadOrigen.id', 'entidadOrigen.nombre']
      });

      res.json({
        resumen: {
          totalIntercambios,
          enProgreso,
          completados,
          conRetrasos,
          tiempoPromedioComplecion: Math.round(tiempoPromedioComplecion * 10) / 10,
          eficienciaPromedio: totalIntercambios > 0 ? Math.round((completados / totalIntercambios) * 100 * 10) / 10 : 0
        },
        distribucion: {
          porPrioridad: porPrioridad.map((item: any) => ({
            prioridad: item.prioridad,
            count: parseInt(item.dataValues.count)
          })),
          porEntidad: porEntidad.map((item: any) => ({
            entidadId: item.entidadOrigenId,
            entidadNombre: item.entidadOrigen?.nombre,
            count: parseInt(item.dataValues.count)
          }))
        },
        periodo: periodo as string
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  }
};