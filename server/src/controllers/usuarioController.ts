import { Request, Response } from 'express';
import { Usuario } from '../models';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';

// Obtener todos los usuarios con paginación y filtros
export const getUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // Filtro por búsqueda en nombre, apellido, username o email
    if (search) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count: totalItems, rows: usuarios } = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] }, // Excluir password por seguridad
      offset,
      limit: Number(limit),
      order: [['apellido', 'ASC'], ['nombre', 'ASC']]
    });

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      usuarios,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit),
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener usuario por ID
export const getUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
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

// Crear nuevo usuario
export const createUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, nombre, apellido, activo = true } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password || !nombre || !apellido) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Verificar si el username ya existe
    const existingUsername = await Usuario.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }

    // Verificar si el email ya existe
    const existingEmail = await Usuario.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    // Validar longitud de password
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const usuario = await Usuario.create({
      username,
      email,
      password: hashedPassword,
      nombre,
      apellido,
      activo
    });

    // Retornar usuario sin password
    const { password: _, ...usuarioData } = usuario.toJSON();
    res.status(201).json(usuarioData);
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    
    // Errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errors: error.errors.map((e: any) => e.message) 
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe un usuario con esos datos' 
      });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar usuario
export const updateUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, nombre, apellido, activo, password } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el username ya existe (en otro usuario)
    if (username && username !== usuario.username) {
      const existingUsername = await Usuario.findOne({ 
        where: { 
          username, 
          id: { [Op.ne]: id } 
        } 
      });
      if (existingUsername) {
        return res.status(400).json({ message: 'El nombre de usuario ya existe' });
      }
    }

    // Verificar si el email ya existe (en otro usuario)
    if (email && email !== usuario.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Formato de email inválido' });
      }

      const existingEmail = await Usuario.findOne({ 
        where: { 
          email, 
          id: { [Op.ne]: id } 
        } 
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {
      username: username || usuario.username,
      email: email || usuario.email,
      nombre: nombre || usuario.nombre,
      apellido: apellido || usuario.apellido,
      activo: activo !== undefined ? activo : usuario.activo
    };

    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    await usuario.update(updateData);

    // Retornar usuario actualizado sin password
    const updatedUsuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUsuario);
  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errors: error.errors.map((e: any) => e.message) 
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'Ya existe un usuario con esos datos' 
      });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar usuario
export const deleteUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que no se elimine a sí mismo
    if (req.user?.id === Number(id)) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que no sea el último usuario activo
    const usuariosActivos = await Usuario.count({ where: { activo: true } });
    if (usuariosActivos === 1 && usuario.activo) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el último usuario activo del sistema' 
      });
    }

    await usuario.destroy();
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Cambiar estado de usuario (activar/desactivar)
export const toggleUsuarioStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    // Verificar que no se desactive a sí mismo
    if (req.user?.id === Number(id) && activo === false) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que no sea el último usuario activo
    if (activo === false && usuario.activo) {
      const usuariosActivos = await Usuario.count({ where: { activo: true } });
      if (usuariosActivos === 1) {
        return res.status(400).json({ 
          message: 'No se puede desactivar el último usuario activo del sistema' 
        });
      }
    }

    await usuario.update({ activo });

    const updatedUsuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUsuario);
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Cambiar contraseña propia
export const changeOwnPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Se requiere la contraseña actual y la nueva' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await Usuario.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, usuario.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await usuario.update({ password: hashedNewPassword });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};