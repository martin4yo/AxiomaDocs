import api from './api';
import { Documentacion, PaginationInfo, RecursoDocumentacion } from '../types';

export interface DocumentacionResponse {
  documentacion: Documentacion[];
  pagination: PaginationInfo;
}

export const documentacionService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<DocumentacionResponse> {
    const response = await api.get('/documentacion', { params });
    return response.data;
  },

  async getById(id: number): Promise<Documentacion> {
    const response = await api.get(`/documentacion/${id}`);
    return response.data;
  },

  async create(documentacion: Omit<Documentacion, 'id' | 'createdAt' | 'updatedAt' | 'estadoVencimiento'>): Promise<Documentacion> {
    const response = await api.post('/documentacion', documentacion);
    return response.data;
  },

  async update(id: number, documentacion: Partial<Omit<Documentacion, 'id' | 'createdAt' | 'updatedAt' | 'estadoVencimiento'>>): Promise<Documentacion> {
    const response = await api.put(`/documentacion/${id}`, documentacion);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/documentacion/${id}`);
  },

  async addRecurso(documentacionId: number, data: {
    recursoId: number;
    fechaEmision?: string;
    fechaTramitacion?: string;
    estadoId?: number;
  }): Promise<RecursoDocumentacion> {
    const response = await api.post(`/documentacion/${documentacionId}/recursos`, data);
    return response.data;
  },

  async updateRecursoDocumentacion(recursoDocId: number, data: {
    fechaEmision?: string;
    fechaTramitacion?: string;
    estadoId?: number;
  }): Promise<RecursoDocumentacion> {
    const response = await api.put(`/recursos/documentos/${recursoDocId}`, data);
    return response.data;
  },

  async removeRecurso(recursoDocId: number): Promise<void> {
    await api.delete(`/recursos/documentos/${recursoDocId}`);
  },
};