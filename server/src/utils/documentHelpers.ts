import { Documentacion } from '../models';

/**
 * Determina si un documento es universal
 * Un documento universal es aquel marcado como tal y no debe permitir
 * la edición de fechas en las asignaciones a recursos o entidades
 */
export const isDocumentoUniversal = (documentacion: Documentacion): boolean => {
  return documentacion.esUniversal === true;
};

/**
 * Obtiene las fechas que deben usarse para una asignación
 * Prioriza las fechas universales si existen, sino permite fechas específicas
 */
export const getFechasForAsignacion = (
  documentacion: Documentacion,
  fechasEspecificas?: {
    fechaEmision?: Date;
    fechaTramitacion?: Date;
    fechaVencimiento?: Date;
  }
) => {
  const esUniversal = isDocumentoUniversal(documentacion);
  
  if (esUniversal) {
    // Si es universal, usar las fechas del documento
    return {
      fechaEmision: documentacion.fechaEmision,
      fechaTramitacion: documentacion.fechaTramitacion,
      fechaVencimiento: documentacion.fechaVencimiento,
      esUniversal: true
    };
  }
  
  // Si no es universal, usar fechas específicas si se proporcionan
  return {
    fechaEmision: fechasEspecificas?.fechaEmision || null,
    fechaTramitacion: fechasEspecificas?.fechaTramitacion || null,
    fechaVencimiento: fechasEspecificas?.fechaVencimiento || null,
    esUniversal: false
  };
};

/**
 * Calcula la fecha de vencimiento basada en fecha de emisión y días de vigencia
 */
export const calcularFechaVencimiento = (fechaEmision: Date, diasVigencia: number): Date => {
  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + diasVigencia);
  return fecha;
};