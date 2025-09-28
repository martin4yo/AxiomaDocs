import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, Building2, Calendar, AlertTriangle, Plus, ClipboardList, Edit, Paperclip, X, Filter } from 'lucide-react';
import { documentosService, DashboardStats } from '../services/documentos';
import { estadosService } from '../services/estados';
import { formatDateLocal } from '../utils/dateUtils';
import ArchivoSubGrid from '../components/Archivos/ArchivoSubGrid';
import EventoSubGrid from '../components/Eventos/EventoSubGrid';
import EditarDocumentoModal from '../components/Documentos/EditarDocumentoModal';
import { Estado } from '../types';

type CategoriaActiva = 'universales' | 'porRecurso' | 'porEntidad' | null;

const Gestion: React.FC = () => {
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaActiva>('universales');
  const [adjuntosModalOpen, setAdjuntosModalOpen] = useState(false);
  const [eventosModalOpen, setEventosModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any>(null);
  const [tipoEdicion, setTipoEdicion] = useState<'universal' | 'recurso' | 'entidad'>('universal');
  const [estadoFiltro, setEstadoFiltro] = useState<number | null>(null);

  // Query para obtener lista de estados
  const { data: estados } = useQuery({
    queryKey: ['estados'],
    queryFn: estadosService.getAll
  });

  // Query para obtener estadísticas del dashboard
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: documentosService.getEstadisticasDashboard
  });

  // Query para obtener documentos filtrados por categoría
  const { data: documentosFiltrados, isLoading: isLoadingDocumentos, refetch: refetchDocumentos } = useQuery({
    queryKey: ['documentos-gestion', categoriaActiva, estadoFiltro],
    queryFn: async () => {
      const data = await documentosService.getDocumentosConEstadoCritico({});

      console.log('Datos recibidos del API:', data);
      console.log('Categoria activa:', categoriaActiva);

      if (!data.documentos || !categoriaActiva) return [];

      const filteredDocs = data.documentos.filter(doc => {
        switch (categoriaActiva) {
          case 'universales':
            return doc.esUniversal;
          case 'porRecurso':
            return !doc.esUniversal && doc.recursosAsignados > 0;
          case 'porEntidad':
            return !doc.esUniversal && doc.entidadesDestino > 0;
          default:
            return false;
        }
      });

      console.log('Documentos filtrados para', categoriaActiva, ':', filteredDocs);

      // Para documentos universales, no necesitamos asignaciones
      if (categoriaActiva === 'universales') {
        return filteredDocs;
      }

      // Para categorías por recurso y entidad, obtener las asignaciones reales
      const docsWithAssignments = await Promise.all(
        filteredDocs.map(async (doc) => {
          try {
            if (categoriaActiva === 'porRecurso') {
              const recursosResponse = await documentosService.getRecursosAsignados(doc.id);
              const asignaciones = recursosResponse.recursos.map(r => ({
                id: r.recurso.id,
                nombre: r.recurso.nombre,
                tipo: 'recurso',
                fechaEmision: r.fechaEmision,
                fechaTramitacion: r.fechaTramitacion,
                fechaVencimiento: r.fechaVencimiento,
                estado: r.estado
              }));
              return { ...doc, asignaciones };
            } else if (categoriaActiva === 'porEntidad') {
              const entidadesResponse = await documentosService.getEntidadesDestino(doc.id);
              const asignaciones = entidadesResponse.entidades.map(e => ({
                id: e.entidadDocumentacionId || e.entidad.id, // Usar el ID de EntidadDocumentacion si existe
                entidadId: e.entidad.id, // ID de la entidad
                nombre: e.entidad.nombre,
                tipo: 'entidad',
                // Usar las fechas específicas de la entidad si existen, sino las del documento
                fechaEmision: e.fechaEmision || doc.fechaEmision,
                fechaTramitacion: e.fechaTramitacion || doc.fechaTramitacion,
                fechaVencimiento: e.fechaVencimiento || doc.fechaVencimiento,
                estado: e.estado
              }));
              return { ...doc, asignaciones };
            }
            return { ...doc, asignaciones: [] };
          } catch (error) {
            console.error(`Error obteniendo asignaciones para documento ${doc.id}:`, error);
            return { ...doc, asignaciones: [] };
          }
        })
      );

      return docsWithAssignments;
    },
    enabled: !!categoriaActiva
  });

  const handleCategoriaClick = (categoria: CategoriaActiva) => {
    setCategoriaActiva(categoria);
  };

  const handleAbrirAdjuntos = (documento: any) => {
    // Agregar información de contexto para determinar el tipo de archivo
    const documentoConContexto = {
      ...documento,
      categoriaActiva: categoriaActiva
    };
    setDocumentoSeleccionado(documentoConContexto);
    setAdjuntosModalOpen(true);
  };

  const handleCerrarAdjuntos = () => {
    setAdjuntosModalOpen(false);
    setDocumentoSeleccionado(null);
  };

  const handleAbrirEventos = (documento: any) => {
    setDocumentoSeleccionado(documento);
    setEventosModalOpen(true);
  };

  const handleCerrarEventos = () => {
    setEventosModalOpen(false);
    setDocumentoSeleccionado(null);
  };

  const handleEventoCreado = () => {
    // Refrescar datos después de crear un evento
    console.log('Evento creado exitosamente');
  };

  const handleAbrirEdicion = (documento: any) => {
    setDocumentoSeleccionado(documento);

    // Determinar el tipo de edición según la categoría activa
    if (categoriaActiva === 'universales') {
      setTipoEdicion('universal');
    } else if (categoriaActiva === 'porRecurso') {
      setTipoEdicion('recurso');
    } else if (categoriaActiva === 'porEntidad') {
      setTipoEdicion('entidad');
    }

    setEditarModalOpen(true);
  };

  const handleCerrarEdicion = () => {
    setEditarModalOpen(false);
    setDocumentoSeleccionado(null);
  };

  const handleDocumentoActualizado = () => {
    // Refrescar datos después de actualizar
    console.log('Documento actualizado exitosamente');
    // TODO: Invaliar queries para refrescar datos
  };

  // Función para agrupar documentos por recurso o entidad
  const agruparDocumentos = (documentos: any[]) => {
    if (!documentos || !Array.isArray(documentos) || categoriaActiva === 'universales') {
      return { sinAgrupar: documentos || [] };
    }

    const grupos: { [key: string]: any[] } = {};

    documentos.forEach(doc => {
      if (doc.asignaciones && doc.asignaciones.length > 0) {
        doc.asignaciones.forEach((asignacion: any) => {
          const clave = `${asignacion.tipo}_${asignacion.id}`;
          if (!grupos[clave]) {
            grupos[clave] = [];
          }
          grupos[clave].push({
            ...doc,
            // Para recursos, usar las fechas de la asignación, para entidades usar las del documento
            fechaEmision: asignacion.fechaEmision || doc.fechaEmision,
            fechaTramitacion: asignacion.fechaTramitacion || doc.fechaTramitacion,
            fechaVencimiento: asignacion.fechaVencimiento || doc.fechaVencimiento,
            estadoCritico: asignacion.estado || doc.estadoCritico,
            asignacionActual: asignacion
          });
        });
      } else {
        // Documentos sin asignaciones específicas
        if (!grupos['sin_asignar']) {
          grupos['sin_asignar'] = [];
        }
        grupos['sin_asignar'].push(doc);
      }
    });

    return grupos;
  };

  // Aplicar filtro de estado
  const aplicarFiltroEstado = (documentos: any[]) => {
    if (!estadoFiltro || !documentos) return documentos;

    return documentos.filter(doc => {
      // Para documentos universales
      if (categoriaActiva === 'universales') {
        // Verificar si el estado crítico coincide con el filtro
        if (doc.estadoCritico && doc.estadoCritico.id === estadoFiltro) {
          return true;
        }
        // También verificar el estado directo del documento
        if (doc.estado && doc.estado.id === estadoFiltro) {
          return true;
        }
        // Para documentos universales que pueden tener el estado en estadoId
        if (doc.estadoId === estadoFiltro) {
          return true;
        }
        return false;
      }

      // Para documentos agrupados (por recurso o entidad)
      if (doc.estadoCritico) {
        return doc.estadoCritico.id === estadoFiltro;
      }

      return false;
    });
  };

  const documentosAgrupados = agruparDocumentos(documentosFiltrados);

  // Aplicar filtro a los documentos agrupados
  const documentosFiltradosPorEstado = categoriaActiva === 'universales'
    ? { sinAgrupar: aplicarFiltroEstado(documentosAgrupados.sinAgrupar) }
    : Object.keys(documentosAgrupados).reduce((acc, key) => {
        const filtrados = aplicarFiltroEstado(documentosAgrupados[key]);
        if (filtrados.length > 0) {
          acc[key] = filtrados;
        }
        return acc;
      }, {} as any);

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
            <ClipboardList className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Documentos
          </h1>
          <p className="text-gray-600">Administra documentos por categorías: universales, asignados a recursos y entidades</p>
        </div>
        <button className="btn btn-primary btn-md">
          <Plus size={16} className="mr-2" />
          Nuevo Documento
        </button>
      </div>

      {/* Filtro por Estado */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <label className="text-sm font-medium text-gray-700">Filtrar por Estado:</label>
          </div>
          <select
            value={estadoFiltro || ''}
            onChange={(e) => setEstadoFiltro(e.target.value ? Number(e.target.value) : null)}
            className="input input-sm max-w-xs"
          >
            <option value="">Todos los estados</option>
            {estados?.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nombre} (Nivel {estado.nivel})
              </option>
            ))}
          </select>
          {estadoFiltro && (
            <button
              onClick={() => setEstadoFiltro(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtro
            </button>
          )}
        </div>
        {estadoFiltro && estados && (
          <div className="mt-2 text-sm text-gray-600">
            Mostrando documentos con estado:
            <span
              className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{
                backgroundColor: estados.find(e => e.id === estadoFiltro)?.color || '#gray'
              }}
            >
              {estados.find(e => e.id === estadoFiltro)?.nombre}
            </span>
          </div>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta Universales */}
          <div
            className={`rounded-lg shadow cursor-pointer hover:shadow-lg transition-all duration-200 ${
              categoriaActiva === 'universales'
                ? 'bg-blue-50 border-2 border-blue-200 shadow-md'
                : 'bg-white'
            }`}
            onClick={() => handleCategoriaClick('universales')}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Documentos Universales</h3>
                  <p className="text-sm text-gray-600">Aplicables a todos los recursos</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{stats?.universales.total || 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{stats?.universales.vencidos || 0}</div>
                  <div className="text-xs text-gray-500">Vencidos</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{stats?.universales.porVencer || 0}</div>
                  <div className="text-xs text-gray-500">Por vencer</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{stats?.universales.enTramite || 0}</div>
                  <div className="text-xs text-gray-500">En trámite</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta Por Recurso */}
          <div
            className={`rounded-lg shadow cursor-pointer hover:shadow-lg transition-all duration-200 ${
              categoriaActiva === 'porRecurso'
                ? 'bg-green-50 border-2 border-green-200 shadow-md'
                : 'bg-white'
            }`}
            onClick={() => handleCategoriaClick('porRecurso')}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Por Recurso</h3>
                  <p className="text-sm text-gray-600">Asignados a recursos específicos</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{stats?.porRecurso.total || 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{stats?.porRecurso.vencidos || 0}</div>
                  <div className="text-xs text-gray-500">Vencidos</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{stats?.porRecurso.porVencer || 0}</div>
                  <div className="text-xs text-gray-500">Por vencer</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{stats?.porRecurso.enTramite || 0}</div>
                  <div className="text-xs text-gray-500">En trámite</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta Por Entidad */}
          <div
            className={`rounded-lg shadow cursor-pointer hover:shadow-lg transition-all duration-200 ${
              categoriaActiva === 'porEntidad'
                ? 'bg-purple-50 border-2 border-purple-200 shadow-md'
                : 'bg-white'
            }`}
            onClick={() => handleCategoriaClick('porEntidad')}
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Por Entidad</h3>
                  <p className="text-sm text-gray-600">Asignados a entidades específicas</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">{stats?.porEntidad.total || 0}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{stats?.porEntidad.vencidos || 0}</div>
                  <div className="text-xs text-gray-500">Vencidos</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{stats?.porEntidad.porVencer || 0}</div>
                  <div className="text-xs text-gray-500">Por vencer</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{stats?.porEntidad.enTramite || 0}</div>
                  <div className="text-xs text-gray-500">En trámite</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Lista de Documentos por Categoría */}
      {categoriaActiva && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {categoriaActiva === 'universales' && 'Documentos Universales'}
                {categoriaActiva === 'porRecurso' && 'Documentos por Recurso'}
                {categoriaActiva === 'porEntidad' && 'Documentos por Entidad'}
              </h2>
            </div>
          </div>

          <div className="">
            {isLoadingDocumentos ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : documentosFiltrados && (documentosFiltrados.length > 0 ||
                  (categoriaActiva !== 'universales' && Object.keys(documentosFiltradosPorEstado).length > 0)) ? (
              <div className="overflow-x-auto">
                {categoriaActiva === 'universales' ? (
                  // Tabla simple para documentos universales
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado Actual
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Emisión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Tramitación
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Vencimiento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentosFiltradosPorEstado.sinAgrupar?.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{doc.codigo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{doc.descripcion}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {doc.estadoCritico ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: doc.estadoCritico.color }}
                              >
                                {doc.estadoCritico.nombre}
                              </span>
                            ) : (
                              <span className="text-gray-400">Sin estado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.fechaEmision ? formatDateLocal(doc.fechaEmision) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.fechaTramitacion ? formatDateLocal(doc.fechaTramitacion) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {doc.fechaVencimiento ? formatDateLocal(doc.fechaVencimiento) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleAbrirEdicion(doc)}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Editar fechas y estado"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleAbrirAdjuntos(doc)}
                                className="text-orange-600 hover:text-orange-900 p-1"
                                title="Gestionar adjuntos"
                              >
                                <Paperclip size={16} />
                              </button>
                              <button
                                onClick={() => handleAbrirEventos(doc)}
                                className="text-purple-600 hover:text-purple-900 p-1"
                                title="Ver eventos"
                              >
                                <Calendar size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  // Tablas agrupadas para documentos por recurso o entidad
                  <div className="space-y-6">
                    {Object.entries(documentosFiltradosPorEstado).map(([grupo, documentos]) => {
                      if (grupo === 'sin_asignar' || documentos.length === 0) return null;

                      const primerDoc = documentos[0];
                      const asignacion = primerDoc.asignacionActual;

                      return (
                        <div key={grupo} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                              {categoriaActiva === 'porRecurso' ? (
                                <>
                                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                                  {asignacion.nombre}
                                </>
                              ) : (
                                <>
                                  <Building2 className="h-5 w-5 mr-2 text-purple-600" />
                                  {asignacion.nombre}
                                </>
                              )}
                            </h3>
                          </div>
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Código
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Descripción
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Estado Actual
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Fecha Emisión
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Fecha Tramitación
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Fecha Vencimiento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {documentos.map((doc) => (
                                <tr key={`${doc.id}-${asignacion.id}`} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{doc.codigo}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{doc.descripcion}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {doc.estadoCritico ? (
                                      <span
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                                        style={{ backgroundColor: doc.estadoCritico.color }}
                                      >
                                        {doc.estadoCritico.nombre}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Sin estado</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {doc.fechaEmision ? formatDateLocal(doc.fechaEmision) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {doc.fechaTramitacion ? formatDateLocal(doc.fechaTramitacion) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {doc.fechaVencimiento ? formatDateLocal(doc.fechaVencimiento) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-3">
                                      <button
                                        onClick={() => handleAbrirEdicion(doc)}
                                        className="text-green-600 hover:text-green-900 p-1"
                                        title="Editar fechas y estado"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleAbrirAdjuntos(doc)}
                                        className="text-orange-600 hover:text-orange-900 p-1"
                                        title="Gestionar adjuntos"
                                      >
                                        <Paperclip size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleAbrirEventos(doc)}
                                        className="text-purple-600 hover:text-purple-900 p-1"
                                        title="Ver eventos"
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
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
                <p className="text-gray-600">
                  {estadoFiltro
                    ? `No se encontraron documentos con el estado seleccionado en esta categoría.`
                    : `No se encontraron documentos para la categoría seleccionada.`}
                </p>
                {estadoFiltro && (
                  <button
                    onClick={() => setEstadoFiltro(null)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Limpiar filtro para ver todos los documentos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alertas y notificaciones */}
      {!categoriaActiva && stats && (
        stats.universales.vencidos > 0 || stats.porRecurso.vencidos > 0 || stats.porEntidad.vencidos > 0 ||
        stats.universales.enTramite > 0 || stats.porRecurso.enTramite > 0 || stats.porEntidad.enTramite > 0
      ) && (
        <div className="space-y-4">
          {/* Alertas de vencidos */}
          {(stats.universales.vencidos > 0 || stats.porRecurso.vencidos > 0 || stats.porEntidad.vencidos > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Documentos vencidos que requieren atención
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside">
                      {stats.universales.vencidos > 0 && (
                        <li>{stats.universales.vencidos} documento(s) universal(es) vencido(s)</li>
                      )}
                      {stats.porRecurso.vencidos > 0 && (
                        <li>{stats.porRecurso.vencidos} documento(s) por recurso vencido(s)</li>
                      )}
                      {stats.porEntidad.vencidos > 0 && (
                        <li>{stats.porEntidad.vencidos} documento(s) por entidad vencido(s)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Información de documentos en trámite */}
          {(stats.universales.enTramite > 0 || stats.porRecurso.enTramite > 0 || stats.porEntidad.enTramite > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <ClipboardList className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Documentos en trámite
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside">
                      {stats.universales.enTramite > 0 && (
                        <li>{stats.universales.enTramite} documento(s) universal(es) en trámite</li>
                      )}
                      {stats.porRecurso.enTramite > 0 && (
                        <li>{stats.porRecurso.enTramite} documento(s) por recurso en trámite</li>
                      )}
                      {stats.porEntidad.enTramite > 0 && (
                        <li>{stats.porEntidad.enTramite} documento(s) por entidad en trámite</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Gestión de Adjuntos */}
      {adjuntosModalOpen && documentoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Gestión de Adjuntos</h2>
                <p className="text-sm text-gray-600">
                  Documento: <span className="font-medium">{documentoSeleccionado.codigo}</span> - {documentoSeleccionado.descripcion}
                </p>
              </div>
              <button
                onClick={handleCerrarAdjuntos}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <ArchivoSubGrid
                tipo={
                  documentoSeleccionado.categoriaActiva === 'universales'
                    ? 'documentacion'
                    : documentoSeleccionado.categoriaActiva === 'porRecurso'
                    ? 'recurso-documentacion'
                    : 'entidad-documentacion'
                }
                referenceId={
                  documentoSeleccionado.categoriaActiva === 'universales'
                    ? documentoSeleccionado.id
                    : documentoSeleccionado.asignacionActual?.id || documentoSeleccionado.id
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eventos */}
      {eventosModalOpen && documentoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Eventos del Documento</h2>
                <p className="text-sm text-gray-600">
                  Documento: <span className="font-medium">{documentoSeleccionado.codigo}</span> - {documentoSeleccionado.descripcion}
                </p>
              </div>
              <button
                onClick={handleCerrarEventos}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <EventoSubGrid
                documento={documentoSeleccionado}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Documento */}
      <EditarDocumentoModal
        isOpen={editarModalOpen}
        onClose={handleCerrarEdicion}
        documento={documentoSeleccionado}
        tipoEdicion={tipoEdicion}
        onDocumentoActualizado={handleDocumentoActualizado}
        refetchDocumentos={refetchDocumentos}
      />
    </div>
  );
};

export default Gestion;