import api from './api';

export interface FiltroDocumentacionPorEstado {
  estadoId?: number;
  entidadId?: number;
}

export interface FiltroRecursosPorEntidad {
  entidadId?: number;
  soloActivos?: boolean;
}

export interface FiltroDocumentosProximosVencer {
  dias?: number;
  entidadId?: number;
}

export interface ReporteDocumentacionPorEstado {
  reporte: {
    recurso: {
      id: number;
      codigo: string;
      nombre: string;
      cuil: string;
      activo: boolean;
      entidades: string;
    };
    documentos: Array<{
      id: number;
      documento: {
        codigo: string;
        descripcion: string;
        esObligatorio: boolean;
        diasVigencia: number;
      };
      fechaEmision?: string;
      fechaTramitacion?: string;
      fechaVencimiento?: string;
      estado: {
        id: number;
        nombre: string;
        color: string;
        nivel: number;
      };
      observaciones?: string;
    }>;
  }[];
  estadisticas: {
    totalRecursos: number;
    recursosConDocumentos: number;
    totalDocumentos: number;
    porEstado: Array<{
      estado: {
        id: number;
        nombre: string;
        color: string;
        nivel: number;
      };
      cantidad: number;
      recursosAfectados: number;
    }>;
  };
  filtros: FiltroDocumentacionPorEstado;
}

export interface ReporteRecursosPorEntidad {
  reporte: {
    entidad: {
      id: number;
      razonSocial: string;
      cuit: string;
      localidad?: string;
    };
    recursos: Array<{
      recurso: {
        id: number;
        codigo: string;
        nombre: string;
        cuil: string;
        activo: boolean;
        fechaInicio?: string;
        fechaFin?: string;
      };
      estadisticasDocumentacion: {
        total: number;
        vigentes: number;
        vencidos: number;
        porVencer: number;
        enTramite: number;
        estadoCritico?: {
          id: number;
          nombre: string;
          color: string;
          nivel: number;
        };
      };
      documentos: Array<{
        documento: {
          id: number;
          codigo: string;
          descripcion: string;
          esObligatorio: boolean;
        };
        fechaEmision?: string;
        fechaTramitacion?: string;
        fechaVencimiento?: string;
        estado?: {
          id: number;
          nombre: string;
          color: string;
          nivel: number;
        };
        observaciones?: string;
      }>;
    }>;
    estadisticas: {
      totalRecursos: number;
      recursosActivos: number;
      totalDocumentos: number;
      documentosVencidos: number;
      documentosPorVencer: number;
    };
  }[];
  estadisticasGenerales: {
    totalEntidades: number;
    entidadesConRecursos: number;
    totalRecursos: number;
    totalDocumentos: number;
  };
  filtros: FiltroRecursosPorEntidad;
}

export interface ReporteDocumentosProximosVencer {
  reporte: Array<{
    id: number;
    recurso: {
      id: number;
      codigo: string;
      nombre: string;
      cuil: string;
      entidades: string;
    };
    documento: {
      codigo: string;
      descripcion: string;
      esObligatorio: boolean;
      diasVigencia: number;
      diasAnticipacion: number;
    };
    fechaEmision?: string;
    fechaTramitacion?: string;
    fechaVencimiento?: string;
    diasHastaVencimiento?: number;
    estado?: {
      id: number;
      nombre: string;
      color: string;
      nivel: number;
    };
    observaciones?: string;
    prioridad: 'Alta' | 'Normal';
  }>;
  estadisticas: {
    totalDocumentos: number;
    documentosObligatorios: number;
    recursosAfectados: number;
    entidadesAfectadas: number;
    porDias: {
      proximos7Dias: number;
      proximos15Dias: number;
      proximos30Dias: number;
    };
  };
  filtros: FiltroDocumentosProximosVencer;
}

export const reportesService = {
  // Reporte de documentación por estado
  getDocumentacionPorEstado: async (filtros: FiltroDocumentacionPorEstado = {}): Promise<ReporteDocumentacionPorEstado> => {
    const params = new URLSearchParams();
    
    if (filtros.estadoId) params.append('estadoId', filtros.estadoId.toString());
    if (filtros.entidadId) params.append('entidadId', filtros.entidadId.toString());

    const response = await api.get(`/reportes/documentacion-por-estado?${params.toString()}`);
    return response.data;
  },

  // Reporte de recursos por entidad
  getRecursosPorEntidad: async (filtros: FiltroRecursosPorEntidad = {}): Promise<ReporteRecursosPorEntidad> => {
    const params = new URLSearchParams();
    
    if (filtros.entidadId) params.append('entidadId', filtros.entidadId.toString());
    if (filtros.soloActivos !== undefined) params.append('soloActivos', filtros.soloActivos.toString());

    const response = await api.get(`/reportes/recursos-por-entidad?${params.toString()}`);
    return response.data;
  },

  // Reporte de documentos próximos a vencer
  getDocumentosProximosVencer: async (filtros: FiltroDocumentosProximosVencer = {}): Promise<ReporteDocumentosProximosVencer> => {
    const params = new URLSearchParams();
    
    if (filtros.dias) params.append('dias', filtros.dias.toString());
    if (filtros.entidadId) params.append('entidadId', filtros.entidadId.toString());

    const response = await api.get(`/reportes/documentos-proximos-vencer?${params.toString()}`);
    return response.data;
  }
};