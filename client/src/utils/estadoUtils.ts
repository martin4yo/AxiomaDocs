import { Estado, RecursoDocumentacion } from '../types';

/**
 * Calcula el estado de mayor nivel de una lista de documentos de recurso
 * @param recursoDocumentacion Lista de documentos del recurso
 * @returns El estado con mayor nivel, o undefined si no hay documentos con estado
 */
export const getHighestLevelEstado = (recursoDocumentacion?: RecursoDocumentacion[]): Estado | undefined => {
  if (!recursoDocumentacion || recursoDocumentacion.length === 0) {
    return undefined;
  }

  // Filtrar documentos que tengan estado
  const documentosConEstado = recursoDocumentacion.filter(doc => doc.estado);
  
  if (documentosConEstado.length === 0) {
    return undefined;
  }

  // Encontrar el estado con mayor nivel
  return documentosConEstado.reduce((maxEstado, doc) => {
    if (!maxEstado || (doc.estado && doc.estado.nivel > maxEstado.nivel)) {
      return doc.estado!;
    }
    return maxEstado;
  }, documentosConEstado[0].estado!);
};

/**
 * Calcula el estado de mayor nivel de una entidad basado en los recursos asignados
 * @param entidadRecursos Lista de recursos de la entidad
 * @returns El estado con mayor nivel, o undefined si no hay documentos con estado
 */
export const getHighestLevelEstadoFromEntidad = (entidadRecursos?: any[]): Estado | undefined => {
  if (!entidadRecursos || entidadRecursos.length === 0) {
    return undefined;
  }

  let maxEstado: Estado | undefined = undefined;

  // Recorrer todos los recursos de la entidad
  for (const entidadRecurso of entidadRecursos) {
    if (entidadRecurso.recurso && entidadRecurso.recurso.recursoDocumentacion) {
      const estadoRecurso = getHighestLevelEstado(entidadRecurso.recurso.recursoDocumentacion);
      if (estadoRecurso && (!maxEstado || estadoRecurso.nivel > maxEstado.nivel)) {
        maxEstado = estadoRecurso;
      }
    }
  }

  return maxEstado;
};

/**
 * Obtiene los próximos vencimientos de documentos
 * @param recursoDocumentacion Lista de documentos del recurso
 * @param diasAnticipacion Número de días de anticipación para considerar "próximo a vencer"
 * @returns Lista de documentos próximos a vencer
 */
export const getProximosVencimientos = (
  recursoDocumentacion?: RecursoDocumentacion[],
  diasAnticipacion: number = 30
): RecursoDocumentacion[] => {
  if (!recursoDocumentacion || recursoDocumentacion.length === 0) {
    return [];
  }

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

  return recursoDocumentacion.filter(doc => {
    if (!doc.fechaVencimiento) return false;
    
    const fechaVencimiento = new Date(doc.fechaVencimiento);
    const hoy = new Date();
    
    return fechaVencimiento >= hoy && fechaVencimiento <= fechaLimite;
  });
};