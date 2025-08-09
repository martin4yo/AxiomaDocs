import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from 'react-query';
import { X } from 'lucide-react';
import { Documentacion } from '../../types';
import { estadosService } from '../../services/estados';

interface DocumentacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentacion?: Documentacion | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

interface DocumentacionForm {
  codigo: string;
  descripcion: string;
  diasVigencia: number;
  diasAnticipacion: number;
  esObligatorio: boolean;
  esUniversal: boolean;
  estadoVencimientoId: number;
  estadoId?: number;
  // Campos para documentos universales
  fechaEmision?: string;
  fechaTramitacion?: string;
}

const DocumentacionModal: React.FC<DocumentacionModalProps> = ({
  isOpen,
  onClose,
  documentacion,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<DocumentacionForm>();

  const esUniversal = useWatch({
    control,
    name: 'esUniversal',
    defaultValue: false,
  });

  const fechaEmision = useWatch({
    control,
    name: 'fechaEmision',
    defaultValue: '',
  });

  const diasVigencia = useWatch({
    control,
    name: 'diasVigencia',
    defaultValue: 365,
  });

  const { data: estados } = useQuery(
    'estados',
    estadosService.getAll,
    { enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      if (documentacion) {
        reset({
          codigo: documentacion.codigo,
          descripcion: documentacion.descripcion,
          diasVigencia: documentacion.diasVigencia,
          diasAnticipacion: documentacion.diasAnticipacion,
          esObligatorio: documentacion.esObligatorio,
          esUniversal: documentacion.esUniversal || false,
          estadoVencimientoId: documentacion.estadoVencimientoId,
          estadoId: documentacion.estadoId || 0,
          fechaEmision: documentacion.fechaEmision ? documentacion.fechaEmision.split('T')[0] : '',
          fechaTramitacion: documentacion.fechaTramitacion ? documentacion.fechaTramitacion.split('T')[0] : '',
        });
      } else {
        reset({
          codigo: '',
          descripcion: '',
          diasVigencia: 365,
          diasAnticipacion: 30,
          esObligatorio: false,
          esUniversal: false,
          estadoVencimientoId: 0,
          estadoId: 0,
          fechaEmision: '',
          fechaTramitacion: '',
        });
      }
    }
  }, [isOpen, documentacion, reset]);

  // Limpiar fechas y estado cuando se desmarca el checkbox de universal
  useEffect(() => {
    if (!esUniversal) {
      setValue('fechaEmision', '');
      setValue('fechaTramitacion', '');
      setValue('estadoId', 0);
    }
  }, [esUniversal, setValue]);

  const calculateVencimiento = () => {
    if (esUniversal && fechaEmision && diasVigencia) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + Number(diasVigencia));
      return emision.toLocaleDateString('es-ES');
    }
    return '';
  };

  const handleFormSubmit = (data: DocumentacionForm) => {
    onSubmit({
      ...data,
      diasVigencia: Number(data.diasVigencia),
      diasAnticipacion: Number(data.diasAnticipacion),
      estadoVencimientoId: Number(data.estadoVencimientoId),
      estadoId: data.estadoId && Number(data.estadoId) > 0 ? Number(data.estadoId) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {documentacion ? 'Editar Documentación' : 'Nueva Documentación'}
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
                placeholder="Código del documento"
              />
              {errors.codigo && (
                <p className="mt-1 text-sm text-red-600">{errors.codigo.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="estadoVencimientoId" className="block text-sm font-medium text-gray-700 mb-1">
                Estado de Vencimiento *
              </label>
              <select
                {...register('estadoVencimientoId', { required: 'Seleccione un estado' })}
                className="input w-full"
              >
                <option value="">Seleccionar estado...</option>
                {estados?.map((estado) => (
                  <option key={estado.id} value={estado.id}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
              {errors.estadoVencimientoId && (
                <p className="mt-1 text-sm text-red-600">{errors.estadoVencimientoId.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Estado que se asigna al documento cuando vence
              </p>
            </div>
          </div>


          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <input
              {...register('descripcion', { required: 'La descripción es requerida' })}
              type="text"
              className="input w-full"
              placeholder="Descripción del documento"
            />
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="diasVigencia" className="block text-sm font-medium text-gray-700 mb-1">
                Días de Vigencia *
              </label>
              <input
                {...register('diasVigencia', { 
                  required: 'Los días de vigencia son requeridos',
                  min: { value: 1, message: 'Mínimo 1 día' }
                })}
                type="number"
                min="1"
                className="input w-full"
                placeholder="365"
              />
              {errors.diasVigencia && (
                <p className="mt-1 text-sm text-red-600">{errors.diasVigencia.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Días que el documento permanece vigente
              </p>
            </div>

            <div>
              <label htmlFor="diasAnticipacion" className="block text-sm font-medium text-gray-700 mb-1">
                Días de Anticipación *
              </label>
              <input
                {...register('diasAnticipacion', { 
                  required: 'Los días de anticipación son requeridos',
                  min: { value: 1, message: 'Mínimo 1 día' }
                })}
                type="number"
                min="1"
                className="input w-full"
                placeholder="30"
              />
              {errors.diasAnticipacion && (
                <p className="mt-1 text-sm text-red-600">{errors.diasAnticipacion.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Días de aviso antes del vencimiento
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                {...register('esObligatorio')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="esObligatorio" className="ml-2 block text-sm text-gray-700">
                Documento Obligatorio
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                {...register('esUniversal')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="esUniversal" className="ml-2 block text-sm text-gray-700">
                Documento Universal
              </label>
            </div>
          </div>

          {/* Campos de fechas para documentos universales */}
          {esUniversal && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Documento Universal
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Al marcar este documento como universal, las fechas y estado definidos aquí se aplicarán automáticamente 
                a todas las asignaciones y no podrán editarse individualmente.
              </p>
              
              {/* Campo de estado para documentos universales */}
              <div className="mb-4">
                <label htmlFor="estadoId" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado del Documento
                </label>
                <select
                  {...register('estadoId')}
                  className="input w-full"
                  disabled={!esUniversal}
                >
                  <option value="">Seleccionar estado...</option>
                  {estados?.map((estado) => (
                    <option key={estado.id} value={estado.id}>
                      {estado.nombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Estado actual del documento universal
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fechaEmision" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión *
                  </label>
                  <input
                    {...register('fechaEmision', { 
                      required: esUniversal ? 'La fecha de emisión es requerida para documentos universales' : false 
                    })}
                    type="date"
                    className="input w-full"
                    disabled={!esUniversal}
                  />
                  {errors.fechaEmision && (
                    <p className="mt-1 text-sm text-red-600">{errors.fechaEmision.message}</p>
                  )}
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
                    disabled={!esUniversal}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha en que se inició la tramitación
                  </p>
                </div>
              </div>

              {/* Mostrar fecha de vencimiento calculada */}
              {calculateVencimiento() && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Fecha de vencimiento calculada:</strong> {calculateVencimiento()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Cálculo: Fecha emisión + {diasVigencia} días de vigencia
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Información</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Días de Vigencia:</strong> Tiempo que el documento es válido desde la fecha de emisión</li>
              <li>• <strong>Días de Anticipación:</strong> Cuántos días antes del vencimiento enviar notificaciones</li>
              <li>• <strong>Estado de Vencimiento:</strong> Estado asignado automáticamente cuando vence el documento</li>
              <li>• <strong>Obligatorio:</strong> Si es requerido para el recurso</li>
              <li>• <strong>Universal:</strong> Si está marcado, las fechas del documento se aplicarán a todas las asignaciones automáticamente</li>
            </ul>
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
              {isLoading ? 'Guardando...' : documentacion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentacionModal;