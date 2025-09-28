import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Calendar, Save } from 'lucide-react';
import { estadosService } from '../../services/estados';
import { documentosService } from '../../services/documentos';

interface EditarDocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: any;
  tipoEdicion: 'universal' | 'recurso' | 'entidad';
  onDocumentoActualizado?: () => void;
  refetchDocumentos?: () => void;
}

const EditarDocumentoModal: React.FC<EditarDocumentoModalProps> = ({
  isOpen,
  onClose,
  documento,
  tipoEdicion,
  onDocumentoActualizado,
  refetchDocumentos
}) => {
  const queryClient = useQueryClient();

  // Estados para el formulario
  const [formData, setFormData] = useState({
    fechaEmision: '',
    fechaTramitacion: '',
    fechaVencimiento: '',
    estadoId: ''
  });

  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({
    fechaEmision: '',
    fechaTramitacion: '',
    fechaVencimiento: ''
  });

  // Query para obtener estados
  const { data: estados } = useQuery({
    queryKey: ['estados'],
    queryFn: () => estadosService.getEstados(),
    enabled: isOpen
  });

  // Inicializar el formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && documento) {
      setFormData({
        fechaEmision: documento.fechaEmision ? documento.fechaEmision.split('T')[0] : '',
        fechaTramitacion: documento.fechaTramitacion ? documento.fechaTramitacion.split('T')[0] : '',
        fechaVencimiento: documento.fechaVencimiento ? documento.fechaVencimiento.split('T')[0] : '',
        estadoId: documento.estadoCritico?.id?.toString() || documento.estado?.id?.toString() || ''
      });
    }
  }, [isOpen, documento]);

  // Función para calcular fecha de vencimiento
  const calcularFechaVencimiento = (fechaEmision: string) => {
    if (!fechaEmision || !documento?.diasVigencia) return '';

    const fecha = new Date(fechaEmision);
    fecha.setDate(fecha.getDate() + documento.diasVigencia);
    return fecha.toISOString().split('T')[0];
  };

  // Función para validar fechas
  const validarFechas = (campo: string, valor: string, datosActuales: any) => {
    const nuevosErrores = { ...errores };
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    const mañana = new Date(fechaActual);
    mañana.setDate(mañana.getDate() + 1);

    if (campo === 'fechaEmision' && valor) {
      const fechaEmision = new Date(valor);

      // Si hay fecha de tramitación, validar que emisión no sea mayor
      if (datosActuales.fechaTramitacion) {
        const fechaTramitacion = new Date(datosActuales.fechaTramitacion);
        if (fechaEmision > fechaTramitacion) {
          nuevosErrores.fechaEmision = 'La fecha de emisión no puede ser mayor a la fecha de tramitación';
        } else {
          nuevosErrores.fechaEmision = '';
        }
      }
    }

    if (campo === 'fechaTramitacion' && valor) {
      const fechaTramitacion = new Date(valor);

      // Validar que tramitación no sea menor a emisión
      if (datosActuales.fechaEmision) {
        const fechaEmision = new Date(datosActuales.fechaEmision);
        if (fechaTramitacion < fechaEmision) {
          nuevosErrores.fechaTramitacion = 'La fecha de tramitación no puede ser menor a la fecha de emisión';
        } else {
          nuevosErrores.fechaTramitacion = '';
        }
      }

      // Validar que tramitación no sea mayor a vencimiento
      if (datosActuales.fechaVencimiento) {
        const fechaVencimiento = new Date(datosActuales.fechaVencimiento);
        if (fechaTramitacion > fechaVencimiento) {
          nuevosErrores.fechaTramitacion = 'La fecha de tramitación no puede ser mayor a la fecha de vencimiento';
        } else if (nuevosErrores.fechaTramitacion === '') {
          nuevosErrores.fechaTramitacion = '';
        }
      }
    }

    if (campo === 'fechaVencimiento' && valor) {
      const fechaVencimiento = new Date(valor);

      // Validar que vencimiento no sea menor a mañana
      if (fechaVencimiento < mañana) {
        nuevosErrores.fechaVencimiento = 'La fecha de vencimiento debe ser mayor a la fecha actual';
      } else {
        nuevosErrores.fechaVencimiento = '';
      }

      // Validar que vencimiento no sea menor a tramitación
      if (datosActuales.fechaTramitacion) {
        const fechaTramitacion = new Date(datosActuales.fechaTramitacion);
        if (fechaVencimiento < fechaTramitacion) {
          nuevosErrores.fechaVencimiento = 'La fecha de vencimiento no puede ser menor a la fecha de tramitación';
        } else if (nuevosErrores.fechaVencimiento === '') {
          nuevosErrores.fechaVencimiento = '';
        }
      }
    }

    setErrores(nuevosErrores);
    return nuevosErrores;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let nuevosDatos = {
      ...formData,
      [name]: value
    };

    // Si se cambia el estado a "Vigente", validar fecha de vencimiento
    if (name === 'estadoId' && value) {
      const estadoSeleccionado = estados?.find((e: any) => e.id === parseInt(value));

      if (estadoSeleccionado && estadoSeleccionado.nombre === 'Vigente') {
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        const mañana = new Date(fechaActual);
        mañana.setDate(mañana.getDate() + 1);

        if (nuevosDatos.fechaVencimiento) {
          const fechaVencimiento = new Date(nuevosDatos.fechaVencimiento);
          if (fechaVencimiento < mañana) {
            alert('No se puede establecer el estado como "Vigente" cuando la fecha de vencimiento es anterior o igual a hoy. El documento está vencido o por vencer.');
            return; // No actualizar el estado
          }
        }
      }
    }

    // Si se cambia fecha de emisión, calcular automáticamente fecha de vencimiento
    if (name === 'fechaEmision' && value) {
      const nuevaFechaVencimiento = calcularFechaVencimiento(value);
      nuevosDatos.fechaVencimiento = nuevaFechaVencimiento;

      // Validar la nueva fecha de vencimiento calculada
      validarFechas('fechaVencimiento', nuevaFechaVencimiento, nuevosDatos);
    }

    // Validar la fecha actual
    validarFechas(name, value, nuevosDatos);

    setFormData(nuevosDatos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar si hay errores antes de enviar
    const hayErrores = Object.values(errores).some(error => error !== '');
    if (hayErrores) {
      alert('Por favor, corrija los errores en las fechas antes de guardar.');
      return;
    }

    // Validación general: La fecha de vencimiento debe ser mayor a hoy
    if (formData.fechaVencimiento) {
      const fechaActual = new Date();
      fechaActual.setHours(0, 0, 0, 0);
      const mañana = new Date(fechaActual);
      mañana.setDate(mañana.getDate() + 1);
      const fechaVencimiento = new Date(formData.fechaVencimiento);

      if (fechaVencimiento < mañana) {
        alert('No se puede guardar: La fecha de vencimiento debe ser posterior a la fecha actual.');
        return;
      }
    }

    // Validación adicional: Si el estado es "Vigente", verificar fecha de vencimiento
    if (formData.estadoId) {
      const estadoSeleccionado = estados?.find((e: any) => e.id === parseInt(formData.estadoId));

      if (estadoSeleccionado && estadoSeleccionado.nombre === 'Vigente' && formData.fechaVencimiento) {
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0);
        const mañana = new Date(fechaActual);
        mañana.setDate(mañana.getDate() + 1);
        const fechaVencimiento = new Date(formData.fechaVencimiento);

        if (fechaVencimiento < mañana) {
          alert('No se puede establecer el estado como "Vigente" cuando la fecha de vencimiento es anterior o igual a hoy.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const updateData = {
        fechaEmision: formData.fechaEmision || undefined,
        fechaTramitacion: formData.fechaTramitacion || undefined,
        fechaVencimiento: formData.fechaVencimiento || undefined,
        estadoId: formData.estadoId ? parseInt(formData.estadoId) : undefined
      };

      // Determinar qué endpoint usar según el tipo de edición
      if (tipoEdicion === 'universal') {
        // Para documentos universales, actualizar la tabla documentacion
        await documentosService.updateDocumentoUniversal(documento.id, updateData);
      } else if (tipoEdicion === 'recurso') {
        // Para asignaciones por recurso, actualizar recurso_documentacion
        await documentosService.updateRecursoAsignado(
          documento.id,
          documento.asignacionActual?.id,
          updateData
        );
      } else if (tipoEdicion === 'entidad') {
        // Para asignaciones por entidad, actualizar entidad_documentacion
        await documentosService.updateEntidadAsignada(
          documento.id,
          documento.asignacionActual?.id,
          updateData
        );
      }

      // Refrescar datos
      onDocumentoActualizado?.();

      // Refrescar la grilla
      if (refetchDocumentos) {
        refetchDocumentos();
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos-gestion'] });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      onClose();

      // Reset form y errores
      setFormData({
        fechaEmision: '',
        fechaTramitacion: '',
        fechaVencimiento: '',
        estadoId: ''
      });
      setErrores({
        fechaEmision: '',
        fechaTramitacion: '',
        fechaVencimiento: ''
      });

    } catch (error) {
      console.error('Error al actualizar documento:', error);
      alert('Error al actualizar el documento. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar si las fechas son editables
  const sonFechasEditables = () => {
    if (!documento) return false;
    // Todas las fechas son editables en cualquier caso
    return true;
  };

  const fechasEditables = sonFechasEditables();

  if (!isOpen || !documento) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="mr-2" size={20} />
            Editar {tipoEdicion === 'universal' ? 'Documento Universal' :
                   tipoEdicion === 'recurso' ? 'Asignación por Recurso' : 'Asignación por Entidad'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-1">
            {documento.codigo} - {documento.descripcion}
          </h4>
          {tipoEdicion !== 'universal' && documento.asignacionActual && (
            <p className="text-sm text-gray-500">
              {tipoEdicion === 'recurso'
                ? `Recurso: ${documento.asignacionActual.nombre}`
                : `Entidad: ${documento.asignacionActual.nombre}`
              }
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Emisión
              </label>
              <input
                type="date"
                name="fechaEmision"
                value={formData.fechaEmision}
                onChange={handleChange}
                disabled={!fechasEditables}
                className={`w-full px-3 py-2 border ${errores.fechaEmision ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errores.fechaEmision && (
                <p className="mt-1 text-sm text-red-600">{errores.fechaEmision}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Tramitación
              </label>
              <input
                type="date"
                name="fechaTramitacion"
                value={formData.fechaTramitacion}
                onChange={handleChange}
                disabled={!fechasEditables}
                className={`w-full px-3 py-2 border ${errores.fechaTramitacion ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errores.fechaTramitacion && (
                <p className="mt-1 text-sm text-red-600">{errores.fechaTramitacion}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Vencimiento
                {documento?.diasVigencia && (
                  <span className="text-gray-500 ml-1 text-xs">
                    ({documento.diasVigencia} días de vigencia)
                  </span>
                )}
              </label>
              <input
                type="date"
                name="fechaVencimiento"
                value={formData.fechaVencimiento}
                onChange={handleChange}
                disabled={!fechasEditables}
                className={`w-full px-3 py-2 border ${errores.fechaVencimiento ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errores.fechaVencimiento && (
                <p className="mt-1 text-sm text-red-600">{errores.fechaVencimiento}</p>
              )}
              {documento?.diasVigencia && fechasEditables && (
                <p className="mt-1 text-xs text-gray-500">
                  Se calcula automáticamente al cambiar la fecha de emisión
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado del Documento
            </label>
            <select
              name="estadoId"
              value={formData.estadoId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar estado</option>
              {estados?.map((estado: any) => (
                <option key={estado.id} value={estado.id}>
                  {estado.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-1" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarDocumentoModal;