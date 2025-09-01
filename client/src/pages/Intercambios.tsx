import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Edit,
  Trash2
} from 'lucide-react';
import intercambioService, { Intercambio, IntercambioFiltros } from '../services/intercambios';
import IntercambioModal from '../components/Intercambios/IntercambioModal';


const Intercambios: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIntercambio, setEditingIntercambio] = useState<Intercambio | null>(null);
  
  const queryClient = useQueryClient();
  const pageSize = 10;

  // Construir filtros
  const filtros: IntercambioFiltros = {
    page: currentPage,
    limit: pageSize,
    ...(searchTerm && { search: searchTerm }),
    ...(selectedEstado !== 'todos' && { estado: selectedEstado })
  };

  // Consultar intercambios
  const { data: intercambiosData, isLoading, error } = useQuery({
    queryKey: ['intercambios', filtros],
    queryFn: () => intercambioService.listar(filtros)
  });

  // Consultar estadísticas
  const { data: estadisticas } = useQuery({
    queryKey: ['intercambios', 'estadisticas'],
    queryFn: () => intercambioService.obtenerEstadisticas('30d')
  });

  // Mutación para eliminar
  const eliminarMutation = useMutation({
    mutationFn: intercambioService.eliminar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intercambios'] });
      toast.success('Intercambio eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el intercambio');
    }
  });

  const intercambios = intercambiosData?.intercambios || [];
  const pagination = intercambiosData?.pagination;

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'iniciado': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'en_progreso': return <Play className="h-4 w-4 text-yellow-500" />;
      case 'completado': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pausado': return <Pause className="h-4 w-4 text-gray-500" />;
      case 'cancelado': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Funciones de manejo
  const handleNuevoIntercambio = () => {
    setEditingIntercambio(null);
    setModalOpen(true);
  };

  const handleEditarIntercambio = (intercambio: Intercambio) => {
    setEditingIntercambio(intercambio);
    setModalOpen(true);
  };

  const handleEliminarIntercambio = async (intercambio: Intercambio) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el intercambio "${intercambio.nombre}"?`)) {
      eliminarMutation.mutate(intercambio.id);
    }
  };

  const handleSaveIntercambio = () => {
    queryClient.invalidateQueries({ queryKey: ['intercambios'] });
    queryClient.invalidateQueries({ queryKey: ['intercambios', 'estadisticas'] });
  };

  // Resetear página al cambiar filtros
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEstadoChange = (value: string) => {
    setSelectedEstado(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 mt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ArrowRightLeft className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Intercambios
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Administra y monitorea todos los procesos de intercambio de documentos entre entidades
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleNuevoIntercambio}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Intercambio
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">En Proceso</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas?.resumen.enProgreso || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completados</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas?.resumen.completados || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Con Retrasos</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas?.resumen.conRetrasos || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowRightLeft className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas?.resumen.totalIntercambios || 0}
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
                placeholder="Buscar intercambios..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEstado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="iniciado">Iniciado</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completado">Completado</option>
              <option value="pausado">Pausado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Más filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de intercambios */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            {isLoading ? 'Cargando...' : `Intercambios (${pagination?.total || 0})`}
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando intercambios...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Error al cargar los intercambios</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {intercambios.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron intercambios
                </h3>
                <p className="text-gray-500">
                  {searchTerm || selectedEstado !== 'todos' 
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'Comienza creando tu primer intercambio de documentos'
                  }
                </p>
              </div>
            ) : (
              intercambios.map((intercambio) => (
                <div key={intercambio.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getEstadoIcon(intercambio.estado)}
                        <span className="ml-2 text-sm font-medium text-gray-500">
                          {intercambio.codigo}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getPrioridadColor(intercambio.prioridad)}`}>
                          {intercambio.prioridad.toUpperCase()}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-medium text-gray-900 mb-1">
                        {intercambio.nombre}
                      </h4>
                      
                      <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4 mb-3">
                        <span>
                          <strong>Origen:</strong> {intercambio.entidadOrigen?.nombre}
                        </span>
                        <span>
                          <strong>Destino:</strong> {intercambio.entidadDestino?.nombre}
                        </span>
                        <span>
                          <strong>Tipo:</strong> {intercambio.workflow?.tipo}
                        </span>
                        <span>
                          <strong>Responsable:</strong> {intercambio.responsable?.nombre} {intercambio.responsable?.apellido}
                        </span>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progreso</span>
                            <span>{intercambio.progreso}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${intercambio.progreso}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>Inicio: {new Date(intercambio.fechaInicio).toLocaleDateString()}</div>
                          <div>Est. Fin: {new Date(intercambio.fechaEstimadaFin).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button 
                        onClick={() => handleEditarIntercambio(intercambio)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEliminarIntercambio(intercambio)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Paginación */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} al{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
              {pagination.total} resultados
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Página {pagination.page} de {pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
              disabled={currentPage >= pagination.pages}
              className="px-3 py-1 text-sm text-gray-500 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de intercambio */}
      <IntercambioModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        intercambio={editingIntercambio}
        onSave={handleSaveIntercambio}
      />
    </div>
  );
};

export default Intercambios;