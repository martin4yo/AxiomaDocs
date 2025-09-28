import React, { useState, useEffect } from 'react';
import { Plus, Download, Edit2, Trash2, FileText, Image, File, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { DocumentoArchivo } from '../../types';
import ArchivoModal from './ArchivoModal';

interface ArchivoSubGridProps {
  tipo: 'documentacion' | 'recurso-documentacion' | 'entidad-documentacion';
  referenceId: number;
  className?: string;
}

interface EditDescripcionModalProps {
  isOpen: boolean;
  archivo: DocumentoArchivo | null;
  onClose: () => void;
  onSave: (id: number, descripcion: string) => void;
  isLoading: boolean;
}

const EditDescripcionModal: React.FC<EditDescripcionModalProps> = ({
  isOpen,
  archivo,
  onClose,
  onSave,
  isLoading
}) => {
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (archivo) {
      setDescripcion(archivo.descripcion || '');
    }
  }, [archivo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (archivo) {
      onSave(archivo.id, descripcion);
    }
  };

  if (!isOpen || !archivo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Editar Descripción</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo: {archivo.filename}
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="input w-full resize-none"
              placeholder="Descripción del archivo..."
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end space-x-3">
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
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ArchivoSubGrid: React.FC<ArchivoSubGridProps> = ({
  tipo,
  referenceId,
  className = ''
}) => {
  const [archivos, setArchivos] = useState<DocumentoArchivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archivoToEdit, setArchivoToEdit] = useState<DocumentoArchivo | null>(null);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) return <File size={16} className="text-gray-500" />;
    if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-500" />;
    return <File size={16} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadArchivos = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/archivos/${tipo}/${referenceId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error al cargar archivos');
      }

      const data = await response.json();
      setArchivos(data.data || []);
    } catch (error) {
      console.error('Error loading archivos:', error);
      toast.error('Error al cargar los archivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchivos();
  }, [tipo, referenceId]);

  const handleUpload = async (files: FileList, descripcion: string) => {
    try {
      setIsUploadLoading(true);

      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      if (descripcion) {
        formData.append('descripcion', descripcion);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/archivos/${tipo}/${referenceId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir archivos');
      }

      toast.success('Archivos subidos correctamente');
      setUploadModalOpen(false);
      loadArchivos();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir archivos');
    } finally {
      setIsUploadLoading(false);
    }
  };

  const handleDownload = async (archivo: DocumentoArchivo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/archivos/${archivo.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al descargar archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = archivo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Archivo descargado');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar archivo');
    }
  };

  const handleEdit = (archivo: DocumentoArchivo) => {
    setArchivoToEdit(archivo);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (id: number, descripcion: string) => {
    try {
      setIsEditLoading(true);

      const response = await fetch(`${API_BASE_URL}/archivos/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ descripcion })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar descripción');
      }

      toast.success('Descripción actualizada');
      setEditModalOpen(false);
      setArchivoToEdit(null);
      loadArchivos();
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('Error al actualizar descripción');
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleDelete = async (archivo: DocumentoArchivo) => {
    if (!confirm(`¿Está seguro de eliminar el archivo "${archivo.filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/archivos/${archivo.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error al eliminar archivo');
      }

      toast.success('Archivo eliminado');
      loadArchivos();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Error al eliminar archivo');
    }
  };

  const getTipoTitle = () => {
    switch (tipo) {
      case 'documentacion':
        return 'Documentos Adjuntos';
      case 'recurso-documentacion':
        return 'Archivos del Recurso';
      case 'entidad-documentacion':
        return 'Archivos de la Entidad';
      default:
        return 'Archivos';
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">
          {getTipoTitle()} ({archivos.length})
        </h4>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn btn-primary btn-sm"
          disabled={loading}
        >
          <Plus size={16} className="mr-2" />
          Agregar Archivos
        </button>
      </div>

      <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : archivos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay archivos adjuntos</p>
              <p className="text-sm">Haga clic en "Agregar Archivos" para subir documentos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">
                      Archivo
                    </th>
                    <th className="text-left py-2">
                      Descripción
                    </th>
                    <th className="text-left py-2">
                      Tamaño
                    </th>
                    <th className="text-left py-2">
                      Versión
                    </th>
                    <th className="text-left py-2">
                      Subido
                    </th>
                    <th className="text-left py-2">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {archivos.map((archivo) => (
                    <tr key={archivo.id}>
                      <td className="py-2">
                        <div className="flex items-center">
                          {getFileIcon(archivo.mimeType)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {archivo.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-2">
                        {archivo.descripcion || '-'}
                      </td>
                      <td className="py-2">
                        {formatFileSize(archivo.size)}
                      </td>
                      <td className="py-2">
                        v{archivo.version}
                      </td>
                      <td className="py-2">
                        <div>
                          {formatDate(archivo.createdAt)}
                        </div>
                        {archivo.creador && (
                          <div className="text-xs text-gray-400">
                            por {archivo.creador.nombre} {archivo.creador.apellido}
                          </div>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownload(archivo)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Descargar"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(archivo)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Editar descripción"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(archivo)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <ArchivoModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        isLoading={isUploadLoading}
        title={`Agregar Archivos - ${getTipoTitle()}`}
      />

      <EditDescripcionModal
        isOpen={editModalOpen}
        archivo={archivoToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setArchivoToEdit(null);
        }}
        onSave={handleSaveEdit}
        isLoading={isEditLoading}
      />
    </div>
  );
};

export default ArchivoSubGrid;