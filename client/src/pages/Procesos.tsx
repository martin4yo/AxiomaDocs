import React, { useState } from 'react';
import { 
  Activity, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';

interface ProcesoStats {
  totalProcesos: number;
  enProgreso: number;
  completados: number;
  conRetrasos: number;
  tiempoPromedioComplecion: number;
  eficienciaPromedio: number;
}

interface BottleneckData {
  paso: string;
  workflow: string;
  tiempoPromedio: number;
  instanciasAfectadas: number;
  impacto: 'alto' | 'medio' | 'bajo';
}

const Procesos: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedWorkflow, setSelectedWorkflow] = useState('todos');

  // Datos mock - en producción vendrían del backend
  const stats: ProcesoStats = {
    totalProcesos: 156,
    enProgreso: 23,
    completados: 128,
    conRetrasos: 5,
    tiempoPromedioComplecion: 4.2,
    eficienciaPromedio: 87.5
  };

  const bottlenecks: BottleneckData[] = [
    {
      paso: 'Revisión Técnica',
      workflow: 'Renovación Licencias',
      tiempoPromedio: 18.5,
      instanciasAfectadas: 12,
      impacto: 'alto'
    },
    {
      paso: 'Aprobación Final',
      workflow: 'Certificados Médicos',
      tiempoPromedio: 8.2,
      instanciasAfectadas: 6,
      impacto: 'medio'
    },
    {
      paso: 'Validación Documentos',
      workflow: 'Contratos',
      tiempoPromedio: 12.1,
      instanciasAfectadas: 3,
      impacto: 'bajo'
    }
  ];

  const getImpactoColor = (impacto: string) => {
    switch (impacto) {
      case 'alto': return 'bg-red-100 text-red-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'bajo': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 mt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="h-8 w-8 mr-3 text-green-600" />
            Monitoreo de Procesos
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Supervisa el rendimiento y optimiza los flujos de trabajo en tiempo real
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reporte Detallado
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Procesos</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalProcesos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Play className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">En Progreso</p>
              <p className="text-xl font-bold text-gray-900">{stats.enProgreso}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Completados</p>
              <p className="text-xl font-bold text-gray-900">{stats.completados}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Con Retrasos</p>
              <p className="text-xl font-bold text-gray-900">{stats.conRetrasos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Tiempo Promedio</p>
              <p className="text-xl font-bold text-gray-900">{stats.tiempoPromedioComplecion}d</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Eficiencia</p>
              <p className="text-xl font-bold text-gray-900">{stats.eficienciaPromedio}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tendencias */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tendencia de Procesos</h3>
            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="text-sm px-3 py-1 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="todos">Todos los workflows</option>
              <option value="renovacion">Renovación Licencias</option>
              <option value="certificados">Certificados Médicos</option>
              <option value="contratos">Contratos</option>
            </select>
          </div>
          
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Gráfico de tendencias</p>
              <p className="text-xs">Se implementará con biblioteca de gráficos</p>
            </div>
          </div>
        </div>

        {/* Distribución por estado */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución por Estado</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Completados</span>
              </div>
              <span className="text-sm font-medium">{stats.completados} ({Math.round((stats.completados / stats.totalProcesos) * 100)}%)</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">En Progreso</span>
              </div>
              <span className="text-sm font-medium">{stats.enProgreso} ({Math.round((stats.enProgreso / stats.totalProcesos) * 100)}%)</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Con Retrasos</span>
              </div>
              <span className="text-sm font-medium">{stats.conRetrasos} ({Math.round((stats.conRetrasos / stats.totalProcesos) * 100)}%)</span>
            </div>
          </div>

          <div className="mt-6 h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-1" />
              <p className="text-xs">Gráfico circular de distribución</p>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis de cuellos de botella */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Cuellos de Botella Identificados</h3>
            <span className="text-sm text-gray-500">Últimos {timeRange}</span>
          </div>
        </div>
        
        <div className="p-6">
          {bottlenecks.length > 0 ? (
            <div className="space-y-4">
              {bottlenecks.map((bottleneck, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                      <h4 className="font-medium text-gray-900">{bottleneck.paso}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getImpactoColor(bottleneck.impacto)}`}>
                        {bottleneck.impacto.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Workflow: <strong>{bottleneck.workflow}</strong>
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {bottleneck.tiempoPromedio}h promedio
                      </span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {bottleneck.instanciasAfectadas} instancias afectadas
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm">
                      Analizar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">¡Excelente rendimiento!</h4>
              <p className="text-gray-500">No se detectaron cuellos de botella significativos</p>
            </div>
          )}
        </div>
      </div>

      {/* Próximas acciones recomendadas */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-medium text-blue-900">Recomendaciones de Optimización</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-2">Automatización de Aprobaciones</h4>
            <p className="text-sm text-gray-600 mb-3">
              Implementar reglas de auto-aprobación para documentos de bajo riesgo
            </p>
            <p className="text-xs text-blue-600 font-medium">Ahorro estimado: 30% tiempo</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-2">Notificaciones Proactivas</h4>
            <p className="text-sm text-gray-600 mb-3">
              Configurar alertas automáticas antes de que ocurran los retrasos
            </p>
            <p className="text-xs text-blue-600 font-medium">Reducción de retrasos: 60%</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-2">Paralelización de Tareas</h4>
            <p className="text-sm text-gray-600 mb-3">
              Ejecutar revisiones técnicas y administrativas en paralelo
            </p>
            <p className="text-xs text-blue-600 font-medium">Aceleración: 25%</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-2">Capacitación del Personal</h4>
            <p className="text-sm text-gray-600 mb-3">
              Entrenar equipos en pasos que generan más demoras
            </p>
            <p className="text-xs text-blue-600 font-medium">Mejora: 40% eficiencia</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Procesos;