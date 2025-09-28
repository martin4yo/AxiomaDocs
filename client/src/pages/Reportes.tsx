import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { FileText, Users, Calendar, BarChart3, Filter, Eye, TrendingUp } from 'lucide-react';
import { reportesService } from '../services/reportes';
import { estadosService } from '../services/estados';
import { entidadesService } from '../services/entidades';
import ExportButtons from '../components/Common/ExportButtons';
import { format } from 'date-fns';

const Reportes: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'documentacion' | 'entidades' | 'vencimientos'>('documentacion');
  const [filtros, setFiltros] = useState({
    estadoId: '',
    entidadId: '',
    soloActivos: true,
    diasVencimiento: 30
  });

  // Datos para los filtros
  const { data: estados } = useQuery('estados', estadosService.getAll);
  const { data: entidadesData } = useQuery('entidades-simple', () => 
    entidadesService.getAll({ page: 1, limit: 1000, search: '' })
  );

  // Reportes
  const { data: reporteDocumentacion, isLoading: loadingDocumentacion } = useQuery(
    ['reporte-documentacion', filtros.estadoId, filtros.entidadId],
    () => reportesService.getDocumentacionPorEstado({
      estadoId: filtros.estadoId ? parseInt(filtros.estadoId) : undefined,
      entidadId: filtros.entidadId ? parseInt(filtros.entidadId) : undefined
    }),
    { enabled: activeReport === 'documentacion' }
  );

  const { data: reporteEntidades, isLoading: loadingEntidades } = useQuery(
    ['reporte-entidades', filtros.entidadId, filtros.soloActivos],
    () => reportesService.getRecursosPorEntidad({
      entidadId: filtros.entidadId ? parseInt(filtros.entidadId) : undefined,
      soloActivos: filtros.soloActivos
    }),
    { enabled: activeReport === 'entidades' }
  );

  const { data: reporteVencimientos, isLoading: loadingVencimientos } = useQuery(
    ['reporte-vencimientos', filtros.diasVencimiento, filtros.entidadId],
    () => reportesService.getDocumentosProximosVencer({
      dias: filtros.diasVencimiento,
      entidadId: filtros.entidadId ? parseInt(filtros.entidadId) : undefined
    }),
    { enabled: activeReport === 'vencimientos' }
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const isLoading = loadingDocumentacion || loadingEntidades || loadingVencimientos;

  // Preparar datos para exportación
  const prepareDocumentacionExport = () => {
    if (!reporteDocumentacion) return [];
    return reporteDocumentacion.reporte.flatMap(item => 
      item.documentos.map(doc => ({
        recursoId: item.recurso.id,
        recursoCodigo: item.recurso.codigo,
        recursoNombre: item.recurso.nombre,
        recursoCUIL: item.recurso.cuil,
        recursoActivo: item.recurso.activo ? 'Sí' : 'No',
        recursoEntidades: item.recurso.entidades,
        documentoCodigo: doc.documento.codigo,
        documentoDescripcion: doc.documento.descripcion,
        documentoObligatorio: doc.documento.esObligatorio ? 'Sí' : 'No',
        fechaEmision: formatDate(doc.fechaEmision),
        fechaTramitacion: formatDate(doc.fechaTramitacion),
        fechaVencimiento: formatDate(doc.fechaVencimiento),
        estadoNombre: doc.estado.nombre,
        observaciones: doc.observaciones || ''
      }))
    );
  };

  const prepareEntidadesExport = () => {
    if (!reporteEntidades) return [];
    return reporteEntidades.reporte.flatMap(entidad =>
      entidad.recursos.map(recurso => ({
        entidadId: entidad.entidad.id,
        entidadRazonSocial: entidad.entidad.razonSocial,
        entidadCUIT: entidad.entidad.cuit,
        entidadLocalidad: entidad.entidad.localidad || '',
        recursoCodigo: recurso.recurso.codigo,
        recursoNombre: recurso.recurso.nombre,
        recursoCUIL: recurso.recurso.cuil,
        recursoActivo: recurso.recurso.activo ? 'Sí' : 'No',
        totalDocumentos: recurso.estadisticasDocumentacion.total,
        documentosVigentes: recurso.estadisticasDocumentacion.vigentes,
        documentosVencidos: recurso.estadisticasDocumentacion.vencidos,
        documentosPorVencer: recurso.estadisticasDocumentacion.porVencer,
        documentosEnTramite: recurso.estadisticasDocumentacion.enTramite,
        estadoCritico: recurso.estadisticasDocumentacion.estadoCritico?.nombre || ''
      }))
    );
  };

  const prepareVencimientosExport = () => {
    if (!reporteVencimientos) return [];
    return reporteVencimientos.reporte.map(item => ({
      recursoCodigo: item.recurso.codigo,
      recursoNombre: item.recurso.nombre,
      recursoCUIL: item.recurso.cuil,
      recursoEntidades: item.recurso.entidades,
      documentoCodigo: item.documento.codigo,
      documentoDescripcion: item.documento.descripcion,
      documentoObligatorio: item.documento.esObligatorio ? 'Sí' : 'No',
      fechaEmision: formatDate(item.fechaEmision),
      fechaTramitacion: formatDate(item.fechaTramitacion),
      fechaVencimiento: formatDate(item.fechaVencimiento),
      diasHastaVencimiento: item.diasHastaVencimiento || 0,
      estadoNombre: item.estado?.nombre || '',
      prioridad: item.prioridad,
      observaciones: item.observaciones || ''
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-8 mt-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="h-8 w-8 mr-3 text-rose-600" />
          Reportes
        </h1>
      </div>

      {/* Selector de Reportes */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-2">
                Tipo de Reporte
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveReport('documentacion')}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    activeReport === 'documentacion'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    <div>
                      <div className="font-medium">Documentación por Estado</div>
                      <div className="text-xs text-gray-500">Agrupada por recurso</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveReport('entidades')}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    activeReport === 'entidades'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    <div>
                      <div className="font-medium">Recursos por Entidad</div>
                      <div className="text-xs text-gray-500">Con estado documentación</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveReport('vencimientos')}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    activeReport === 'vencimientos'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    <div>
                      <div className="font-medium">Próximos Vencimientos</div>
                      <div className="text-xs text-gray-500">Documentos por vencer</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-content">
          <div className="flex items-center mb-4 mt-2">
            <Filter className="w-5 h-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-medium">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Estado (solo para reporte de documentación) */}
            {activeReport === 'documentacion' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filtros.estadoId}
                  onChange={(e) => setFiltros({ ...filtros, estadoId: e.target.value })}
                  className="input"
                >
                  <option value="">Todos los estados</option>
                  {estados?.map((estado) => (
                    <option key={estado.id} value={estado.id}>
                      {estado.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Entidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entidad
              </label>
              <select
                value={filtros.entidadId}
                onChange={(e) => setFiltros({ ...filtros, entidadId: e.target.value })}
                className="input"
              >
                <option value="">Todas las entidades</option>
                {entidadesData?.entidades.map((entidad) => (
                  <option key={entidad.id} value={entidad.id}>
                    {entidad.razonSocial}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Solo Activos (solo para reporte de entidades) */}
            {activeReport === 'entidades' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recursos
                </label>
                <select
                  value={filtros.soloActivos ? 'true' : 'false'}
                  onChange={(e) => setFiltros({ ...filtros, soloActivos: e.target.value === 'true' })}
                  className="input"
                >
                  <option value="true">Solo activos</option>
                  <option value="false">Todos</option>
                </select>
              </div>
            )}

            {/* Filtro Días Vencimiento (solo para reporte de vencimientos) */}
            {activeReport === 'vencimientos' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días anticipación
                </label>
                <select
                  value={filtros.diasVencimiento}
                  onChange={(e) => setFiltros({ ...filtros, diasVencimiento: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas y Exportación */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Estadísticas */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center mb-4 mt-2">
                  <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="text-lg font-medium">Estadísticas</h3>
                </div>

                {activeReport === 'documentacion' && reporteDocumentacion && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {reporteDocumentacion.estadisticas.totalRecursos}
                      </div>
                      <div className="text-sm text-gray-600">Total Recursos</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {reporteDocumentacion.estadisticas.recursosConDocumentos}
                      </div>
                      <div className="text-sm text-gray-600">Con Documentos</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {reporteDocumentacion.estadisticas.totalDocumentos}
                      </div>
                      <div className="text-sm text-gray-600">Total Documentos</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {reporteDocumentacion.estadisticas.porEstado.length}
                      </div>
                      <div className="text-sm text-gray-600">Estados Diferentes</div>
                    </div>
                  </div>
                )}

                {activeReport === 'entidades' && reporteEntidades && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {reporteEntidades.estadisticasGenerales.totalEntidades}
                      </div>
                      <div className="text-sm text-gray-600">Total Entidades</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {reporteEntidades.estadisticasGenerales.totalRecursos}
                      </div>
                      <div className="text-sm text-gray-600">Total Recursos</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {reporteEntidades.estadisticasGenerales.totalDocumentos}
                      </div>
                      <div className="text-sm text-gray-600">Total Documentos</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {reporteEntidades.estadisticasGenerales.entidadesConRecursos}
                      </div>
                      <div className="text-sm text-gray-600">Con Recursos</div>
                    </div>
                  </div>
                )}

                {activeReport === 'vencimientos' && reporteVencimientos && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {reporteVencimientos.estadisticas.totalDocumentos}
                      </div>
                      <div className="text-sm text-gray-600">Total Documentos</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {reporteVencimientos.estadisticas.documentosObligatorios}
                      </div>
                      <div className="text-sm text-gray-600">Obligatorios</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {reporteVencimientos.estadisticas.recursosAfectados}
                      </div>
                      <div className="text-sm text-gray-600">Recursos Afectados</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {reporteVencimientos.estadisticas.porDias.proximos7Dias}
                      </div>
                      <div className="text-sm text-gray-600">Próximos 7 días</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exportación */}
          <div>
            <div className="card">
              <div className="card-content">
                <div className="flex items-center mb-4 mt-2">
                  <Eye className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="text-lg font-medium">Exportar Reporte</h3>
                </div>

                {activeReport === 'documentacion' && (
                  <ExportButtons
                    data={prepareDocumentacionExport()}
                    exportConfig={{
                      filename: `reporte_documentacion_por_estado_${new Date().toISOString().split('T')[0]}`,
                      title: 'Reporte: Documentación por Estado',
                      columns: [
                        { key: 'recursoCodigo', label: 'Código Recurso', width: 15 },
                        { key: 'recursoNombre', label: 'Recurso', width: 25 },
                        { key: 'recursoCUIL', label: 'CUIL', width: 15 },
                        { key: 'documentoCodigo', label: 'Código Doc.', width: 15 },
                        { key: 'documentoDescripcion', label: 'Documento', width: 30 },
                        { key: 'fechaVencimiento', label: 'Fecha Venc.', width: 15 },
                        { key: 'estadoNombre', label: 'Estado', width: 15 }
                      ]
                    }}
                    disabled={isLoading}
                  />
                )}

                {activeReport === 'entidades' && (
                  <ExportButtons
                    data={prepareEntidadesExport()}
                    exportConfig={{
                      filename: `reporte_recursos_por_entidad_${new Date().toISOString().split('T')[0]}`,
                      title: 'Reporte: Recursos por Entidad',
                      columns: [
                        { key: 'entidadRazonSocial', label: 'Entidad', width: 25 },
                        { key: 'recursoCodigo', label: 'Código Recurso', width: 15 },
                        { key: 'recursoNombre', label: 'Recurso', width: 25 },
                        { key: 'totalDocumentos', label: 'Total Docs', width: 12 },
                        { key: 'documentosVigentes', label: 'Vigentes', width: 12 },
                        { key: 'documentosVencidos', label: 'Vencidos', width: 12 },
                        { key: 'estadoCritico', label: 'Estado Crítico', width: 15 }
                      ]
                    }}
                    disabled={isLoading}
                  />
                )}

                {activeReport === 'vencimientos' && (
                  <ExportButtons
                    data={prepareVencimientosExport()}
                    exportConfig={{
                      filename: `reporte_proximos_vencimientos_${new Date().toISOString().split('T')[0]}`,
                      title: 'Reporte: Documentos Próximos a Vencer',
                      columns: [
                        { key: 'recursoCodigo', label: 'Código Recurso', width: 15 },
                        { key: 'recursoNombre', label: 'Recurso', width: 25 },
                        { key: 'documentoCodigo', label: 'Código Doc.', width: 15 },
                        { key: 'documentoDescripcion', label: 'Documento', width: 30 },
                        { key: 'fechaVencimiento', label: 'Fecha Venc.', width: 15 },
                        { key: 'diasHastaVencimiento', label: 'Días Rest.', width: 10 },
                        { key: 'prioridad', label: 'Prioridad', width: 12 }
                      ]
                    }}
                    disabled={isLoading}
                  />
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Los reportes se exportan con los filtros aplicados actualmente.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
};

export default Reportes;