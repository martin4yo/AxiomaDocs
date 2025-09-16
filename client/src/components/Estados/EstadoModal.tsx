import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Estado } from '../../types';

interface EstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estado?: Estado | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

interface EstadoForm {
  nombre: string;
  codigo?: string;
  color: string;
  nivel: number;
  descripcion?: string;
}

const EstadoModal: React.FC<EstadoModalProps> = ({
  isOpen,
  onClose,
  estado,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstadoForm>();

  useEffect(() => {
    if (isOpen) {
      if (estado) {
        reset({
          nombre: estado.nombre,
          codigo: estado.codigo || '',
          color: estado.color,
          nivel: estado.nivel || 1,
          descripcion: estado.descripcion || '',
        });
      } else {
        reset({
          nombre: '',
          codigo: '',
          color: '#000000',
          nivel: 1,
          descripcion: '',
        });
      }
    }
  }, [isOpen, estado, reset]);

  const handleFormSubmit = (data: EstadoForm) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {estado ? 'Editar Estado' : 'Nuevo Estado'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              {...register('nombre', { required: 'El nombre es requerido' })}
              type="text"
              className="input w-full"
              placeholder="Ingrese el nombre del estado"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
              Código del Sistema
            </label>
            <input
              {...register('codigo', {
                pattern: {
                  value: /^[A-Z_]+$/,
                  message: 'Solo letras mayúsculas y guiones bajos (ej: POR_VENCER)'
                }
              })}
              type="text"
              className="input w-full"
              placeholder="POR_VENCER, VENCIDO, VIGENTE (opcional)"
              style={{ textTransform: 'uppercase' }}
            />
            {errors.codigo && (
              <p className="mt-1 text-sm text-red-600">{errors.codigo.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Código único para identificación automática del sistema. Si no se especifica, solo será un estado manual.
            </p>
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
              Color *
            </label>
            <div className="flex items-center space-x-2">
              <input
                {...register('color', { required: 'El color es requerido' })}
                type="color"
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                {...register('color', { required: 'El color es requerido' })}
                type="text"
                className="input flex-1"
                placeholder="#000000"
              />
            </div>
            {errors.color && (
              <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
              Nivel *
            </label>
            <input
              {...register('nivel', { 
                required: 'El nivel es requerido',
                min: { value: 1, message: 'El nivel mínimo es 1' },
                max: { value: 10, message: 'El nivel máximo es 10' }
              })}
              type="number"
              min="1"
              max="10"
              className="input w-full"
              placeholder="1"
            />
            {errors.nivel && (
              <p className="mt-1 text-sm text-red-600">{errors.nivel.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Nivel de prioridad (1-10, mayor número = mayor prioridad)
            </p>
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register('descripcion')}
              rows={3}
              className="input w-full resize-none"
              placeholder="Descripción opcional del estado"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : estado ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstadoModal;