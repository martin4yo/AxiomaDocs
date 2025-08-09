import api from './api';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUsuarioData {
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  activo?: boolean;
}

export interface UpdateUsuarioData {
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  activo?: boolean;
  password?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UsuariosResponse {
  usuarios: Usuario[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetUsuariosParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const usuariosService = {
  // Obtener todos los usuarios con paginación
  getAll: async (params: GetUsuariosParams = {}): Promise<UsuariosResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);

    const response = await api.get(`/usuarios?${searchParams.toString()}`);
    return response.data;
  },

  // Obtener usuario por ID
  getById: async (id: number): Promise<Usuario> => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  // Crear nuevo usuario
  create: async (data: CreateUsuarioData): Promise<Usuario> => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },

  // Actualizar usuario
  update: async (id: number, data: UpdateUsuarioData): Promise<Usuario> => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },

  // Eliminar usuario
  delete: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },

  // Cambiar estado de usuario (activar/desactivar)
  toggleStatus: async (id: number, activo: boolean): Promise<Usuario> => {
    const response = await api.patch(`/usuarios/${id}/toggle-status`, { activo });
    return response.data;
  },

  // Cambiar contraseña propia
  changeOwnPassword: async (data: ChangePasswordData): Promise<void> => {
    await api.post('/usuarios/change-password', data);
  }
};