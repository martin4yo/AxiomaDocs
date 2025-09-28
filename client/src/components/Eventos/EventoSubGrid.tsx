import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Clock, FileText, User, Edit, Trash2 } from 'lucide-react';
import { formatDateLocal } from '../../utils/dateUtils';
import { eventosService, Evento, EventosFiltros } from '../../services/eventos';
import EventoModal from './EventoModal';


interface EventoSubGridProps {
  documento: any;
  className?: string;
}

const EventoSubGrid: React.FC<EventoSubGridProps> = ({ documento, className = '' }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Preparar filtros para la consulta
  const filtros: EventosFiltros = {
    documentacionId: documento.id,
    recursoDocumentacionId: documento.asignacionActual?.tipo === 'recurso' ? documento.asignacionActual.id : undefined,
    entidadDocumentacionId: documento.asignacionActual?.tipo === 'entidad' ? documento.asignacionActual.id : undefined
  };

  // Query para obtener eventos
  const { data: eventosResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['eventos', filtros],
    queryFn: () => eventosService.getEventos(filtros),
    staleTime: 30000, // Considerar datos frescos por 30 segundos
  });

  const eventos = eventosResponse?.eventos || [];

  // Mutation para eliminar evento
  const deleteMutation = useMutation({
    mutationFn: eventosService.deleteEvento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos', filtros] });
    },
    onError: (error) => {
      console.error('Error al eliminar evento:', error);
      alert('Error al eliminar el evento');
    }
  });

  const getTipoEventoColor = (tipo: string) => {
    switch (tipo) {
      case 'seguimiento': return 'bg-blue-100 text-blue-800';
      case 'tramite': return 'bg-green-100 text-green-800';
      case 'notificacion': return 'bg-yellow-100 text-yellow-800';
      case 'observacion': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoEventoLabel = (tipo: string) => {
    switch (tipo) {
      case 'seguimiento': return 'Seguimiento';
      case 'tramite': return 'Trámite';
      case 'notificacion': return 'Notificación';
      case 'observacion': return 'Observación';
      default: return tipo;
    }
  };

  const handleNuevoEvento = () => {
    setModalOpen(true);
  };

  const handleEventoCreado = () => {
    setModalOpen(false);
    refetch(); // Refrescar la lista de eventos
  };

  const handleEditarEvento = (evento: Evento) => {
    console.log('Editar evento:', evento);
    // TODO: Implementar modal de edición
  };

  const handleEliminarEvento = (evento: Evento) => {
    if (window.confirm('¿Está seguro de que desea eliminar este evento?')) {
      deleteMutation.mutate(evento.id);
    }
  };

  // Los eventos ya vienen ordenados del backend, pero por si acaso
  const eventosOrdenados = [...eventos].sort((a, b) => {
    const fechaHoraA = new Date(`${a.fecha}T${a.hora}`);
    const fechaHoraB = new Date(`${b.fecha}T${b.hora}`);
    return fechaHoraB.getTime() - fechaHoraA.getTime();
  });

  return (
    <div className={`bg-white ${className}`}>
      {/* Header con título y botón agregar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center">
          <Calendar className="mr-2 text-purple-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            Eventos del Documento
          </h3>
          <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
            {eventos.length}
          </span>
        </div>
        <button
          onClick={handleNuevoEvento}
          className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Nuevo Evento
        </button>
      </div>

      {/* Lista de eventos */}
      {error ? (
        <div className="text-center py-8 text-red-500">
          <p className="text-lg font-medium mb-1">Error al cargar eventos</p>
          <p className="text-sm">Por favor, intente nuevamente</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : eventosOrdenados.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {eventosOrdenados.map((evento) => (
            <div
              key={evento.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header del evento */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoEventoColor(evento.tipoEvento)}`}
                  >
                    {getTipoEventoLabel(evento.tipoEvento)}
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-1" />
                    {formatDateLocal(evento.fecha)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock size={14} className="mr-1" />
                    {evento.hora}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditarEvento(evento)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Editar evento"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleEliminarEvento(evento)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Eliminar evento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Contenido del evento */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <FileText size={16} className="mr-2 text-gray-500" />
                  {evento.titulo}
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed ml-6">
                  {evento.descripcion}
                </p>
                {evento.observaciones && (
                  <div className="ml-6 mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    <strong>Observaciones:</strong> {evento.observaciones}
                  </div>
                )}
              </div>

              {/* Footer con información del creador */}
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <User size={12} className="mr-1" />
                  Creado por: {evento.creador.nombre} {evento.creador.apellido}
                </div>
                <div>
                  {formatDateLocal(evento.createdAt)} {new Date(evento.createdAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium mb-1">No hay eventos registrados</p>
          <p className="text-sm">Haga clic en "Nuevo Evento" para agregar el primer evento</p>
        </div>
      )}

      {/* Modal para crear/editar evento */}
      <EventoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        documento={documento}
        onEventoCreado={handleEventoCreado}
      />
    </div>
  );
};

export default EventoSubGrid;