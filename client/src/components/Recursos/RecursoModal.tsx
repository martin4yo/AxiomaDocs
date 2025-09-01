import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Recurso } from '../../types';
import { formatDateForInput, getCurrentDateLocal } from '../../utils/dateUtils';

interface RecursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurso?: Recurso | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

interface RecursoForm {
  codigo: string;
  apellido: string;
  nombre: string;
  telefono?: string;
  cuil?: string;
  direccion?: string;
  localidad?: string;
  fechaAlta: string;
  fechaBaja?: string;
}

const RecursoModal: React.FC<RecursoModalProps> = ({
  isOpen,
  onClose,
  recurso,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecursoForm>();

  useEffect(() => {
    if (isOpen) {
      if (recurso) {
        reset({
          codigo: recurso.codigo,
          apellido: recurso.apellido,
          nombre: recurso.nombre,
          telefono: recurso.telefono || '',
          cuil: recurso.cuil || '',
          direccion: recurso.direccion || '',
          localidad: recurso.localidad || '',
          fechaAlta: formatDateForInput(recurso.fechaAlta),
          fechaBaja: formatDateForInput(recurso.fechaBaja),
        });
      } else {
        reset({
          codigo: '',
          apellido: '',
          nombre: '',
          telefono: '',
          cuil: '',
          direccion: '',
          localidad: '',
          fechaAlta: formatDateForInput(getCurrentDateLocal()),
          fechaBaja: '',
        });
      }
    }
  }, [isOpen, recurso, reset]);

  const handleFormSubmit = (data: RecursoForm) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {recurso ? 'Editar Recurso' : 'Nuevo Recurso'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                {...register('codigo', { required: 'El código es requerido' })}
                type="text"
                className="input w-full"
                placeholder="Código del recurso"
              />
              {errors.codigo && (
                <p className="mt-1 text-sm text-red-600">{errors.codigo.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="cuil" className="block text-sm font-medium text-gray-700 mb-1">
                CUIL
              </label>
              <input
                {...register('cuil')}
                type="text"
                className="input w-full"
                placeholder="20-12345678-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                {...register('apellido', { required: 'El apellido es requerido' })}
                type="text"
                className="input w-full"
                placeholder="Apellido del recurso"
              />
              {errors.apellido && (
                <p className="mt-1 text-sm text-red-600">{errors.apellido.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                {...register('nombre', { required: 'El nombre es requerido' })}
                type="text"
                className="input w-full"
                placeholder="Nombre del recurso"
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                {...register('telefono')}
                type="text"
                className="input w-full"
                placeholder="Número de teléfono"
              />
            </div>

            <div>
              <label htmlFor="localidad" className="block text-sm font-medium text-gray-700 mb-1">
                Localidad
              </label>
              <input
                {...register('localidad')}
                type="text"
                className="input w-full"
                placeholder="Localidad"
              />
            </div>
          </div>

          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              {...register('direccion')}
              type="text"
              className="input w-full"
              placeholder="Dirección completa"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fechaAlta" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Alta *
              </label>
              <input
                {...register('fechaAlta', { required: 'La fecha de alta es requerida' })}
                type="date"
                className="input w-full"
              />
              {errors.fechaAlta && (
                <p className="mt-1 text-sm text-red-600">{errors.fechaAlta.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="fechaBaja" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Baja
              </label>
              <input
                {...register('fechaBaja')}
                type="date"
                className="input w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Los recursos dados de baja no pueden tener documentos asignados
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              {isLoading ? 'Guardando...' : recurso ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecursoModal;