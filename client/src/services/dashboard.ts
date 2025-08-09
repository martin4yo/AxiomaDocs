import api from './api';

export interface DashboardStats {
  totalRecursos: number;
  recursosActivos: number;
  totalDocumentacion: number;
  totalEntidades: number;
  documentosPorVencer: number;
  documentosVencidos: number;
}

export interface DocumentoPorVencer {
  id: number;
  recurso: {
    codigo: string;
    apellido: string;
    nombre: string;
  };
  documentacion: {
    codigo: string;
    descripcion: string;
  };
  fechaVencimiento: string;
  diasParaVencer: number;
  estado?: {
    nombre: string;
    color: string;
  };
}

export interface ActividadReciente {
  id: number;
  tipo: 'recurso' | 'documento' | 'entidad';
  descripcion: string;
  fecha: string;
  usuario?: string;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  async getDocumentosPorVencer(dias: number = 30): Promise<DocumentoPorVencer[]> {
    const response = await api.get(`/dashboard/documentos-por-vencer?dias=${dias}`);
    return response.data;
  },

  async getActividadReciente(limit: number = 10): Promise<ActividadReciente[]> {
    // Por ahora retornamos un array vacío ya que no está implementado
    // Evitar warning de parámetro sin usar
    limit;
    return [];
  }
};