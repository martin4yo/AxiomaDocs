import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image, File } from 'lucide-react';
import toast from 'react-hot-toast';

interface ArchivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: FileList, descripcion: string) => void;
  isLoading: boolean;
  title: string;
}

interface FilePreview {
  file: File;
  preview?: string;
}

const ArchivoModal: React.FC<ArchivoModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isLoading,
  title
}) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

  const validateFile = (file: File): boolean => {
    // Validar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Tipo de archivo no permitido: ${file.name}`);
      return false;
    }

    // Validar extensión
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      toast.error(`Extensión no permitida: ${file.name}`);
      return false;
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`Archivo muy grande: ${file.name} (máximo 10MB)`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFiles: FileList) => {
    const validFiles: FilePreview[] = [];

    Array.from(selectedFiles).forEach(file => {
      if (validateFile(file)) {
        const filePreview: FilePreview = { file };

        // Crear preview para imágenes
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            filePreview.preview = e.target?.result as string;
            setFiles(prev => [...prev]);
          };
          reader.readAsDataURL(file);
        }

        validFiles.push(filePreview);
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      toast.error('Debe seleccionar al menos un archivo');
      return;
    }

    const fileList = new DataTransfer();
    files.forEach(fp => fileList.items.add(fp.file));

    onUpload(fileList.files, descripcion);
  };

  const handleClose = () => {
    setFiles([]);
    setDescripcion('');
    setDragOver(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Zona de drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary btn-md"
                disabled={isLoading}
              >
                Seleccionar Archivos
              </button>
              <p className="mt-2 text-sm text-gray-500">
                o arrastra archivos aquí
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (máx. 10MB c/u)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* Lista de archivos seleccionados */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">
                Archivos seleccionados ({files.length})
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {files.map((filePreview, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {filePreview.preview ? (
                        <img
                          src={filePreview.preview}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="text-gray-500">
                          {getFileIcon(filePreview.file.type)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {filePreview.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(filePreview.file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isLoading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="input w-full resize-none"
              placeholder="Descripción de los archivos..."
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary btn-md"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary btn-md"
            disabled={isLoading || files.length === 0}
          >
            {isLoading ? 'Subiendo...' : `Subir ${files.length} archivo${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchivoModal;