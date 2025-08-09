import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Usuario } from '../../services/usuarios';

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  nombre: string;
  apellido: string;
  activo: boolean;
}

const UsuarioModal: React.FC<UsuarioModalProps> = ({
  isOpen,
  onClose,
  usuario,
  onSubmit,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      nombre: '',
      apellido: '',
      activo: true,
    },
  });

  const password = watch('password');
  const isEditing = !!usuario;

  useEffect(() => {
    if (isOpen) {
      if (usuario) {
        reset({
          username: usuario.username,
          email: usuario.email,
          password: '',
          confirmPassword: '',
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          activo: usuario.activo,
        });
      } else {
        reset({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          nombre: '',
          apellido: '',
          activo: true,
        });
      }
    }
  }, [isOpen, usuario, reset]);

  const handleFormSubmit = (data: FormData) => {
    const submitData = {
      username: data.username.trim(),
      email: data.email.trim(),
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      activo: data.activo,
    };

    // Solo incluir password si no está vacío
    if (data.password) {
      (submitData as any).password = data.password;
    }

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('nombre', { 
                  required: 'El nombre es obligatorio',
                  minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' }
                })}
                className={`input pl-10 ${errors.nombre ? 'border-red-300' : ''}`}
                placeholder="Ingresa el nombre"
                disabled={isLoading}
              />
            </div>
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('apellido', { 
                  required: 'El apellido es obligatorio',
                  minLength: { value: 2, message: 'El apellido debe tener al menos 2 caracteres' }
                })}
                className={`input pl-10 ${errors.apellido ? 'border-red-300' : ''}`}
                placeholder="Ingresa el apellido"
                disabled={isLoading}
              />
            </div>
            {errors.apellido && (
              <p className="mt-1 text-xs text-red-600">{errors.apellido.message}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de Usuario *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('username', { 
                  required: 'El nombre de usuario es obligatorio',
                  minLength: { value: 3, message: 'El nombre de usuario debe tener al menos 3 caracteres' },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Solo se permiten letras, números y guiones bajos'
                  }
                })}
                className={`input pl-10 ${errors.username ? 'border-red-300' : ''}`}
                placeholder="Ingresa el nombre de usuario"
                disabled={isLoading}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('email', { 
                  required: 'El email es obligatorio',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Formato de email inválido'
                  }
                })}
                type="email"
                className={`input pl-10 ${errors.email ? 'border-red-300' : ''}`}
                placeholder="Ingresa el email"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('password', { 
                  required: isEditing ? false : 'La contraseña es obligatoria',
                  minLength: { 
                    value: 6, 
                    message: 'La contraseña debe tener al menos 6 caracteres' 
                  }
                })}
                type={showPassword ? 'text' : 'password'}
                className={`input pl-10 pr-10 ${errors.password ? 'border-red-300' : ''}`}
                placeholder={isEditing ? "Dejar vacío para no cambiar" : "Ingresa la contraseña"}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          {(password && password.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register('confirmPassword', { 
                    required: 'Debes confirmar la contraseña',
                    validate: (value) => value === password || 'Las contraseñas no coinciden'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
                  placeholder="Confirma la contraseña"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {/* Estado Activo */}
          <div className="flex items-center">
            <input
              {...register('activo')}
              type="checkbox"
              id="activo"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
              Usuario activo
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioModal;