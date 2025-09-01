import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Edit, Trash2, Users, Search, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Documentacion, RecursoDocumentacion } from '../types';
import { documentacionService } from '../services/documentacion';
import DocumentacionModal from '../components/Documentacion/DocumentacionModal';
import RecursoDocumentoModal from '../components/Documentacion/RecursoDocumentoModal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import ExportButtons from '../components/Common/ExportButtons';
import { prepareDocumentacionData } from '../utils/exportUtils';

const DocumentacionPage: React.FC = () => {
  const [isDocumentacionModalOpen, setIsDocumentacionModalOpen] = useState(false);
  const [isRecursoModalOpen, setIsRecursoModalOpen] = useState(false);
  const [editingDocumentacion, setEditingDocumentacion] = useState<Documentacion | null>(null);
  const [selectedDocumentacion, setSelectedDocumentacion] = useState<Documentacion | null>(null);
  const [editingRecursoDoc, setEditingRecursoDoc] = useState<RecursoDocumentacion | null>(null);
  const [deletingDocumentacion, setDeletingDocumentacion] = useState<Documentacion | null>(null);
  const [deletingRecursoDoc, setDeletingRecursoDoc] = useState<RecursoDocumentacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showRecursos, setShowRecursos] = useState<{[key: number]: boolean}>({});
  
  const queryClient = useQueryClient();

  const { data: documentacionData, isLoading } = useQuery(
    ['documentacion', currentPage, searchTerm],
    () => documentacionService.getAll({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm 
    }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(documentacionService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('documentacion');
      setIsDocumentacionModalOpen(false);
      toast.success('Documentación creada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear documentación');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Documentacion> }) =>
      documentacionService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentacion');
        setIsDocumentacionModalOpen(false);
        setEditingDocumentacion(null);
        toast.success('Documentación actualizada correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar documentación');
      },
    }
  );

  const deleteMutation = useMutation(documentacionService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('documentacion');
      setDeletingDocumentacion(null);
      toast.success('Documentación eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar documentación');
    },
  });

  const addRecursoMutation = useMutation(
    ({ documentacionId, data }: { documentacionId: number; data: any }) =>
      documentacionService.addRecurso(documentacionId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentacion');
        setIsRecursoModalOpen(false);
        setSelectedDocumentacion(null);
        toast.success('Recurso asignado correctamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al asignar recurso';
        toast.error(message);
      },
    }
  );

  const updateRecursoDocMutation = useMutation(
    ({ recursoDocId, data }: { recursoDocId: number; data: any }) =>
      documentacionService.updateRecursoDocumentacion(recursoDocId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documentacion');
        setIsRecursoModalOpen(false);
        setEditingRecursoDoc(null);
        toast.success('Asignación actualizada correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar asignación');
      },
    }
  );

  const removeRecursoMutation = useMutation(documentacionService.removeRecurso, {
    onSuccess: () => {
      queryClient.invalidateQueries('documentacion');
      setDeletingRecursoDoc(null);
      toast.success('Asignación removida correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover asignación');
    },
  });

  const handleCreateDocumentacion = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateDocumentacion = (data: any) => {
    if (editingDocumentacion) {
      updateMutation.mutate({ id: editingDocumentacion.id, data });
    }
  };

  const handleDeleteDocumentacion = () => {
    if (deletingDocumentacion) {
      deleteMutation.mutate(deletingDocumentacion.id);
    }
  };

  const handleEditDocumentacion = (documentacion: Documentacion) => {
    setEditingDocumentacion(documentacion);
    setIsDocumentacionModalOpen(true);
  };

  const handleAddRecurso = async (documentacion: Documentacion) => {
    // Si la documentacion no tiene los recursos cargados, los obtenemos
    if (!documentacion.recursoDocumentacion) {
      try {
        const fullDocumentacion = await documentacionService.getById(documentacion.id);
        setSelectedDocumentacion(fullDocumentacion);
      } catch (error) {
        console.error('Error obteniendo documentacion:', error);
        setSelectedDocumentacion(documentacion);
      }
    } else {
      setSelectedDocumentacion(documentacion);
    }
    
    setIsRecursoModalOpen(true);
  };

  const handleEditRecursoDoc = (recursoDoc: RecursoDocumentacion) => {
    setEditingRecursoDoc(recursoDoc);
    setIsRecursoModalOpen(true);
  };

  const handleSubmitRecursoDoc = (data: any) => {
    if (editingRecursoDoc) {
      updateRecursoDocMutation.mutate({ recursoDocId: editingRecursoDoc.id, data });
    } else if (selectedDocumentacion) {
      addRecursoMutation.mutate({ documentacionId: selectedDocumentacion.id, data });
    }
  };

  const handleRemoveRecursoDoc = () => {
    if (deletingRecursoDoc) {
      removeRecursoMutation.mutate(deletingRecursoDoc.id);
    }
  };

  const handleCloseDocumentacionModal = () => {
    setIsDocumentacionModalOpen(false);
    setEditingDocumentacion(null);
  };

  const handleCloseRecursoModal = () => {
    setIsRecursoModalOpen(false);
    setEditingRecursoDoc(null);
    setSelectedDocumentacion(null);
  };

  const toggleRecursos = (documentacionId: number) => {
    setShowRecursos(prev => ({
      ...prev,
      [documentacionId]: !prev[documentacionId]
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="h-8 w-8 mr-3 text-emerald-600" />
          Documentación
        </h1>
        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareDocumentacionData(documentacionData?.documentacion || [])}
            exportConfig={{
              filename: `documentacion_${new Date().toISOString().split('T')[0]}`,
              title: 'Listado de Documentación',
              columns: [
                { key: 'codigo', label: 'Código', width: 15 },
                { key: 'descripcion', label: 'Descripción', width: 30 },
                { key: 'diasVigencia', label: 'Días Vigencia', width: 15 },
                { key: 'diasAnticipacion', label: 'Días Anticipación', width: 15 },
                { key: 'esObligatorio', label: 'Obligatorio', width: 15 },
                { key: 'esUniversal', label: 'Universal', width: 15 },
                { key: 'fechaEmision', label: 'Fecha Emisión', width: 15 },
                { key: 'fechaTramitacion', label: 'Fecha Tramitación', width: 15 },
                { key: 'fechaVencimiento', label: 'Fecha Vencimiento', width: 15 },
                { key: 'fechaCreacion', label: 'Fecha Creación', width: 15 }
              ]
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => setIsDocumentacionModalOpen(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} className="mr-2" />
            Nueva Documentación
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-content p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Documentacion Table */}
      <div className="card">
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Días Vigencia</th>
                  <th>Días Anticipación</th>
                  <th>Obligatorio</th>
                  <th>Universal</th>
                  <th>Fecha Vencimiento</th>
                  <th>Estado</th>
                  <th className="w-48">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentacionData?.documentacion.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <tr>
                      <td className="font-medium">{doc.codigo}</td>
                      <td>{doc.descripcion}</td>
                      <td className="text-center">{doc.diasVigencia}</td>
                      <td className="text-center">{doc.diasAnticipacion}</td>
                      <td className="text-center">
                        <span className={`status-badge ${doc.esObligatorio ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {doc.esObligatorio ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`status-badge ${doc.esUniversal ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {doc.esUniversal ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="text-center">
                        {doc.esUniversal && doc.fechaVencimiento ? 
                          new Date(doc.fechaVencimiento).toLocaleDateString('es-ES') : 
                          doc.esUniversal ? 'Sin calcular' : '-'
                        }
                      </td>
                      <td>
                        {doc.estado ? (
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: doc.estado.color + '20', color: doc.estado.color }}
                          >
                            {doc.estado.nombre}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleRecursos(doc.id)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="Ver recursos asignados"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleAddRecurso(doc)}
                            className="p-1 text-gray-600 hover:text-green-600"
                            title="Asignar recurso"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => handleEditDocumentacion(doc)}
                            className="p-1 text-gray-600 hover:text-primary-600"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingDocumentacion(doc)}
                            className="p-1 text-gray-600 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Resources Row */}
                    {showRecursos[doc.id] && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="bg-gray-50 p-4 border-t">
                            <h4 className="font-medium mb-3">Recursos Asignados</h4>
                            {doc.recursoDocumentacion && doc.recursoDocumentacion.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2">Recurso</th>
                                      <th className="text-left py-2">Fecha Emisión</th>
                                      <th className="text-left py-2">Fecha Tramitación</th>
                                      <th className="text-left py-2">Fecha Vencimiento</th>
                                      <th className="text-left py-2">Estado</th>
                                      <th className="text-left py-2 w-24">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {doc.recursoDocumentacion.map((recursoDoc) => (
                                      <tr key={recursoDoc.id} className="border-b border-gray-100">
                                        <td className="py-2">
                                          {recursoDoc.recurso?.codigo} - {recursoDoc.recurso?.apellido}, {recursoDoc.recurso?.nombre}
                                        </td>
                                        <td className="py-2">{formatDate(recursoDoc.fechaEmision)}</td>
                                        <td className="py-2">{formatDate(recursoDoc.fechaTramitacion)}</td>
                                        <td className="py-2">{formatDate(recursoDoc.fechaVencimiento)}</td>
                                        <td className="py-2">
                                          {recursoDoc.estado ? (
                                            <span 
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                              style={{ backgroundColor: recursoDoc.estado.color + '20', color: recursoDoc.estado.color }}
                                            >
                                              {recursoDoc.estado.nombre}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="py-2">
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleEditRecursoDoc(recursoDoc)}
                                              className="p-1 text-gray-600 hover:text-primary-600"
                                              title="Editar asignación"
                                            >
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              onClick={() => setDeletingRecursoDoc(recursoDoc)}
                                              className="p-1 text-gray-600 hover:text-red-600"
                                              title="Remover asignación"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No hay recursos asignados</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            
            {documentacionData?.documentacion.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontró documentación' : 'No hay documentación registrada'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {documentacionData && documentacionData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="flex items-center text-sm text-gray-700">
                Mostrando {((documentacionData.pagination.currentPage - 1) * documentacionData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(documentacionData.pagination.currentPage * documentacionData.pagination.itemsPerPage, documentacionData.pagination.totalItems)} de{' '}
                {documentacionData.pagination.totalItems} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Anterior
                </button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} de {documentacionData.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === documentacionData.pagination.totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DocumentacionModal
        isOpen={isDocumentacionModalOpen}
        onClose={handleCloseDocumentacionModal}
        documentacion={editingDocumentacion}
        onSubmit={editingDocumentacion ? handleUpdateDocumentacion : handleCreateDocumentacion}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <RecursoDocumentoModal
        isOpen={isRecursoModalOpen}
        onClose={handleCloseRecursoModal}
        recursoDocumentacion={editingRecursoDoc}
        documentacionId={selectedDocumentacion?.id || editingRecursoDoc?.documentacionId || 0}
        assignedRecursos={
          selectedDocumentacion?.recursoDocumentacion?.map(rd => rd.recursoId) || []
        }
        onSubmit={handleSubmitRecursoDoc}
        isLoading={addRecursoMutation.isLoading || updateRecursoDocMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingDocumentacion}
        onClose={() => setDeletingDocumentacion(null)}
        onConfirm={handleDeleteDocumentacion}
        title="Eliminar Documentación"
        message={`¿Está seguro que desea eliminar la documentación "${deletingDocumentacion?.descripcion}"?`}
        isLoading={deleteMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingRecursoDoc}
        onClose={() => setDeletingRecursoDoc(null)}
        onConfirm={handleRemoveRecursoDoc}
        title="Remover Asignación"
        message={`¿Está seguro que desea remover la asignación del recurso "${deletingRecursoDoc?.recurso?.apellido}, ${deletingRecursoDoc?.recurso?.nombre}"?`}
        isLoading={removeRecursoMutation.isLoading}
      />
    </div>
  );
};

export default DocumentacionPage;