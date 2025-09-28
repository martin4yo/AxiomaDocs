import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

// Helper para determinar la siguiente versión de un archivo
const getNextVersion = async (nombreArchivo: string, type: 'documentacion' | 'recurso-documentacion' | 'entidad-documentacion', referenceId: number) => {
  const whereClause: any = { nombreArchivo };

  if (type === 'documentacion') {
    whereClause.documentacionId = referenceId;
  } else if (type === 'recurso-documentacion') {
    whereClause.recursoDocumentacionId = referenceId;
  } else if (type === 'entidad-documentacion') {
    whereClause.entidadDocumentacionId = referenceId;
  }

  const existingFiles = await prisma.documentoArchivo.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  return existingFiles.length + 1;
};

// Get archivos para documentación universal
export const getDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que la documentación existe
    const documentacion = await prisma.documentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    const archivos = await prisma.documentoArchivo.findMany({
      where: {
        documentacionId: parseInt(id)
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: [
        { nombreArchivo: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Mapear los campos para compatibilidad con el frontend
    const archivosMapeados = archivos.map(archivo => ({
      id: archivo.id,
      filename: archivo.nombreArchivo,
      storedFilename: archivo.rutaArchivo,
      mimeType: archivo.tipoMime,
      size: archivo.tamano,
      descripcion: archivo.descripcion,
      version: archivo.version,
      documentacionId: archivo.documentacionId,
      creadoPor: archivo.createdBy,
      createdAt: archivo.createdAt.toISOString(),
      updatedAt: archivo.updatedAt.toISOString(),
      creador: archivo.createdByUser ? {
        nombre: archivo.createdByUser.nombre,
        apellido: archivo.createdByUser.apellido
      } : undefined
    }));

    res.json({ data: archivosMapeados });
  } catch (error) {
    console.error('Error obteniendo archivos de documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Get archivos para recurso-documentación
export const getRecursoDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que recurso-documentacion existe
    const recursoDocumentacion = await prisma.recursoDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!recursoDocumentacion) {
      return res.status(404).json({ message: 'Recurso-Documentación no encontrado' });
    }

    const archivos = await prisma.documentoArchivo.findMany({
      where: {
        recursoDocumentacionId: parseInt(id)
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: [
        { nombreArchivo: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Mapear los campos para compatibilidad con el frontend
    const archivosMapeados = archivos.map(archivo => ({
      id: archivo.id,
      filename: archivo.nombreArchivo,
      storedFilename: archivo.rutaArchivo,
      mimeType: archivo.tipoMime,
      size: archivo.tamano,
      descripcion: archivo.descripcion,
      version: archivo.version,
      recursoDocumentacionId: archivo.recursoDocumentacionId,
      creadoPor: archivo.createdBy,
      createdAt: archivo.createdAt.toISOString(),
      updatedAt: archivo.updatedAt.toISOString(),
      creador: archivo.createdByUser ? {
        nombre: archivo.createdByUser.nombre,
        apellido: archivo.createdByUser.apellido
      } : undefined
    }));

    res.json({ data: archivosMapeados });
  } catch (error) {
    console.error('Error obteniendo archivos de recurso-documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Get archivos para entidad-documentación
export const getEntidadDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que entidad-documentacion existe
    const entidadDocumentacion = await prisma.entidadDocumentacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entidadDocumentacion) {
      return res.status(404).json({ message: 'Entidad-Documentación no encontrada' });
    }

    const archivos = await prisma.documentoArchivo.findMany({
      where: {
        entidadDocumentacionId: parseInt(id)
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: [
        { nombreArchivo: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Mapear los campos para compatibilidad con el frontend
    const archivosMapeados = archivos.map(archivo => ({
      id: archivo.id,
      filename: archivo.nombreArchivo,
      storedFilename: archivo.rutaArchivo,
      mimeType: archivo.tipoMime,
      size: archivo.tamano,
      descripcion: archivo.descripcion,
      version: archivo.version,
      entidadDocumentacionId: archivo.entidadDocumentacionId,
      creadoPor: archivo.createdBy,
      createdAt: archivo.createdAt.toISOString(),
      updatedAt: archivo.updatedAt.toISOString(),
      creador: archivo.createdByUser ? {
        nombre: archivo.createdByUser.nombre,
        apellido: archivo.createdByUser.apellido
      } : undefined
    }));

    res.json({ data: archivosMapeados });
  } catch (error) {
    console.error('Error obteniendo archivos de entidad-documentación:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Upload archivos para documentación, recurso-documentación o entidad-documentación
export const uploadArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron archivos' });
    }

    // Determinar el tipo basado en la URL
    const path = req.path;
    let tipo: 'documentacion' | 'recurso-documentacion' | 'entidad-documentacion';
    let entidadExiste = false;

    if (path.includes('/documentacion/')) {
      tipo = 'documentacion';
      const documentacion = await prisma.documentacion.findUnique({
        where: { id: parseInt(id) }
      });
      entidadExiste = !!documentacion;
    } else if (path.includes('/recurso-documentacion/')) {
      tipo = 'recurso-documentacion';
      const recursoDocumentacion = await prisma.recursoDocumentacion.findUnique({
        where: { id: parseInt(id) }
      });
      entidadExiste = !!recursoDocumentacion;
    } else if (path.includes('/entidad-documentacion/')) {
      tipo = 'entidad-documentacion';
      const entidadDocumentacion = await prisma.entidadDocumentacion.findUnique({
        where: { id: parseInt(id) }
      });
      entidadExiste = !!entidadDocumentacion;
    } else {
      return res.status(400).json({ message: 'Tipo de entidad no válido' });
    }

    if (!entidadExiste) {
      return res.status(404).json({ message: `${tipo} no encontrado(a)` });
    }

    const archivosCreados = [];

    for (const file of files) {
      try {
        // Determinar la siguiente versión para este archivo
        const version = await getNextVersion(file.originalname, tipo, parseInt(id));

        // Preparar datos del archivo
        const archivoData: any = {
          nombreArchivo: file.originalname,
          rutaArchivo: file.filename, // Nombre único generado por multer
          tipoMime: file.mimetype,
          tamano: file.size,
          version: version,
          activo: true,
          createdBy: userId,
          updatedBy: userId
        };

        // Asignar el ID correspondiente según el tipo
        if (tipo === 'documentacion') {
          archivoData.documentacionId = parseInt(id);
        } else if (tipo === 'recurso-documentacion') {
          archivoData.recursoDocumentacionId = parseInt(id);
        } else if (tipo === 'entidad-documentacion') {
          archivoData.entidadDocumentacionId = parseInt(id);
        }

        // Crear registro en base de datos
        const archivo = await prisma.documentoArchivo.create({
          data: archivoData
        });

        archivosCreados.push(archivo);
      } catch (error) {
        console.error(`Error guardando archivo ${file.originalname}:`, error);
        // Eliminar archivo físico si falla la base de datos
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    if (archivosCreados.length === 0) {
      return res.status(500).json({ message: 'No se pudo guardar ningún archivo' });
    }

    res.status(201).json({
      message: `${archivosCreados.length} archivo(s) subido(s) correctamente`,
      data: archivosCreados
    });
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Delete archivo
export const deleteArchivo = async (req: AuthRequest, res: Response) => {
  try {
    const { archivoId } = req.params;
    const userId = req.user!.id;

    const archivo = await prisma.documentoArchivo.findUnique({
      where: { id: parseInt(archivoId) }
    });

    if (!archivo) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    // Eliminar archivo físico si existe
    let uploadDir = 'uploads/';
    if (archivo.documentacionId) {
      uploadDir += `documentacion/${archivo.documentacionId}`;
    } else if (archivo.recursoDocumentacionId) {
      uploadDir += `recurso-documentacion/${archivo.recursoDocumentacionId}`;
    } else if (archivo.entidadDocumentacionId) {
      uploadDir += `entidad-documentacion/${archivo.entidadDocumentacionId}`;
    }

    const fullPath = path.join(__dirname, '../../', uploadDir, archivo.rutaArchivo);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Eliminar registro de base de datos
    await prisma.documentoArchivo.delete({
      where: { id: parseInt(archivoId) }
    });

    res.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Download archivo
export const downloadArchivo = async (req: AuthRequest, res: Response) => {
  try {
    const { archivoId } = req.params;

    const archivo = await prisma.documentoArchivo.findUnique({
      where: { id: parseInt(archivoId) }
    });

    if (!archivo) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    let uploadDir = 'uploads/';
    if (archivo.documentacionId) {
      uploadDir += `documentacion/${archivo.documentacionId}`;
    } else if (archivo.recursoDocumentacionId) {
      uploadDir += `recurso-documentacion/${archivo.recursoDocumentacionId}`;
    } else if (archivo.entidadDocumentacionId) {
      uploadDir += `entidad-documentacion/${archivo.entidadDocumentacionId}`;
    }

    const fullPath = path.join(__dirname, '../../', uploadDir, archivo.rutaArchivo);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Archivo físico no encontrado' });
    }

    res.download(fullPath, archivo.nombreArchivo);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};