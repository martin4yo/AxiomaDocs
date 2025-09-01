import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Workflow, Usuario, Intercambio } from '../models';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const workflowController = {
  // GET /api/workflows
  async listar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoria,
        tipo,
        estado,
        incluirInactivos = false
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
      
      if (categoria) {
        whereClause.categoria = categoria;
      }
      
      if (tipo) {
        whereClause.tipo = tipo;
      }
      
      if (estado) {
        whereClause.estado = estado;
      } else if (!incluirInactivos) {
        // Por defecto, solo mostrar workflows activos y borradores
        whereClause.estado = {
          [Op.in]: ['activo', 'borrador']
        };
      }

      const { rows: workflows, count: total } = await Workflow.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          },
          {
            model: Usuario,
            as: 'modificador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ],
        attributes: {
          exclude: ['pasos', 'transiciones', 'eventos'] // Excluir campos pesados en la lista
        },
        order: [['fechaUltimaModificacion', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.json({
        workflows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al listar workflows:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // GET /api/workflows/:id
  async obtenerPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const workflow = await Workflow.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          },
          {
            model: Usuario,
            as: 'modificador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      if (!workflow) {
        res.status(404).json({ error: 'Workflow no encontrado' });
        return;
      }

      res.json(workflow);
    } catch (error) {
      console.error('Error al obtener workflow:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // POST /api/workflows
  async crear(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        codigo,
        nombre,
        descripcion,
        categoria,
        subcategoria,
        tags = [],
        tipo,
        participantes = [],
        pasos = [],
        transiciones = [],
        eventos = [],
        complejidad = 'media',
        estimacionDuracionHoras,
        recursosRequeridos = []
      } = req.body;

      const usuarioId = req.user?.id;

      // Validaciones
      if (!codigo || !nombre || !categoria || !tipo) {
        res.status(400).json({ 
          error: 'Campos requeridos faltantes', 
          campos: ['codigo', 'nombre', 'categoria', 'tipo'] 
        });
        return;
      }

      // Verificar que el código no existe
      const workflowExistente = await Workflow.findOne({ where: { codigo } });
      if (workflowExistente) {
        res.status(400).json({ error: 'Ya existe un workflow con este código' });
        return;
      }

      // Validar tipo
      const tiposValidos = ['bilateral', 'supervisado', 'circular', 'jerarquico', 'paralelo'];
      if (!tiposValidos.includes(tipo)) {
        res.status(400).json({ error: 'Tipo de workflow no válido' });
        return;
      }

      // Validar complejidad
      const complejidadesValidas = ['baja', 'media', 'alta', 'critica'];
      if (!complejidadesValidas.includes(complejidad)) {
        res.status(400).json({ error: 'Complejidad no válida' });
        return;
      }

      // Crear el workflow
      const nuevoWorkflow = await Workflow.create({
        codigo,
        nombre,
        descripcion,
        version: '1.0',
        categoria,
        subcategoria,
        tags,
        tipo,
        participantes,
        pasos,
        transiciones,
        eventos,
        complejidad,
        estimacionDuracionHoras,
        recursosRequeridos,
        estado: 'borrador',
        publicado: false,
        utilizaciones: 0,
        fechaUltimaModificacion: new Date(),
        creadoPor: usuarioId
      });

      // Obtener el workflow creado con las relaciones
      const workflowCompleto = await Workflow.findByPk(nuevoWorkflow.id, {
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      res.status(201).json(workflowCompleto);
    } catch (error) {
      console.error('Error al crear workflow:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // PUT /api/workflows/:id
  async actualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        nombre,
        descripcion,
        categoria,
        subcategoria,
        tags,
        participantes,
        pasos,
        transiciones,
        eventos,
        complejidad,
        estimacionDuracionHoras,
        recursosRequeridos,
        estado
      } = req.body;

      const usuarioId = req.user?.id;

      const workflow = await Workflow.findByPk(id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow no encontrado' });
        return;
      }

      // Validar que el usuario tiene permisos para modificar
      if (workflow.creadoPor !== usuarioId && !req.user?.esAdmin) {
        res.status(403).json({ error: 'Sin permisos para modificar este workflow' });
        return;
      }

      // No permitir modificar workflows con intercambios activos
      if (estado !== workflow.estado && workflow.estado === 'activo') {
        const intercambiosActivos = await Intercambio.count({
          where: {
            workflowId: id,
            estado: { [Op.in]: ['iniciado', 'en_progreso'] }
          }
        });

        if (intercambiosActivos > 0) {
          res.status(400).json({ 
            error: 'No se puede modificar un workflow con intercambios activos',
            intercambiosActivos 
          });
          return;
        }
      }

      // Validar estado
      if (estado) {
        const estadosValidos = ['borrador', 'activo', 'pausado', 'obsoleto', 'archivado'];
        if (!estadosValidos.includes(estado)) {
          res.status(400).json({ error: 'Estado no válido' });
          return;
        }
      }

      // Incrementar versión si hay cambios significativos
      let nuevaVersion = workflow.version;
      if (pasos || transiciones || participantes) {
        const versionActual = parseFloat(workflow.version);
        nuevaVersion = (versionActual + 0.1).toFixed(1);
      }

      const updateData: any = {
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(categoria && { categoria }),
        ...(subcategoria !== undefined && { subcategoria }),
        ...(tags && { tags }),
        ...(participantes && { participantes }),
        ...(pasos && { pasos }),
        ...(transiciones && { transiciones }),
        ...(eventos && { eventos }),
        ...(complejidad && { complejidad }),
        ...(estimacionDuracionHoras !== undefined && { estimacionDuracionHoras }),
        ...(recursosRequeridos && { recursosRequeridos }),
        ...(estado && { estado }),
        version: nuevaVersion,
        modificadoPor: usuarioId
      };

      // Si se está publicando, establecer fecha de publicación
      if (estado === 'activo' && workflow.estado !== 'activo') {
        updateData.fechaPublicacion = new Date();
        updateData.publicado = true;
      }

      await workflow.update(updateData);

      // Obtener el workflow actualizado con las relaciones
      const workflowActualizado = await Workflow.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          },
          {
            model: Usuario,
            as: 'modificador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      res.json(workflowActualizado);
    } catch (error) {
      console.error('Error al actualizar workflow:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // DELETE /api/workflows/:id
  async eliminar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;

      const workflow = await Workflow.findByPk(id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow no encontrado' });
        return;
      }

      // Validar que el usuario tiene permisos para eliminar
      if (workflow.creadoPor !== usuarioId && !req.user?.esAdmin) {
        res.status(403).json({ error: 'Sin permisos para eliminar este workflow' });
        return;
      }

      // Verificar que no tiene intercambios asociados
      const intercambiosCount = await Intercambio.count({ where: { workflowId: id } });
      if (intercambiosCount > 0) {
        res.status(400).json({ 
          error: 'No se puede eliminar un workflow con intercambios asociados',
          intercambios: intercambiosCount
        });
        return;
      }

      await workflow.destroy();

      res.json({ message: 'Workflow eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar workflow:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // POST /api/workflows/:id/duplicar
  async duplicar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nuevoCodigo, nuevoNombre } = req.body;
      const usuarioId = req.user?.id;

      const workflow = await Workflow.findByPk(id);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow no encontrado' });
        return;
      }

      if (!nuevoCodigo || !nuevoNombre) {
        res.status(400).json({ 
          error: 'Campos requeridos faltantes', 
          campos: ['nuevoCodigo', 'nuevoNombre'] 
        });
        return;
      }

      // Verificar que el nuevo código no existe
      const workflowExistente = await Workflow.findOne({ where: { codigo: nuevoCodigo } });
      if (workflowExistente) {
        res.status(400).json({ error: 'Ya existe un workflow con este código' });
        return;
      }

      // Crear la copia
      const workflowDuplicado = await Workflow.create({
        codigo: nuevoCodigo,
        nombre: nuevoNombre,
        descripcion: `Copia de: ${workflow.descripcion || workflow.nombre}`,
        version: '1.0',
        categoria: workflow.categoria,
        subcategoria: workflow.subcategoria,
        tags: [...(workflow.tags || []), 'copia'],
        tipo: workflow.tipo,
        participantes: workflow.participantes,
        pasos: workflow.pasos,
        transiciones: workflow.transiciones,
        eventos: workflow.eventos,
        complejidad: workflow.complejidad,
        estimacionDuracionHoras: workflow.estimacionDuracionHoras,
        recursosRequeridos: workflow.recursosRequeridos,
        estado: 'borrador',
        publicado: false,
        utilizaciones: 0,
        fechaUltimaModificacion: new Date(),
        creadoPor: usuarioId
      });

      // Obtener el workflow duplicado con las relaciones
      const workflowCompleto = await Workflow.findByPk(workflowDuplicado.id, {
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ]
      });

      res.status(201).json(workflowCompleto);
    } catch (error) {
      console.error('Error al duplicar workflow:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // GET /api/workflows/estadisticas
  async obtenerEstadisticas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Estadísticas básicas
      const [
        totalWorkflows,
        activos,
        utilizaciones,
        porCategoria,
        porTipo
      ] = await Promise.all([
        Workflow.count(),
        Workflow.count({ where: { estado: 'activo' } }),
        Workflow.sum('utilizaciones'),
        Workflow.findAll({
          attributes: [
            'categoria',
            [Workflow.sequelize!.fn('COUNT', Workflow.sequelize!.col('id')), 'count']
          ],
          group: ['categoria']
        }),
        Workflow.findAll({
          attributes: [
            'tipo',
            [Workflow.sequelize!.fn('COUNT', Workflow.sequelize!.col('id')), 'count']
          ],
          group: ['tipo']
        })
      ]);

      // Tiempo promedio de duración
      const workflowsConDuracion = await Workflow.findAll({
        where: {
          estimacionDuracionHoras: { [Op.not]: undefined }
        } as any,
        attributes: ['estimacionDuracionHoras']
      });

      let tiempoPromedio = 0;
      if (workflowsConDuracion.length > 0) {
        const tiempoTotal = workflowsConDuracion.reduce((acc, w) => acc + (w.estimacionDuracionHoras || 0), 0);
        tiempoPromedio = tiempoTotal / workflowsConDuracion.length;
      }

      res.json({
        resumen: {
          totalWorkflows,
          activos,
          utilizaciones: utilizaciones || 0,
          tiempoPromedio: Math.round(tiempoPromedio * 10) / 10
        },
        distribucion: {
          porCategoria: porCategoria.map((item: any) => ({
            categoria: item.categoria,
            count: parseInt(item.dataValues.count)
          })),
          porTipo: porTipo.map((item: any) => ({
            tipo: item.tipo,
            count: parseInt(item.dataValues.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de workflows:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  },

  // GET /api/workflows/templates
  async obtenerTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { categoria } = req.query;

      const whereClause: any = {
        estado: 'activo',
        publicado: true
      };

      if (categoria) {
        whereClause.categoria = categoria;
      }

      const templates = await Workflow.findAll({
        where: whereClause,
        attributes: [
          'id', 
          'codigo', 
          'nombre', 
          'descripcion', 
          'categoria', 
          'tipo', 
          'complejidad',
          'estimacionDuracionHoras',
          'utilizaciones'
        ],
        include: [
          {
            model: Usuario,
            as: 'creador',
            attributes: ['id', 'nombreUsuario', 'nombre', 'apellido']
          }
        ],
        order: [['utilizaciones', 'DESC'], ['nombre', 'ASC']]
      });

      res.json(templates);
    } catch (error) {
      console.error('Error al obtener templates de workflows:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  }
};