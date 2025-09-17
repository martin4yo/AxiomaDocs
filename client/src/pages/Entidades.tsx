import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Edit, Trash2, FileText, Users, Search, Building2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { Entidad, EntidadDocumentacion, EntidadRecurso } from '../types';
import { entidadesService } from '../services/entidades';
import EntidadModal from '../components/Entidades/EntidadModal';
import EntidadDocumentacionModal from '../components/Entidades/EntidadDocumentacionModal';
import EntidadRecursoModal from '../components/Entidades/EntidadRecursoModal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import ExportButtons from '../components/Common/ExportButtons';
import ArchivoSubGrid from '../components/Archivos/ArchivoSubGrid';
import { prepareEntidadData } from '../utils/exportUtils';
import { formatDateLocal } from '../utils/dateUtils';
import { getHighestLevelEstado } from '../utils/estadoUtils';
import { isDocumentoUniversal } from '../utils/documentHelpers';

const Entidades: React.FC = () => {
  const [isEntidadModalOpen, setIsEntidadModalOpen] = useState(false);
  const [isDocumentacionModalOpen, setIsDocumentacionModalOpen] = useState(false);
  const [isRecursoModalOpen, setIsRecursoModalOpen] = useState(false);
  const [editingEntidad, setEditingEntidad] = useState<Entidad | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<Entidad | null>(null);
  const [editingDocumentacion, setEditingDocumentacion] = useState<EntidadDocumentacion | null>(null);
  const [editingRecurso, setEditingRecurso] = useState<EntidadRecurso | null>(null);
  const [deletingEntidad, setDeletingEntidad] = useState<Entidad | null>(null);
  const [deletingDocumentacion, setDeletingDocumentacion] = useState<EntidadDocumentacion | null>(null);
  const [deletingRecurso, setDeletingRecurso] = useState<EntidadRecurso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDocumentacion, setShowDocumentacion] = useState<{[key: number]: boolean}>({});
  const [showRecursos, setShowRecursos] = useState<{[key: number]: boolean}>({});
  const [showDocumentacionArchivos, setShowDocumentacionArchivos] = useState<{[key: number]: boolean}>({});
  
  const queryClient = useQueryClient();

  const { data: entidadesData, isLoading } = useQuery(
    ['entidades', currentPage, searchTerm],
    () => entidadesService.getAll({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm 
    }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(entidadesService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('entidades');
      setIsEntidadModalOpen(false);
      toast.success('Entidad creada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear entidad');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Entidad> }) =>
      entidadesService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('entidades');
        setIsEntidadModalOpen(false);
        setEditingEntidad(null);
        toast.success('Entidad actualizada correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar entidad');
      },
    }
  );

  const deleteMutation = useMutation(entidadesService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('entidades');
      setDeletingEntidad(null);
      toast.success('Entidad eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar entidad');
    },
  });

  const addDocumentacionMutation = useMutation(
    ({ entidadId, data }: { entidadId: number; data: any }) =>
      entidadesService.addDocumentacion(entidadId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('entidades');
        setIsDocumentacionModalOpen(false);
        setSelectedEntidad(null);
        toast.success('Documentación asignada correctamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al asignar documentación';
        toast.error(message);
      },
    }
  );

  const updateDocumentacionMutation = useMutation(
    ({ entidadDocId, data }: { entidadDocId: number; data: any }) =>
      entidadesService.updateEntidadDocumentacion(entidadDocId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('entidades');
        setIsDocumentacionModalOpen(false);
        setEditingDocumentacion(null);
        toast.success('Documentación actualizada correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar documentación');
      },
    }
  );

  const removeDocumentacionMutation = useMutation(entidadesService.removeDocumentacion, {
    onSuccess: () => {
      queryClient.invalidateQueries('entidades');
      setDeletingDocumentacion(null);
      toast.success('Documentación removida correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover documentación');
    },
  });

  const addRecursoMutation = useMutation(
    ({ entidadId, data }: { entidadId: number; data: any }) =>
      entidadesService.addRecurso(entidadId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('entidades');
        setIsRecursoModalOpen(false);
        setSelectedEntidad(null);
        toast.success('Recurso asignado correctamente');
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'Error al asignar recurso';
        toast.error(message);
      },
    }
  );

  const updateRecursoMutation = useMutation(
    ({ entidadRecursoId, data }: { entidadRecursoId: number; data: any }) =>
      entidadesService.updateEntidadRecurso(entidadRecursoId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('entidades');
        setIsRecursoModalOpen(false);
        setEditingRecurso(null);
        toast.success('Recurso actualizado correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar recurso');
      },
    }
  );

  const removeRecursoMutation = useMutation(entidadesService.removeRecurso, {
    onSuccess: () => {
      queryClient.invalidateQueries('entidades');
      setDeletingRecurso(null);
      toast.success('Recurso removido correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover recurso');
    },
  });

  const handleCreateEntidad = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateEntidad = (data: any) => {
    if (editingEntidad) {
      updateMutation.mutate({ id: editingEntidad.id, data });
    }
  };

  const handleDeleteEntidad = () => {
    if (deletingEntidad) {
      deleteMutation.mutate(deletingEntidad.id);
    }
  };

  const handleEditEntidad = (entidad: Entidad) => {
    setEditingEntidad(entidad);
    setIsEntidadModalOpen(true);
  };

  const handleAddDocumentacion = async (entidad: Entidad) => {
    if (!entidad.entidadDocumentacion) {
      try {
        const fullEntidad = await entidadesService.getById(entidad.id);
        setSelectedEntidad(fullEntidad);
      } catch (error) {
        console.error('Error obteniendo entidad:', error);
        setSelectedEntidad(entidad);
      }
    } else {
      setSelectedEntidad(entidad);
    }
    setIsDocumentacionModalOpen(true);
  };

  const handleEditDocumentacion = (documentacion: EntidadDocumentacion) => {
    setEditingDocumentacion(documentacion);
    setIsDocumentacionModalOpen(true);
  };

  const handleSubmitDocumentacion = (data: any) => {
    if (editingDocumentacion) {
      updateDocumentacionMutation.mutate({ entidadDocId: editingDocumentacion.id, data });
    } else if (selectedEntidad) {
      addDocumentacionMutation.mutate({ entidadId: selectedEntidad.id, data });
    }
  };

  const handleRemoveDocumentacion = () => {
    if (deletingDocumentacion) {
      removeDocumentacionMutation.mutate(deletingDocumentacion.id);
    }
  };

  const handleAddRecurso = async (entidad: Entidad) => {
    if (!entidad.entidadRecurso) {
      try {
        const fullEntidad = await entidadesService.getById(entidad.id);
        setSelectedEntidad(fullEntidad);
      } catch (error) {
        console.error('Error obteniendo entidad:', error);
        setSelectedEntidad(entidad);
      }
    } else {
      setSelectedEntidad(entidad);
    }
    setIsRecursoModalOpen(true);
  };

  const handleEditRecurso = (recurso: EntidadRecurso) => {
    setEditingRecurso(recurso);
    setIsRecursoModalOpen(true);
  };

  const handleSubmitRecurso = (data: any) => {
    if (editingRecurso) {
      updateRecursoMutation.mutate({ entidadRecursoId: editingRecurso.id, data });
    } else if (selectedEntidad) {
      addRecursoMutation.mutate({ entidadId: selectedEntidad.id, data });
    }
  };

  const handleRemoveRecurso = () => {
    if (deletingRecurso) {
      removeRecursoMutation.mutate(deletingRecurso.id);
    }
  };

  const handleCloseEntidadModal = () => {
    setIsEntidadModalOpen(false);
    setEditingEntidad(null);
  };

  const handleCloseDocumentacionModal = () => {
    setIsDocumentacionModalOpen(false);
    setEditingDocumentacion(null);
    setSelectedEntidad(null);
  };

  const handleCloseRecursoModal = () => {
    setIsRecursoModalOpen(false);
    setEditingRecurso(null);
    setSelectedEntidad(null);
  };

  const toggleDocumentacion = (entidadId: number) => {
    setShowDocumentacion(prev => ({
      ...prev,
      [entidadId]: !prev[entidadId]
    }));
  };

  const toggleRecursos = (entidadId: number) => {
    setShowRecursos(prev => ({
      ...prev,
      [entidadId]: !prev[entidadId]
    }));
  };

  const toggleDocumentacionArchivos = (documentacionId: number) => {
    setShowDocumentacionArchivos(prev => ({
      ...prev,
      [documentacionId]: !prev[documentacionId]
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
          <Building2 className="h-8 w-8 mr-3 text-purple-600" />
          Entidades
        </h1>
        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareEntidadData(entidadesData?.entidades || [])}
            exportConfig={{
              filename: `entidades_${new Date().toISOString().split('T')[0]}`,
              title: 'Listado de Entidades',
              columns: [
                { key: 'razonSocial', label: 'Razón Social', width: 25 },
                { key: 'cuit', label: 'CUIT', width: 15 },
                { key: 'localidad', label: 'Localidad', width: 20 },
                { key: 'telefono', label: 'Teléfono', width: 15 },
                { key: 'urlPlataformaDocumentacion', label: 'URL Plataforma', width: 25 },
                { key: 'estadoCritico', label: 'Estado Crítico', width: 15 },
                { key: 'totalRecursos', label: 'Total Recursos', width: 10 },
                { key: 'fechaCreacion', label: 'Fecha Creación', width: 15 }
              ]
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => setIsEntidadModalOpen(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} className="mr-2" />
            Nueva Entidad
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
              placeholder="Buscar por razón social o CUIT..."
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

      {/* Entidades Table */}
      <div className="card">
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Razón Social</th>
                  <th>CUIT</th>
                  <th>Localidad</th>
                  <th>Teléfono</th>
                  <th>URL Plataforma</th>
                  <th>Estado Crítico</th>
                  <th>Recursos</th>
                  <th className="w-56">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entidadesData?.entidades.map((entidad) => (
                  <React.Fragment key={entidad.id}>
                    <tr>
                      <td className="font-medium">{entidad.razonSocial}</td>
                      <td className="min-w-28 whitespace-nowrap">{entidad.cuit}</td>
                      <td>{entidad.localidad || '-'}</td>
                      <td>{entidad.telefono || '-'}</td>
                      <td>
                        {entidad.urlPlataformaDocumentacion ? (
                          <a 
                            href={entidad.urlPlataformaDocumentacion} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 truncate inline-block max-w-32"
                          >
                            {entidad.urlPlataformaDocumentacion}
                          </a>
                        ) : '-'}
                      </td>
                      <td>
                        {entidad.estadoCritico ? (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: entidad.estadoCritico.color + '20', color: entidad.estadoCritico.color }}
                          >
                            {entidad.estadoCritico.nombre}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="flex items-center text-blue-600">
                          <Users size={14} className="mr-1" />
                          <span className="text-xs font-medium">
                            {entidad.entidadRecurso?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleDocumentacion(entidad.id)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="Ver documentación"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => toggleRecursos(entidad.id)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="Ver recursos"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => handleAddDocumentacion(entidad)}
                            className="p-1 text-gray-600 hover:text-green-600"
                            title="Asignar documentación"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleAddRecurso(entidad)}
                            className="p-1 text-gray-600 hover:text-green-600"
                            title="Asignar recurso"
                          >
                            <Users size={16} />
                          </button>
                          <button
                            onClick={() => handleEditEntidad(entidad)}
                            className="p-1 text-gray-600 hover:text-primary-600"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingEntidad(entidad)}
                            className="p-1 text-gray-600 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Documentacion Row */}
                    {showDocumentacion[entidad.id] && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-blue-50 p-4 border-t">
                            <h4 className="font-medium mb-3">Documentación Asignada</h4>
                            {entidad.entidadDocumentacion && entidad.entidadDocumentacion.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2">Documentación</th>
                                      <th className="text-left py-2">Fecha Emisión</th>
                                      <th className="text-left py-2">Fecha Tramitación</th>
                                      <th className="text-left py-2">Fecha Vencimiento</th>
                                      <th className="text-left py-2">Estado</th>
                                      <th className="text-left py-2">Inhabilitante</th>
                                      <th className="text-left py-2">Envío Mail</th>
                                      <th className="text-left py-2">Mail Destino</th>
                                      <th className="text-left py-2 w-24">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entidad.entidadDocumentacion.map((doc) => (
                                      <React.Fragment key={doc.id}>
                                        <tr className="border-b border-gray-100">
                                        <td className="py-2">
                                          {doc.documentacion?.codigo} - {doc.documentacion?.descripcion}
                                        </td>
                                        <td className="py-2">{formatDateLocal(doc.fechaEmision)}</td>
                                        <td className="py-2">{formatDateLocal(doc.fechaTramitacion)}</td>
                                        <td className="py-2">{formatDateLocal(doc.fechaVencimiento)}</td>
                                        <td className="py-2">
                                          {doc.documentacion?.estado ? (
                                            <span 
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                              style={{ backgroundColor: doc.documentacion.estado.color + '20', color: doc.documentacion.estado.color }}
                                            >
                                              {doc.documentacion.estado.nombre}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="py-2">
                                          <span className={`status-badge ${doc.esInhabilitante ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {doc.esInhabilitante ? 'Sí' : 'No'}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          <span className={`status-badge ${doc.enviarPorMail ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {doc.enviarPorMail ? 'Sí' : 'No'}
                                          </span>
                                        </td>
                                        <td className="py-2">{doc.mailDestino || '-'}</td>
                                        <td className="py-2">
                                          <div className="flex space-x-1">
                                            {!isDocumentoUniversal(doc.documentacion) && (
                                              <button
                                                onClick={() => toggleDocumentacionArchivos(doc.id)}
                                                className="p-1 text-gray-600 hover:text-orange-600"
                                                title="Ver archivos"
                                              >
                                                <Paperclip size={14} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleEditDocumentacion(doc)}
                                              className="p-1 text-gray-600 hover:text-primary-600"
                                              title="Editar documentación"
                                            >
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              onClick={() => setDeletingDocumentacion(doc)}
                                              className="p-1 text-gray-600 hover:text-red-600"
                                              title="Remover documentación"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>

                                      {!isDocumentoUniversal(doc.documentacion) && showDocumentacionArchivos[doc.id] && (
                                        <tr>
                                          <td colSpan={9} className="p-0">
                                            <div className="bg-orange-50 p-4 border-t">
                                              <ArchivoSubGrid
                                                tipo="entidad-documentacion"
                                                referenceId={doc.id}
                                                className=""
                                              />
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No hay documentación asignada</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}


                    {/* Recursos Row */}
                    {showRecursos[entidad.id] && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="bg-green-50 p-4 border-t">
                            <h4 className="font-medium mb-3">Recursos Asignados</h4>
                            {entidad.entidadRecurso && entidad.entidadRecurso.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2">Recurso</th>
                                      <th className="text-left py-2">Fecha Inicio</th>
                                      <th className="text-left py-2">Fecha Fin</th>
                                      <th className="text-left py-2">Estado</th>
                                      <th className="text-left py-2">Estado Crítico</th>
                                      <th className="text-left py-2 w-24">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entidad.entidadRecurso.map((recursoEnt) => (
                                      <tr key={recursoEnt.id} className="border-b border-gray-100">
                                        <td className="py-2">
                                          {recursoEnt.recurso?.codigo} - {recursoEnt.recurso?.apellido}, {recursoEnt.recurso?.nombre}
                                        </td>
                                        <td className="py-2">{formatDateLocal(recursoEnt.fechaInicio)}</td>
                                        <td className="py-2">{formatDateLocal(recursoEnt.fechaFin)}</td>
                                        <td className="py-2">
                                          <span className={`status-badge ${recursoEnt.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {recursoEnt.activo ? 'Activo' : 'Inactivo'}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          {(() => {
                                            const estadoCritico = getHighestLevelEstado(recursoEnt.recurso?.recursoDocumentacion);
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
                                        <td className="py-2">
                                          <div className="flex space-x-1">
                                            <button
                                              onClick={() => handleEditRecurso(recursoEnt)}
                                              className="p-1 text-gray-600 hover:text-primary-600"
                                              title="Editar recurso"
                                            >
                                              <Edit size={14} />
                                            </button>
                                            <button
                                              onClick={() => setDeletingRecurso(recursoEnt)}
                                              className="p-1 text-gray-600 hover:text-red-600"
                                              title="Remover recurso"
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
            
            {entidadesData?.entidades.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron entidades' : 'No hay entidades registradas'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {entidadesData && entidadesData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="flex items-center text-sm text-gray-700">
                Mostrando {((entidadesData.pagination.currentPage - 1) * entidadesData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(entidadesData.pagination.currentPage * entidadesData.pagination.itemsPerPage, entidadesData.pagination.totalItems)} de{' '}
                {entidadesData.pagination.totalItems} resultados
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
                  {currentPage} de {entidadesData.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === entidadesData.pagination.totalPages}
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
      <EntidadModal
        isOpen={isEntidadModalOpen}
        onClose={handleCloseEntidadModal}
        entidad={editingEntidad}
        onSubmit={editingEntidad ? handleUpdateEntidad : handleCreateEntidad}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <EntidadDocumentacionModal
        isOpen={isDocumentacionModalOpen}
        onClose={handleCloseDocumentacionModal}
        entidadDocumentacion={editingDocumentacion}
        entidadId={selectedEntidad?.id || editingDocumentacion?.entidadId || 0}
        assignedDocumentacion={
          selectedEntidad?.entidadDocumentacion?.map(ed => ed.documentacionId) || []
        }
        onSubmit={handleSubmitDocumentacion}
        isLoading={addDocumentacionMutation.isLoading || updateDocumentacionMutation.isLoading}
      />

      <EntidadRecursoModal
        isOpen={isRecursoModalOpen}
        onClose={handleCloseRecursoModal}
        entidadRecurso={editingRecurso}
        entidadId={selectedEntidad?.id || editingRecurso?.entidadId || 0}
        assignedRecursos={
          selectedEntidad?.entidadRecurso?.map(er => er.recursoId) || []
        }
        onSubmit={handleSubmitRecurso}
        isLoading={addRecursoMutation.isLoading || updateRecursoMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingEntidad}
        onClose={() => setDeletingEntidad(null)}
        onConfirm={handleDeleteEntidad}
        title="Eliminar Entidad"
        message={`¿Está seguro que desea eliminar la entidad "${deletingEntidad?.razonSocial}"?`}
        isLoading={deleteMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingDocumentacion}
        onClose={() => setDeletingDocumentacion(null)}
        onConfirm={handleRemoveDocumentacion}
        title="Remover Documentación"
        message={`¿Está seguro que desea remover la documentación "${deletingDocumentacion?.documentacion?.descripcion}" de la entidad?`}
        isLoading={removeDocumentacionMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingRecurso}
        onClose={() => setDeletingRecurso(null)}
        onConfirm={handleRemoveRecurso}
        title="Remover Recurso"
        message={`¿Está seguro que desea remover el recurso "${deletingRecurso?.recurso?.apellido}, ${deletingRecurso?.recurso?.nombre}" de la entidad?`}
        isLoading={removeRecursoMutation.isLoading}
      />
    </div>
  );
};

export default Entidades;