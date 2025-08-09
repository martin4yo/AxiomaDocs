import React from 'react';
import { useQuery } from 'react-query';
import { Users, FileText, Building2, AlertTriangle, Clock } from 'lucide-react';
import { dashboardService, DashboardStats, DocumentoPorVencer } from '../services/dashboard';

const Dashboard: React.FC = () => {
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

  return (
    <div className="space-y-6">
      <div className="pt-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema</p>
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
    </div>
  );
};

export default Dashboard;