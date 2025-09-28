import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  FileText,
  AlertCircle,
  Calendar,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Send,
  Clock,
  CheckCircle,
  Edit,
  User,
  Mail,
  Globe,
  X
} from 'lucide-react';

import documentosService, {
  DocumentoConEstadoCritico,
  DocumentosFiltros,
  RecursoAsignado,
  EntidadDestino
} from '../services/documentos';

const GestionDocumentos: React.FC = () => {
  // Estados para filtros y paginación
  const [filtros, setFiltros] = useState<DocumentosFiltros>({
    page: 1,
    limit: 20,
    search: '',
    estadoSeguimiento: undefined,
    soloConVencimientos: false
  });

  // Estados para sub-grillas expandidas
  const [documentoExpandido, setDocumentoExpandido] = useState<number | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'recursos' | 'entidades'>('recursos');

  // Estados para edición
  const [editingRecurso, setEditingRecurso] = useState<number | null>(null);
  const [editingEnvio, setEditingEnvio] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Query principal: documentos con estado crítico
  const { data: documentosData, isLoading } = useQuery({
    queryKey: ['documentos-criticos', filtros],
    queryFn: () => documentosService.getDocumentosConEstadoCritico(filtros),
    staleTime: 30000
  });

  // Query para recursos asignados (cuando se expande un documento)
  const { data: recursosData } = useQuery({
    queryKey: ['documento-recursos', documentoExpandido],
    queryFn: () => documentoExpandido ? documentosService.getRecursosAsignados(documentoExpandido) : null,
    enabled: !!documentoExpandido
  });

  // Query para entidades destino (cuando se expande un documento)
  const { data: entidadesData } = useQuery({
    queryKey: ['documento-entidades', documentoExpandido],
    queryFn: () => documentoExpandido ? documentosService.getEntidadesDestino(documentoExpandido) : null,
    enabled: !!documentoExpandido
  });

  // Mutaciones para actualizar datos
  const updateRecursoMutation = useMutation({
    mutationFn: ({ documentoId, recursoId, data }: any) =>
      documentosService.updateRecursoAsignado(documentoId, recursoId, data),
    onSuccess: () => {
      toast.success('Recurso actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['documento-recursos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-criticos'] });
      setEditingRecurso(null);
    },
    onError: () => {
      toast.error('Error al actualizar el recurso');
    }
  });

  const updateEnvioMutation = useMutation({
    mutationFn: ({ documentoId, entidadId, data }: any) =>
      documentosService.updateEstadoEnvio(documentoId, entidadId, data),
    onSuccess: () => {
      toast.success('Estado de envío actualizado');
      queryClient.invalidateQueries({ queryKey: ['documento-entidades'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-criticos'] });
      setEditingEnvio(null);
    },
    onError: () => {
      toast.error('Error al actualizar el envío');
    }
  });

  // Handlers
  const handleFiltroChange = (campo: string, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1 // Reset a primera página al cambiar filtros
    }));
  };

  const handleExpandirDocumento = (documentoId: number) => {
    if (documentoExpandido === documentoId) {
      setDocumentoExpandido(null);
    } else {
      setDocumentoExpandido(documentoId);
      setVistaActiva('recursos'); // Por defecto mostrar recursos
    }
  };

  const handleUpdateRecurso = (recursoId: number, data: any) => {
    if (!documentoExpandido) return;
    updateRecursoMutation.mutate({
      documentoId: documentoExpandido,
      recursoId,
      data
    });
  };

  const handleUpdateEnvio = (entidadId: number, data: any) => {
    if (!documentoExpandido) return;
    updateEnvioMutation.mutate({
      documentoId: documentoExpandido,
      entidadId,
      data
    });
  };

  // Función para obtener el estilo del estado crítico
  const getEstadoCriticoStyle = (estadoCritico: any) => {
    return {
      backgroundColor: estadoCritico.color,
      color: '#FFFFFF',
      fontSize: '11px',
      fontWeight: 'bold'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Documentos</h1>
          <p className="text-gray-600 mt-1">
            Gestión centralizada por documento con estado crítico y tracking de envíos
          </p>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <FileText size={24} className="text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Documentos</p>
              <p className="text-2xl font-bold text-gray-900">
                {documentosData?.pagination?.totalItems || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle size={24} className="text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Estados Críticos</p>
              <p className="text-2xl font-bold text-gray-900">
                {documentosData?.documentos?.filter(d => d.estadoCritico.nivel >= 8).length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock size={24} className="text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Envíos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {documentosData?.documentos?.reduce((acc, d) => acc + d.enviosPendientes, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle size={24} className="text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Envíos Completados</p>
              <p className="text-2xl font-bold text-gray-900">
                {documentosData?.documentos?.reduce((acc, d) => acc + d.enviosEnviados, 0) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="space-y-4">
          {/* Primera línea: Búsqueda */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por código o descripción..."
                  value={filtros.search || ''}
                  onChange={(e) => handleFiltroChange('search', e.target.value)}
                  className="pl-10 input w-full"
                />
              </div>
            </div>
          </div>

          {/* Segunda línea: Filtros específicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Seguimiento
              </label>
              <select
                className="input"
                value={filtros.estadoSeguimiento || ''}
                onChange={(e) => handleFiltroChange('estadoSeguimiento', e.target.value || undefined)}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="enviado">Enviados</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filtros.soloConVencimientos || false}
                  onChange={(e) => handleFiltroChange('soloConVencimientos', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Solo con vencimientos</span>
              </label>
            </div>

            <div className="flex items-end">
              <select
                className="input"
                value={filtros.limit || 20}
                onChange={(e) => handleFiltroChange('limit', parseInt(e.target.value))}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla Principal de Documentos */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : documentosData?.documentos?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No se encontraron documentos</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado Crítico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próximo Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignaciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Envíos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosData?.documentos?.map((documento) => (
                  <React.Fragment key={documento.id}>
                    {/* Fila principal del documento */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {documento.codigo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {documento.descripcion}
                          </div>
                          {documento.esUniversal && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              Universal
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={getEstadoCriticoStyle(documento.estadoCritico)}
                        >
                          {documento.estadoCritico.nombre}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {documento.proximaVencimiento ? (
                          <div className="flex items-center">
                            <Calendar size={16} className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {new Date(documento.proximaVencimiento).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin vencimientos</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          {documento.recursosAsignados > 0 && (
                            <div className="flex items-center">
                              <Users size={16} className="text-blue-500 mr-1" />
                              <span className="text-sm text-gray-900">{documento.recursosAsignados}</span>
                            </div>
                          )}
                          {documento.entidadesDestino > 0 && (
                            <div className="flex items-center">
                              <Building2 size={16} className="text-green-500 mr-1" />
                              <span className="text-sm text-gray-900">{documento.entidadesDestino}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {documento.enviosPendientes > 0 && (
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900">{documento.enviosPendientes}</span>
                            </div>
                          )}
                          {documento.enviosEnviados > 0 && (
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900">{documento.enviosEnviados}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleExpandirDocumento(documento.id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                          title={documentoExpandido === documento.id ? "Contraer" : "Expandir"}
                        >
                          {documentoExpandido === documento.id ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Sub-grillas expandidas */}
                    {documentoExpandido === documento.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Tabs para alternar entre vistas */}
                            <div className="flex border-b">
                              <button
                                onClick={() => setVistaActiva('recursos')}
                                className={`px-4 py-2 font-medium text-sm ${
                                  vistaActiva === 'recursos'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                Recursos Asignados ({documento.recursosAsignados})
                              </button>
                              <button
                                onClick={() => setVistaActiva('entidades')}
                                className={`px-4 py-2 font-medium text-sm ${
                                  vistaActiva === 'entidades'
                                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                Entidades Destino ({documento.entidadesDestino})
                              </button>
                            </div>

                            {/* Contenido de las sub-grillas */}
                            {vistaActiva === 'recursos' && recursosData && (
                              <div className="bg-white rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">Recursos Asignados</h4>
                                {recursosData.recursos.length === 0 ? (
                                  <p className="text-gray-500 text-sm">No hay recursos asignados</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Recurso</th>
                                          <th className="px-3 py-2 text-left">Vencimiento</th>
                                          <th className="px-3 py-2 text-left">Estado</th>
                                          <th className="px-3 py-2 text-left">Seguimiento</th>
                                          <th className="px-3 py-2 text-left">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {recursosData.recursos.map((recurso) => (
                                          <tr key={recurso.id}>
                                            <td className="px-3 py-2">
                                              <div>
                                                <div className="font-medium">{recurso.recurso.nombre}</div>
                                                <div className="text-gray-500">{recurso.recurso.cuil}</div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2">
                                              {recurso.fechaVencimiento ? (
                                                new Date(recurso.fechaVencimiento).toLocaleDateString()
                                              ) : (
                                                <span className="text-gray-400">Sin fecha</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {recurso.estado ? (
                                                <span
                                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                  style={{
                                                    backgroundColor: recurso.estado.color,
                                                    color: '#FFFFFF'
                                                  }}
                                                >
                                                  {recurso.estado.nombre}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400">Sin estado</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                recurso.estadoSeguimiento === 'enviado'
                                                  ? 'bg-green-100 text-green-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {recurso.estadoSeguimiento === 'enviado' ? 'Enviado' : 'Pendiente'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <button
                                                onClick={() => setEditingRecurso(recurso.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Editar"
                                              >
                                                <Edit size={14} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                            {vistaActiva === 'entidades' && entidadesData && (
                              <div className="bg-white rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">Entidades Destino</h4>
                                {entidadesData.entidades.length === 0 ? (
                                  <p className="text-gray-500 text-sm">No hay entidades destino</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Entidad</th>
                                          <th className="px-3 py-2 text-left">Motivo</th>
                                          <th className="px-3 py-2 text-left">Destino</th>
                                          <th className="px-3 py-2 text-left">Estado</th>
                                          <th className="px-3 py-2 text-left">Estado Envío</th>
                                          <th className="px-3 py-2 text-left">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {entidadesData.entidades.map((entidad) => (
                                          <tr key={entidad.id}>
                                            <td className="px-3 py-2">
                                              <div>
                                                <div className="font-medium">{entidad.entidad.nombre}</div>
                                                <div className="text-gray-500">{entidad.entidad.cuit}</div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {entidad.motivo}
                                            </td>
                                            <td className="px-3 py-2">
                                              {entidad.destino ? (
                                                <div className="flex items-center">
                                                  {entidad.tipoDestino === 'url' ? (
                                                    <Globe size={14} className="text-blue-500 mr-1" />
                                                  ) : (
                                                    <Mail size={14} className="text-green-500 mr-1" />
                                                  )}
                                                  <a
                                                    href={entidad.tipoDestino === 'url' ? entidad.destino : `mailto:${entidad.destino}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-xs"
                                                  >
                                                    {entidad.tipoDestino === 'url' ? 'Plataforma' : entidad.destino}
                                                  </a>
                                                </div>
                                              ) : (
                                                <span className="text-gray-400">Sin destino</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {entidad.estado ? (
                                                <span
                                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                  style={{
                                                    backgroundColor: entidad.estado.color,
                                                    color: '#fff'
                                                  }}
                                                >
                                                  {entidad.estado.nombre}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400">Sin estado</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                entidad.estadoEnvio === 'enviado'
                                                  ? 'bg-green-100 text-green-800'
                                                  : entidad.estadoEnvio === 'recibido'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {entidad.estadoEnvio === 'enviado' ? 'Enviado' :
                                                 entidad.estadoEnvio === 'recibido' ? 'Recibido' : 'Pendiente'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <button
                                                onClick={() => setEditingEnvio(entidad.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Gestionar envío"
                                              >
                                                <Send size={14} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {documentosData && documentosData.pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handleFiltroChange('page', Math.max(1, filtros.page! - 1))}
                  disabled={filtros.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handleFiltroChange('page', Math.min(documentosData.pagination.totalPages, filtros.page! + 1))}
                  disabled={filtros.page === documentosData.pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {(filtros.page! - 1) * filtros.limit! + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(filtros.page! * filtros.limit!, documentosData.pagination.totalItems)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{documentosData.pagination.totalItems}</span>{' '}
                    resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: documentosData.pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handleFiltroChange('page', page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === filtros.page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionDocumentos;