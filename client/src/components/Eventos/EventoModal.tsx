import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import { eventosService, CreateEventoData } from '../../services/eventos';

interface EventoModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  onEventoCreado?: () => void;
}

const EventoModal: React.FC<EventoModalProps> = ({
  isOpen,
  onClose,
  documento,
  onEventoCreado
}) => {
  const [formData, setFormData] = useState({
    tipoEvento: 'seguimiento' as 'seguimiento' | 'tramite' | 'notificacion' | 'observacion',
    fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    hora: new Date().toTimeString().split(' ')[0].substring(0, 5), // Hora actual en formato HH:MM
    titulo: '',
    descripcion: '',
    observaciones: ''
  });

  // Mutation para crear evento
  const createMutation = useMutation({
    mutationFn: eventosService.createEvento,
    onSuccess: () => {
      onEventoCreado?.();
      onClose();
      // Reset form
      setFormData({
        tipoEvento: 'seguimiento',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
        titulo: '',
        descripcion: '',
        observaciones: ''
      });
    },
    onError: (error) => {
      console.error('Error al crear evento:', error);
      alert('Error al crear el evento. Por favor, intente nuevamente.');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData: CreateEventoData = {
      documentacionId: documento.id,
      recursoDocumentacionId: documento.asignacionActual?.tipo === 'recurso' ? documento.asignacionActual.id : undefined,
      entidadDocumentacionId: documento.asignacionActual?.tipo === 'entidad' ? documento.asignacionActual.id : undefined,
      tipoEvento: formData.tipoEvento,
      fecha: formData.fecha,
      hora: formData.hora,
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      observaciones: formData.observaciones || undefined
    };

    createMutation.mutate(eventData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="mr-2" size={20} />
            Registrar Evento - {documento?.codigo}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-1">{documento?.descripcion}</h4>
          <p className="text-sm text-gray-500">
            {documento?.asignacionActual?.tipo === 'recurso' &&
              `Recurso: ${documento.asignacionActual.nombre}`}
            {documento?.asignacionActual?.tipo === 'entidad' &&
              `Entidad: ${documento.asignacionActual.nombre}`}
            {!documento?.asignacionActual && 'Documento Universal'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Evento
              </label>
              <select
                name="tipoEvento"
                value={formData.tipoEvento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="seguimiento">Seguimiento</option>
                <option value="tramite">Trámite</option>
                <option value="notificacion">Notificación</option>
                <option value="observacion">Observación</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={16} className="inline mr-1" />
                Fecha
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock size={16} className="inline mr-1" />
                Hora
              </label>
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Resumen del evento"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={16} className="inline mr-1" />
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows={3}
              placeholder="Descripción detallada del evento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={2}
              placeholder="Observaciones adicionales (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={createMutation.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-1" />
                  Registrar Evento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventoModal;