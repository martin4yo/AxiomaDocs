import api from './api';

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  user?: {
    email: string;
    nombre: string;
    apellido: string;
  };
  message?: string;
  code?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export const passwordResetService = {
  // Solicitar recuperación de contraseña
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  // Verificar token de recuperación
  verifyResetToken: async (token: string): Promise<VerifyResetTokenResponse> => {
    const response = await api.get(`/auth/verify-reset-token/${token}`);
    return response.data;
  },

  // Restablecer contraseña
  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  }
};