import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Entidad } from '../../types';

interface EntidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidad?: Entidad | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

interface EntidadForm {
  razonSocial: string;
  cuit: string;
  domicilio?: string;
  telefono?: string;
  localidad?: string;
  urlPlataformaDocumentacion?: string;
}

const EntidadModal: React.FC<EntidadModalProps> = ({
  isOpen,
  onClose,
  entidad,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntidadForm>();

  useEffect(() => {
    if (isOpen) {
      if (entidad) {
        reset({
          razonSocial: entidad.razonSocial,
          cuit: entidad.cuit,
          domicilio: entidad.domicilio || '',
          telefono: entidad.telefono || '',
          localidad: entidad.localidad || '',
          urlPlataformaDocumentacion: entidad.urlPlataformaDocumentacion || '',
        });
      } else {
        reset({
          razonSocial: '',
          cuit: '',
          domicilio: '',
          telefono: '',
          localidad: '',
          urlPlataformaDocumentacion: '',
        });
      }
    }
  }, [isOpen, entidad, reset]);

  const handleFormSubmit = (data: EntidadForm) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {entidad ? 'Editar Entidad' : 'Nueva Entidad'}
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
            <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-1">
              Razón Social *
            </label>
            <input
              {...register('razonSocial', { required: 'La razón social es requerida' })}
              type="text"
              className="input w-full"
              placeholder="Ingrese la razón social"
            />
            {errors.razonSocial && (
              <p className="mt-1 text-sm text-red-600">{errors.razonSocial.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-1">
              CUIT *
            </label>
            <input
              {...register('cuit', { 
                required: 'El CUIT es requerido',
                pattern: {
                  value: /^[0-9]{2}-[0-9]{8}-[0-9]$/,
                  message: 'Formato CUIT inválido (ej: 20-12345678-9)'
                }
              })}
              type="text"
              className="input w-full"
              placeholder="20-12345678-9"
            />
            {errors.cuit && (
              <p className="mt-1 text-sm text-red-600">{errors.cuit.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="domicilio" className="block text-sm font-medium text-gray-700 mb-1">
              Domicilio
            </label>
            <input
              {...register('domicilio')}
              type="text"
              className="input w-full"
              placeholder="Dirección de la entidad"
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              {...register('telefono')}
              type="text"
              className="input w-full"
              placeholder="Teléfono de contacto"
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
              placeholder="Ciudad o localidad"
            />
          </div>

          <div>
            <label htmlFor="urlPlataformaDocumentacion" className="block text-sm font-medium text-gray-700 mb-1">
              URL Plataforma Documentación
            </label>
            <input
              {...register('urlPlataformaDocumentacion')}
              type="url"
              className="input w-full"
              placeholder="https://ejemplo.com"
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
              {isLoading ? 'Guardando...' : entidad ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntidadModal;