import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { username: { contains: search.toString(), mode: 'insensitive' as const } },
        { email: { contains: search.toString(), mode: 'insensitive' as const } },
        { nombre: { contains: search.toString(), mode: 'insensitive' as const } },
        { apellido: { contains: search.toString(), mode: 'insensitive' as const } },
      ]
    } : {};

    const [usuarios, count] = await Promise.all([
      prisma.usuario.findMany({
        where: searchFilter,
        orderBy: [
          { apellido: 'asc' },
          { nombre: 'asc' }
        ],
        take: Number(limit),
        skip: offset,
        select: {
          id: true,
          username: true,
          email: true,
          nombre: true,
          apellido: true,
          esAdmin: true,
          activo: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.usuario.count({
        where: searchFilter
      })
    ]);

    res.json({
      usuarios,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        totalItems: count,
        itemsPerPage: Number(limit),
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        esAdmin: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, nombre, apellido, esAdmin } = req.body;

    // Verificar que el usuario actual es admin
    const currentUser = await prisma.usuario.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser?.esAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden crear usuarios' });
    }

    // Verificar que no existe otro usuario con el mismo username
    const existingUser = await prisma.usuario.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese nombre de usuario' });
    }

    // Verificar que no existe otro usuario con el mismo email
    const existingEmail = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese email' });
    }

    // Validar contraseña
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        username,
        email,
        password: hashedPassword,
        nombre,
        apellido,
        esAdmin: Boolean(esAdmin),
        activo: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        esAdmin: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, password, nombre, apellido, esAdmin, activo } = req.body;

    // Verificar que el usuario actual es admin o está modificando su propio perfil
    const currentUser = await prisma.usuario.findUnique({
      where: { id: req.user!.id }
    });

    const targetUserId = parseInt(id);
    const isOwnProfile = req.user!.id === targetUserId;
    const isAdmin = currentUser?.esAdmin;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ message: 'No tienes permisos para modificar este usuario' });
    }

    // Verificar que el usuario a modificar existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: targetUserId }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Protección: prevenir auto-eliminación del último admin
    if (esAdmin === false && usuarioExistente.esAdmin) {
      const adminCount = await prisma.usuario.count({
        where: { esAdmin: true, activo: true }
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'No se puede quitar privilegios de administrador al último admin activo'
        });
      }
    }

    // Protección: prevenir desactivación del último admin
    if (activo === false && usuarioExistente.esAdmin && usuarioExistente.activo) {
      const activeAdminCount = await prisma.usuario.count({
        where: { esAdmin: true, activo: true }
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          message: 'No se puede desactivar al último administrador activo'
        });
      }
    }

    // Verificar username único si se está cambiando
    if (username && username !== usuarioExistente.username) {
      const existingUser = await prisma.usuario.findUnique({
        where: { username }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Ya existe un usuario con ese nombre de usuario' });
      }
    }

    // Verificar email único si se está cambiando
    if (email && email !== usuarioExistente.email) {
      const existingEmail = await prisma.usuario.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return res.status(400).json({ message: 'Ya existe un usuario con ese email' });
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {
      username,
      email,
      nombre,
      apellido,
    };

    // Solo admins pueden cambiar privilegios de admin y estado activo
    if (isAdmin) {
      updateData.esAdmin = esAdmin !== undefined ? Boolean(esAdmin) : undefined;
      updateData.activo = activo !== undefined ? Boolean(activo) : undefined;
    }

    // Actualizar contraseña si se proporciona
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        esAdmin: true,
        activo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(usuarioActualizado);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario actual es admin
    const currentUser = await prisma.usuario.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser?.esAdmin) {
      return res.status(403).json({ message: 'Solo los administradores pueden eliminar usuarios' });
    }

    const targetUserId = parseInt(id);

    // Protección: prevenir auto-eliminación
    if (req.user!.id === targetUserId) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: targetUserId }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Protección: prevenir eliminación del último admin
    if (usuario.esAdmin) {
      const adminCount = await prisma.usuario.count({
        where: { esAdmin: true, activo: true }
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'No se puede eliminar al último administrador del sistema'
        });
      }
    }

    await prisma.usuario.delete({
      where: { id: targetUserId }
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const targetUserId = parseInt(id);
    const isOwnProfile = req.user!.id === targetUserId;

    // Verificar que el usuario actual es admin o está modificando su propia contraseña
    const currentUser = await prisma.usuario.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!currentUser.esAdmin && !isOwnProfile) {
      return res.status(403).json({ message: 'No tienes permisos para cambiar esta contraseña' });
    }

    // Verificar que el usuario a modificar existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: targetUserId }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si no es admin, verificar contraseña actual
    if (!currentUser.esAdmin && isOwnProfile) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Debes proporcionar tu contraseña actual' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, usuario.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
      }
    }

    // Validar nueva contraseña
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuario.update({
      where: { id: targetUserId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUsuarioStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsuarios = await prisma.usuario.count();
    const usuariosActivos = await prisma.usuario.count({
      where: { activo: true }
    });
    const administradores = await prisma.usuario.count({
      where: { esAdmin: true, activo: true }
    });

    res.json({
      total: totalUsuarios,
      activos: usuariosActivos,
      inactivos: totalUsuarios - usuariosActivos,
      administradores
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};