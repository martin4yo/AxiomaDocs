import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Users, FileText, Building2, AlertTriangle, Clock, LayoutDashboard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { dashboardService, DashboardStats, DocumentoPorVencer } from '../services/dashboard';
import { estadoDocumentosService } from '../services/estadoDocumentos';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [showActualizacionModal, setShowActualizacionModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    dashboardService.getStats,
    { refetchInterval: 30000 } // Refrescar cada 30 segundos
  );

  const { data: documentosPorVencer, isLoading: documentosLoading } = useQuery<DocumentoPorVencer[]>(
    'documentos-por-vencer',
    () => dashboardService.getDocumentosPorVencer(30),
    { refetchInterval: 60000 } // Refrescar cada minuto
  );

  const { data: ultimaActualizacion } = useQuery(
    'ultima-actualizacion',
    estadoDocumentosService.obtenerUltimaActualizacion,
    { refetchInterval: 60000 }
  );

  const actualizacionMutation = useMutation(
    estadoDocumentosService.actualizarEstados,
    {
      onSuccess: (data) => {
        toast.success(`Actualización completada: ${data.actualizados} documentos actualizados`);
        queryClient.invalidateQueries('dashboard-stats');
        queryClient.invalidateQueries('documentos-por-vencer');
        queryClient.invalidateQueries('ultima-actualizacion');
        setShowActualizacionModal(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.mensaje || 'Error al actualizar estados');
      }
    }
  );

  const statsCards = [
    {
      name: 'Recursos Activos',
      value: stats?.recursosActivos || 0,
      total: stats?.totalRecursos || 0,
      icon: Users,
      color: 'bg-blue-500',
      subtitle: `${stats?.totalRecursos || 0} total`,
    },
    {
      name: 'Documentos',
      value: stats?.totalDocumentacion || 0,
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      name: 'Entidades',
      value: stats?.totalEntidades || 0,
      icon: Building2,
      color: 'bg-purple-500',
    },
    {
      name: 'Por Vencer',
      value: stats?.documentosPorVencer || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      subtitle: `${stats?.documentosVencidos || 0} vencidos`,
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateFull = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="pt-6 mt-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <LayoutDashboard className="h-8 w-8 mr-3 text-indigo-600" />
              Dashboard
            </h1>
            <p className="text-gray-600">Resumen general del sistema</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Información de última actualización */}
            {ultimaActualizacion?.ultimaActualizacion && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                <div className="flex items-center">
                  {ultimaActualizacion.ultimaActualizacion.error ? (
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  )}
                  <span>
                    Última actualización: {formatDateFull(ultimaActualizacion.ultimaActualizacion.fecha)}
                  </span>
                </div>
                {ultimaActualizacion.ultimaActualizacion.actualizados !== undefined && (
                  <div className="text-xs text-gray-500 mt-1">
                    {ultimaActualizacion.ultimaActualizacion.actualizados} documentos actualizados
                  </div>
                )}
              </div>
            )}

            {/* Botón de actualización manual */}
            <button
              onClick={() => setShowActualizacionModal(true)}
              className="btn btn-primary btn-md flex items-center"
              disabled={actualizacionMutation.isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${actualizacionMutation.isLoading ? 'animate-spin' : ''}`} />
              Actualizar Estados
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-content p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500">{stat.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Documentos por Vencer (30 días)</h3>
          </div>
          <div className="card-content">
            {documentosLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : documentosPorVencer && documentosPorVencer.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {documentosPorVencer.slice(0, 10).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.recurso.apellido}, {doc.recurso.nombre}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {doc.documentacion.codigo} - {doc.documentacion.descripcion}
                      </p>
                      <p className="text-xs text-gray-400">
                        Vence: {formatDate(doc.fechaVencimiento)}
                      </p>
                    </div>
                    <div className="flex items-center ml-3">
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        doc.diasParaVencer <= 7 
                          ? 'bg-red-100 text-red-800' 
                          : doc.diasParaVencer <= 15 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        <Clock size={12} className="mr-1" />
                        {doc.diasParaVencer}d
                      </div>
                      {doc.estado && (
                        <span 
                          className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: doc.estado.color + '20', color: doc.estado.color }}
                        >
                          {doc.estado.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {documentosPorVencer.length > 10 && (
                  <div className="text-center pt-3">
                    <p className="text-sm text-gray-500">
                      Y {documentosPorVencer.length - 10} documentos más...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No hay documentos próximos a vencer</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Resumen por Estado</h3>
          </div>
          <div className="card-content">
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Recursos Activos</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {stats?.recursosActivos || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Por Vencer (30d)</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700">
                    {stats?.documentosPorVencer || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Vencidos</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">
                    {stats?.documentosVencidos || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Total Documentos</span>
                  </div>
                  <span className="text-lg font-bold text-blue-700">
                    {stats?.totalDocumentacion || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación de actualización */}
      {showActualizacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <RefreshCw className="h-6 w-6 text-indigo-600 mr-3" />
              <h3 className="text-lg font-semibold">Actualizar Estados de Documentos</h3>
            </div>

            <div className="mb-4 text-gray-600">
              <p className="mb-3">
                Esta acción revisará todos los documentos del sistema y actualizará sus estados según las fechas de vencimiento configuradas.
              </p>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">Los documentos se actualizarán de la siguiente manera:</p>
                <ul className="space-y-1 ml-4">
                  <li>• <span className="font-medium">Vencidos:</span> Fecha de vencimiento pasada</li>
                  <li>• <span className="font-medium">Por Vencer:</span> Dentro de los días de anticipación configurados</li>
                  <li>• <span className="font-medium">Vigente:</span> Fuera del rango de días de anticipación</li>
                </ul>
              </div>

              {ultimaActualizacion?.tareasProgamadas && ultimaActualizacion.tareasProgamadas.length > 0 && (
                <div className="mt-3 bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Tareas automáticas activas:</p>
                  <ul className="space-y-1 ml-4">
                    {ultimaActualizacion.tareasProgamadas.map(tarea => (
                      <li key={tarea.nombre}>
                        • {tarea.nombre.replace(/-/g, ' ')}
                        {tarea.activo && <span className="text-green-600 ml-2">(Activa)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowActualizacionModal(false)}
                className="btn btn-secondary btn-md"
                disabled={actualizacionMutation.isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={() => actualizacionMutation.mutate()}
                className="btn btn-primary btn-md flex items-center"
                disabled={actualizacionMutation.isLoading}
              >
                {actualizacionMutation.isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Actualizar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;