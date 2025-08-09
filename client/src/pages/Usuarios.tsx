import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Usuario } from '../services/usuarios';
import { usuariosService } from '../services/usuarios';
import UsuarioModal from '../components/Usuarios/UsuarioModal';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import ExportButtons from '../components/Common/ExportButtons';
import { format } from 'date-fns';

const Usuarios: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();

  const { data: usuariosData, isLoading } = useQuery(
    ['usuarios', currentPage, searchTerm],
    () => usuariosService.getAll({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm 
    }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(usuariosService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('usuarios');
      setIsModalOpen(false);
      toast.success('Usuario creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => usuariosService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('usuarios');
        setIsModalOpen(false);
        setEditingUsuario(null);
        toast.success('Usuario actualizado correctamente');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al actualizar usuario');
      },
    }
  );

  const deleteMutation = useMutation(usuariosService.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('usuarios');
      setDeletingUsuario(null);
      toast.success('Usuario eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    },
  });

  const toggleStatusMutation = useMutation(
    ({ id, activo }: { id: number; activo: boolean }) => usuariosService.toggleStatus(id, activo),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('usuarios');
        toast.success(`Usuario ${data.activo ? 'activado' : 'desactivado'} correctamente`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error al cambiar estado del usuario');
      },
    }
  );

  const handleCreateUsuario = (data: any) => {
    createMutation.mutate(data);
  };

  const handleUpdateUsuario = (data: any) => {
    if (editingUsuario) {
      updateMutation.mutate({ id: editingUsuario.id, data });
    }
  };

  const handleDeleteUsuario = () => {
    if (deletingUsuario) {
      deleteMutation.mutate(deletingUsuario.id);
    }
  };

  const handleEditUsuario = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (usuario: Usuario) => {
    toggleStatusMutation.mutate({ id: usuario.id, activo: !usuario.activo });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUsuario(null);
  };


  // Preparar datos para exportación
  const prepareExportData = () => {
    if (!usuariosData) return [];
    
    return usuariosData.usuarios.map(usuario => ({
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombreCompleto: `${usuario.apellido}, ${usuario.nombre}`,
      estado: usuario.activo ? 'Activo' : 'Inactivo',
      fechaCreacion: format(new Date(usuario.createdAt), 'dd/MM/yyyy'),
      fechaModificacion: format(new Date(usuario.updatedAt), 'dd/MM/yyyy')
    }));
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-8 h-8 mr-2 text-primary-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">Administra los usuarios del sistema</p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButtons
            data={prepareExportData()}
            exportConfig={{
              filename: `usuarios_${new Date().toISOString().split('T')[0]}`,
              title: 'Listado de Usuarios del Sistema',
              columns: [
                { key: 'id', label: 'ID', width: 10 },
                { key: 'username', label: 'Usuario', width: 20 },
                { key: 'nombreCompleto', label: 'Nombre Completo', width: 25 },
                { key: 'email', label: 'Email', width: 25 },
                { key: 'estado', label: 'Estado', width: 15 },
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
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-content p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, usuario o email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {usuariosData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {usuariosData.pagination.totalItems}
                </div>
                <div className="text-sm text-gray-600">Total Usuarios</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {usuariosData.usuarios.filter(u => u.activo).length}
                </div>
                <div className="text-sm text-gray-600">Usuarios Activos</div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UserX className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {usuariosData.usuarios.filter(u => !u.activo).length}
                </div>
                <div className="text-sm text-gray-600">Usuarios Inactivos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th className="w-48">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosData?.usuarios.map((usuario) => (
                  <tr key={usuario.id} className={!usuario.activo ? 'opacity-60 bg-gray-50' : ''}>
                    <td className="font-medium">#{usuario.id}</td>
                    <td>
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">{usuario.username}</span>
                      </div>
                    </td>
                    <td>{usuario.apellido}, {usuario.nombre}</td>
                    <td className="text-sm text-gray-600">{usuario.email}</td>
                    <td>
                      <span className={`status-badge ${
                        usuario.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {format(new Date(usuario.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleStatus(usuario)}
                          className={`p-1 hover:bg-gray-100 rounded transition-colors ${
                            usuario.activo 
                              ? 'text-red-600 hover:text-red-700' 
                              : 'text-green-600 hover:text-green-700'
                          }`}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                          disabled={toggleStatusMutation.isLoading}
                        >
                          {usuario.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditUsuario(usuario)}
                          className="p-1 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                          title="Editar usuario"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingUsuario(usuario)}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {usuariosData?.usuarios.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {usuariosData && usuariosData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="flex items-center text-sm text-gray-700">
                Mostrando {((usuariosData.pagination.currentPage - 1) * usuariosData.pagination.itemsPerPage) + 1} a{' '}
                {Math.min(usuariosData.pagination.currentPage * usuariosData.pagination.itemsPerPage, usuariosData.pagination.totalItems)} de{' '}
                {usuariosData.pagination.totalItems} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Anterior
                </button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} de {usuariosData.pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === usuariosData.pagination.totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UsuarioModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        usuario={editingUsuario}
        onSubmit={editingUsuario ? handleUpdateUsuario : handleCreateUsuario}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingUsuario}
        onClose={() => setDeletingUsuario(null)}
        onConfirm={handleDeleteUsuario}
        title="Eliminar Usuario"
        message={`¿Está seguro que desea eliminar el usuario "${deletingUsuario?.username}"? Esta acción no se puede deshacer.`}
        isLoading={deleteMutation.isLoading}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Usuarios;