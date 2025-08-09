import { Documentacion } from '../types';

/**
 * Determina si un documento es universal
 * Un documento universal es aquel marcado como tal y no debe permitir
 * la edición de fechas en las asignaciones a recursos o entidades
 */
export const isDocumentoUniversal = (documentacion?: Documentacion): boolean => {
  if (!documentacion) return false;
  return documentacion.esUniversal === true;
};

/**
 * Obtiene las fechas que deben mostrarse para una asignación
 * Prioriza las fechas universales si existen, sino usa fechas específicas
 */
export const getFechasForDisplay = (
  documentacion?: Documentacion,
  fechasEspecificas?: {
    fechaEmision?: string;
    fechaTramitacion?: string;
    fechaVencimiento?: string;
  }
) => {
  const esUniversal = isDocumentoUniversal(documentacion);
  
  if (esUniversal && documentacion) {
    // Si es universal, usar las fechas del documento
    return {
      fechaEmision: documentacion.fechaEmision,
      fechaTramitacion: documentacion.fechaTramitacion,
      fechaVencimiento: documentacion.fechaVencimiento,
      esUniversal: true
    };
  }
  
  // Si no es universal, usar fechas específicas
  return {
    fechaEmision: fechasEspecificas?.fechaEmision || '',
    fechaTramitacion: fechasEspecificas?.fechaTramitacion || '',
    fechaVencimiento: fechasEspecificas?.fechaVencimiento || '',
    esUniversal: false
  };
};

/**
 * Calcula la fecha de vencimiento basada en fecha de emisión y días de vigencia
 */
export const calcularFechaVencimiento = (fechaEmision: string, diasVigencia: number): string => {
  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + diasVigencia);
  return fecha.toISOString().split('T')[0];
};

/**
 * Formatea una fecha para mostrar en formato español
 */
export const formatearFecha = (fecha?: string): string => {
  if (!fecha) return '';
  
  const date = new Date(fecha);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};