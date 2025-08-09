import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { X } from 'lucide-react';
import { RecursoDocumentacion, Documentacion } from '../../types';
import { documentacionService } from '../../services/documentacion';
import { estadosService } from '../../services/estados';

interface DocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  recursoDocumentacion?: RecursoDocumentacion | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  recursoId: number;
  assignedDocuments?: number[]; // IDs de documentos ya asignados
}

interface DocumentoForm {
  documentacionId: number;
  fechaEmision?: string;
  fechaTramitacion?: string;
  estadoId?: number;
}

const DocumentoModal: React.FC<DocumentoModalProps> = ({
  isOpen,
  onClose,
  recursoDocumentacion,
  onSubmit,
  isLoading,
  recursoId: _recursoId,
  assignedDocuments = [],
}) => {
  const [selectedDoc, setSelectedDoc] = useState<Documentacion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue: _setValue,
    formState: { errors },
  } = useForm<DocumentoForm>();

  const fechaEmision = watch('fechaEmision');
  const documentacionId = watch('documentacionId');

  const { data: documentacionList } = useQuery(
    'documentacion-all',
    () => documentacionService.getAll({ limit: 100 }),
    { enabled: isOpen }
  );

  const { data: estados } = useQuery(
    'estados',
    estadosService.getAll,
    { enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      if (recursoDocumentacion) {
        reset({
          documentacionId: recursoDocumentacion.documentacionId,
          fechaEmision: recursoDocumentacion.fechaEmision 
            ? new Date(recursoDocumentacion.fechaEmision).toISOString().split('T')[0] 
            : '',
          fechaTramitacion: recursoDocumentacion.fechaTramitacion 
            ? new Date(recursoDocumentacion.fechaTramitacion).toISOString().split('T')[0] 
            : '',
          estadoId: recursoDocumentacion.estadoId || undefined,
        });
        setSelectedDoc(recursoDocumentacion.documentacion || null);
      } else {
        reset({
          documentacionId: 0,
          fechaEmision: '',
          fechaTramitacion: '',
          estadoId: undefined,
        });
        setSelectedDoc(null);
      }
    }
  }, [isOpen, recursoDocumentacion, reset]);

  useEffect(() => {
    if (documentacionId && documentacionList) {
      const doc = documentacionList.documentacion.find(d => d.id === Number(documentacionId));
      setSelectedDoc(doc || null);
    }
  }, [documentacionId, documentacionList]);

  const calculateVencimiento = () => {
    if (fechaEmision && selectedDoc) {
      const emision = new Date(fechaEmision);
      emision.setDate(emision.getDate() + selectedDoc.diasVigencia);
      return emision.toLocaleDateString('es-ES');
    }
    return '-';
  };

  const handleFormSubmit = (data: DocumentoForm) => {
    onSubmit({
      ...data,
      documentacionId: Number(data.documentacionId),
      estadoId: data.estadoId ? Number(data.estadoId) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {recursoDocumentacion ? 'Editar Documento' : 'Asignar Documento'}
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
              Documento *
            </label>
            <select
              {...register('documentacionId', { required: 'Seleccione un documento' })}
              className="input w-full"
              disabled={!!recursoDocumentacion}
            >
              <option value="">Seleccionar documento...</option>
              {documentacionList?.documentacion
                .filter(doc => recursoDocumentacion || !assignedDocuments.includes(doc.id))
                .map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.codigo} - {doc.descripcion}
                </option>
              ))}
            </select>
            {errors.documentacionId && (
              <p className="mt-1 text-sm text-red-600">{errors.documentacionId.message}</p>
            )}
            {!recursoDocumentacion && documentacionList?.documentacion
              .filter(doc => !assignedDocuments.includes(doc.id)).length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Todos los documentos disponibles ya están asignados a este recurso.
              </p>
            )}
          </div>

          {selectedDoc && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>Días de vigencia:</strong> {selectedDoc.diasVigencia}</p>
              <p><strong>Días de anticipación:</strong> {selectedDoc.diasAnticipacion}</p>
              <p><strong>Obligatorio:</strong> {selectedDoc.esObligatorio ? 'Sí' : 'No'}</p>
            </div>
          )}

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

          {fechaEmision && selectedDoc && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Fecha de vencimiento calculada:</strong> {calculateVencimiento()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Cálculo: Fecha emisión + {selectedDoc.diasVigencia} días
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

export default DocumentoModal;