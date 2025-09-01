import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Edit, Trash2, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { Estado } from '../types';
import { estadosService } from '../services/estados';
import EstadoModal from '../components/Estados/EstadoModal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import ExportButtons from '../components/Common/ExportButtons';
import { prepareEstadoData } from '../utils/exportUtils';

const Estados: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstado, setEditingEstado] = useState<Estado | null>(null);
  const [deletingEstado, setDeletingEstado] = useState<Estado | null>(null);
  const queryClient = useQueryClient();

  const { data: estados, isLoading } = useQuery('estados', estadosService.getAll);

  const createMutation = useMutation(estadosService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('estados');
      setIsModalOpen(false);
      toast.success('Estado creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear estado');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Estado> }) =>
      estadosService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('estados');
        setIsModalOpen(false);
        setEditingEstado(null);
        toast.success('Estado actualizado correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar estado');
      },
    }
  );

  const deleteMutation = useMutation(estadosService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('estados');
      setDeletingEstado(null);
      toast.success('Estado eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar estado');
    },
  });

  const handleCreate = (data: Omit<Estado, 'id' | 'createdAt' | 'updatedAt'>) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: Partial<Omit<Estado, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (editingEstado) {
      updateMutation.mutate({ id: editingEstado.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingEstado) {
      deleteMutation.mutate(deletingEstado.id);
    }
  };

  const handleEdit = (estado: Estado) => {
    setEditingEstado(estado);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEstado(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Flag className="h-8 w-8 mr-3 text-amber-600" />
          Estados
        </h1>
        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareEstadoData(estados || [])}
            exportConfig={{
              filename: `estados_${new Date().toISOString().split('T')[0]}`,
              title: 'Listado de Estados',
              columns: [
                { key: 'nombre', label: 'Nombre', width: 20 },
                { key: 'color', label: 'Color', width: 15 },
                { key: 'nivel', label: 'Nivel', width: 10 },
                { key: 'descripcion', label: 'Descripción', width: 30 },
                { key: 'fechaCreacion', label: 'Fecha Creación', width: 15 },
                { key: 'fechaModificacion', label: 'Fecha Modificación', width: 15 }
              ]
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-md"
          >
            <Plus size={16} className="mr-2" />
            Nuevo Estado
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Color</th>
                  <th>Descripción</th>
                  <th>Fecha Creación</th>
                  <th className="w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estados?.map((estado) => (
                  <tr key={estado.id}>
                    <td className="font-medium">{estado.nombre}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: estado.color }}
                        />
                        <span className="text-sm text-gray-600">{estado.color}</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {estado.descripcion || '-'}
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(estado.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(estado)}
                          className="p-1 text-gray-600 hover:text-primary-600"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingEstado(estado)}
                          className="p-1 text-gray-600 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {estados?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay estados registrados
              </div>
            )}
          </div>
        </div>
      </div>

      <EstadoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        estado={editingEstado}
        onSubmit={editingEstado ? handleUpdate : handleCreate}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingEstado}
        onClose={() => setDeletingEstado(null)}
        onConfirm={handleDelete}
        title="Eliminar Estado"
        message={`¿Está seguro que desea eliminar el estado "${deletingEstado?.nombre}"?`}
        isLoading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default Estados;