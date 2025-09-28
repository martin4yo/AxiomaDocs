import api from './api';

// Interfaces para el nuevo API de documentos
export interface DocumentoConEstadoCritico {
  id: number;
  codigo: string;
  descripcion: string;
  diasVigencia: number;
  esUniversal: boolean;
  // Campos de fechas del documento
  fechaEmision: string | null;
  fechaTramitacion: string | null;
  fechaVencimiento: string | null;
  estadoCritico: {
    nivel: number;
    nombre: string;
    color: string;
  };
  proximaVencimiento: string | null;
  recursosAsignados: number;
  entidadesDestino: number;
  totalEnvios: number;
  enviosPendientes: number;
  enviosEnviados: number;
  creador: {
    nombre: string;
    apellido: string;
  };
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface RecursoAsignado {
  id: number;
  recurso: {
    id: number;
    nombre: string;
    codigo: string;
    cuil: string;
  };
  fechaEmision: string | null;
  fechaTramitacion: string | null;
  fechaVencimiento: string | null;
  estado: {
    id: number;
    nombre: string;
    color: string;
    nivel: number;
  } | null;
  estadoSeguimiento: 'pendiente' | 'enviado';
  observaciones: string | null;
  creador: {
    nombre: string;
    apellido: string;
  };
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface EntidadDestino {
  id: string;
  entidadDocumentacionId?: number; // ID de la relación EntidadDocumentacion
  entidad: {
    id: number;
    nombre: string;
    cuit: string;
  };
  motivo: string;
  destino: string | null;
  tipoDestino: 'url' | 'email';
  // Fechas del documento para esta entidad
  fechaEmision?: string | null;
  fechaTramitacion?: string | null;
  fechaVencimiento?: string | null;
  estadoEnvio: 'pendiente' | 'enviado' | 'recibido';
  fechaEnvio: string | null;
  observaciones: string | null;
  ultimaAccion: string | null;
  responsable: {
    nombre: string;
    apellido: string;
  } | null;
  estado?: any; // Estado del documento para esa entidad
}

export interface DocumentosResponse {
  documentos: DocumentoConEstadoCritico[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface RecursosAsignadosResponse {
  recursos: RecursoAsignado[];
}

export interface EntidadesDestinoResponse {
  entidades: EntidadDestino[];
}

// Parámetros de filtros
export interface DocumentosFiltros {
  page?: number;
  limit?: number;
  search?: string;
  estadoSeguimiento?: 'pendiente' | 'enviado';
  soloConVencimientos?: boolean;
}

export interface UpdateRecursoAsignadoData {
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  estadoId?: number;
  estadoSeguimiento?: 'pendiente' | 'enviado';
  observaciones?: string;
}

export interface UpdateEstadoEnvioData {
  recursoId?: number;
  estadoEnvio: 'pendiente' | 'enviado' | 'recibido';
  destino?: string;
  observaciones?: string;
}

// Interfaces para estadísticas del dashboard
export interface DashboardStats {
  universales: {
    total: number;
    vencidos: number;
    porVencer: number;
    enTramite: number;
    vigentes: number;
  };
  porRecurso: {
    total: number;
    vencidos: number;
    porVencer: number;
    enTramite: number;
    vigentes: number;
  };
  porEntidad: {
    total: number;
    vencidos: number;
    porVencer: number;
    enTramite: number;
    vigentes: number;
  };
}

// Servicios del API
export const documentosService = {
  // GET /api/documentos/stats - Estadísticas optimizadas del dashboard
  getEstadisticasDashboard: async (): Promise<DashboardStats> => {
    const response = await api.get('/documentos/stats');
    return response.data;
  },

  // GET /api/documentos - Lista principal de documentos con estado crítico
  getDocumentosConEstadoCritico: async (filtros: DocumentosFiltros = {}): Promise<DocumentosResponse> => {
    const params = new URLSearchParams();

    if (filtros.page) params.append('page', filtros.page.toString());
    if (filtros.limit) params.append('limit', filtros.limit.toString());
    if (filtros.search) params.append('search', filtros.search);
    if (filtros.estadoSeguimiento) params.append('estadoSeguimiento', filtros.estadoSeguimiento);
    if (filtros.soloConVencimientos) params.append('soloConVencimientos', 'true');

    const response = await api.get(`/documentos?${params.toString()}`);
    return response.data;
  },

  // GET /api/documentos/:id/recursos - Sub-grilla de recursos asignados
  getRecursosAsignados: async (documentoId: number): Promise<RecursosAsignadosResponse> => {
    const response = await api.get(`/documentos/${documentoId}/recursos`);
    return response.data;
  },

  // GET /api/documentos/:id/entidades - Sub-grilla de entidades destino
  getEntidadesDestino: async (documentoId: number): Promise<EntidadesDestinoResponse> => {
    const response = await api.get(`/documentos/${documentoId}/entidades`);
    return response.data;
  },

  // PUT /api/documentos/:documentoId/recursos/:recursoAsignacionId - Actualizar recurso asignado
  updateRecursoAsignado: async (
    documentoId: number,
    recursoAsignacionId: number,
    data: UpdateRecursoAsignadoData
  ): Promise<{ message: string; asignacion: any }> => {
    const response = await api.put(`/documentos/${documentoId}/recursos/${recursoAsignacionId}`, data);
    return response.data;
  },

  // PUT /api/documentos/:documentoId/entidades/:entidadAsignacionId/asignacion - Actualizar asignación de entidad
  updateEntidadAsignada: async (
    documentoId: number,
    entidadAsignacionId: number,
    data: UpdateRecursoAsignadoData
  ): Promise<{ message: string; asignacion: any }> => {
    const response = await api.put(`/documentos/${documentoId}/entidades/${entidadAsignacionId}/asignacion`, data);
    return response.data;
  },

  // PUT /api/documentos/:documentoId/entidades/:entidadId/envio - Actualizar estado de envío
  updateEstadoEnvio: async (
    documentoId: number,
    entidadId: number,
    data: UpdateEstadoEnvioData
  ): Promise<{ message: string; envio: any }> => {
    const response = await api.put(`/documentos/${documentoId}/entidades/${entidadId}/envio`, data);
    return response.data;
  },

  // PUT /api/documentos/:id/universal - Actualizar documento universal
  updateDocumentoUniversal: async (
    documentoId: number,
    data: UpdateRecursoAsignadoData
  ): Promise<{ message: string; documento: any }> => {
    const response = await api.put(`/documentos/${documentoId}/universal`, data);
    return response.data;
  }
};

export default documentosService;