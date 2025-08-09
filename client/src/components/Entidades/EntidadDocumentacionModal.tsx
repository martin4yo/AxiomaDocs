import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { X } from 'lucide-react';
import { EntidadDocumentacion, Documentacion } from '../../types';
import { documentacionService } from '../../services/documentacion';

interface EntidadDocumentacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidadDocumentacion?: EntidadDocumentacion | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  entidadId: number;
  assignedDocumentacion?: number[];
}

interface EntidadDocumentacionForm {
  documentacionId: number;
  esInhabilitante: boolean;
  enviarPorMail: boolean;
  mailDestino?: string;
  // Campos de fechas específicas por entidad (solo si el documento no es universal)
  fechaEmision?: string;
  fechaTramitacion?: string;
}

const EntidadDocumentacionModal: React.FC<EntidadDocumentacionModalProps> = ({
  isOpen,
  onClose,
  entidadDocumentacion,
  onSubmit,
  isLoading,
  entidadId: _entidadId,
  assignedDocumentacion = [],
}) => {
  const [selectedDoc, setSelectedDoc] = useState<Documentacion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EntidadDocumentacionForm>();

  const documentacionId = watch('documentacionId');
  const enviarPorMail = watch('enviarPorMail');
  const fechaEmision = watch('fechaEmision');

  const { data: documentacionList } = useQuery(
    'documentacion-all',
    () => documentacionService.getAll({ limit: 100 }),
    { enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      if (entidadDocumentacion) {
        reset({
          documentacionId: entidadDocumentacion.documentacionId,
          esInhabilitante: entidadDocumentacion.esInhabilitante,
          enviarPorMail: entidadDocumentacion.enviarPorMail,
          mailDestino: entidadDocumentacion.mailDestino || '',
          fechaEmision: entidadDocumentacion.fechaEmision ? entidadDocumentacion.fechaEmision.split('T')[0] : '',
          fechaTramitacion: entidadDocumentacion.fechaTramitacion ? entidadDocumentacion.fechaTramitacion.split('T')[0] : '',
        });
        setSelectedDoc(entidadDocumentacion.documentacion || null);
      } else {
        reset({
          documentacionId: 0,
          esInhabilitante: false,
          enviarPorMail: false,
          mailDestino: '',
          fechaEmision: '',
          fechaTramitacion: '',
        });
        setSelectedDoc(null);
      }
    }
  }, [isOpen, entidadDocumentacion, reset]);

  useEffect(() => {
    if (documentacionId && documentacionList) {
      const doc = documentacionList.documentacion.find(d => d.id === Number(documentacionId));
      setSelectedDoc(doc || null);
    }
  }, [documentacionId, documentacionList]);

  const calculateVencimiento = () => {
    if (selectedDoc && !selectedDoc.esUniversal && fechaEmision && selectedDoc.diasVigencia) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + selectedDoc.diasVigencia);
      return emision.toLocaleDateString('es-ES');
    }
    return '';
  };

  const handleFormSubmit = (data: EntidadDocumentacionForm) => {
    onSubmit({
      ...data,
      documentacionId: Number(data.documentacionId),
    });
  };

  if (!isOpen) return null;

  const documentacionDisponible = documentacionList?.documentacion.filter(doc => 
    entidadDocumentacion || !assignedDocumentacion.includes(doc.id)
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {entidadDocumentacion ? 'Editar Documentación' : 'Asignar Documentación'}
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
            <label htmlFor="documentacionId" className="block text-sm font-medium text-gray-700 mb-1">
              Documentación *
            </label>
            <select
              {...register('documentacionId', { required: 'Seleccione una documentación' })}
              className="input w-full"
              disabled={!!entidadDocumentacion}
            >
              <option value="">Seleccionar documentación...</option>
              {documentacionDisponible.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.codigo} - {doc.descripcion}
                </option>
              ))}
            </select>
            {errors.documentacionId && (
              <p className="mt-1 text-sm text-red-600">{errors.documentacionId.message}</p>
            )}
            {!entidadDocumentacion && documentacionDisponible.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Toda la documentación disponible ya está asignada a esta entidad.
              </p>
            )}
          </div>

          {selectedDoc && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>Días de vigencia:</strong> {selectedDoc.diasVigencia}</p>
              <p><strong>Días de anticipación:</strong> {selectedDoc.diasAnticipacion}</p>
              <p><strong>Obligatorio:</strong> {selectedDoc.esObligatorio ? 'Sí' : 'No'}</p>
              <p><strong>Universal:</strong> {selectedDoc.esUniversal ? 'Sí' : 'No'}</p>
              {selectedDoc.esUniversal && (
                <p className="text-blue-600 mt-2">
                  <strong>Documento Universal:</strong> Las fechas están predefinidas y no se pueden editar
                </p>
              )}
            </div>
          )}

          <div className="flex items-center">
            <input
              {...register('esInhabilitante')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="esInhabilitante" className="ml-2 block text-sm text-gray-900">
              Es inhabilitante
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('enviarPorMail')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="enviarPorMail" className="ml-2 block text-sm text-gray-900">
              Enviar por mail
            </label>
          </div>

          {enviarPorMail && (
            <div>
              <label htmlFor="mailDestino" className="block text-sm font-medium text-gray-700 mb-1">
                Mail de destino *
              </label>
              <input
                {...register('mailDestino', { 
                  required: enviarPorMail ? 'El mail de destino es requerido' : false,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email inválido'
                  }
                })}
                type="email"
                className="input w-full"
                placeholder="correo@ejemplo.com"
              />
              {errors.mailDestino && (
                <p className="mt-1 text-sm text-red-600">{errors.mailDestino.message}</p>
              )}
            </div>
          )}

          {/* Campos de fechas específicas (solo si el documento no es universal) */}
          {selectedDoc && !selectedDoc.esUniversal && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Fechas Específicas para esta Entidad</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Fecha específica de emisión para esta entidad
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
                    Fecha específica de tramitación para esta entidad
                  </p>
                </div>
              </div>

              {/* Mostrar fecha de vencimiento calculada para documentos no universales */}
              {calculateVencimiento() && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Fecha de vencimiento calculada:</strong> {calculateVencimiento()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Cálculo: Fecha emisión + {selectedDoc?.diasVigencia} días de vigencia
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mostrar fechas universales si el documento es universal */}
          {selectedDoc && selectedDoc.esUniversal && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Fechas Universales (Solo Lectura)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={selectedDoc.fechaEmision ? selectedDoc.fechaEmision.split('T')[0] : ''}
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
                    value={selectedDoc.fechaTramitacion ? selectedDoc.fechaTramitacion.split('T')[0] : ''}
                    className="input w-full bg-gray-100"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha universal - no editable
                  </p>
                </div>
              </div>

              {/* Mostrar fecha de vencimiento universal */}
              {selectedDoc.fechaVencimiento && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Fecha de vencimiento:</strong> {new Date(selectedDoc.fechaVencimiento).toLocaleDateString('es-ES')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Fecha universal predefinida
                  </p>
                </div>
              )}
            </div>
          )}

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
              {isLoading ? 'Guardando...' : entidadDocumentacion ? 'Actualizar' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntidadDocumentacionModal;