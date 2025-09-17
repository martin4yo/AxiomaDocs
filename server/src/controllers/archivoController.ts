import { Response } from 'express';
import { DocumentoArchivo, Documentacion, RecursoDocumentacion, EntidadDocumentacion } from '../models';
import { AuthRequest } from '../middleware/auth';
import { validateUploadedFile, deleteFile, getFileInfo } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

// Helper para determinar la siguiente versión de un archivo
const getNextVersion = async (filename: string, type: 'documentacion' | 'recurso-documentacion' | 'entidad-documentacion', referenceId: number) => {
  const whereClause: any = { filename };

  if (type === 'documentacion') {
    whereClause.documentacionId = referenceId;
  } else if (type === 'recurso-documentacion') {
    whereClause.recursoDocumentacionId = referenceId;
  } else if (type === 'entidad-documentacion') {
    whereClause.entidadDocumentacionId = referenceId;
  }

  const existingFiles = await DocumentoArchivo.findAll({
    where: whereClause,
    order: [['version', 'DESC']],
    limit: 1
  });

  return existingFiles.length > 0 ? existingFiles[0].version + 1 : 1;
};

// Upload archivos para documentación universal
export const uploadDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron archivos' });
    }

    // Verificar que la documentación existe
    const documentacion = await Documentacion.findByPk(id);
    if (!documentacion) {
      return res.status(404).json({ message: 'Documentación no encontrada' });
    }

    const archivosCreados = [];

    for (const file of files) {
      try {
        validateUploadedFile(file);

        // Obtener la siguiente versión
        const version = await getNextVersion(file.originalname, 'documentacion', Number(id));

        const archivo = await DocumentoArchivo.create({
          filename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          descripcion: req.body.descripcion || `Archivo ${file.originalname}`,
          version,
          documentacionId: Number(id),
          creadoPor: userId
        });

        archivosCreados.push(archivo);
      } catch (error) {
        // Si hay error, eliminar el archivo del disco
        deleteFile(file.path);
        console.error(`Error procesando archivo ${file.originalname}:`, error);
      }
    }

    if (archivosCreados.length === 0) {
      return res.status(400).json({ message: 'No se pudo procesar ningún archivo' });
    }

    res.status(201).json({
      message: `${archivosCreados.length} archivo(s) subido(s) correctamente`,
      archivos: archivosCreados
    });

  } catch (error) {
    console.error('Error subiendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Upload archivos para recurso-documentación
export const uploadRecursoDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron archivos' });
    }

    // Verificar que la asignación recurso-documentación existe
    const recursoDoc = await RecursoDocumentacion.findByPk(id);
    if (!recursoDoc) {
      return res.status(404).json({ message: 'Asignación recurso-documentación no encontrada' });
    }

    const archivosCreados = [];

    for (const file of files) {
      try {
        validateUploadedFile(file);

        const version = await getNextVersion(file.originalname, 'recurso-documentacion', Number(id));

        const archivo = await DocumentoArchivo.create({
          filename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          descripcion: req.body.descripcion || `Archivo ${file.originalname}`,
          version,
          recursoDocumentacionId: Number(id),
          creadoPor: userId
        });

        archivosCreados.push(archivo);
      } catch (error) {
        deleteFile(file.path);
        console.error(`Error procesando archivo ${file.originalname}:`, error);
      }
    }

    if (archivosCreados.length === 0) {
      return res.status(400).json({ message: 'No se pudo procesar ningún archivo' });
    }

    res.status(201).json({
      message: `${archivosCreados.length} archivo(s) subido(s) correctamente`,
      archivos: archivosCreados
    });

  } catch (error) {
    console.error('Error subiendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Upload archivos para entidad-documentación
export const uploadEntidadDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron archivos' });
    }

    // Verificar que la asignación entidad-documentación existe
    const entidadDoc = await EntidadDocumentacion.findByPk(id);
    if (!entidadDoc) {
      return res.status(404).json({ message: 'Asignación entidad-documentación no encontrada' });
    }

    const archivosCreados = [];

    for (const file of files) {
      try {
        validateUploadedFile(file);

        const version = await getNextVersion(file.originalname, 'entidad-documentacion', Number(id));

        const archivo = await DocumentoArchivo.create({
          filename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          descripcion: req.body.descripcion || `Archivo ${file.originalname}`,
          version,
          entidadDocumentacionId: Number(id),
          creadoPor: userId
        });

        archivosCreados.push(archivo);
      } catch (error) {
        deleteFile(file.path);
        console.error(`Error procesando archivo ${file.originalname}:`, error);
      }
    }

    if (archivosCreados.length === 0) {
      return res.status(400).json({ message: 'No se pudo procesar ningún archivo' });
    }

    res.status(201).json({
      message: `${archivosCreados.length} archivo(s) subido(s) correctamente`,
      archivos: archivosCreados
    });

  } catch (error) {
    console.error('Error subiendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener archivos por documentación
export const getDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const archivos = await DocumentoArchivo.findAll({
      where: { documentacionId: id },
      include: [
        {
          model: DocumentoArchivo.associations.creador.target,
          as: 'creador',
          attributes: ['nombre', 'apellido', 'username']
        }
      ],
      order: [['filename', 'ASC'], ['version', 'DESC']]
    });

    res.json({ data: archivos });
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener archivos por recurso-documentación
export const getRecursoDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const archivos = await DocumentoArchivo.findAll({
      where: { recursoDocumentacionId: id },
      include: [
        {
          model: DocumentoArchivo.associations.creador.target,
          as: 'creador',
          attributes: ['nombre', 'apellido', 'username']
        }
      ],
      order: [['filename', 'ASC'], ['version', 'DESC']]
    });

    res.json({ data: archivos });
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener archivos por entidad-documentación
export const getEntidadDocumentacionArchivos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const archivos = await DocumentoArchivo.findAll({
      where: { entidadDocumentacionId: id },
      include: [
        {
          model: DocumentoArchivo.associations.creador.target,
          as: 'creador',
          attributes: ['nombre', 'apellido', 'username']
        }
      ],
      order: [['filename', 'ASC'], ['version', 'DESC']]
    });

    res.json({ data: archivos });
  } catch (error) {
    console.error('Error obteniendo archivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Descargar archivo
export const downloadArchivo = async (req: AuthRequest, res: Response) => {
  try {
    const { archivoId } = req.params;

    const archivo = await DocumentoArchivo.findByPk(archivoId);
    if (!archivo) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    // Construir la ruta del archivo (absoluta desde el directorio del servidor)
    let filePath = path.join(__dirname, '../../uploads/');
    if (archivo.documentacionId) {
      filePath = path.join(filePath, `documentacion/${archivo.documentacionId}/${archivo.storedFilename}`);
    } else if (archivo.recursoDocumentacionId) {
      filePath = path.join(filePath, `recurso-documentacion/${archivo.recursoDocumentacionId}/${archivo.storedFilename}`);
    } else if (archivo.entidadDocumentacionId) {
      filePath = path.join(filePath, `entidad-documentacion/${archivo.entidadDocumentacionId}/${archivo.storedFilename}`);
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error('Archivo no encontrado en:', filePath);
      return res.status(404).json({ message: 'Archivo físico no encontrado' });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.filename}"`);
    res.setHeader('Content-Type', archivo.mimeType);

    // Enviar archivo
    res.sendFile(filePath);

  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar descripción de archivo
export const updateArchivo = async (req: AuthRequest, res: Response) => {
  try {
    const { archivoId } = req.params;
    const { descripcion } = req.body;

    const archivo = await DocumentoArchivo.findByPk(archivoId);
    if (!archivo) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    await archivo.update({ descripcion });

    res.json({ message: 'Descripción actualizada correctamente', archivo });
  } catch (error) {
    console.error('Error actualizando archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar archivo
export const deleteArchivo = async (req: AuthRequest, res: Response) => {
  try {
    const { archivoId } = req.params;

    const archivo = await DocumentoArchivo.findByPk(archivoId);
    if (!archivo) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    // Construir la ruta del archivo para eliminarlo del disco
    let filePath = 'uploads/';
    if (archivo.documentacionId) {
      filePath += `documentacion/${archivo.documentacionId}/${archivo.storedFilename}`;
    } else if (archivo.recursoDocumentacionId) {
      filePath += `recurso-documentacion/${archivo.recursoDocumentacionId}/${archivo.storedFilename}`;
    } else if (archivo.entidadDocumentacionId) {
      filePath += `entidad-documentacion/${archivo.entidadDocumentacionId}/${archivo.storedFilename}`;
    }

    // Eliminar archivo del disco
    deleteFile(filePath);

    // Eliminar registro de la base de datos
    await archivo.destroy();

    res.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};