import api from './api';
import { Recurso, RecursoDocumentacion, PaginationInfo } from '../types';

export interface RecursosResponse {
  recursos: Recurso[];
  pagination: PaginationInfo;
}

export const recursosService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<RecursosResponse> {
    const response = await api.get('/recursos', { params });
    return response.data;
  },

  async getById(id: number): Promise<Recurso> {
    const response = await api.get(`/recursos/${id}`);
    return response.data;
  },

  async create(recurso: Omit<Recurso, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recurso> {
    const response = await api.post('/recursos', recurso);
    return response.data;
  },

  async update(id: number, recurso: Partial<Omit<Recurso, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Recurso> {
    const response = await api.put(`/recursos/${id}`, recurso);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/recursos/${id}`);
  },

  async addDocument(recursoId: number, data: {
    documentacionId: number;
    fechaEmision?: string;
    fechaTramitacion?: string;
    estadoId?: number;
  }): Promise<RecursoDocumentacion> {
    const response = await api.post(`/recursos/${recursoId}/documentos`, data);
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

  async removeDocument(recursoDocId: number): Promise<void> {
    await api.delete(`/recursos/documentos/${recursoDocId}`);
  },
};