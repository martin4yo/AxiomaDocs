import api from './api';

export interface Intercambio {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  workflowId: number;
  workflowVersion: string;
  entidadOrigenId: number;
  entidadDestinoId: number;
  estado: 'iniciado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  fechaInicio: string;
  fechaEstimadaFin: string;
  fechaFinReal?: string;
  progreso: number;
  pasoActualId?: string;
  contexto: any;
  parametrosIniciales: any;
  participantesAsignados: any[];
  documentosRequeridos?: any[];
  documentosSubidos?: any[];
  observaciones?: string;
  responsableId: number;
  supervisorId?: number;
  creadoPor: number;
  modificadoPor?: number;
  createdAt: string;
  updatedAt: string;
  
  // Relaciones
  workflow?: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    categoria: string;
  };
  entidadOrigen?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  entidadDestino?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  responsable?: {
    id: number;
    nombreUsuario: string;
    nombre: string;
    apellido: string;
  };
  supervisor?: {
    id: number;
    nombreUsuario: string;
    nombre: string;
    apellido: string;
  };
}

export interface IntercambioCreacion {
  nombre: string;
  descripcion?: string;
  workflowId: number;
  entidadOrigenId: number;
  entidadDestinoId: number;
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  fechaEstimadaFin?: string;
  responsableId: number;
  supervisorId?: number;
  parametrosIniciales?: any;
  documentosRequeridos?: any[];
  observaciones?: string;
}

export interface IntercambioActualizacion {
  nombre?: string;
  descripcion?: string;
  estado?: 'iniciado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  fechaEstimadaFin?: string;
  progreso?: number;
  pasoActualId?: string;
  responsableId?: number;
  supervisorId?: number;
  observaciones?: string;
}

export interface IntercambioFiltros {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
  prioridad?: string;
  entidadOrigenId?: number;
  entidadDestinoId?: number;
  workflowId?: number;
}

export interface IntercambioEstadisticas {
  resumen: {
    totalIntercambios: number;
    enProgreso: number;
    completados: number;
    conRetrasos: number;
    tiempoPromedioComplecion: number;
    eficienciaPromedio: number;
  };
  distribucion: {
    porPrioridad: Array<{
      prioridad: string;
      count: number;
    }>;
    porEntidad: Array<{
      entidadId: number;
      entidadNombre: string;
      count: number;
    }>;
  };
  periodo: string;
}

export interface PaginatedResponse<T> {
  intercambios: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const intercambioService = {
  // Listar intercambios con filtros y paginación
  async listar(filtros: IntercambioFiltros = {}): Promise<PaginatedResponse<Intercambio>> {
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/intercambios?${params.toString()}`);
    return response.data;
  },

  // Obtener intercambio por ID
  async obtenerPorId(id: number): Promise<Intercambio> {
    const response = await api.get(`/intercambios/${id}`);
    return response.data;
  },

  // Crear nuevo intercambio
  async crear(data: IntercambioCreacion): Promise<Intercambio> {
    const response = await api.post('/intercambios', data);
    return response.data;
  },

  // Actualizar intercambio
  async actualizar(id: number, data: IntercambioActualizacion): Promise<Intercambio> {
    const response = await api.put(`/intercambios/${id}`, data);
    return response.data;
  },

  // Eliminar intercambio
  async eliminar(id: number): Promise<void> {
    await api.delete(`/intercambios/${id}`);
  },

  // Obtener estadísticas
  async obtenerEstadisticas(periodo: string = '30d'): Promise<IntercambioEstadisticas> {
    const response = await api.get(`/intercambios/estadisticas?periodo=${periodo}`);
    return response.data;
  },

  // Cambiar estado del intercambio
  async cambiarEstado(id: number, estado: string, observaciones?: string): Promise<Intercambio> {
    return this.actualizar(id, { estado: estado as any, observaciones });
  },

  // Actualizar progreso
  async actualizarProgreso(id: number, progreso: number): Promise<Intercambio> {
    return this.actualizar(id, { progreso });
  },

  // Asignar responsable
  async asignarResponsable(id: number, responsableId: number): Promise<Intercambio> {
    return this.actualizar(id, { responsableId });
  },

  // Asignar supervisor
  async asignarSupervisor(id: number, supervisorId: number): Promise<Intercambio> {
    return this.actualizar(id, { supervisorId });
  }
};

export default intercambioService;