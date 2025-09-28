import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  FileText,
  Filter,
  Edit,
  Calendar,
  User,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  Paperclip
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  gestionDocumentosService,
  AsignacionDocumento,
  FiltrosGestion,
  ActualizarAsignacion
} from '../services/gestionDocumentos';
import { estadosService } from '../services/estados';
import { entidadesService } from '../services/entidades';
import { documentacionService } from '../services/documentacion';
import { recursosService } from '../services/recursos';
import ExportButtons from '../components/common/ExportButtons';
import ArchivoSubGrid from '../components/Archivos/ArchivoSubGrid';

const GestionDocumentos: React.FC = () => {
  const [filtros, setFiltros] = useState<FiltrosGestion>({
    page: 1,
    limit: 50
  });
  const [showFiltros, setShowFiltros] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ActualizarAsignacion>({});
  const [showDocuments, setShowDocuments] = useState<{
    isOpen: boolean;
    tipo: 'recurso-documentacion' | 'entidad-documentacion';
    referenceId: number;
  }>({ isOpen: false, tipo: 'recurso-documentacion', referenceId: 0 });

  const queryClient = useQueryClient();

  // Invalidar caché cuando se monta el componente para obtener datos frescos
  useEffect(() => {
    queryClient.invalidateQueries(['gestion-documentos']);
  }, [queryClient]);

  // Queries para datos básicos
  const { data: estados } = useQuery('estados', estadosService.getAll);
  const { data: entidades } = useQuery('entidades', () => entidadesService.getAll({}));
  const { data: recursos } = useQuery('recursos', () => recursosService.getAll({}));
  const { data: documentacion } = useQuery('documentacion', () => documentacionService.getAll({}));

  // Query principal para asignaciones
  const {
    data: asignacionesData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['gestion-documentos', filtros],
    () => gestionDocumentosService.getAsignaciones(filtros),
    {
      keepPreviousData: true,
      staleTime: 0, // Siempre refetch para obtener datos actualizados
      refetchOnMount: true, // Refetch cuando el componente se monta
      refetchOnWindowFocus: true // Refetch cuando la ventana obtiene foco
    }
  );

  // Mutation para actualizar asignaciones
  const updateMutation = useMutation(
    ({ tipo, id, datos }: { tipo: 'recurso' | 'entidad'; id: number; datos: ActualizarAsignacion }) =>
      gestionDocumentosService.updateAsignacion(tipo, id, datos),
    {
      onSuccess: () => {
        toast.success('Asignación actualizada correctamente');
        setEditingItem(null);
        setEditForm({});
        // Invalidar queries para refrescar los datos inmediatamente
        queryClient.invalidateQueries(['gestion-documentos']);
      },
      onError: () => {
        toast.error('Error al actualizar la asignación');
      }
    }
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      if (!year || !month || !day) return 'Fecha inválida';
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getEstadoStyle = (estado?: any) => {
    if (!estado || !estado.color) return 'bg-gray-100 text-gray-800';

    // Usar el color real del estado
    return {
      backgroundColor: `${estado.color}20`, // 20% de opacidad
      color: estado.color,
      borderColor: estado.color
    };
  };

  const getEstadoSeguimientoIcon = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'entregado':
        return <CheckCircle size={16} className="text-blue-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  const handleEdit = (asignacion: AsignacionDocumento) => {
    setEditingItem(asignacion.id);
    setEditForm({
      fechaEmision: asignacion.fechaEmision?.split('T')[0] || '',
      fechaTramitacion: asignacion.fechaTramitacion?.split('T')[0] || '',
      fechaVencimiento: asignacion.fechaVencimiento?.split('T')[0] || '',
      estadoId: asignacion.estado?.id || undefined,
      estadoSeguimiento: asignacion.estadoSeguimiento || 'pendiente'
    });
  };

  const handleSave = (asignacion: AsignacionDocumento) => {
    const [tipo, id] = asignacion.id.split('-');
    updateMutation.mutate({
      tipo: tipo as 'recurso' | 'entidad',
      id: parseInt(id),
      datos: editForm
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleShowDocuments = (asignacion: AsignacionDocumento) => {
    setShowDocuments({
      isOpen: true,
      tipo: asignacion.tipo === 'recurso' ? 'recurso-documentacion' : 'entidad-documentacion',
      referenceId: asignacion.asignacionId
    });
  };

  const handleFiltroChange = (campo: string, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1 // Reset page when filters change
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      page: 1,
      limit: 50
    });
  };

  const prepareExportData = (asignaciones: AsignacionDocumento[]) => {
    return asignaciones.map(asig => ({
      documento: `${asig.documento.codigo} - ${asig.documento.descripcion}`,
      asignadoA: asig.asignadoA.nombre,
      tipo: asig.tipo === 'recurso' ? 'Recurso' : 'Entidad',
      fechaEmision: formatDate(asig.fechaEmision),
      fechaTramitacion: formatDate(asig.fechaTramitacion),
      fechaVencimiento: formatDate(asig.fechaVencimiento),
      estado: asig.estado?.nombre || '-',
      estadoSeguimiento: asig.estadoSeguimiento,
      entidadDestino: asig.entidadDestino?.nombre || '-'
    }));
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <p className="text-red-600">Error al cargar los documentos</p>
        <button onClick={() => refetch()} className="btn btn-primary btn-sm mt-4">
          <RefreshCw size={16} className="mr-2" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="h-8 w-8 mr-3 text-purple-600" />
          Gestión de Documentos
          {isFetching && (
            <RefreshCw size={20} className="ml-3 text-blue-600 animate-spin" />
          )}
        </h1>

        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareExportData(asignacionesData?.asignaciones || [])}
            exportConfig={{
              filename: `gestion_documentos_${new Date().toISOString().split('T')[0]}`,
              title: 'Gestión de Documentos',
              columns: [
                { key: 'documento', label: 'Documento', width: 30 },
                { key: 'asignadoA', label: 'Asignado A', width: 25 },
                { key: 'tipo', label: 'Tipo', width: 10 },
                { key: 'fechaEmision', label: 'F. Emisión', width: 12 },
                { key: 'fechaTramitacion', label: 'F. Tramitación', width: 12 },
                { key: 'fechaVencimiento', label: 'F. Vencimiento', width: 12 },
                { key: 'estado', label: 'Estado', width: 15 },
                { key: 'estadoSeguimiento', label: 'Seguimiento', width: 12 },
                { key: 'entidadDestino', label: 'Entidad Destino', width: 20 }
              ]
            }}
          />

          <button
            onClick={() => refetch()}
            className={`btn btn-secondary btn-md ${isFetching ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isFetching}
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Actualizando...' : 'Actualizar'}
          </button>

          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="btn btn-secondary btn-md"
          >
            <Filter size={16} className="mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFiltros && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          {/* Primera línea: Búsqueda */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Código o descripción del documento..."
                  value={filtros.search || ''}
                  onChange={(e) => handleFiltroChange('search', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Segunda línea: Filtros principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Documento
              </label>
              <select
                className="input"
                value={filtros.documentacionId || ''}
                onChange={(e) => handleFiltroChange('documentacionId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todos los documentos</option>
                {documentacion?.documentacion?.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.codigo} - {doc.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recurso
              </label>
              <select
                className="input"
                value={filtros.recursoId || ''}
                onChange={(e) => handleFiltroChange('recursoId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todos los recursos</option>
                {recursos?.recursos?.map((recurso) => (
                  <option key={recurso.id} value={recurso.id}>
                    {recurso.apellido}, {recurso.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entidad
              </label>
              <select
                className="input"
                value={filtros.entidadId || ''}
                onChange={(e) => handleFiltroChange('entidadId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todas las entidades</option>
                {entidades?.entidades?.map((entidad) => (
                  <option key={entidad.id} value={entidad.id}>
                    {entidad.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Documento
              </label>
              <select
                className="input"
                value={filtros.estadoId || ''}
                onChange={(e) => handleFiltroChange('estadoId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todos los estados</option>
                {estados?.map((estado) => (
                  <option key={estado.id} value={estado.id}>
                    {estado.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Seguimiento
              </label>
              <select
                className="input"
                value={filtros.estadoSeguimiento || ''}
                onChange={(e) => handleFiltroChange('estadoSeguimiento', e.target.value || undefined)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días hasta vencer
              </label>
              <select
                className="input"
                value={filtros.diasVencimiento || ''}
                onChange={(e) => handleFiltroChange('diasVencimiento', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Todos</option>
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="60">60 días</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={limpiarFiltros} className="btn btn-secondary btn-sm">
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText size={24} className="text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Asignaciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {asignacionesData?.pagination?.totalItems || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <AlertCircle size={24} className="text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Próximos a Vencer</p>
              <p className="text-2xl font-bold text-gray-900">
                {asignacionesData?.asignaciones?.filter(a => {
                  if (!a.fechaVencimiento) return false;
                  const vencimiento = new Date(a.fechaVencimiento);
                  const hoy = new Date();
                  const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                  return diff <= 30 && diff >= 0;
                }).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle size={24} className="text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Vigentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {asignacionesData?.asignaciones?.filter(a =>
                  a.estado?.nivel && a.estado.nivel <= 3
                ).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle size={24} className="text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Críticos</p>
              <p className="text-2xl font-bold text-gray-900">
                {asignacionesData?.asignaciones?.filter(a =>
                  a.estado?.nivel && a.estado.nivel >= 8
                ).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla principal */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : asignacionesData?.asignaciones?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No se encontraron asignaciones</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignado A
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seguimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {asignacionesData?.asignaciones?.map((asignacion) => (
                  <tr key={asignacion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {asignacion.documento.codigo}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asignacion.documento.descripcion}
                        </div>
                        {asignacion.documento.esUniversal && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Universal
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {asignacion.tipo === 'recurso' ? (
                          <User size={16} className="text-blue-500 mr-2" />
                        ) : (
                          <Building2 size={16} className="text-green-500 mr-2" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {asignacion.asignadoA.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {asignacion.asignadoA.codigo}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {editingItem === asignacion.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-600 mb-1">Fecha Emisión</label>
                            <input
                              type="date"
                              value={editForm.fechaEmision || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, fechaEmision: e.target.value }))}
                              className="input input-sm"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-600 mb-1">Fecha Tramitación</label>
                            <input
                              type="date"
                              value={editForm.fechaTramitacion || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, fechaTramitacion: e.target.value }))}
                              className="input input-sm"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs text-gray-600 mb-1">Fecha Vencimiento</label>
                            <input
                              type="date"
                              value={editForm.fechaVencimiento || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                              className="input input-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div>
                            <span className="text-gray-500">Emisión:</span> {formatDate(asignacion.fechaEmision)}
                          </div>
                          <div>
                            <span className="text-gray-500">Tramitación:</span> {formatDate(asignacion.fechaTramitacion)}
                          </div>
                          <div>
                            <span className="text-gray-500">Vencimiento:</span> {formatDate(asignacion.fechaVencimiento)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem === asignacion.id ? (
                        // Si el documento es universal, no permitir editar el estado
                        asignacion.documento.esUniversal ? (
                          <div className="text-sm text-gray-600">
                            <span className="italic">Estado universal</span>
                            {asignacion.estado && (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-2"
                                style={getEstadoStyle(asignacion.estado)}
                              >
                                {asignacion.estado.nombre}
                              </span>
                            )}
                          </div>
                        ) : (
                          <select
                            value={editForm.estadoId || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, estadoId: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="input input-sm"
                          >
                            <option value="">Seleccionar estado</option>
                            {estados?.map((estado) => (
                              <option key={estado.id} value={estado.id}>
                                {estado.nombre}
                              </option>
                            ))}
                          </select>
                        )
                      ) : asignacion.estado ? (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                          style={getEstadoStyle(asignacion.estado)}
                        >
                          {asignacion.estado.nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin estado</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem === asignacion.id ? (
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Estado Seguimiento</label>
                          <select
                            value={editForm.estadoSeguimiento || 'pendiente'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, estadoSeguimiento: e.target.value as 'pendiente' | 'enviado' }))}
                            className="input input-sm w-full"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="enviado">Enviado</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {getEstadoSeguimientoIcon(asignacion.estadoSeguimiento)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {asignacion.estadoSeguimiento}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingItem === asignacion.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(asignacion)}
                            className="text-green-600 hover:text-green-900"
                            disabled={updateMutation.isLoading}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900"
                            disabled={updateMutation.isLoading}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(asignacion)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleShowDocuments(asignacion)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver documentos adjuntos"
                          >
                            <Paperclip size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {asignacionesData?.pagination && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((filtros.page || 1) - 1) * (filtros.limit || 50) + 1} a{' '}
              {Math.min((filtros.page || 1) * (filtros.limit || 50), asignacionesData.pagination.totalItems)} de{' '}
              {asignacionesData.pagination.totalItems} resultados
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleFiltroChange('page', (filtros.page || 1) - 1)}
                disabled={filtros.page === 1}
                className="btn btn-secondary btn-sm"
              >
                Anterior
              </button>
              <button
                onClick={() => handleFiltroChange('page', (filtros.page || 1) + 1)}
                disabled={filtros.page === asignacionesData.pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de documentos adjuntos */}
      {showDocuments.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Documentos Adjuntos</h2>
              <button
                onClick={() => setShowDocuments({ isOpen: false, tipo: 'recurso-documentacion', referenceId: 0 })}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <ArchivoSubGrid
                tipo={showDocuments.tipo}
                referenceId={showDocuments.referenceId}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionDocumentos;