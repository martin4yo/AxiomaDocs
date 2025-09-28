import { Request, Response } from 'express';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import Documentacion from '../models/Documentacion';
import Entidad from '../models/Entidad';
import Recurso from '../models/Recurso';
import DocumentoEnvio from '../models/DocumentoEnvio';
import DocumentoEvento from '../models/DocumentoEvento';
import DocumentoArchivo from '../models/DocumentoArchivo';
import RecursoDocumentacion from '../models/RecursoDocumentacion';
import EntidadDocumentacion from '../models/EntidadDocumentacion';

export const getEstadisticasSeguimiento = async (req: Request, res: Response) => {
  try {
    const totalDocumentos = await Documentacion.count();
    const totalEntidades = await Entidad.count();

    const enviosPendientes = await DocumentoEnvio.count({
      where: { estadoEnvio: 'pendiente' }
    });

    const enviosEnviados = await DocumentoEnvio.count({
      where: { estadoEnvio: 'enviado' }
    });

    const enviosRecibidos = await DocumentoEnvio.count({
      where: { estadoEnvio: 'recibido' }
    });

    res.json({
      totalDocumentos,
      totalEntidades,
      pendientes: enviosPendientes,
      enviados: enviosEnviados,
      recibidos: enviosRecibidos
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de seguimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getSeguimientoPorDocumento = async (req: Request, res: Response) => {
  try {
    const { search, estadoEnvio, entidadId } = req.query;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { codigo: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } }
      ];
    }

    const envioWhere: any = {};
    if (estadoEnvio) {
      envioWhere.estadoEnvio = estadoEnvio;
    }
    if (entidadId) {
      envioWhere.entidadId = entidadId;
    }

    const documentos = await Documentacion.findAll({
      where: whereClause,
      include: [
        {
          model: DocumentoEnvio,
          as: 'envios',
          required: false,
          where: envioWhere,
          include: [
            {
              model: Entidad,
              as: 'entidad',
              attributes: ['id', 'razonSocial', 'cuit', 'urlPlataformaDocumentacion', 'telefono']
            },
            {
              model: Recurso,
              as: 'recurso',
              attributes: ['id', 'nombre', 'apellido'],
              required: false
            }
          ]
        }
      ],
      order: [['codigo', 'ASC']]
    });

    const documentosFormateados = await Promise.all(documentos.map(async (doc) => {
      const envios = doc.envios || [];

      const entidadesFormateadas = await Promise.all(envios.map(async (envio: any) => {
        // Contar adjuntos
        let totalAdjuntos = 0;

        // Adjuntos específicos del recurso si existe
        if (envio.recursoId) {
          const recursoDoc = await RecursoDocumentacion.findOne({
            where: { documentacionId: doc.id, recursoId: envio.recursoId }
          });
          if (recursoDoc) {
            totalAdjuntos += await DocumentoArchivo.count({
              where: { recursoDocumentacionId: recursoDoc.id }
            });
          }
        }

        // Adjuntos específicos de la entidad
        const entidadDoc = await EntidadDocumentacion.findOne({
          where: { documentacionId: doc.id, entidadId: envio.entidad.id }
        });
        if (entidadDoc) {
          totalAdjuntos += await DocumentoArchivo.count({
            where: { entidadDocumentacionId: entidadDoc.id }
          });
        }

        // Adjuntos generales del documento
        totalAdjuntos += await DocumentoArchivo.count({
          where: {
            documentacionId: doc.id,
            recursoDocumentacionId: null,
            entidadDocumentacionId: null
          }
        });

        // Contar eventos
        let totalEventos = 0;
        if (envio.recursoId) {
          const recursoDoc = await RecursoDocumentacion.findOne({
            where: { documentacionId: doc.id, recursoId: envio.recursoId }
          });
          if (recursoDoc) {
            totalEventos += await DocumentoEvento.count({
              where: { recursoDocumentacionId: recursoDoc.id }
            });
          }
        }
        if (entidadDoc) {
          totalEventos += await DocumentoEvento.count({
            where: { entidadDocumentacionId: entidadDoc.id }
          });
        }
        totalEventos += await DocumentoEvento.count({
          where: { documentacionId: doc.id }
        });

        return {
          entidadId: envio.entidad.id,
          entidadNombre: envio.entidad.razonSocial,
          entidadCuit: envio.entidad.cuit,
          estadoEnvio: envio.estadoEnvio,
          fechaEnvio: envio.fechaEnvio,
          destino: envio.destino,
          observaciones: envio.observaciones,
          tieneAdjuntos: totalAdjuntos > 0,
          totalEventos,
          urlPlataforma: envio.entidad.urlPlataformaDocumentacion,
          emailContacto: envio.entidad.telefono,
          recursoId: envio.recursoId,
          recursoNombre: envio.recurso ? `${envio.recurso.apellido}, ${envio.recurso.nombre}` : null
        };
      }));

      return {
        id: doc.id,
        codigo: doc.codigo,
        descripcion: doc.descripcion,
        totalEntidades: envios.length,
        pendientes: envios.filter((e: any) => e.estadoEnvio === 'pendiente').length,
        enviados: envios.filter((e: any) => e.estadoEnvio === 'enviado').length,
        entidades: entidadesFormateadas
      };
    }));

    res.json({ documentos: documentosFormateados });

  } catch (error) {
    console.error('Error obteniendo seguimiento por documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getSeguimientoPorEntidad = async (req: Request, res: Response) => {
  try {
    const { search, estadoEnvio, documentoId } = req.query;

    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { razonSocial: { [Op.like]: `%${search}%` } },
        { cuit: { [Op.like]: `%${search}%` } }
      ];
    }

    const envioWhere: any = {};
    if (estadoEnvio) {
      envioWhere.estadoEnvio = estadoEnvio;
    }
    if (documentoId) {
      envioWhere.documentacionId = documentoId;
    }

    const entidades = await Entidad.findAll({
      where: whereClause,
      include: [
        {
          model: DocumentoEnvio,
          as: 'envios',
          required: false,
          where: envioWhere,
          include: [
            {
              model: Documentacion,
              as: 'documentacion',
              attributes: ['id', 'codigo', 'descripcion']
            },
            {
              model: Recurso,
              as: 'recurso',
              attributes: ['id', 'nombre', 'apellido'],
              required: false
            }
          ]
        }
      ],
      order: [['razonSocial', 'ASC']]
    });

    const entidadesFormateadas = await Promise.all(entidades.map(async (entidad) => {
      const envios = entidad.envios || [];

      const documentosFormateados = await Promise.all(envios.map(async (envio: any) => {
        // Contar adjuntos
        let totalAdjuntos = 0;

        // Adjuntos específicos del recurso si existe
        if (envio.recursoId) {
          const recursoDoc = await RecursoDocumentacion.findOne({
            where: { documentacionId: envio.documentacion.id, recursoId: envio.recursoId }
          });
          if (recursoDoc) {
            totalAdjuntos += await DocumentoArchivo.count({
              where: { recursoDocumentacionId: recursoDoc.id }
            });
          }
        }

        // Adjuntos específicos de la entidad
        const entidadDoc = await EntidadDocumentacion.findOne({
          where: { documentacionId: envio.documentacion.id, entidadId: entidad.id }
        });
        let entidadDocumentacionId = null;
        if (entidadDoc) {
          entidadDocumentacionId = entidadDoc.id;
          totalAdjuntos += await DocumentoArchivo.count({
            where: { entidadDocumentacionId: entidadDoc.id }
          });
        }

        // Adjuntos generales del documento
        totalAdjuntos += await DocumentoArchivo.count({
          where: {
            documentacionId: envio.documentacion.id,
            recursoDocumentacionId: null,
            entidadDocumentacionId: null
          }
        });

        // Contar eventos
        let totalEventos = 0;
        if (envio.recursoId) {
          const recursoDoc = await RecursoDocumentacion.findOne({
            where: { documentacionId: envio.documentacion.id, recursoId: envio.recursoId }
          });
          if (recursoDoc) {
            totalEventos += await DocumentoEvento.count({
              where: { recursoDocumentacionId: recursoDoc.id }
            });
          }
        }
        if (entidadDoc) {
          totalEventos += await DocumentoEvento.count({
            where: { entidadDocumentacionId: entidadDoc.id }
          });
        }
        totalEventos += await DocumentoEvento.count({
          where: { documentacionId: envio.documentacion.id }
        });

        return {
          id: envio.documentacion.id,
          codigo: envio.documentacion.codigo,
          descripcion: envio.documentacion.descripcion,
          estadoEnvio: envio.estadoEnvio,
          fechaEnvio: envio.fechaEnvio,
          destino: envio.destino,
          observaciones: envio.observaciones,
          recursoId: envio.recursoId,
          recursoNombre: envio.recurso ? `${envio.recurso.apellido}, ${envio.recurso.nombre}` : null,
          entidadDocumentacionId,
          tieneAdjuntos: totalAdjuntos > 0,
          totalEventos
        };
      }));

      return {
        id: entidad.id,
        nombre: entidad.razonSocial,
        cuit: entidad.cuit,
        totalDocumentos: envios.length,
        pendientes: envios.filter((e: any) => e.estadoEnvio === 'pendiente').length,
        enviados: envios.filter((e: any) => e.estadoEnvio === 'enviado').length,
        urlPlataforma: entidad.urlPlataformaDocumentacion,
        emailContacto: entidad.telefono,
        documentos: documentosFormateados
      };
    }));

    res.json({ entidades: entidadesFormateadas });

  } catch (error) {
    console.error('Error obteniendo seguimiento por entidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const cambiarEstadoEnvio = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { estadoEnvio, destino, observaciones, recursoId } = req.body;

    // Buscar o crear el envío
    let envio = await DocumentoEnvio.findOne({
      where: {
        documentacionId: documentoId,
        entidadId: entidadId,
        ...(recursoId && { recursoId })
      }
    });

    if (!envio) {
      // Crear nuevo envío si no existe
      envio = await DocumentoEnvio.create({
        documentacionId: documentoId,
        entidadId: entidadId,
        recursoId: recursoId || null,
        estadoEnvio: estadoEnvio,
        destino: destino || null,
        observaciones: observaciones || null,
        fechaEnvio: estadoEnvio === 'enviado' ? new Date() : null
      });
    } else {
      // Actualizar envío existente
      await envio.update({
        estadoEnvio,
        destino: destino || envio.destino,
        observaciones: observaciones || envio.observaciones,
        fechaEnvio: estadoEnvio === 'enviado' ? new Date() : envio.fechaEnvio
      });
    }

    res.json({
      message: 'Estado de envío actualizado correctamente',
      envio
    });

  } catch (error) {
    console.error('Error cambiando estado de envío:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getEventosDocumento = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { recursoId } = req.query;

    const whereClause: any = {};

    if (recursoId) {
      // Buscar eventos del recurso-documento
      const recursoDoc = await RecursoDocumentacion.findOne({
        where: { documentacionId: documentoId, recursoId: recursoId }
      });
      if (recursoDoc) {
        whereClause.recursoDocumentacionId = recursoDoc.id;
      }
    } else {
      // Buscar eventos de la entidad-documento
      const entidadDoc = await EntidadDocumentacion.findOne({
        where: { documentacionId: documentoId, entidadId: entidadId }
      });
      if (entidadDoc) {
        whereClause.entidadDocumentacionId = entidadDoc.id;
      }
    }

    // También incluir eventos generales del documento
    const eventos = await DocumentoEvento.findAll({
      where: {
        [Op.or]: [
          whereClause,
          { documentacionId: documentoId }
        ]
      },
      order: [['fecha', 'DESC'], ['hora', 'DESC']]
    });

    const eventosFormateados = eventos.map(evento => ({
      id: evento.id,
      tipoEvento: evento.tipoEvento,
      fecha: evento.fecha,
      hora: evento.hora,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      observaciones: evento.observaciones,
      creador: {
        nombre: 'Sistema', // TODO: implementar relación con Usuario
        apellido: ''
      },
      fechaCreacion: evento.createdAt
    }));

    res.json({ eventos: eventosFormateados });

  } catch (error) {
    console.error('Error obteniendo eventos del documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getAdjuntosDocumento = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { recursoId } = req.query;

    console.log('=== GET ADJUNTOS DEBUG ===');
    console.log('documentoId:', documentoId);
    console.log('entidadId:', entidadId);
    console.log('recursoId:', recursoId);

    const whereClause: any = {
      documentacionId: documentoId
    };

    if (recursoId) {
      // Buscar adjuntos del recurso-documento
      const recursoDoc = await RecursoDocumentacion.findOne({
        where: { documentacionId: documentoId, recursoId: recursoId }
      });
      console.log('recursoDoc encontrado:', recursoDoc?.id);
      if (recursoDoc) {
        whereClause.recursoDocumentacionId = recursoDoc.id;
      }
    } else {
      // Buscar adjuntos de la entidad-documento
      const entidadDoc = await EntidadDocumentacion.findOne({
        where: { documentacionId: documentoId, entidadId: entidadId }
      });
      console.log('entidadDoc encontrado:', entidadDoc?.id);
      if (entidadDoc) {
        whereClause.entidadDocumentacionId = entidadDoc.id;
      }
    }

    console.log('whereClause final:', whereClause);

    const adjuntos = await DocumentoArchivo.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    console.log('adjuntos encontrados:', adjuntos.length);

    const adjuntosFormateados = adjuntos.map(adjunto => ({
      id: adjunto.id,
      nombreArchivo: adjunto.filename,
      tipoArchivo: adjunto.mimeType,
      tamaño: adjunto.size,
      descripcion: adjunto.descripcion,
      version: adjunto.version,
      fechaSubida: adjunto.createdAt,
      subidoPor: {
        nombre: 'Sistema', // TODO: implementar relación con Usuario
        apellido: ''
      }
    }));

    console.log('adjuntosFormateados:', adjuntosFormateados);
    console.log('===========================');

    res.json({ adjuntos: adjuntosFormateados });

  } catch (error) {
    console.error('Error obteniendo adjuntos del documento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const crearEvento = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { tipoEvento, titulo, descripcion, observaciones, recursoId } = req.body;

    let recursoDocumentacionId = null;
    let entidadDocumentacionId = null;

    if (recursoId) {
      const recursoDoc = await RecursoDocumentacion.findOne({
        where: { documentacionId: documentoId, recursoId: recursoId }
      });
      if (recursoDoc) {
        recursoDocumentacionId = recursoDoc.id;
      }
    } else {
      const entidadDoc = await EntidadDocumentacion.findOne({
        where: { documentacionId: documentoId, entidadId: entidadId }
      });
      if (entidadDoc) {
        entidadDocumentacionId = entidadDoc.id;
      }
    }

    const ahora = new Date();
    const evento = await DocumentoEvento.create({
      documentacionId: documentoId,
      recursoDocumentacionId,
      entidadDocumentacionId,
      tipoEvento,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().split(' ')[0],
      titulo,
      descripcion,
      observaciones: observaciones || null
    });

    res.json({
      message: 'Evento creado correctamente',
      evento: {
        id: evento.id,
        tipoEvento: evento.tipoEvento,
        fecha: evento.fecha,
        hora: evento.hora,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        observaciones: evento.observaciones,
        creador: {
          nombre: 'Sistema',
          apellido: ''
        },
        fechaCreacion: evento.createdAt
      }
    });

  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const descargarAdjunto = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId, adjuntoId } = req.params;

    console.log('=== DESCARGA ADJUNTO DEBUG ===');
    console.log('documentoId:', documentoId);
    console.log('entidadId:', entidadId);
    console.log('adjuntoId:', adjuntoId);

    // Buscar el adjunto específico
    const adjunto = await DocumentoArchivo.findOne({
      where: {
        id: adjuntoId,
        documentacionId: documentoId
      }
    });

    if (!adjunto) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    console.log('Adjunto encontrado:', adjunto.filename);

    // Para demostración, crearemos el archivo temporalmente
    // En producción, aquí buscarías el archivo en el almacenamiento real
    const uploadsPath = path.join(__dirname, '../../uploads');

    // Asegurar que existe el directorio de uploads
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const filePath = path.join(uploadsPath, adjunto.storedFilename);

    // Si el archivo no existe físicamente, crear uno de demostración
    if (!fs.existsSync(filePath)) {
      const contenidoDemo = `Archivo de demostración: ${adjunto.filename}
Documento: ${documentoId}
Entidad: ${entidadId}
Tamaño: ${adjunto.size} bytes
Descripción: ${adjunto.descripcion}
Fecha de creación: ${adjunto.createdAt}

Este es un archivo de demostración generado para mostrar la funcionalidad de descarga.`;

      fs.writeFileSync(filePath, contenidoDemo);
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${adjunto.filename}"`);
    res.setHeader('Content-Type', adjunto.mimeType);
    res.setHeader('Content-Length', adjunto.size);

    // Enviar el archivo
    res.download(filePath, adjunto.filename, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error descargando el archivo' });
        }
      }
    });

  } catch (error) {
    console.error('Error descargando adjunto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const descargarAdjuntosMasivo = async (req: Request, res: Response) => {
  try {
    const { documentoId, entidadId } = req.params;
    const { recursoId } = req.query;

    console.log('=== DESCARGA MASIVA DEBUG ===');
    console.log('documentoId:', documentoId);
    console.log('entidadId:', entidadId);
    console.log('recursoId:', recursoId);

    // Obtener los adjuntos usando la misma lógica que getAdjuntosDocumento
    const whereClause: any = {
      documentacionId: documentoId
    };

    if (recursoId) {
      const recursoDoc = await RecursoDocumentacion.findOne({
        where: { documentacionId: documentoId, recursoId: recursoId }
      });
      if (recursoDoc) {
        whereClause.recursoDocumentacionId = recursoDoc.id;
      }
    } else {
      const entidadDoc = await EntidadDocumentacion.findOne({
        where: { documentacionId: documentoId, entidadId: entidadId }
      });
      if (entidadDoc) {
        whereClause.entidadDocumentacionId = entidadDoc.id;
      }
    }

    const adjuntos = await DocumentoArchivo.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    if (adjuntos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron adjuntos para descargar' });
    }

    console.log(`Encontrados ${adjuntos.length} adjuntos para comprimir`);

    // Crear nombre del ZIP
    const zipName = `adjuntos_doc${documentoId}_ent${entidadId}_${new Date().getTime()}.zip`;

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    // Crear el archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compresión
    });

    // Manejar errores del archivo
    archive.on('error', (err) => {
      console.error('Error creando ZIP:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error comprimiendo archivos' });
      }
    });

    // Pipe del archive al response
    archive.pipe(res);

    // Directorio de uploads
    const uploadsPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    // Agregar cada archivo al ZIP
    for (const adjunto of adjuntos) {
      const filePath = path.join(uploadsPath, adjunto.storedFilename);

      // Si el archivo no existe físicamente, crear uno de demostración
      if (!fs.existsSync(filePath)) {
        const contenidoDemo = `Archivo de demostración: ${adjunto.filename}
Documento: ${documentoId}
Entidad: ${entidadId}
Tamaño: ${adjunto.size} bytes
Descripción: ${adjunto.descripcion}
Fecha de creación: ${adjunto.createdAt}

Este es un archivo de demostración generado para mostrar la funcionalidad de descarga masiva.`;

        fs.writeFileSync(filePath, contenidoDemo);
      }

      // Agregar archivo al ZIP
      archive.file(filePath, { name: adjunto.filename });
      console.log(`Agregado al ZIP: ${adjunto.filename}`);
    }

    // Finalizar el archivo
    archive.finalize();

  } catch (error) {
    console.error('Error descargando adjuntos masivo:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
};