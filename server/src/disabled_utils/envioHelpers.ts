import { DocumentoEnvio, Estado, EntidadDocumentacion, Entidad } from '../models';

// Función para crear envíos pendientes automáticamente cuando un documento pasa a estado VIGENTE
export const crearEnviosPendientes = async (
  documentacionId: number,
  recursoId?: number,
  entidadId?: number,
  userId?: number
) => {
  try {
    // Buscar el estado VIGENTE
    const estadoVigente = await Estado.findOne({
      where: { nombre: 'Vigente' }
    });

    if (!estadoVigente) {
      console.error('Estado VIGENTE no encontrado');
      return;
    }

    // Si es para un recurso específico
    if (recursoId) {
      // Buscar todas las entidades donde este documento debe ser enviado
      const entidadDocumentaciones = await EntidadDocumentacion.findAll({
        where: { documentacionId },
        include: [
          {
            model: Entidad,
            as: 'entidad',
            attributes: ['id', 'razonSocial']
          }
        ]
      });

      // Crear envíos pendientes para cada entidad
      for (const entidadDoc of entidadDocumentaciones) {
        await crearEnvioSiNoExiste(
          documentacionId,
          entidadDoc.entidadId,
          recursoId,
          userId
        );
      }
    }
    // Si es para una entidad específica
    else if (entidadId) {
      await crearEnvioSiNoExiste(
        documentacionId,
        entidadId,
        undefined,
        userId
      );
    }
    // Si es un documento universal, crear envíos para todas las entidades
    else {
      const entidadDocumentaciones = await EntidadDocumentacion.findAll({
        where: { documentacionId },
        include: [
          {
            model: Entidad,
            as: 'entidad',
            attributes: ['id', 'razonSocial']
          }
        ]
      });

      // Crear envíos pendientes para cada entidad
      for (const entidadDoc of entidadDocumentaciones) {
        await crearEnvioSiNoExiste(
          documentacionId,
          entidadDoc.entidadId,
          undefined,
          userId
        );
      }
    }

  } catch (error) {
    console.error('Error creando envíos pendientes:', error);
  }
};

// Función helper para crear un envío solo si no existe
const crearEnvioSiNoExiste = async (
  documentacionId: number,
  entidadId: number,
  recursoId?: number,
  userId?: number
) => {
  try {
    const whereClause: any = {
      documentacionId,
      entidadId
    };

    if (recursoId) {
      whereClause.recursoId = recursoId;
    }

    // Verificar si ya existe un envío para esta combinación
    const envioExistente = await DocumentoEnvio.findOne({
      where: whereClause
    });

    if (!envioExistente) {
      // Crear nuevo envío pendiente
      await DocumentoEnvio.create({
        documentacionId,
        entidadId,
        recursoId: recursoId || null,
        estadoEnvio: 'pendiente',
        creadoPor: userId,
        modificadoPor: userId
      });

      console.log(`Envío pendiente creado: Documento ${documentacionId} -> Entidad ${entidadId}${recursoId ? ` -> Recurso ${recursoId}` : ''}`);
    }
  } catch (error) {
    console.error('Error creando envío individual:', error);
  }
};