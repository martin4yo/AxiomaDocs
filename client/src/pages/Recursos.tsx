import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Edit, Trash2, FileText, Search, Eye, AlertCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Recurso, RecursoDocumentacion } from '../types';
import { recursosService } from '../services/recursos';
import RecursoModal from '../components/Recursos/RecursoModal';
import DocumentoModal from '../components/Recursos/DocumentoModal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import ExportButtons from '../components/Common/ExportButtons';
import { getHighestLevelEstado, getProximosVencimientos } from '../utils/estadoUtils';
import { prepareRecursoData } from '../utils/exportUtils';
import { formatDateLocal } from '../utils/dateUtils';

const Recursos: React.FC = () => {
  const [isRecursoModalOpen, setIsRecursoModalOpen] = useState(false);
  const [isDocumentoModalOpen, setIsDocumentoModalOpen] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState<Recurso | null>(null);
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);
  const [editingDocumento, setEditingDocumento] = useState<RecursoDocumentacion | null>(null);
  const [deletingRecurso, setDeletingRecurso] = useState<Recurso | null>(null);
  const [deletingDocumento, setDeletingDocumento] = useState<RecursoDocumentacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDocuments, setShowDocuments] = useState<{[key: number]: boolean}>({});
  
  const queryClient = useQueryClient();

  const { data: recursosData, isLoading } = useQuery(
    ['recursos', currentPage, searchTerm],
    () => recursosService.getAll({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm 
    }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(recursosService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('recursos');
      setIsRecursoModalOpen(false);
      toast.success('Recurso creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear recurso');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Recurso> }) =>
      recursosService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('recursos');
        setIsRecursoModalOpen(false);
        setEditingRecurso(null);
        toast.success('Recurso actualizado correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar recurso');
      },
    }
  );

  const deleteMutation = useMutation(recursosService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('recursos');
      setDeletingRecurso(null);
      toast.success('Recurso eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar recurso');
    },
  });

  const addDocumentMutation = useMutation(
    ({ recursoId, data }: { recursoId: number; data: any }) =>
      recursosService.addDocument(recursoId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('recursos');
        setIsDocumentoModalOpen(false);
        setSelectedRecurso(null);
        toast.success('Documento asignado correctamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al asignar documento';
        toast.error(message);
      },
    }
  );

  const updateDocumentMutation = useMutation(
    ({ recursoDocId, data }: { recursoDocId: number; data: any }) =>
      recursosService.updateRecursoDocumentacion(recursoDocId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('recursos');
        setIsDocumentoModalOpen(false);
        setEditingDocumento(null);
        toast.success('Documento actualizado correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar documento');
      },
    }
  );

  const removeDocumentMutation = useMutation(recursosService.removeDocument, {
    onSuccess: () => {
      queryClient.invalidateQueries('recursos');
      setDeletingDocumento(null);
      toast.success('Documento removido correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover documento');
    },
  });

  const handleCreateRecurso = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateRecurso = (data: any) => {
    if (editingRecurso) {
      updateMutation.mutate({ id: editingRecurso.id, data });
    }
  };

  const handleDeleteRecurso = () => {
    if (deletingRecurso) {
      deleteMutation.mutate(deletingRecurso.id);
    }
  };

  const handleEditRecurso = (recurso: Recurso) => {
    setEditingRecurso(recurso);
    setIsRecursoModalOpen(true);
  };

  const handleAddDocument = async (recurso: Recurso) => {
    if (recurso.fechaBaja) {
      toast.error('No se pueden asignar documentos a recursos dados de baja');
      return;
    }
    
    // Si el recurso no tiene los documentos cargados, los obtenemos
    if (!recurso.recursoDocumentacion) {
      try {
        const fullRecurso = await recursosService.getById(recurso.id);
        setSelectedRecurso(fullRecurso);
      } catch (error) {
        console.error('Error obteniendo recurso:', error);
        setSelectedRecurso(recurso);
      }
    } else {
      setSelectedRecurso(recurso);
    }
    
    setIsDocumentoModalOpen(true);
  };

  const handleEditDocument = (documento: RecursoDocumentacion) => {
    setEditingDocumento(documento);
    setIsDocumentoModalOpen(true);
  };

  const handleSubmitDocument = (data: any) => {
    if (editingDocumento) {
      updateDocumentMutation.mutate({ recursoDocId: editingDocumento.id, data });
    } else if (selectedRecurso) {
      addDocumentMutation.mutate({ recursoId: selectedRecurso.id, data });
    }
  };

  const handleRemoveDocument = () => {
    if (deletingDocumento) {
      removeDocumentMutation.mutate(deletingDocumento.id);
    }
  };

  const handleCloseRecursoModal = () => {
    setIsRecursoModalOpen(false);
    setEditingRecurso(null);
  };

  const handleCloseDocumentoModal = () => {
    setIsDocumentoModalOpen(false);
    setEditingDocumento(null);
    setSelectedRecurso(null);
  };

  const toggleDocuments = (recursoId: number) => {
    setShowDocuments(prev => ({
      ...prev,
      [recursoId]: !prev[recursoId]
    }));
  };

  // Usar la nueva función de formateo de fechas locales


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
          <Users className="h-8 w-8 mr-3 text-sky-600" />
          Recursos
        </h1>
        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareRecursoData(recursosData?.recursos || [])}
            exportConfig={{
              filename: `recursos_${new Date().toISOString().split('T')[0]}`,
              title: 'Listado de Recursos',
              columns: [
                { key: 'codigo', label: 'Código', width: 15 },
                { key: 'apellido', label: 'Apellido', width: 20 },
                { key: 'nombre', label: 'Nombre', width: 20 },
                { key: 'cuil', label: 'CUIL', width: 15 },
                { key: 'telefono', label: 'Teléfono', width: 15 },
                { key: 'fechaAlta', label: 'Fecha Alta', width: 15 },
                { key: 'estadoNombre', label: 'Estado', width: 15 },
                { key: 'estadoCritico', label: 'Estado Crítico', width: 15 },
                { key: 'proximosVencimientos', label: 'Próximos Venc.', width: 15 },
                { key: 'fechaBaja', label: 'Fecha Baja', width: 15 }
              ]
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => setIsRecursoModalOpen(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} className="mr-2" />
            Nuevo Recurso
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
              placeholder="Buscar por código, nombre, apellido o CUIL..."
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

      {/* Recursos Table */}
      <div className="card">
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Apellido y Nombre</th>
                  <th>CUIL</th>
                  <th>Teléfono</th>
                  <th>Fecha Alta</th>
                  <th>Estado</th>
                  <th>Estado Crítico</th>
                  <th>Próximos Venc.</th>
                  <th className="w-48">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recursosData?.recursos.map((recurso) => (
                  <React.Fragment key={recurso.id}>
                    <tr className={recurso.fechaBaja ? 'opacity-60 bg-red-50' : ''}>
                      <td className="font-medium">{recurso.codigo}</td>
                      <td>{recurso.apellido}, {recurso.nombre}</td>
                      <td>{recurso.cuil || '-'}</td>
                      <td>{recurso.telefono || '-'}</td>
                      <td>{formatDateLocal(recurso.fechaAlta)}</td>
                      <td>
                        <span className={`status-badge ${recurso.fechaBaja ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {recurso.fechaBaja ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const estadoCritico = getHighestLevelEstado(recurso.recursoDocumentacion);
                          if (!estadoCritico) return '-';
                          return (
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: estadoCritico.color + '20', color: estadoCritico.color }}
                            >
                              {estadoCritico.nombre}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const proximosVenc = getProximosVencimientos(recurso.recursoDocumentacion);
                          if (proximosVenc.length === 0) return '-';
                          return (
                            <div className="flex items-center text-amber-600">
                              <AlertCircle size={14} className="mr-1" />
                              <span className="text-xs font-medium">
                                {proximosVenc.length} doc{proximosVenc.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleDocuments(recurso.id)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="Ver documentos"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleAddDocument(recurso)}
                            className="p-1 text-gray-600 hover:text-green-600"
                            title="Asignar documento"
                            disabled={!!recurso.fechaBaja}
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => handleEditRecurso(recurso)}
                            className="p-1 text-gray-600 hover:text-primary-600"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingRecurso(recurso)}
                            className="p-1 text-gray-600 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Documents Row */}
                    {showDocuments[recurso.id] && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="bg-gray-50 p-4 border-t">
                            <h4 className="font-medium mb-3">Documentos Asignados</h4>
                            {recurso.recursoDocumentacion && recurso.recursoDocumentacion.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2">Documento</th>
                                      <th className="text-left py-2">Fecha Emisión</th>
                                      <th className="text-left py-2">Fecha Tramitación</th>
                                      <th className="text-left py-2">Fecha Vencimiento</th>
                                      <th className="text-left py-2">Estado</th>
                                      <th className="text-left py-2 w-24">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {recurso.recursoDocumentacion.map((doc) => (
                                      <tr key={doc.id} className="border-b border-gray-100">
                                        <td className="py-2">
                                          {doc.documentacion?.codigo} - {doc.documentacion?.descripcion}
                                        </td>
                                        <td className="py-2">{formatDateLocal(doc.fechaEmision)}</td>
                                        <td className="py-2">{formatDateLocal(doc.fechaTramitacion)}</td>
                                        <td className="py-2">{formatDateLocal(doc.fechaVencimiento)}</td>
                                        <td className="py-2">
                                          {doc.estado ? (
                                            <span 
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                              style={{ backgroundColor: doc.estado.color + '20', color: doc.estado.color }}
                                            >
                                              {doc.estado.nombre}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="py-2">
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleEditDocument(doc)}
                                              className="p-1 text-gray-600 hover:text-primary-600"
                                              title="Editar documento"
                                            >
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              onClick={() => setDeletingDocumento(doc)}
                                              className="p-1 text-gray-600 hover:text-red-600"
                                              title="Remover documento"
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
                              <p className="text-gray-500 text-sm">No hay documentos asignados</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            
            {recursosData?.recursos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron recursos' : 'No hay recursos registrados'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {recursosData && recursosData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="flex items-center text-sm text-gray-700">
                Mostrando {((recursosData.pagination.currentPage - 1) * recursosData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(recursosData.pagination.currentPage * recursosData.pagination.itemsPerPage, recursosData.pagination.totalItems)} de{' '}
                {recursosData.pagination.totalItems} resultados
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
                  {currentPage} de {recursosData.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === recursosData.pagination.totalPages}
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
      <RecursoModal
        isOpen={isRecursoModalOpen}
        onClose={handleCloseRecursoModal}
        recurso={editingRecurso}
        onSubmit={editingRecurso ? handleUpdateRecurso : handleCreateRecurso}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <DocumentoModal
        isOpen={isDocumentoModalOpen}
        onClose={handleCloseDocumentoModal}
        recursoDocumentacion={editingDocumento}
        recursoId={selectedRecurso?.id || editingDocumento?.recursoId || 0}
        assignedDocuments={
          selectedRecurso?.recursoDocumentacion?.map(rd => rd.documentacionId) || []
        }
        onSubmit={handleSubmitDocument}
        isLoading={addDocumentMutation.isLoading || updateDocumentMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingRecurso}
        onClose={() => setDeletingRecurso(null)}
        onConfirm={handleDeleteRecurso}
        title="Eliminar Recurso"
        message={`¿Está seguro que desea eliminar el recurso "${deletingRecurso?.apellido}, ${deletingRecurso?.nombre}"?`}
        isLoading={deleteMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingDocumento}
        onClose={() => setDeletingDocumento(null)}
        onConfirm={handleRemoveDocument}
        title="Remover Documento"
        message={`¿Está seguro que desea remover el documento "${deletingDocumento?.documentacion?.descripcion}" del recurso?`}
        isLoading={removeDocumentMutation.isLoading}
      />
    </div>
  );
};

export default Recursos;