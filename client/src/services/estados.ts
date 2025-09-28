import api from './api';
import { Estado } from '../types';

export const estadosService = {
  async getAll(): Promise<Estado[]> {
    const response = await api.get('/estados');
    return response.data;
  },

  async getById(id: number): Promise<Estado> {
    const response = await api.get(`/estados/${id}`);
    return response.data;
  },

  async create(estado: Omit<Estado, 'id' | 'createdAt' | 'updatedAt'>): Promise<Estado> {
    const response = await api.post('/estados', estado);
    return response.data;
  },

  async update(id: number, estado: Partial<Omit<Estado, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Estado> {
    const response = await api.put(`/estados/${id}`, estado);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/estados/${id}`);
  },

  // Alias for getAll for backward compatibility
  async getEstados(): Promise<Estado[]> {
    return this.getAll();
  },
};