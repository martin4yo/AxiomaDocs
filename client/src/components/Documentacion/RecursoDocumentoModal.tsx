import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { X } from 'lucide-react';
import { RecursoDocumentacion, Recurso } from '../../types';
import { recursosService } from '../../services/recursos';
import { estadosService } from '../../services/estados';
import { documentacionService } from '../../services/documentacion';

interface RecursoDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  recursoDocumentacion?: RecursoDocumentacion | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  documentacionId: number;
  assignedRecursos?: number[]; // IDs de recursos ya asignados
}

interface RecursoDocumentoForm {
  recursoId: number;
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  estadoId?: number;
}

const RecursoDocumentoModal: React.FC<RecursoDocumentoModalProps> = ({
  isOpen,
  onClose,
  recursoDocumentacion,
  onSubmit,
  isLoading,
  documentacionId,
  assignedRecursos = [],
}) => {
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);
  const [selectedDocumentacion, setSelectedDocumentacion] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecursoDocumentoForm>();

  const recursoId = watch('recursoId');
  const fechaEmision = watch('fechaEmision');
  const fechaVencimiento = watch('fechaVencimiento');

  // Obtener fecha mínima (día actual + 1)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const { data: recursosData } = useQuery(
    'recursos-all',
    () => recursosService.getAll({ limit: 100 }),
    { enabled: isOpen }
  );

  const { data: estados } = useQuery(
    'estados',
    estadosService.getAll,
    { enabled: isOpen }
  );

  const { data: documentacionData } = useQuery(
    ['documentacion-single', documentacionId],
    () => documentacionService.getById(documentacionId),
    { enabled: isOpen && documentacionId > 0 }
  );

  useEffect(() => {
    if (isOpen) {
      if (recursoDocumentacion) {
        reset({
          recursoId: recursoDocumentacion.recursoId,
          fechaEmision: recursoDocumentacion.fechaEmision 
            ? new Date(recursoDocumentacion.fechaEmision).toISOString().split('T')[0] 
            : '',
          fechaTramitacion: recursoDocumentacion.fechaTramitacion 
            ? new Date(recursoDocumentacion.fechaTramitacion).toISOString().split('T')[0] 
            : '',
          fechaVencimiento: recursoDocumentacion.fechaVencimiento 
            ? new Date(recursoDocumentacion.fechaVencimiento).toISOString().split('T')[0] 
            : '',
          estadoId: recursoDocumentacion.estadoId || undefined,
        });
        setSelectedRecurso(recursoDocumentacion.recurso || null);
      } else {
        reset({
          recursoId: 0,
          fechaEmision: '',
          fechaTramitacion: '',
          fechaVencimiento: '',
          estadoId: undefined,
        });
        setSelectedRecurso(null);
      }
    }
  }, [isOpen, recursoDocumentacion, reset]);

  useEffect(() => {
    if (recursoId && recursosData) {
      const recurso = recursosData.recursos.find(r => r.id === Number(recursoId));
      setSelectedRecurso(recurso || null);
    }
  }, [recursoId, recursosData]);

  useEffect(() => {
    if (documentacionData) {
      setSelectedDocumentacion(documentacionData);
    }
  }, [documentacionData]);

  // Establecer fecha de vencimiento sugerida por defecto para documentos no universales
  useEffect(() => {
    if (selectedDocumentacion && !selectedDocumentacion.esUniversal && fechaEmision && !fechaVencimiento) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + selectedDocumentacion.diasVigencia);
      const fechaCalculada = emision.toISOString().split('T')[0];
      setValue('fechaVencimiento', fechaCalculada);
    }
  }, [selectedDocumentacion, fechaEmision, fechaVencimiento, setValue]);

  const calculateVencimiento = () => {
    if (selectedDocumentacion) {
      // Si es universal, usar la fecha de vencimiento del documento
      if (selectedDocumentacion.esUniversal && selectedDocumentacion.fechaVencimiento) {
        return new Date(selectedDocumentacion.fechaVencimiento).toLocaleDateString('es-ES');
      }
      // Si no es universal y hay fecha de emisión, calcular
      if (fechaEmision && !selectedDocumentacion.esUniversal) {
        const emision = new Date(fechaEmision);
        emision.setDate(emision.getDate() + selectedDocumentacion.diasVigencia);
        return emision.toLocaleDateString('es-ES');
      }
    }
    return '-';
  };

  const handleFormSubmit = (data: RecursoDocumentoForm) => {
    if (selectedRecurso?.fechaBaja) {
      return; // Ya validado en el UI
    }

    onSubmit({
      ...data,
      recursoId: Number(data.recursoId),
      estadoId: data.estadoId ? Number(data.estadoId) : undefined,
    });
  };

  if (!isOpen) return null;

  // Filtrar recursos activos y no asignados
  const recursosDisponibles = recursosData?.recursos.filter(r => 
    !r.fechaBaja && (recursoDocumentacion || !assignedRecursos.includes(r.id))
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {recursoDocumentacion ? 'Editar Asignación' : 'Asignar Recurso'}
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
              disabled={!!recursoDocumentacion}
            >
              <option value="">Seleccionar recurso...</option>
              {recursosDisponibles.map((recurso) => (
                <option key={recurso.id} value={recurso.id}>
                  {recurso.codigo} - {recurso.apellido}, {recurso.nombre}
                </option>
              ))}
            </select>
            {!recursoDocumentacion && recursosDisponibles.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Todos los recursos disponibles ya están asignados a esta documentación.
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
              <p><strong>Fecha Alta:</strong> {selectedRecurso.fechaAlta ? new Date(selectedRecurso.fechaAlta).toLocaleDateString('es-ES') : 'No especificado'}</p>
            </div>
          )}

          {/* Campos de fechas específicas (solo si el documento no es universal) */}
          {selectedDocumentacion && !selectedDocumentacion.esUniversal && (
            <>
              <div>
                <label htmlFor="fechaEmision" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  {...register('fechaEmision')}
                  type="date"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fecha en que se emitió el documento
                </p>
              </div>

              <div>
                <label htmlFor="fechaTramitacion" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Tramitación
                </label>
                <input
                  {...register('fechaTramitacion')}
                  type="date"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fecha de inicio o recepción del documento
                </p>
              </div>

              <div>
                <label htmlFor="fechaVencimiento" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  {...register('fechaVencimiento', {
                    validate: (value) => {
                      if (value) {
                        const selectedDate = new Date(value);
                        const minDate = new Date();
                        minDate.setDate(minDate.getDate() + 1);
                        if (selectedDate < minDate) {
                          return 'La fecha de vencimiento debe ser posterior al día actual';
                        }
                      }
                      return true;
                    }
                  })}
                  type="date"
                  min={getMinDate()}
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fecha de vencimiento del documento (editable)
                </p>
                {fechaEmision && selectedDocumentacion && !fechaVencimiento && (
                  <p className="mt-1 text-xs text-blue-600">
                    Sugerencia calculada: {calculateVencimiento()}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Mostrar fechas universales si el documento es universal */}
          {selectedDocumentacion && selectedDocumentacion.esUniversal && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Fechas Universales (Solo Lectura)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={selectedDocumentacion.fechaEmision ? selectedDocumentacion.fechaEmision.split('T')[0] : ''}
                    className="input w-full bg-gray-100"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha universal - no editable
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Tramitación
                  </label>
                  <input
                    type="date"
                    value={selectedDocumentacion.fechaTramitacion ? selectedDocumentacion.fechaTramitacion.split('T')[0] : ''}
                    className="input w-full bg-gray-100"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha universal - no editable
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={selectedDocumentacion.fechaVencimiento ? selectedDocumentacion.fechaVencimiento.split('T')[0] : ''}
                    className="input w-full bg-gray-100"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha universal - no editable
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedDocumentacion && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>Documento:</strong> {selectedDocumentacion.codigo} - {selectedDocumentacion.descripcion}</p>
              <p><strong>Días de vigencia:</strong> {selectedDocumentacion.diasVigencia}</p>
              <p><strong>Días de anticipación:</strong> {selectedDocumentacion.diasAnticipacion}</p>
              <p><strong>Obligatorio:</strong> {selectedDocumentacion.esObligatorio ? 'Sí' : 'No'}</p>
              <p><strong>Universal:</strong> {selectedDocumentacion.esUniversal ? 'Sí' : 'No'}</p>
              {selectedDocumentacion.esUniversal && (
                <p className="text-blue-600 mt-2">
                  <strong>Documento Universal:</strong> Las fechas están predefinidas y no se pueden editar
                </p>
              )}
            </div>
          )}

          {selectedDocumentacion && !selectedDocumentacion.esUniversal && calculateVencimiento() !== '-' && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Fecha de vencimiento calculada (sugerencia):</strong> {calculateVencimiento()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Cálculo: Fecha emisión + {selectedDocumentacion.diasVigencia} días
              </p>
            </div>
          )}

          <div>
            <label htmlFor="estadoId" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              {...register('estadoId')}
              className="input w-full"
            >
              <option value="">Sin estado...</option>
              {estados?.map((estado) => (
                <option key={estado.id} value={estado.id}>
                  {estado.nombre}
                </option>
              ))}
            </select>
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
              {isLoading ? 'Guardando...' : recursoDocumentacion ? 'Actualizar' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecursoDocumentoModal;