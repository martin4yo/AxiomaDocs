import api from './api';

export interface Workflow {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  version: string;
  categoria: string;
  subcategoria?: string;
  tags?: string[];
  tipo: 'bilateral' | 'supervisado' | 'circular' | 'jerarquico' | 'paralelo';
  participantes: any[];
  pasos: any[];
  transiciones: any[];
  eventos?: any[];
  complejidad: 'baja' | 'media' | 'alta' | 'critica';
  estimacionDuracionHoras?: number;
  recursosRequeridos?: string[];
  estado: 'borrador' | 'activo' | 'pausado' | 'obsoleto' | 'archivado';
  publicado: boolean;
  utilizaciones: number;
  promedioTiempoComplecion?: number;
  tasaExito?: number;
  fechaPublicacion?: string;
  fechaUltimaModificacion: string;
  creadoPor: number;
  modificadoPor?: number;
  createdAt: string;
  updatedAt: string;
  
  // Relaciones
  creador?: {
    id: number;
    nombreUsuario: string;
    nombre: string;
    apellido: string;
  };
  modificador?: {
    id: number;
    nombreUsuario: string;
    nombre: string;
    apellido: string;
  };
}

export interface WorkflowCreacion {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  subcategoria?: string;
  tags?: string[];
  tipo: 'bilateral' | 'supervisado' | 'circular' | 'jerarquico' | 'paralelo';
  participantes?: any[];
  pasos?: any[];
  transiciones?: any[];
  eventos?: any[];
  complejidad?: 'baja' | 'media' | 'alta' | 'critica';
  estimacionDuracionHoras?: number;
  recursosRequeridos?: string[];
}

export interface WorkflowActualizacion {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  subcategoria?: string;
  tags?: string[];
  participantes?: any[];
  pasos?: any[];
  transiciones?: any[];
  eventos?: any[];
  complejidad?: 'baja' | 'media' | 'alta' | 'critica';
  estimacionDuracionHoras?: number;
  recursosRequeridos?: string[];
  estado?: 'borrador' | 'activo' | 'pausado' | 'obsoleto' | 'archivado';
}

export interface WorkflowFiltros {
  page?: number;
  limit?: number;
  search?: string;
  categoria?: string;
  tipo?: string;
  estado?: string;
  incluirInactivos?: boolean;
}

export interface WorkflowEstadisticas {
  resumen: {
    totalWorkflows: number;
    activos: number;
    utilizaciones: number;
    tiempoPromedio: number;
  };
  distribucion: {
    porCategoria: Array<{
      categoria: string;
      count: number;
    }>;
    porTipo: Array<{
      tipo: string;
      count: number;
    }>;
  };
}

export interface WorkflowTemplate {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo: string;
  complejidad: string;
  estimacionDuracionHoras?: number;
  utilizaciones: number;
  creador?: {
    id: number;
    nombreUsuario: string;
    nombre: string;
    apellido: string;
  };
}

export interface PaginatedResponse<T> {
  workflows: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const workflowService = {
  // Listar workflows con filtros y paginación
  async listar(filtros: WorkflowFiltros = {}): Promise<PaginatedResponse<Workflow>> {
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/workflows?${params.toString()}`);
    return response.data;
  },

  // Obtener workflow por ID
  async obtenerPorId(id: number): Promise<Workflow> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  // Crear nuevo workflow
  async crear(data: WorkflowCreacion): Promise<Workflow> {
    const response = await api.post('/workflows', data);
    return response.data;
  },

  // Actualizar workflow
  async actualizar(id: number, data: WorkflowActualizacion): Promise<Workflow> {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },

  // Eliminar workflow
  async eliminar(id: number): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  // Duplicar workflow
  async duplicar(id: number, nuevoCodigo: string, nuevoNombre: string): Promise<Workflow> {
    const response = await api.post(`/workflows/${id}/duplicar`, {
      nuevoCodigo,
      nuevoNombre
    });
    return response.data;
  },

  // Obtener estadísticas
  async obtenerEstadisticas(): Promise<WorkflowEstadisticas> {
    const response = await api.get('/workflows/estadisticas');
    return response.data;
  },

  // Obtener templates disponibles
  async obtenerTemplates(categoria?: string): Promise<WorkflowTemplate[]> {
    const params = categoria ? `?categoria=${categoria}` : '';
    const response = await api.get(`/workflows/templates${params}`);
    return response.data;
  },

  // Cambiar estado del workflow
  async cambiarEstado(id: number, estado: string): Promise<Workflow> {
    return this.actualizar(id, { estado: estado as any });
  },

  // Activar workflow
  async activar(id: number): Promise<Workflow> {
    return this.cambiarEstado(id, 'activo');
  },

  // Pausar workflow
  async pausar(id: number): Promise<Workflow> {
    return this.cambiarEstado(id, 'pausado');
  },

  // Archivar workflow
  async archivar(id: number): Promise<Workflow> {
    return this.cambiarEstado(id, 'archivado');
  }
};

export default workflowService;