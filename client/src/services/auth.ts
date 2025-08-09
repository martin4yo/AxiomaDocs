import api from './api';
import { AuthResponse, Usuario } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async register(userData: {
    username: string;
    email: string;
    password: string;
    nombre: string;
    apellido: string;
  }): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async getProfile(): Promise<Usuario> {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser(): Usuario | null {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};