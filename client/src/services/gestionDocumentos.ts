import api from './api';

export interface AsignacionDocumento {
  id: string;
  tipo: 'recurso' | 'entidad';
  asignacionId: number;
  documento: {
    id: number;
    codigo: string;
    descripcion: string;
    diasVigencia: number;
    diasAnticipacion: number;
    esUniversal: boolean;
  };
  asignadoA: {
    id: number;
    nombre: string;
    codigo: string;
    tipo: 'recurso' | 'entidad';
  };
  entidadDestino?: {
    id: number;
    nombre: string;
    urlPlataforma?: string;
    emailContacto?: string;
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
  estadoSeguimiento: 'pendiente' | 'enviado' | 'entregado';
  enviarPorMail?: boolean;
  inhabilitante?: boolean;
  creador?: {
    nombre: string;
    apellido: string;
  };
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface AsignacionesResponse {
  asignaciones: AsignacionDocumento[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface EstadisticasGestion {
  totalAsignaciones: number;
  proximosVencer: number;
  pendientesEnvio: number;
  enviados: number;
  porEstado?: { [key: string]: number };
}

export interface FiltrosGestion {
  page?: number;
  limit?: number;
  search?: string;
  estadoId?: number;
  entidadId?: number;
  recursoId?: number;
  documentacionId?: number;
  diasVencimiento?: number;
  estadoSeguimiento?: string;
}

export interface ActualizarAsignacion {
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  estadoId?: number;
  estadoSeguimiento?: string;
}

export const gestionDocumentosService = {
  // Obtener todas las asignaciones con filtros
  getAsignaciones: async (filtros: FiltrosGestion = {}): Promise<AsignacionesResponse> => {
    const params = new URLSearchParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/gestion-documentos?${params.toString()}`);
    return response.data;
  },

  // Actualizar una asignación (fechas, estado)
  updateAsignacion: async (
    tipo: 'recurso' | 'entidad',
    id: number,
    datos: ActualizarAsignacion
  ): Promise<any> => {
    const response = await api.put(`/gestion-documentos/${tipo}/${id}`, datos);
    return response.data;
  },

  // Obtener estadísticas para el dashboard
  getEstadisticas: async (): Promise<EstadisticasGestion> => {
    const response = await api.get('/gestion-documentos/estadisticas');
    return response.data;
  }
};