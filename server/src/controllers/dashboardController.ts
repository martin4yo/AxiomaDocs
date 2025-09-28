import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total recursos
    const totalRecursos = await prisma.recurso.count();

    // Recursos activos (sin fecha de baja)
    const recursosActivos = await prisma.recurso.count({
      where: {
        fechaBaja: null
      }
    });

    // Total documentación
    const totalDocumentacion = await prisma.documentacion.count();

    // Total entidades
    const totalEntidades = await prisma.entidad.count();

    // Documentos por vencer (próximos 30 días) - RecursoDocumentacion + EntidadDocumentacion + Universal
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const documentosPorVencerRecurso = await prisma.recursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite
        }
      }
    });

    // Documentos de entidades por vencer
    console.log('🔍 Ejecutando consulta EntidadDocumentacion por vencer...');
    const documentosPorVencerEntidad = await prisma.entidadDocumentacion.count({
      where: {
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite,
          not: null
        }
      }
    });
    console.log('✅ EntidadDocumentacion por vencer:', documentosPorVencerEntidad);

    // Documentos universales por vencer
    console.log('🔍 Ejecutando consulta Documentacion universal por vencer...');
    const documentosPorVencerUniversal = await prisma.documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite
        }
      }
    });
    console.log('✅ Documentacion universal por vencer:', documentosPorVencerUniversal);

    const documentosPorVencer = documentosPorVencerRecurso + documentosPorVencerEntidad + documentosPorVencerUniversal;

    // Documentos vencidos (RecursoDocumentacion + EntidadDocumentacion + Universal)
    console.log('🔍 Ejecutando consulta RecursoDocumentacion vencidos...');
    const documentosVencidosRecurso = await prisma.recursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          lt: new Date()
        }
      }
    });
    console.log('✅ RecursoDocumentacion vencidos:', documentosVencidosRecurso);

    // Documentos vencidos de entidades
    console.log('🔍 Ejecutando consulta EntidadDocumentacion vencidos...');
    const documentosVencidosEntidad = await prisma.entidadDocumentacion.count({
      where: {
        fechaVencimiento: {
          lt: new Date(),
          not: null
        }
      }
    });
    console.log('✅ EntidadDocumentacion vencidos:', documentosVencidosEntidad);

    // Documentos universales vencidos
    console.log('🔍 Ejecutando consulta Documentacion universal vencidos...');
    const documentosVencidosUniversal = await prisma.documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          lt: new Date()
        }
      }
    });
    console.log('✅ Documentacion universal vencidos:', documentosVencidosUniversal);

    const documentosVencidos = documentosVencidosRecurso + documentosVencidosEntidad + documentosVencidosUniversal;

    console.log('📊 Dashboard Stats Debug:', {
      documentosVencidosRecurso,
      documentosVencidosEntidad,
      documentosVencidosUniversal,
      totalVencidos: documentosVencidos,
      documentosPorVencerRecurso,
      documentosPorVencerEntidad,
      documentosPorVencerUniversal,
      totalPorVencer: documentosPorVencer
    });

    res.json({
      totalRecursos,
      recursosActivos,
      totalDocumentacion,
      totalEntidades,
      documentosPorVencer,
      documentosVencidos
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getDocumentosPorVencer = async (req: AuthRequest, res: Response) => {
  try {
    const { dias = 30 } = req.query;

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + Number(dias));

    // Documentos de recursos por vencer
    const documentosRecurso = await prisma.recursoDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite
        }
      },
      include: {
        recurso: {
          select: { id: true, apellido: true, nombre: true }
        },
        documentacion: {
          select: { id: true, descripcion: true }
        },
        estado: {
          select: { id: true, nombre: true, color: true }
        }
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 15
    });

    // Documentos de entidades por vencer
    const documentosEntidad = await prisma.entidadDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite,
          not: null
        }
      },
      include: {
        entidad: {
          select: { id: true, nombre: true }
        },
        documentacion: {
          select: { id: true, descripcion: true }
        }
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 10
    });

    // Documentos universales por vencer
    const documentosUniversal = await prisma.documentacion.findMany({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite
        }
      },
      include: {
        estado: {
          select: { id: true, nombre: true, color: true }
        }
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 5
    });

    // Formatear documentos de recursos
    const documentosRecursoFormatted = documentosRecurso.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: doc.recurso,
      documentacion: doc.documentacion,
      estado: doc.estado,
      tipo: 'recurso'
    }));

    // Formatear documentos de entidades
    const documentosEntidadFormatted = documentosEntidad.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'ENTIDAD', nombre: doc.entidad?.nombre || 'Sin entidad' },
      documentacion: doc.documentacion,
      estado: { id: 0, nombre: 'ENTIDAD', color: '#f59e0b' }, // Color amarillo para entidades
      tipo: 'entidad'
    }));

    // Formatear documentos universales
    const documentosUniversalFormatted = documentosUniversal.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'UNIVERSAL', nombre: doc.nombre },
      documentacion: { descripcion: doc.descripcion },
      estado: doc.estado,
      tipo: 'universal'
    }));

    // Combinar todos los documentos
    const todosDocumentos = [...documentosRecursoFormatted, ...documentosEntidadFormatted, ...documentosUniversalFormatted];

    // Ordenar por fecha de vencimiento y limitar a 20
    todosDocumentos.sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime());
    const documentosLimitados = todosDocumentos.slice(0, 20);

    // Calcular días para vencer
    const documentosConDias = documentosLimitados.map(doc => {
      const hoy = new Date();
      const fechaVenc = new Date(doc.fechaVencimiento!);
      const diffTime = fechaVenc.getTime() - hoy.getTime();
      const diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...doc,
        diasParaVencer
      };
    });

    res.json(documentosConDias);
  } catch (error) {
    console.error('Error obteniendo documentos por vencer:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getDocumentosVencidos = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    console.log('📊 Obteniendo documentos vencidos...');

    // Documentos de recursos vencidos
    const documentosRecurso = await prisma.recursoDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          lt: new Date()
        }
      },
      include: {
        recurso: {
          select: { id: true, apellido: true, nombre: true }
        },
        documentacion: {
          select: { id: true, descripcion: true }
        },
        estado: {
          select: { id: true, nombre: true, color: true }
        }
      },
      orderBy: { fechaVencimiento: 'desc' },
      take: 10
    });

    // Documentos de entidades vencidos
    const documentosEntidad = await prisma.entidadDocumentacion.findMany({
      where: {
        fechaVencimiento: {
          lt: new Date(),
          not: null
        }
      },
      include: {
        entidad: {
          select: { id: true, nombre: true, contacto: true }
        },
        documentacion: {
          select: { id: true, descripcion: true }
        }
      },
      orderBy: { fechaVencimiento: 'desc' },
      take: 10
    });

    // Documentos universales vencidos
    const documentosUniversal = await prisma.documentacion.findMany({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          lt: new Date()
        }
      },
      include: {
        estado: {
          select: { id: true, nombre: true, color: true }
        }
      },
      orderBy: { fechaVencimiento: 'desc' },
      take: 5
    });

    // Formatear documentos de recursos
    const documentosRecursoFormatted = documentosRecurso.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: doc.recurso,
      documentacion: doc.documentacion,
      estado: doc.estado,
      tipo: 'recurso'
    }));

    // Formatear documentos de entidades
    const documentosEntidadFormatted = documentosEntidad.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'ENTIDAD', nombre: doc.entidad?.nombre || 'Sin entidad' },
      documentacion: doc.documentacion,
      estado: { id: 0, nombre: 'VENCIDO', color: '#dc2626' }, // Color rojo para vencidos
      tipo: 'entidad'
    }));

    // Formatear documentos universales
    const documentosUniversalFormatted = documentosUniversal.map(doc => ({
      id: doc.id,
      fechaVencimiento: doc.fechaVencimiento,
      recurso: { apellido: 'UNIVERSAL', nombre: doc.nombre },
      documentacion: { descripcion: doc.descripcion },
      estado: doc.estado,
      tipo: 'universal'
    }));

    // Combinar todos los documentos
    const todosDocumentos = [...documentosRecursoFormatted, ...documentosEntidadFormatted, ...documentosUniversalFormatted];

    // Ordenar por fecha de vencimiento (más recientes primero) y limitar
    todosDocumentos.sort((a, b) => new Date(b.fechaVencimiento!).getTime() - new Date(a.fechaVencimiento!).getTime());
    const documentosLimitados = todosDocumentos.slice(0, Number(limit));

    // Calcular días vencidos
    const documentosConDias = documentosLimitados.map(doc => {
      const hoy = new Date();
      const fechaVenc = new Date(doc.fechaVencimiento!);
      const diffTime = hoy.getTime() - fechaVenc.getTime();
      const diasVencidos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...doc,
        diasVencidos
      };
    });

    res.json(documentosConDias);
  } catch (error) {
    console.error('Error obteniendo documentos vencidos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getActividadReciente = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    // Por ahora retornamos actividad simulada
    // En una implementación real, tendríamos una tabla de auditoria/logs
    const actividades = [
      {
        id: 1,
        tipo: 'recurso',
        descripcion: 'Nuevo recurso creado',
        fecha: new Date().toISOString(),
        usuario: 'Sistema'
      },
      {
        id: 2,
        tipo: 'documento',
        descripcion: 'Documento asignado',
        fecha: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
        usuario: 'Sistema'
      }
    ];

    res.json(actividades.slice(0, Number(limit)));
  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};