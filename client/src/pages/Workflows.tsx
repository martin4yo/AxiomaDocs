import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Copy, 
  Trash2,
  Play,
  Pause,
  Settings,
  Workflow,
  Users,
  Clock,
  CheckCircle,
  Activity
} from 'lucide-react';

interface WorkflowTemplate {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  tipo: 'bilateral' | 'supervisado' | 'circular' | 'jerarquico' | 'paralelo';
  estado: 'borrador' | 'activo' | 'pausado' | 'obsoleto';
  version: string;
  cantidadPasos: number;
  estimacionDuracion: number; // en horas
  utilizaciones: number;
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  creadoPor: string;
}

const Workflows: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('todas');
  const [selectedEstado, setSelectedEstado] = useState('todos');

  // Datos mock - en producción vendrían del backend
  const workflows: WorkflowTemplate[] = [
    {
      id: 1,
      codigo: 'WF_RENOVACION_LICENCIAS',
      nombre: 'Renovación de Licencias de Conducir',
      descripcion: 'Proceso estándar para renovación de licencias entre gobierno y entidades',
      categoria: 'Gobierno',
      tipo: 'bilateral',
      estado: 'activo',
      version: '2.1',
      cantidadPasos: 6,
      estimacionDuracion: 72,
      utilizaciones: 45,
      fechaCreacion: '2025-01-15',
      fechaUltimaModificacion: '2025-08-10',
      creadoPor: 'María González'
    },
    {
      id: 2,
      codigo: 'WF_CERTIFICADOS_MEDICOS',
      nombre: 'Distribución de Certificados Médicos',
      descripcion: 'Flujo circular para distribución masiva de certificados médicos',
      categoria: 'Salud',
      tipo: 'circular',
      estado: 'activo',
      version: '1.5',
      cantidadPasos: 4,
      estimacionDuracion: 24,
      utilizaciones: 23,
      fechaCreacion: '2025-02-20',
      fechaUltimaModificacion: '2025-07-15',
      creadoPor: 'Carlos López'
    },
    {
      id: 3,
      codigo: 'WF_APROBACION_CONTRATOS',
      nombre: 'Aprobación Jerárquica de Contratos',
      descripcion: 'Proceso de aprobación con múltiples niveles de supervisión',
      categoria: 'Legal',
      tipo: 'jerarquico',
      estado: 'borrador',
      version: '1.0',
      cantidadPasos: 8,
      estimacionDuracion: 120,
      utilizaciones: 0,
      fechaCreacion: '2025-08-18',
      fechaUltimaModificacion: '2025-08-20',
      creadoPor: 'Ana Martínez'
    }
  ];

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'bilateral': return <Users className="h-4 w-4" />;
      case 'circular': return <Activity className="h-4 w-4" />;
      case 'jerarquico': return <Workflow className="h-4 w-4" />;
      case 'supervisado': return <CheckCircle className="h-4 w-4" />;
      case 'paralelo': return <Clock className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'borrador': return 'bg-gray-100 text-gray-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800';
      case 'obsoleto': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Gobierno': return 'bg-blue-100 text-blue-800';
      case 'Salud': return 'bg-emerald-100 text-emerald-800';
      case 'Legal': return 'bg-purple-100 text-purple-800';
      case 'Educación': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = selectedCategoria === 'todas' || workflow.categoria === selectedCategoria;
    const matchesEstado = selectedEstado === 'todos' || workflow.estado === selectedEstado;
    
    return matchesSearch && matchesCategoria && matchesEstado;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-8 mt-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Workflow className="h-8 w-8 mr-3 text-purple-600" />
            Configuración de Flujos
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Diseña y configura workflows para automatizar procesos de intercambio
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Workflow
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Workflow className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {workflows.filter(w => w.estado === 'activo').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Utilizaciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {workflows.reduce((acc, w) => acc + w.utilizaciones, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(workflows.reduce((acc, w) => acc + w.estimacionDuracion, 0) / workflows.length)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="todas">Todas las categorías</option>
              <option value="Gobierno">Gobierno</option>
              <option value="Salud">Salud</option>
              <option value="Legal">Legal</option>
              <option value="Educación">Educación</option>
            </select>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="borrador">Borrador</option>
              <option value="pausado">Pausado</option>
              <option value="obsoleto">Obsoleto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de workflows */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            Workflows Configurados ({filteredWorkflows.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredWorkflows.map((workflow) => (
            <div key={workflow.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="flex items-center text-gray-500 mr-4">
                      {getTipoIcon(workflow.tipo)}
                      <span className="ml-1 text-sm">{workflow.tipo}</span>
                    </div>
                    <span className="text-sm text-gray-500 mr-4">
                      {workflow.codigo}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(workflow.estado)}`}>
                      {workflow.estado.toUpperCase()}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getCategoriaColor(workflow.categoria)}`}>
                      {workflow.categoria}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-medium text-gray-900 mb-1">
                    {workflow.nombre}
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {workflow.descripcion}
                  </p>
                  
                  <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {workflow.estimacionDuracion}h estimadas
                    </span>
                    <span className="flex items-center">
                      <Settings className="h-4 w-4 mr-1" />
                      {workflow.cantidadPasos} pasos
                    </span>
                    <span className="flex items-center">
                      <Activity className="h-4 w-4 mr-1" />
                      {workflow.utilizaciones} usos
                    </span>
                    <span>
                      Versión {workflow.version}
                    </span>
                    <span>
                      por {workflow.creadoPor}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Duplicar">
                    <Copy className="h-4 w-4" />
                  </button>
                  {workflow.estado === 'activo' ? (
                    <button className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Pausar">
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : (
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Activar">
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron workflows
          </h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategoria !== 'todas' || selectedEstado !== 'todos'
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Comienza creando tu primer workflow automatizado'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Workflows;