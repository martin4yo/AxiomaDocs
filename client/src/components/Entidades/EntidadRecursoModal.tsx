import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { X } from 'lucide-react';
import { EntidadRecurso, Recurso } from '../../types';
import { recursosService } from '../../services/recursos';

interface EntidadRecursoModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidadRecurso?: EntidadRecurso | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  entidadId: number;
  assignedRecursos?: number[];
}

interface EntidadRecursoForm {
  recursoId: number;
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
}

const EntidadRecursoModal: React.FC<EntidadRecursoModalProps> = ({
  isOpen,
  onClose,
  entidadRecurso,
  onSubmit,
  isLoading,
  entidadId: _entidadId,
  assignedRecursos = [],
}) => {
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EntidadRecursoForm>();

  const recursoId = watch('recursoId');

  const { data: recursosData } = useQuery(
    'recursos-all',
    () => recursosService.getAll({ limit: 100 }),
    { enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      if (entidadRecurso) {
        reset({
          recursoId: entidadRecurso.recursoId,
          fechaInicio: entidadRecurso.fechaInicio
            ? new Date(entidadRecurso.fechaInicio).toISOString().split('T')[0]
            : '',
          fechaFin: entidadRecurso.fechaFin
            ? new Date(entidadRecurso.fechaFin).toISOString().split('T')[0]
            : '',
          activo: entidadRecurso.activo,
        });
        setSelectedRecurso(entidadRecurso.recurso || null);
      } else {
        reset({
          recursoId: 0,
          fechaInicio: '',
          fechaFin: '',
          activo: true,
        });
        setSelectedRecurso(null);
      }
    }
  }, [isOpen, entidadRecurso, reset]);

  useEffect(() => {
    if (recursoId && recursosData) {
      const recurso = recursosData.recursos.find(r => r.id === Number(recursoId));
      setSelectedRecurso(recurso || null);
    }
  }, [recursoId, recursosData]);

  const handleFormSubmit = (data: EntidadRecursoForm) => {
    if (selectedRecurso?.fechaBaja) {
      return; // Ya validado en el UI
    }

    onSubmit({
      ...data,
      recursoId: Number(data.recursoId),
    });
  };

  if (!isOpen) return null;

  // Filtrar recursos activos y no asignados
  const recursosDisponibles = recursosData?.recursos.filter(r => 
    !r.fechaBaja && (entidadRecurso || !assignedRecursos.includes(r.id))
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {entidadRecurso ? 'Editar Recurso' : 'Asignar Recurso'}
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
            <label htmlFor="recursoId" className="block text-sm font-medium text-gray-700 mb-1">
              Recurso *
            </label>
            <select
              {...register('recursoId', { required: 'Seleccione un recurso' })}
              className="input w-full"
              disabled={!!entidadRecurso}
            >
              <option value="">Seleccionar recurso...</option>
              {recursosDisponibles.map((recurso) => (
                <option key={recurso.id} value={recurso.id}>
                  {recurso.codigo} - {recurso.apellido}, {recurso.nombre}
                </option>
              ))}
            </select>
            {!entidadRecurso && recursosDisponibles.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Todos los recursos disponibles ya están asignados a esta entidad.
              </p>
            )}
            {errors.recursoId && (
              <p className="mt-1 text-sm text-red-600">{errors.recursoId.message}</p>
            )}
          </div>

          {selectedRecurso && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>CUIL:</strong> {selectedRecurso.cuil || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> {selectedRecurso.telefono || 'No especificado'}</p>
              <p><strong>Localidad:</strong> {selectedRecurso.localidad || 'No especificado'}</p>
              <p><strong>Fecha Alta:</strong> {new Date(selectedRecurso.fechaAlta).toLocaleDateString('es-ES')}</p>
            </div>
          )}

          <div>
            <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio *
            </label>
            <input
              {...register('fechaInicio', { required: 'La fecha de inicio es requerida' })}
              type="date"
              className="input w-full"
            />
            {errors.fechaInicio && (
              <p className="mt-1 text-sm text-red-600">{errors.fechaInicio.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Fin
            </label>
            <input
              {...register('fechaFin')}
              type="date"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Opcional. Dejar vacío si la asignación es indefinida.
            </p>
          </div>

          <div className="flex items-center">
            <input
              {...register('activo')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
              Activo
            </label>
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
              {isLoading ? 'Guardando...' : entidadRecurso ? 'Actualizar' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntidadRecursoModal;