import api from './api';

// Interfaces para seguimiento de envíos
export interface DocumentoSeguimiento {
  id: number;
  codigo: string;
  descripcion: string;
  totalEntidades: number;
  pendientes: number;
  enviados: number;
  entidades: EntidadEnvio[];
}

export interface EntidadSeguimiento {
  id: number;
  nombre: string;
  cuit: string;
  totalDocumentos: number;
  pendientes: number;
  enviados: number;
  documentos: DocumentoEnvio[];
  urlPlataforma?: string;
  emailContacto?: string;
}

export interface DocumentoEnvio {
  id: number;
  codigo: string;
  descripcion: string;
  estadoEnvio: 'pendiente' | 'enviado' | 'recibido';
  fechaEnvio?: string;
  destino?: string;
  observaciones?: string;
  recursoId?: number;
  recursoNombre?: string;
  entidadDocumentacionId?: number;
  tieneAdjuntos: boolean;
  totalEventos: number;
}

export interface EntidadEnvio {
  entidadId: number;
  entidadNombre: string;
  entidadCuit: string;
  estadoEnvio: 'pendiente' | 'enviado' | 'recibido';
  fechaEnvio?: string;
  destino?: string;
  observaciones?: string;
  tieneAdjuntos: boolean;
  totalEventos: number;
  urlPlataforma?: string;
  emailContacto?: string;
}

export interface SeguimientoStats {
  totalDocumentos: number;
  totalEntidades: number;
  pendientes: number;
  enviados: number;
  recibidos: number;
}

export interface SeguimientoFiltros {
  search?: string;
  estadoEnvio?: 'pendiente' | 'enviado' | 'recibido';
  entidadId?: number;
  documentoId?: number;
}

export interface EventoDocumento {
  id: number;
  tipoEvento: 'seguimiento' | 'tramite' | 'notificacion' | 'observacion';
  fecha: string;
  hora: string;
  titulo: string;
  descripcion: string;
  observaciones?: string;
  creador: {
    nombre: string;
    apellido: string;
  };
  fechaCreacion: string;
}

export interface AdjuntoDocumento {
  id: number;
  nombreArchivo: string;
  tipoArchivo: string;
  tamaño: number;
  descripcion?: string;
  version: number;
  fechaSubida: string;
  subidoPor: {
    nombre: string;
    apellido: string;
  };
}

// Servicios para seguimiento
export const seguimientoService = {
  // GET /api/seguimiento/stats - Estadísticas generales
  getEstadisticas: async (): Promise<SeguimientoStats> => {
    const response = await api.get('/seguimiento/stats');
    return response.data;
  },

  // GET /api/seguimiento/por-documento - Vista agrupada por documento
  getPorDocumento: async (filtros: SeguimientoFiltros = {}): Promise<DocumentoSeguimiento[]> => {
    const params = new URLSearchParams();

    if (filtros.search) params.append('search', filtros.search);
    if (filtros.estadoEnvio) params.append('estadoEnvio', filtros.estadoEnvio);
    if (filtros.entidadId) params.append('entidadId', filtros.entidadId.toString());

    const response = await api.get(`/seguimiento/por-documento?${params.toString()}`);
    return response.data.documentos;
  },

  // GET /api/seguimiento/por-entidad - Vista agrupada por entidad
  getPorEntidad: async (filtros: SeguimientoFiltros = {}): Promise<EntidadSeguimiento[]> => {
    const params = new URLSearchParams();

    if (filtros.search) params.append('search', filtros.search);
    if (filtros.estadoEnvio) params.append('estadoEnvio', filtros.estadoEnvio);
    if (filtros.documentoId) params.append('documentoId', filtros.documentoId.toString());

    const response = await api.get(`/seguimiento/por-entidad?${params.toString()}`);
    return response.data.entidades;
  },

  // PUT /api/seguimiento/cambiar-estado/:documentoId/:entidadId - Cambiar estado de envío
  cambiarEstadoEnvio: async (
    documentoId: number,
    entidadId: number,
    data: {
      estadoEnvio: 'pendiente' | 'enviado' | 'recibido';
      destino?: string;
      observaciones?: string;
      recursoId?: number;
    }
  ): Promise<{ message: string; envio: any }> => {
    const response = await api.put(`/seguimiento/cambiar-estado/${documentoId}/${entidadId}`, data);
    return response.data;
  },

  // GET /api/seguimiento/eventos/:documentoId/:entidadId - Obtener eventos del documento
  getEventos: async (documentoId: number, entidadId: number, recursoId?: number): Promise<EventoDocumento[]> => {
    const params = recursoId ? `?recursoId=${recursoId}` : '';
    const response = await api.get(`/seguimiento/eventos/${documentoId}/${entidadId}${params}`);
    return response.data.eventos;
  },

  // GET /api/seguimiento/adjuntos/:documentoId/:entidadId - Obtener adjuntos del documento
  getAdjuntos: async (documentoId: number, entidadId: number, recursoId?: number): Promise<AdjuntoDocumento[]> => {
    const params = recursoId ? `?recursoId=${recursoId}` : '';
    const response = await api.get(`/seguimiento/adjuntos/${documentoId}/${entidadId}${params}`);
    return response.data.adjuntos;
  },

  // POST /api/seguimiento/eventos/:documentoId/:entidadId - Crear nuevo evento
  crearEvento: async (
    documentoId: number,
    entidadId: number,
    data: {
      tipoEvento: 'seguimiento' | 'tramite' | 'notificacion' | 'observacion';
      titulo: string;
      descripcion: string;
      observaciones?: string;
      recursoId?: number;
    }
  ): Promise<{ message: string; evento: EventoDocumento }> => {
    const response = await api.post(`/seguimiento/eventos/${documentoId}/${entidadId}`, data);
    return response.data;
  },

  // GET /api/seguimiento/adjuntos/:documentoId/:entidadId/descargar/:adjuntoId - Descargar adjunto individual
  descargarAdjunto: async (documentoId: number, entidadId: number, adjuntoId: number, recursoId?: number): Promise<void> => {
    const params = recursoId ? `?recursoId=${recursoId}` : '';
    const response = await api.get(`/seguimiento/adjuntos/${documentoId}/${entidadId}/descargar/${adjuntoId}${params}`, {
      responseType: 'blob'
    });

    // Crear y descargar el archivo
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Obtener el nombre del archivo desde el header Content-Disposition
    const contentDisposition = response.headers['content-disposition'];
    let filename = `adjunto_${adjuntoId}.pdf`; // fallback
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // GET /api/seguimiento/adjuntos/:documentoId/:entidadId/descargar-todos - Descarga masiva de adjuntos
  descargarAdjuntosMasivo: async (documentoId: number, entidadId: number, recursoId?: number): Promise<void> => {
    const params = recursoId ? `?recursoId=${recursoId}` : '';
    const response = await api.get(`/seguimiento/adjuntos/${documentoId}/${entidadId}/descargar-todos${params}`, {
      responseType: 'blob'
    });

    // Crear y descargar el archivo ZIP
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Obtener el nombre del archivo desde el header Content-Disposition
    const contentDisposition = response.headers['content-disposition'];
    let filename = `adjuntos_doc${documentoId}_ent${entidadId}_${Date.now()}.zip`; // fallback
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default seguimientoService;