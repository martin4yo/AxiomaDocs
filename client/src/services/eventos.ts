import api from './api';

// Interfaces para eventos
export interface Evento {
  id: number;
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  tipoEvento: 'seguimiento' | 'tramite' | 'notificacion' | 'observacion';
  fecha: string;
  hora: string;
  titulo: string;
  descripcion: string;
  observaciones?: string;
  creadoPor: number;
  modificadoPor?: number;
  createdAt: string;
  updatedAt: string;
  creador: {
    id: number;
    nombre: string;
    apellido: string;
  };
  modificador?: {
    id: number;
    nombre: string;
    apellido: string;
  };
  documentacion: {
    id: number;
    codigo: string;
    descripcion: string;
  };
}

export interface EventosResponse {
  eventos: Evento[];
}

export interface CreateEventoData {
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  tipoEvento: 'seguimiento' | 'tramite' | 'notificacion' | 'observacion';
  fecha: string;
  hora: string;
  titulo: string;
  descripcion: string;
  observaciones?: string;
}

export interface UpdateEventoData {
  tipoEvento?: 'seguimiento' | 'tramite' | 'notificacion' | 'observacion';
  fecha?: string;
  hora?: string;
  titulo?: string;
  descripcion?: string;
  observaciones?: string;
}

export interface EventosFiltros {
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
}

// Servicios del API
export const eventosService = {
  // GET /api/eventos - Obtener eventos con filtros
  getEventos: async (filtros: EventosFiltros): Promise<EventosResponse> => {
    const params = new URLSearchParams();

    params.append('documentacionId', filtros.documentacionId.toString());

    if (filtros.recursoDocumentacionId) {
      params.append('recursoDocumentacionId', filtros.recursoDocumentacionId.toString());
    }

    if (filtros.entidadDocumentacionId) {
      params.append('entidadDocumentacionId', filtros.entidadDocumentacionId.toString());
    }

    const response = await api.get(`/eventos?${params.toString()}`);
    return response.data;
  },

  // GET /api/eventos/:id - Obtener un evento específico
  getEventoById: async (id: number): Promise<{ evento: Evento }> => {
    const response = await api.get(`/eventos/${id}`);
    return response.data;
  },

  // POST /api/eventos - Crear nuevo evento
  createEvento: async (data: CreateEventoData): Promise<{ message: string; evento: Evento }> => {
    const response = await api.post('/eventos', data);
    return response.data;
  },

  // PUT /api/eventos/:id - Actualizar evento
  updateEvento: async (id: number, data: UpdateEventoData): Promise<{ message: string; evento: Evento }> => {
    const response = await api.put(`/eventos/${id}`, data);
    return response.data;
  },

  // DELETE /api/eventos/:id - Eliminar evento
  deleteEvento: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/eventos/${id}`);
    return response.data;
  }
};

export default eventosService;