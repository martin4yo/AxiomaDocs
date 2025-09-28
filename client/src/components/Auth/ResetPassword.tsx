import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { passwordResetService } from '../../services/passwordReset';
import toast from 'react-hot-toast';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; nombre: string; apellido: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenError, setTokenError] = useState<{ message: string; code?: string } | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordFormData>();

  const password = watch('newPassword');

  // Verificar token al cargar el componente
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError({ message: 'Token inválido o faltante', code: 'MISSING_TOKEN' });
        setIsVerifying(false);
        return;
      }

      try {
        const response = await passwordResetService.verifyResetToken(token);
        if (response.valid && response.user) {
          setTokenValid(true);
          setUserInfo(response.user);
        } else {
          setTokenError({ message: 'Token inválido', code: 'INVALID_TOKEN' });
        }
      } catch (error: any) {
        const errorData = error.response?.data;
        setTokenError({
          message: errorData?.message || 'Error verificando el token',
          code: errorData?.code
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await passwordResetService.resetPassword({
        token,
        newPassword: data.newPassword
      });

      setResetSuccess(true);
      toast.success('Contraseña actualizada exitosamente');

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: any) {
      const errorData = error.response?.data;
      const message = errorData?.message || 'Error al restablecer la contraseña';

      if (errorData?.code === 'TOKEN_EXPIRED' || errorData?.code === 'TOKEN_USED') {
        setTokenError({ message, code: errorData.code });
        setTokenValid(false);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };

    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*]/.test(password)
    ];

    strength = checks.filter(Boolean).length;

    if (strength < 2) return { strength, text: 'Muy débil', color: 'text-red-600' };
    if (strength < 3) return { strength, text: 'Débil', color: 'text-orange-600' };
    if (strength < 4) return { strength, text: 'Buena', color: 'text-yellow-600' };
    return { strength, text: 'Fuerte', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(password || '');

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Contraseña Actualizada!
            </h2>

            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!tokenValid || tokenError) {
    const getErrorContent = () => {
      switch (tokenError?.code) {
        case 'TOKEN_EXPIRED':
          return {
            icon: <AlertTriangle className="h-8 w-8 text-orange-600" />,
            title: 'Enlace Expirado',
            message: 'Este enlace de recuperación ha expirado. Los enlaces son válidos por 1 hora.',
            action: 'Solicitar nuevo enlace'
          };
        case 'TOKEN_USED':
          return {
            icon: <XCircle className="h-8 w-8 text-red-600" />,
            title: 'Enlace Ya Utilizado',
            message: 'Este enlace ya ha sido utilizado. Cada enlace solo puede usarse una vez.',
            action: 'Solicitar nuevo enlace'
          };
        default:
          return {
            icon: <XCircle className="h-8 w-8 text-red-600" />,
            title: 'Enlace Inválido',
            message: tokenError?.message || 'El enlace de recuperación no es válido.',
            action: 'Volver al login'
          };
      }
    };

    const errorContent = getErrorContent();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              {errorContent.icon}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {errorContent.title}
            </h2>

            <p className="text-gray-600 mb-6">
              {errorContent.message}
            </p>

            <div className="space-y-3">
              {(tokenError?.code === 'TOKEN_EXPIRED' || tokenError?.code === 'TOKEN_USED') && (
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {errorContent.action}
                </button>
              )}

              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nueva Contraseña
          </h2>

          {userInfo && (
            <p className="text-gray-600">
              Restablecer contraseña para <strong>{userInfo.nombre} {userInfo.apellido}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                {...register('newPassword', {
                  required: 'La contraseña es requerida',
                  minLength: {
                    value: 6,
                    message: 'La contraseña debe tener al menos 6 caracteres'
                  }
                })}
                className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ingresa tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}

            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fortaleza:</span>
                  <span className={passwordStrength.color}>{passwordStrength.text}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength.strength < 2 ? 'bg-red-500' :
                      passwordStrength.strength < 3 ? 'bg-orange-500' :
                      passwordStrength.strength < 4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: value => value === password || 'Las contraseñas no coinciden'
                })}
                className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirma tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
};