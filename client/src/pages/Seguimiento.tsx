import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Building2, FileText, Clock, CheckCircle, Filter, Paperclip, Calendar, X, Download, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import seguimientoService from '../services/seguimiento';

type VistaActiva = 'porEntidad' | 'porDocumento';

const Seguimiento: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('porEntidad');
  const [filtros, setFiltros] = useState<{
    estadoEnvio: 'pendiente' | 'enviado' | 'recibido' | '';
    search: string;
  }>({
    estadoEnvio: '', // 'pendiente', 'enviado', 'recibido'
    search: ''
  });
  const [modalEventos, setModalEventos] = useState<{visible: boolean, documentoId?: number, entidadId?: number, recursoId?: number}>({ visible: false });
  const [modalAdjuntos, setModalAdjuntos] = useState<{visible: boolean, documentoId?: number, entidadId?: number, recursoId?: number}>({ visible: false });

  const queryClient = useQueryClient();

  // Queries para obtener datos de seguimiento
  const { data: statsData } = useQuery({
    queryKey: ['seguimiento-stats'],
    queryFn: seguimientoService.getEstadisticas,
    staleTime: 30000
  });

  const { data: documentosData, isLoading: loadingDocumentos } = useQuery({
    queryKey: ['seguimiento-por-documento', filtros],
    queryFn: () => seguimientoService.getPorDocumento({
      ...filtros,
      estadoEnvio: filtros.estadoEnvio || undefined
    }),
    enabled: vistaActiva === 'porDocumento',
    staleTime: 30000
  });

  const { data: entidadesData, isLoading: loadingEntidades } = useQuery({
    queryKey: ['seguimiento-por-entidad', filtros],
    queryFn: () => seguimientoService.getPorEntidad({
      ...filtros,
      estadoEnvio: filtros.estadoEnvio || undefined
    }),
    enabled: vistaActiva === 'porEntidad',
    staleTime: 30000
  });

  const { data: eventosData, isLoading: loadingEventos } = useQuery({
    queryKey: ['seguimiento-eventos', modalEventos.documentoId, modalEventos.entidadId, modalEventos.recursoId],
    queryFn: () => seguimientoService.getEventos(modalEventos.documentoId!, modalEventos.entidadId!, modalEventos.recursoId),
    enabled: modalEventos.visible && !!modalEventos.documentoId && !!modalEventos.entidadId
  });

  const { data: adjuntosData, isLoading: loadingAdjuntos } = useQuery({
    queryKey: ['seguimiento-adjuntos', modalAdjuntos.documentoId, modalAdjuntos.entidadId, modalAdjuntos.recursoId],
    queryFn: () => seguimientoService.getAdjuntos(modalAdjuntos.documentoId!, modalAdjuntos.entidadId!, modalAdjuntos.recursoId),
    enabled: modalAdjuntos.visible && !!modalAdjuntos.documentoId && !!modalAdjuntos.entidadId
  });

  // Mutation para cambiar estado de envío
  const cambiarEstadoMutation = useMutation({
    mutationFn: ({ documentoId, entidadId, data }: { documentoId: number, entidadId: number, data: any }) =>
      seguimientoService.cambiarEstadoEnvio(documentoId, entidadId, data),
    onSuccess: () => {
      toast.success('Estado de envío actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['seguimiento-stats'] });
      queryClient.invalidateQueries({ queryKey: ['seguimiento-por-documento'] });
      queryClient.invalidateQueries({ queryKey: ['seguimiento-por-entidad'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado de envío');
    }
  });

  const handleFiltroChange = (campo: string, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleCambiarEstado = async (documentoId: number, entidadId: number, recursoId?: number) => {
    try {
      await cambiarEstadoMutation.mutateAsync({
        documentoId,
        entidadId,
        data: {
          estadoEnvio: 'enviado',
          recursoId
        }
      });
    } catch (error) {
      // Error ya manejado en la mutation
    }
  };

  const openModalEventos = (documentoId: number, entidadId: number, recursoId?: number) => {
    setModalEventos({ visible: true, documentoId, entidadId, recursoId });
  };

  const openModalAdjuntos = (documentoId: number, entidadId: number, recursoId?: number) => {
    setModalAdjuntos({ visible: true, documentoId, entidadId, recursoId });
  };

  const handleDescargarAdjunto = async (adjuntoId: number) => {
    try {
      await seguimientoService.descargarAdjunto(
        modalAdjuntos.documentoId!,
        modalAdjuntos.entidadId!,
        adjuntoId,
        modalAdjuntos.recursoId
      );
      toast.success('Archivo descargado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error descargando el archivo');
    }
  };

  const handleDescargarTodos = async () => {
    try {
      await seguimientoService.descargarAdjuntosMasivo(
        modalAdjuntos.documentoId!,
        modalAdjuntos.entidadId!,
        modalAdjuntos.recursoId
      );
      toast.success('Archivos descargados correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error descargando los archivos');
    }
  };

  const isLoading = loadingDocumentos || loadingEntidades;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-8 mt-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Send className="h-8 w-8 mr-3 text-green-600" />
            Seguimiento de Envíos
          </h1>
          <p className="text-gray-600">Monitorea qué documentos fueron enviados y a qué entidades</p>
        </div>
      </div>

      {/* Filtros y Vista Toggle */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {/* Toggle de Vista */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActiva('porEntidad')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                vistaActiva === 'porEntidad'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 size={16} className="mr-2 inline" />
              Por Entidad
            </button>
            <button
              onClick={() => setVistaActiva('porDocumento')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                vistaActiva === 'porDocumento'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={16} className="mr-2 inline" />
              Por Documento
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                value={filtros.search}
                onChange={(e) => handleFiltroChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <select
              value={filtros.estadoEnvio}
              onChange={(e) => handleFiltroChange('estadoEnvio', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="enviado">Enviados</option>
              <option value="recibido">Recibidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vista Por Entidad */}
      {vistaActiva === 'porEntidad' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {entidadesData?.map((entidad) => (
            <div key={entidad.id} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{entidad.nombre}</h3>
                      <p className="text-sm text-gray-600">CUIT: {entidad.cuit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{entidad.totalDocumentos} documentos</div>
                    <div className="text-xs text-gray-400">{entidad.pendientes} pendientes • {entidad.enviados} enviados</div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {entidad.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{doc.codigo}</div>
                        <div className="text-sm text-gray-600">{doc.descripcion}</div>
                        {doc.recursoNombre && (
                          <div className="text-xs text-gray-400">Recurso: {doc.recursoNombre}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          doc.estadoEnvio === 'enviado'
                            ? 'bg-green-100 text-green-800'
                            : doc.estadoEnvio === 'recibido'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.estadoEnvio === 'enviado' ? (
                            <>
                              <CheckCircle size={12} className="mr-1" />
                              Enviado
                            </>
                          ) : doc.estadoEnvio === 'recibido' ? (
                            <>
                              <CheckCircle size={12} className="mr-1" />
                              Recibido
                            </>
                          ) : (
                            <>
                              <Clock size={12} className="mr-1" />
                              Pendiente
                            </>
                          )}
                        </span>

                        {/* Icono para cambiar estado solo si está pendiente */}
                        {doc.estadoEnvio === 'pendiente' && (
                          <button
                            onClick={() => handleCambiarEstado(doc.id, entidad.id, doc.recursoId)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Marcar como enviado"
                            disabled={cambiarEstadoMutation.isPending}
                          >
                            <Send size={14} />
                          </button>
                        )}

                        {/* Icono de adjuntos */}
                        <button
                          onClick={() => openModalAdjuntos(doc.id, entidad.id, doc.recursoId)}
                          className={`${doc.tieneAdjuntos ? 'text-orange-600 hover:text-orange-900' : 'text-gray-400 hover:text-gray-600'} p-1 rounded relative`}
                          title="Ver adjuntos"
                        >
                          <Paperclip size={14} />
                          {doc.tieneAdjuntos && (
                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center text-[10px]">
                              •
                            </span>
                          )}
                        </button>

                        {/* Icono de eventos */}
                        <button
                          onClick={() => openModalEventos(doc.id, entidad.id, doc.recursoId)}
                          className={`${doc.totalEventos > 0 ? 'text-blue-600 hover:text-blue-900' : 'text-gray-400 hover:text-gray-600'} p-1 rounded relative`}
                          title="Ver eventos"
                        >
                          <Calendar size={14} />
                          {doc.totalEventos > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                              {doc.totalEventos > 9 ? '9+' : doc.totalEventos}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {entidadesData?.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No se encontraron entidades con documentos para enviar
            </div>
          )}
        </div>
      )}

      {/* Vista Por Documento */}
      {vistaActiva === 'porDocumento' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entidades Destino
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado General
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosData?.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.codigo}</div>
                        <div className="text-sm text-gray-500">{doc.descripcion}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {doc.totalEntidades} entidades • {doc.pendientes} pendientes • {doc.enviados} enviados
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {doc.entidades.slice(0, 3).map((entidad) => (
                          <div key={entidad.entidadId} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Building2 size={14} className="text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{entidad.entidadNombre}</span>
                              {entidad.recursoNombre && (
                                <span className="text-xs text-gray-400 ml-2">({entidad.recursoNombre})</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                entidad.estadoEnvio === 'enviado'
                                  ? 'bg-green-100 text-green-800'
                                  : entidad.estadoEnvio === 'recibido'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {entidad.estadoEnvio === 'enviado' ? 'Enviado' : entidad.estadoEnvio === 'recibido' ? 'Recibido' : 'Pendiente'}
                              </span>

                              {/* Iconos de acción */}
                              <div className="flex space-x-1">
                                {entidad.estadoEnvio === 'pendiente' && (
                                  <button
                                    onClick={() => handleCambiarEstado(doc.id, entidad.entidadId, entidad.recursoId)}
                                    className="text-green-600 hover:text-green-900 p-1 rounded"
                                    title="Marcar como enviado"
                                    disabled={cambiarEstadoMutation.isPending}
                                  >
                                    <Send size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => openModalAdjuntos(doc.id, entidad.entidadId, entidad.recursoId)}
                                  className={`${entidad.tieneAdjuntos ? 'text-orange-600 hover:text-orange-900' : 'text-gray-400 hover:text-gray-600'} p-1 rounded relative`}
                                  title="Ver adjuntos"
                                >
                                  <Paperclip size={12} />
                                  {entidad.tieneAdjuntos && (
                                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-2 w-2"></span>
                                  )}
                                </button>
                                <button
                                  onClick={() => openModalEventos(doc.id, entidad.entidadId, entidad.recursoId)}
                                  className={`${entidad.totalEventos > 0 ? 'text-blue-600 hover:text-blue-900' : 'text-gray-400 hover:text-gray-600'} p-1 rounded relative`}
                                  title="Ver eventos"
                                >
                                  <Calendar size={12} />
                                  {entidad.totalEventos > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center text-[9px]">
                                      {entidad.totalEventos > 9 ? '9+' : entidad.totalEventos}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {doc.entidades.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{doc.entidades.length - 3} más...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.pendientes === 0
                          ? 'bg-green-100 text-green-800'
                          : doc.enviados === 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {doc.pendientes === 0 ? (
                          <>
                            <CheckCircle size={12} className="mr-1" />
                            Completo
                          </>
                        ) : doc.enviados === 0 ? (
                          <>
                            <Clock size={12} className="mr-1" />
                            Pendiente
                          </>
                        ) : (
                          <>
                            <Clock size={12} className="mr-1" />
                            Parcial
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModalAdjuntos(doc.id, doc.entidades[0]?.entidadId)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver adjuntos generales"
                        >
                          <Paperclip size={16} />
                        </button>
                        <button
                          onClick={() => openModalEventos(doc.id, doc.entidades[0]?.entidadId)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver eventos generales"
                        >
                          <Calendar size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documentosData?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron documentos para enviar
            </div>
          )}
        </div>
      )}

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.pendientes || 0}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Send className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.enviados || 0}</div>
              <div className="text-sm text-gray-600">Enviados</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.recibidos || 0}</div>
              <div className="text-sm text-gray-600">Recibidos</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{statsData?.totalEntidades || 0}</div>
              <div className="text-sm text-gray-600">Entidades</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Eventos */}
      {modalEventos.visible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-lg font-medium text-gray-900">Eventos del Documento</h3>
              <button
                onClick={() => setModalEventos({ visible: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingEventos ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : eventosData?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay eventos registrados para este documento
                </div>
              ) : (
                <div className="space-y-4">
                  {eventosData?.map((evento) => (
                    <div key={evento.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{evento.titulo}</h4>
                          <p className="text-sm text-gray-600 mt-1">{evento.descripcion}</p>
                          {evento.observaciones && (
                            <p className="text-xs text-gray-500 mt-1">{evento.observaciones}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{evento.fecha}</div>
                          <div>{evento.hora}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Por: {evento.creador.nombre} {evento.creador.apellido}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adjuntos */}
      {modalAdjuntos.visible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-lg font-medium text-gray-900">Adjuntos del Documento</h3>
              <div className="flex items-center space-x-2">
                {adjuntosData && adjuntosData.length > 1 && (
                  <button
                    onClick={handleDescargarTodos}
                    className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    title="Descargar todos los archivos en ZIP"
                  >
                    <Package size={16} className="mr-1" />
                    Descargar Todo
                  </button>
                )}
                <button
                  onClick={() => setModalAdjuntos({ visible: false })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingAdjuntos ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                </div>
              ) : adjuntosData?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay adjuntos para este documento
                </div>
              ) : (
                <div className="space-y-3">
                  {adjuntosData?.map((adjunto) => (
                    <div key={adjunto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center flex-1">
                        <Paperclip className="h-5 w-5 text-orange-500 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{adjunto.nombreArchivo}</div>
                          <div className="text-sm text-gray-600">
                            {adjunto.tipoArchivo} • {(adjunto.tamaño / 1024).toFixed(1)} KB
                            {adjunto.version > 1 && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                v{adjunto.version}
                              </span>
                            )}
                          </div>
                          {adjunto.descripcion && (
                            <div className="text-xs text-gray-500 mt-1">{adjunto.descripcion}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-xs text-gray-500">
                          <div className="font-medium">{adjunto.fechaSubida}</div>
                          <div>Por: {adjunto.subidoPor.nombre} {adjunto.subidoPor.apellido}</div>
                        </div>
                        <button
                          onClick={() => handleDescargarAdjunto(adjunto.id)}
                          className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          title={`Descargar ${adjunto.nombreArchivo}`}
                        >
                          <Download size={16} className="mr-1" />
                          Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Seguimiento;