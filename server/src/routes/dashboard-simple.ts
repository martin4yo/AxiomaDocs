import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Endpoint para obtener estadísticas básicas del dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Obtener conteos básicos
    const totalRecursos = await prisma.recurso.count();
    const recursosActivos = await prisma.recurso.count({
      where: { activo: true }
    });

    const totalDocumentacion = await prisma.documentacion.count();
    const totalEntidades = await prisma.entidad.count();

    // Estadísticas de documentos de recursos
    const documentosRecurso = await prisma.recursoDocumentacion.count();

    // Estadísticas de documentos de entidades
    const documentosEntidad = await prisma.entidadDocumentacion.count();

    // Documentos universales
    const documentosUniversales = await prisma.documentacion.count({
      where: { esUniversal: true }
    });

    res.json({
      recursos: {
        total: totalRecursos,
        activos: recursosActivos,
        inactivos: totalRecursos - recursosActivos
      },
      documentacion: {
        total: totalDocumentacion,
        universales: documentosUniversales,
        especificos: totalDocumentacion - documentosUniversales
      },
      entidades: {
        total: totalEntidades
      },
      asignaciones: {
        recursos: documentosRecurso,
        entidades: documentosEntidad,
        total: documentosRecurso + documentosEntidad
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;