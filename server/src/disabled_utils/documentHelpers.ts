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
  
  // Si no es universal, usar fechas específicas y calcular vencimiento si es necesario
  let fechaVencimiento = fechasEspecificas?.fechaVencimiento || null;
  
  // Calcular fecha de vencimiento automáticamente si hay fecha de emisión pero no vencimiento
  if (fechasEspecificas?.fechaEmision && !fechaVencimiento && documentacion.diasVigencia) {
    fechaVencimiento = calcularFechaVencimiento(fechasEspecificas.fechaEmision, documentacion.diasVigencia);
  }
  
  return {
    fechaEmision: fechasEspecificas?.fechaEmision || null,
    fechaTramitacion: fechasEspecificas?.fechaTramitacion || null,
    fechaVencimiento: fechaVencimiento,
    esUniversal: false
  };
};

/**
 * Calcula la fecha de vencimiento basada en fecha de emisión y días de vigencia
 * Usa fecha local de Argentina para evitar problemas con UTC
 */
export const calcularFechaVencimiento = (fechaEmision: Date, diasVigencia: number): Date => {
  // Crear una nueva fecha en zona horaria local
  const fecha = new Date(fechaEmision.getTime());
  
  // Agregar los días de vigencia
  fecha.setDate(fecha.getDate() + diasVigencia);
  
  // Asegurar que se mantenga en zona horaria local
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
};

/**
 * Crea una fecha local sin conversión UTC
 */
export const crearFechaLocal = (year: number, month: number, day: number): Date => {
  return new Date(year, month, day);
};

/**
 * Convierte una string de fecha a Date local
 */
export const parseFechaLocal = (fechaString: string): Date => {
  const fecha = new Date(fechaString);
  // Crear nueva fecha usando componentes locales para evitar conversión UTC
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
};