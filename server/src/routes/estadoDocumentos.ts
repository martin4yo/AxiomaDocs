import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/estado-documentos/ultima-actualizacion
// Obtener la fecha de última actualización de estados de documentos
router.get('/ultima-actualizacion', authenticateToken, async (req, res) => {
  try {
    // Buscar la última actualización de cualquier documento o recurso-documentación
    const [ultimaActualizacionDoc, ultimaActualizacionRD] = await Promise.all([
      prisma.documentacion.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      prisma.recursoDocumentacion.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ]);

    let ultimaActualizacion = new Date('2023-01-01'); // Fecha por defecto

    if (ultimaActualizacionDoc?.updatedAt) {
      ultimaActualizacion = new Date(Math.max(ultimaActualizacion.getTime(), ultimaActualizacionDoc.updatedAt.getTime()));
    }

    if (ultimaActualizacionRD?.updatedAt) {
      ultimaActualizacion = new Date(Math.max(ultimaActualizacion.getTime(), ultimaActualizacionRD.updatedAt.getTime()));
    }

    res.json({
      ultimaActualizacion: ultimaActualizacion.toISOString(),
      mensaje: 'Última actualización de estados de documentos'
    });

  } catch (error) {
    console.error('Error obteniendo última actualización:', error);
    res.status(500).json({
      message: 'Error obteniendo última actualización',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// POST /api/estado-documentos/actualizar
// Recalcular y actualizar estados de documentos
router.post('/actualizar', authenticateToken, async (req, res) => {
  try {
    // Obtener estados por defecto
    const estados = await prisma.estado.findMany({
      orderBy: { nivel: 'asc' }
    });

    if (estados.length === 0) {
      return res.status(400).json({ message: 'No hay estados configurados en el sistema' });
    }

    const estadoVigente = estados.find(e => e.nombre.toLowerCase().includes('vigente')) || estados[0];
    const estadoVencido = estados.find(e => e.nombre.toLowerCase().includes('vencido')) || estados[estados.length - 1];
    const estadoPorVencer = estados.find(e => e.nombre.toLowerCase().includes('por vencer')) || estados[1] || estados[0];

    const hoy = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(hoy.getDate() + 30);

    // Actualizar estados de RecursoDocumentacion
    const recursosDocumentacion = await prisma.recursoDocumentacion.findMany({
      include: {
        documentacion: true
      }
    });

    let actualizados = 0;

    for (const rd of recursosDocumentacion) {
      let nuevoEstadoId = estadoVigente.id;

      if (rd.fechaVencimiento) {
        if (rd.fechaVencimiento < hoy) {
          nuevoEstadoId = estadoVencido.id;
        } else if (rd.fechaVencimiento <= en30Dias) {
          nuevoEstadoId = estadoPorVencer.id;
        }
      }

      // Solo actualizar si el estado cambió
      if (rd.estadoId !== nuevoEstadoId) {
        await prisma.recursoDocumentacion.update({
          where: { id: rd.id },
          data: { estadoId: nuevoEstadoId }
        });
        actualizados++;
      }
    }

    // También actualizar EntidadDocumentacion si existe
    try {
      const entidadesDocumentacion = await prisma.entidadDocumentacion.findMany({
        include: {
          documentacion: true
        }
      });

      for (const ed of entidadesDocumentacion) {
        let nuevoEstadoId = estadoVigente.id;

        if (ed.fechaVencimiento) {
          if (ed.fechaVencimiento < hoy) {
            nuevoEstadoId = estadoVencido.id;
          } else if (ed.fechaVencimiento <= en30Dias) {
            nuevoEstadoId = estadoPorVencer.id;
          }
        }

        // Solo actualizar si el estado cambió
        if (ed.estadoId !== nuevoEstadoId) {
          await prisma.entidadDocumentacion.update({
            where: { id: ed.id },
            data: { estadoId: nuevoEstadoId }
          });
          actualizados++;
        }
      }
    } catch (error) {
      console.log('Advertencia: No se pudo actualizar EntidadDocumentacion (tabla puede no existir)');
    }

    res.json({
      message: 'Estados de documentos actualizados exitosamente',
      documentosActualizados: actualizados,
      fechaActualizacion: new Date().toISOString(),
      estadosUtilizados: {
        vigente: estadoVigente.nombre,
        porVencer: estadoPorVencer.nombre,
        vencido: estadoVencido.nombre
      }
    });

  } catch (error) {
    console.error('Error actualizando estados de documentos:', error);
    res.status(500).json({
      message: 'Error actualizando estados de documentos',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;