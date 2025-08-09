import api from './api';
import { Entidad, EntidadDocumentacion, EntidadRecurso, PaginationInfo } from '../types';

export interface EntidadesResponse {
  entidades: Entidad[];
  pagination: PaginationInfo;
}

export const entidadesService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<EntidadesResponse> {
    const response = await api.get('/entidades', { params });
    return response.data;
  },

  async getById(id: number): Promise<Entidad> {
    const response = await api.get(`/entidades/${id}`);
    return response.data;
  },

  async create(entidad: Omit<Entidad, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entidad> {
    const response = await api.post('/entidades', entidad);
    return response.data;
  },

  async update(id: number, entidad: Partial<Omit<Entidad, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Entidad> {
    const response = await api.put(`/entidades/${id}`, entidad);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/entidades/${id}`);
  },

  // Documentación
  async addDocumentacion(entidadId: number, data: {
    documentacionId: number;
    esInhabilitante: boolean;
    enviarPorMail: boolean;
    mailDestino?: string;
  }): Promise<EntidadDocumentacion> {
    const response = await api.post(`/entidades/${entidadId}/documentacion`, data);
    return response.data;
  },

  async updateEntidadDocumentacion(entidadDocId: number, data: {
    esInhabilitante: boolean;
    enviarPorMail: boolean;
    mailDestino?: string;
  }): Promise<EntidadDocumentacion> {
    const response = await api.put(`/entidades/documentacion/${entidadDocId}`, data);
    return response.data;
  },

  async removeDocumentacion(entidadDocId: number): Promise<void> {
    await api.delete(`/entidades/documentacion/${entidadDocId}`);
  },

  // Recursos
  async addRecurso(entidadId: number, data: {
    recursoId: number;
    fechaInicio: string;
    fechaFin?: string;
  }): Promise<EntidadRecurso> {
    const response = await api.post(`/entidades/${entidadId}/recursos`, data);
    return response.data;
  },

  async updateEntidadRecurso(entidadRecursoId: number, data: {
    fechaInicio: string;
    fechaFin?: string;
    activo: boolean;
  }): Promise<EntidadRecurso> {
    const response = await api.put(`/entidades/recursos/${entidadRecursoId}`, data);
    return response.data;
  },

  async removeRecurso(entidadRecursoId: number): Promise<void> {
    await api.delete(`/entidades/recursos/${entidadRecursoId}`);
  },
};