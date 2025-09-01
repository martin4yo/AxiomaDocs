import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import intercambioService, { Intercambio, IntercambioCreacion, IntercambioActualizacion } from '../../services/intercambios';
import workflowService from '../../services/workflows';
import { entidadesService } from '../../services/entidades';
import { usuariosService } from '../../services/usuarios';

interface IntercambioModalProps {
  isOpen: boolean;
  onClose: () => void;
  intercambio?: Intercambio | null;
  onSave: (intercambio: Intercambio) => void;
}

type FormData = {
  nombre: string;
  descripcion: string;
  workflowId: number | '';
  entidadOrigenId: number | '';
  entidadDestinoId: number | '';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  fechaEstimadaFin: string;
  responsableId: number | '';
  supervisorId: number | '';
  observaciones: string;
};

const IntercambioModal: React.FC<IntercambioModalProps> = ({
  isOpen,
  onClose,
  intercambio,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!intercambio;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<FormData>();

  const workflowId = watch('workflowId');

  // Cargar datos necesarios para el formulario
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', 'templates'],
    queryFn: () => workflowService.obtenerTemplates()
  });

  const { data: entidades = [] } = useQuery({
    queryKey: ['entidades', 'all'],
    queryFn: () => entidadesService.getAll({ limit: 1000 }).then(res => res.entidades)
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios', 'all'],
    queryFn: () => usuariosService.getAll({ limit: 1000 }).then(res => res.usuarios)
  });

  const { data: workflowSeleccionado } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowService.obtenerPorId(Number(workflowId)),
    enabled: !!workflowId && Number(workflowId) !== 0
  });

  // Resetear formulario cuando cambia el intercambio
  useEffect(() => {
    if (isOpen) {
      if (intercambio) {
        reset({
          nombre: intercambio.nombre,
          descripcion: intercambio.descripcion || '',
          workflowId: intercambio.workflowId,
          entidadOrigenId: intercambio.entidadOrigenId,
          entidadDestinoId: intercambio.entidadDestinoId,
          prioridad: intercambio.prioridad,
          fechaEstimadaFin: intercambio.fechaEstimadaFin.split('T')[0], // Solo fecha
          responsableId: intercambio.responsableId,
          supervisorId: intercambio.supervisorId || '',
          observaciones: intercambio.observaciones || ''
        });
      } else {
        reset({
          nombre: '',
          descripcion: '',
          workflowId: '',
          entidadOrigenId: '',
          entidadDestinoId: '',
          prioridad: 'media',
          fechaEstimadaFin: '',
          responsableId: '',
          supervisorId: '',
          observaciones: ''
        });
      }
    }
  }, [isOpen, intercambio, reset]);

  // Calcular fecha estimada basada en el workflow seleccionado
  useEffect(() => {
    if (workflowSeleccionado && workflowSeleccionado.estimacionDuracionHoras && !isEditing) {
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio.getTime() + (workflowSeleccionado.estimacionDuracionHoras * 60 * 60 * 1000));
      const fechaFormateada = fechaFin.toISOString().split('T')[0];
      
      reset(prev => ({
        ...prev,
        fechaEstimadaFin: fechaFormateada
      }));
    }
  }, [workflowSeleccionado, isEditing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Validaciones adicionales
      if (data.entidadOrigenId === data.entidadDestinoId) {
        toast.error('La entidad origen y destino no pueden ser la misma');
        return;
      }

      if (isEditing && intercambio) {
        // Actualizar intercambio existente
        const updateData: IntercambioActualizacion = {
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          prioridad: data.prioridad,
          fechaEstimadaFin: data.fechaEstimadaFin,
          responsableId: Number(data.responsableId),
          supervisorId: data.supervisorId ? Number(data.supervisorId) : undefined,
          observaciones: data.observaciones || undefined
        };

        const intercambioActualizado = await intercambioService.actualizar(intercambio.id, updateData);
        onSave(intercambioActualizado);
        toast.success('Intercambio actualizado exitosamente');
      } else {
        // Crear nuevo intercambio
        const createData: IntercambioCreacion = {
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          workflowId: Number(data.workflowId),
          entidadOrigenId: Number(data.entidadOrigenId),
          entidadDestinoId: Number(data.entidadDestinoId),
          prioridad: data.prioridad,
          fechaEstimadaFin: data.fechaEstimadaFin,
          responsableId: Number(data.responsableId),
          supervisorId: data.supervisorId ? Number(data.supervisorId) : undefined,
          observaciones: data.observaciones || undefined
        };

        const nuevoIntercambio = await intercambioService.crear(createData);
        onSave(nuevoIntercambio);
        toast.success('Intercambio creado exitosamente');
      }

      onClose();
    } catch (error: any) {
      console.error('Error al guardar intercambio:', error);
      toast.error(error.response?.data?.error || 'Error al guardar el intercambio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

        <div className="inline-block w-full max-w-4xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? 'Editar Intercambio' : 'Nuevo Intercambio'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Intercambio *
                  </label>
                  <Controller
                    name="nombre"
                    control={control}
                    rules={{ required: 'El nombre es requerido' }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: Renovación Licencias - Entidad A"
                      />
                    )}
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                  )}
                </div>

                {/* Workflow */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow *
                  </label>
                  <Controller
                    name="workflowId"
                    control={control}
                    rules={{ required: 'El workflow es requerido' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">Seleccionar workflow...</option>
                        {workflows.map(workflow => (
                          <option key={workflow.id} value={workflow.id}>
                            {workflow.nombre} ({workflow.categoria})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.workflowId && (
                    <p className="mt-1 text-sm text-red-600">{errors.workflowId.message}</p>
                  )}
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <Controller
                    name="prioridad"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Crítica</option>
                      </select>
                    )}
                  />
                </div>

                {/* Entidad Origen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entidad Origen *
                  </label>
                  <Controller
                    name="entidadOrigenId"
                    control={control}
                    rules={{ required: 'La entidad origen es requerida' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">Seleccionar entidad origen...</option>
                        {entidades.map(entidad => (
                          <option key={entidad.id} value={entidad.id}>
                            {entidad.razonSocial}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.entidadOrigenId && (
                    <p className="mt-1 text-sm text-red-600">{errors.entidadOrigenId.message}</p>
                  )}
                </div>

                {/* Entidad Destino */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entidad Destino *
                  </label>
                  <Controller
                    name="entidadDestinoId"
                    control={control}
                    rules={{ required: 'La entidad destino es requerida' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        disabled={isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                      >
                        <option value="">Seleccionar entidad destino...</option>
                        {entidades.map(entidad => (
                          <option key={entidad.id} value={entidad.id}>
                            {entidad.razonSocial}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.entidadDestinoId && (
                    <p className="mt-1 text-sm text-red-600">{errors.entidadDestinoId.message}</p>
                  )}
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <Controller
                    name="responsableId"
                    control={control}
                    rules={{ required: 'El responsable es requerido' }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar responsable...</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre} {usuario.apellido} ({usuario.username})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.responsableId && (
                    <p className="mt-1 text-sm text-red-600">{errors.responsableId.message}</p>
                  )}
                </div>

                {/* Supervisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor
                  </label>
                  <Controller
                    name="supervisorId"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sin supervisor asignado</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre} {usuario.apellido} ({usuario.username})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {/* Fecha Estimada de Fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Estimada de Finalización *
                  </label>
                  <Controller
                    name="fechaEstimadaFin"
                    control={control}
                    rules={{ required: 'La fecha estimada es requerida' }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  />
                  {errors.fechaEstimadaFin && (
                    <p className="mt-1 text-sm text-red-600">{errors.fechaEstimadaFin.message}</p>
                  )}
                  {workflowSeleccionado?.estimacionDuracionHoras && (
                    <p className="mt-1 text-xs text-gray-500">
                      Duración estimada del workflow: {workflowSeleccionado.estimacionDuracionHoras} horas
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <Controller
                    name="descripcion"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descripción del intercambio..."
                      />
                    )}
                  />
                </div>

                {/* Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <Controller
                    name="observaciones"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Observaciones adicionales..."
                      />
                    )}
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntercambioModal;