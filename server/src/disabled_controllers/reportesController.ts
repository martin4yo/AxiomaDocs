import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../models/database';
import { Recurso, RecursoDocumentacion, Documentacion, Estado, Entidad, EntidadRecurso } from '../models';

// Reporte: Documentación por estado agrupada por recurso
export const getDocumentacionPorEstado = async (req: Request, res: Response) => {
  try {
    const { estadoId, entidadId } = req.query;
    
    const whereClause: any = {};
    const includeEntidad: any = {
      model: EntidadRecurso,
      as: 'entidadRecurso',
      required: false,
      include: [{
        model: Entidad,
        as: 'entidad',
        attributes: ['id', 'razonSocial']
      }]
    };

    // Si se especifica una entidad, filtrar por ella
    if (entidadId) {
      includeEntidad.where = { entidadId };
    }

    const recursos = await Recurso.findAll({
      where: whereClause,
      include: [
        includeEntidad,
        {
          model: RecursoDocumentacion,
          as: 'recursoDocumentacion',
          required: false,
          where: estadoId ? { estadoId } : undefined,
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
              attributes: ['id', 'codigo', 'descripcion', 'esObligatorio', 'diasVigencia']
            },
            {
              model: Estado,
              as: 'estado',
              attributes: ['id', 'nombre', 'color', 'nivel']
            }
          ]
        }
      ],
      order: [
        ['apellido', 'ASC'],
        ['nombre', 'ASC'],
        [{ model: RecursoDocumentacion, as: 'recursoDocumentacion' }, 'fechaVencimiento', 'ASC']
      ]
    });

    // Procesar los datos para el reporte
    const reporte = recursos.map(recurso => {
      const entidades = recurso.entidadRecurso?.map((er: any) => er.entidad?.razonSocial).filter(Boolean) || [];
      
      return {
        recurso: {
          id: recurso.id,
          codigo: recurso.codigo,
          nombre: `${recurso.apellido}, ${recurso.nombre}`,
          cuil: recurso.cuil,
          activo: !recurso.fechaBaja,
          entidades: entidades.join(', ')
        },
        documentos: recurso.recursoDocumentacion?.map((rd: any) => ({
          id: rd.id,
          documento: {
            codigo: rd.documentacion?.codigo,
            descripcion: rd.documentacion?.descripcion,
            esObligatorio: rd.documentacion?.esObligatorio,
            diasVigencia: rd.documentacion?.diasVigencia
          },
          fechaEmision: rd.fechaEmision,
          fechaTramitacion: rd.fechaTramitacion,
          fechaVencimiento: rd.fechaVencimiento,
          estado: {
            id: rd.estado?.id,
            nombre: rd.estado?.nombre,
            color: rd.estado?.color,
            nivel: rd.estado?.nivel
          },
          observaciones: rd.observaciones
        })) || []
      };
    });

    // Estadísticas del reporte
    const totalRecursos = recursos.length;
    const recursosConDocumentos = recursos.filter(r => r.recursoDocumentacion && r.recursoDocumentacion.length > 0).length;
    const totalDocumentos = recursos.reduce((acc, r) => acc + (r.recursoDocumentacion?.length || 0), 0);

    // Agrupar por estado
    const estadisticasPorEstado: any = {};
    recursos.forEach(recurso => {
      recurso.recursoDocumentacion?.forEach((rd: any) => {
        if (rd.estado) {
          if (!estadisticasPorEstado[rd.estado.nombre]) {
            estadisticasPorEstado[rd.estado.nombre] = {
              estado: rd.estado,
              cantidad: 0,
              recursos: new Set()
            };
          }
          estadisticasPorEstado[rd.estado.nombre].cantidad++;
          estadisticasPorEstado[rd.estado.nombre].recursos.add(recurso.id);
        }
      });
    });

    // Convertir Set a count
    Object.keys(estadisticasPorEstado).forEach(key => {
      estadisticasPorEstado[key].recursosAfectados = estadisticasPorEstado[key].recursos.size;
      delete estadisticasPorEstado[key].recursos;
    });

    res.json({
      reporte,
      estadisticas: {
        totalRecursos,
        recursosConDocumentos,
        totalDocumentos,
        porEstado: Object.values(estadisticasPorEstado)
      },
      filtros: {
        estadoId: estadoId || null,
        entidadId: entidadId || null
      }
    });

  } catch (error) {
    console.error('Error generando reporte de documentación por estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Reporte: Recursos por entidad con estado de documentación
export const getRecursosPorEntidad = async (req: Request, res: Response) => {
  try {
    const { entidadId, soloActivos } = req.query;
    
    const whereClauseEntidad: any = {};
    const whereClauseRecurso: any = {};

    if (entidadId) {
      whereClauseEntidad.id = entidadId;
    }

    if (soloActivos === 'true') {
      whereClauseRecurso.fechaBaja = null;
    }

    const entidades = await Entidad.findAll({
      where: whereClauseEntidad,
      include: [
        {
          model: EntidadRecurso,
          as: 'entidadRecurso',
          required: false,
          where: { activo: true },
          include: [
            {
              model: Recurso,
              as: 'recurso',
              where: whereClauseRecurso,
              include: [
                {
                  model: RecursoDocumentacion,
                  as: 'recursoDocumentacion',
                  required: false,
                  include: [
                    {
                      model: Documentacion,
                      as: 'documentacion',
                      attributes: ['id', 'codigo', 'descripcion', 'esObligatorio']
                    },
                    {
                      model: Estado,
                      as: 'estado',
                      attributes: ['id', 'nombre', 'color', 'nivel']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      order: [
        ['razonSocial', 'ASC'],
        [{ model: EntidadRecurso, as: 'entidadRecurso' }, { model: Recurso, as: 'recurso' }, 'apellido', 'ASC'],
        [{ model: EntidadRecurso, as: 'entidadRecurso' }, { model: Recurso, as: 'recurso' }, 'nombre', 'ASC']
      ]
    });

    const reporte = entidades.map(entidad => {
      const recursos = entidad.entidadRecurso?.map((er: any) => {
        const recurso = er.recurso;
        if (!recurso) return null;

        // Calcular estadísticas de documentación del recurso
        const documentos = recurso.recursoDocumentacion || [];
        const totalDocumentos = documentos.length;
        const documentosVigentes = documentos.filter((rd: any) => rd.estado?.nombre === 'Vigente').length;
        const documentosVencidos = documentos.filter((rd: any) => rd.estado?.nombre === 'Vencido').length;
        const documentosPorVencer = documentos.filter((rd: any) => rd.estado?.nombre === 'Por Vencer').length;
        const documentosEnTramite = documentos.filter((rd: any) => rd.estado?.nombre === 'En Trámite').length;

        // Estado crítico (mayor nivel)
        const estadoCritico = documentos.reduce((maxEstado: any, doc: any) => {
          if (doc.estado && (!maxEstado || doc.estado.nivel > maxEstado.nivel)) {
            return doc.estado;
          }
          return maxEstado;
        }, null as any);

        return {
          recurso: {
            id: recurso.id,
            codigo: recurso.codigo,
            nombre: `${recurso.apellido}, ${recurso.nombre}`,
            cuil: recurso.cuil,
            activo: !recurso.fechaBaja,
            fechaInicio: er.fechaInicio,
            fechaFin: er.fechaFin
          },
          estadisticasDocumentacion: {
            total: totalDocumentos,
            vigentes: documentosVigentes,
            vencidos: documentosVencidos,
            porVencer: documentosPorVencer,
            enTramite: documentosEnTramite,
            estadoCritico
          },
          documentos: documentos.map((rd: any) => ({
            documento: rd.documentacion,
            fechaEmision: rd.fechaEmision,
            fechaTramitacion: rd.fechaTramitacion,
            fechaVencimiento: rd.fechaVencimiento,
            estado: rd.estado,
            observaciones: rd.observaciones
          }))
        };
      }).filter(Boolean) || [];

      return {
        entidad: {
          id: entidad.id,
          razonSocial: entidad.razonSocial,
          cuit: entidad.cuit,
          localidad: entidad.localidad
        },
        recursos,
        estadisticas: {
          totalRecursos: recursos.length,
          recursosActivos: recursos.filter((r: any) => r.recurso.activo).length,
          totalDocumentos: recursos.reduce((acc: any, r: any) => acc + r.estadisticasDocumentacion.total, 0),
          documentosVencidos: recursos.reduce((acc: any, r: any) => acc + r.estadisticasDocumentacion.vencidos, 0),
          documentosPorVencer: recursos.reduce((acc: any, r: any) => acc + r.estadisticasDocumentacion.porVencer, 0)
        }
      };
    });

    const estadisticasGenerales = {
      totalEntidades: entidades.length,
      entidadesConRecursos: entidades.filter(e => e.entidadRecurso && e.entidadRecurso.length > 0).length,
      totalRecursos: reporte.reduce((acc, e) => acc + e.recursos.length, 0),
      totalDocumentos: reporte.reduce((acc, e) => acc + e.estadisticas.totalDocumentos, 0)
    };

    res.json({
      reporte,
      estadisticasGenerales,
      filtros: {
        entidadId: entidadId || null,
        soloActivos: soloActivos === 'true'
      }
    });

  } catch (error) {
    console.error('Error generando reporte de recursos por entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Reporte: Documentos próximos a vencer
export const getDocumentosProximosAVencer = async (req: Request, res: Response) => {
  try {
    const { dias = '30', entidadId } = req.query;
    const diasAnticipacion = parseInt(dias as string);
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const whereClause: any = {
      fechaVencimiento: {
        [Op.lte]: fechaLimite,
        [Op.gte]: new Date() // Solo documentos que no han vencido aún
      }
    };

    let includeEntidad: any = {
      model: Recurso,
      as: 'recurso',
      include: [{
        model: EntidadRecurso,
        as: 'entidadRecurso',
        required: false,
        include: [{
          model: Entidad,
          as: 'entidad',
          attributes: ['id', 'razonSocial']
        }]
      }]
    };

    // Si se especifica entidad, filtrar
    if (entidadId) {
      includeEntidad.include[0].where = { entidadId };
      includeEntidad.include[0].required = true;
    }

    const documentosProximos = await RecursoDocumentacion.findAll({
      where: whereClause,
      include: [
        includeEntidad,
        {
          model: Documentacion,
          as: 'documentacion',
          attributes: ['id', 'codigo', 'descripcion', 'esObligatorio', 'diasVigencia', 'diasAnticipacion']
        },
        {
          model: Estado,
          as: 'estado',
          attributes: ['id', 'nombre', 'color', 'nivel']
        }
      ],
      order: [
        ['fechaVencimiento', 'ASC']
      ]
    });

    const reporte = documentosProximos.map(rd => {
      const recurso = rd.recurso;
      const entidades = recurso?.entidadRecurso?.map((er: any) => er.entidad?.razonSocial).filter(Boolean) || [];
      
      // Calcular días hasta vencimiento
      const diasHastaVencimiento = rd.fechaVencimiento ? 
        Math.ceil((new Date(rd.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
        null;

      return {
        id: rd.id,
        recurso: {
          id: recurso?.id,
          codigo: recurso?.codigo,
          nombre: `${recurso?.apellido}, ${recurso?.nombre}`,
          cuil: recurso?.cuil,
          entidades: entidades.join(', ')
        },
        documento: {
          codigo: rd.documentacion?.codigo,
          descripcion: rd.documentacion?.descripcion,
          esObligatorio: rd.documentacion?.esObligatorio,
          diasVigencia: rd.documentacion?.diasVigencia,
          diasAnticipacion: rd.documentacion?.diasAnticipacion
        },
        fechaEmision: rd.fechaEmision,
        fechaTramitacion: rd.fechaTramitacion,
        fechaVencimiento: rd.fechaVencimiento,
        diasHastaVencimiento,
        estado: {
          id: rd.estado?.id,
          nombre: rd.estado?.nombre,
          color: rd.estado?.color,
          nivel: rd.estado?.nivel
        },
        observaciones: rd.observaciones,
        prioridad: rd.documentacion?.esObligatorio ? 'Alta' : 'Normal'
      };
    });

    const estadisticas = {
      totalDocumentos: reporte.length,
      documentosObligatorios: reporte.filter(r => r.documento.esObligatorio).length,
      recursosAfectados: [...new Set(reporte.map(r => r.recurso.id))].length,
      entidadesAfectadas: [...new Set(reporte.flatMap(r => r.recurso.entidades.split(', ')).filter(Boolean))].length,
      porDias: {
        proximos7Dias: reporte.filter(r => r.diasHastaVencimiento !== null && r.diasHastaVencimiento <= 7).length,
        proximos15Dias: reporte.filter(r => r.diasHastaVencimiento !== null && r.diasHastaVencimiento <= 15).length,
        proximos30Dias: reporte.filter(r => r.diasHastaVencimiento !== null && r.diasHastaVencimiento <= 30).length
      }
    };

    res.json({
      reporte,
      estadisticas,
      filtros: {
        diasAnticipacion,
        entidadId: entidadId || null
      }
    });

  } catch (error) {
    console.error('Error generando reporte de documentos próximos a vencer:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};