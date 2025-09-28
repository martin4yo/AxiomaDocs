import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { EmailService } from '../services/emailService';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, nombre, apellido } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Verificar si el email ya existe
    const existingEmail = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar si es el primer usuario (será admin)
    const userCount = await prisma.usuario.count();

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        username,
        email,
        password: hashedPassword,
        nombre,
        apellido,
        activo: true,
        esAdmin: userCount === 0, // Primer usuario es admin
      }
    });

    // Generar token
    const token = generateToken(usuario.id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { username }
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, usuario.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token
    const token = generateToken(usuario.id);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        nombre: true,
        apellido: true,
        esAdmin: true,
        activo: true,
        createdAt: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        activo: usuario.activo,
        createdAt: usuario.createdAt,
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Solicitar recuperación de contraseña
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El email es requerido' });
    }

    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Siempre responder con éxito por seguridad (no revelar si el email existe)
    res.json({
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
    });

    // Solo proceder si el usuario existe y está activo
    if (!usuario || !usuario.activo) {
      return;
    }

    // Invalidar tokens anteriores del usuario
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: usuario.id,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true }
    });

    // Generar nuevo token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en base de datos
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: usuario.id,
        expiresAt,
        used: false
      }
    });

    // Enviar email de recuperación
    const emailTemplate = EmailService.generatePasswordResetEmail(
      usuario.email,
      `${usuario.nombre} ${usuario.apellido}`,
      resetToken
    );

    const emailSent = await EmailService.sendEmail(emailTemplate);

    if (!emailSent) {
      console.error('Error enviando email de recuperación para:', email);
    } else {
      console.log('Email de recuperación enviado a:', email);
    }

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Verificar token de recuperación
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
            apellido: true,
            activo: true
          }
        }
      }
    });

    if (!resetToken) {
      return res.status(400).json({
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    if (resetToken.used) {
      return res.status(400).json({
        message: 'Este enlace ya ha sido utilizado',
        code: 'TOKEN_USED'
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        message: 'El enlace ha expirado. Solicita uno nuevo.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (!resetToken.user.activo) {
      return res.status(400).json({
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    res.json({
      valid: true,
      user: {
        email: resetToken.user.email,
        nombre: resetToken.user.nombre,
        apellido: resetToken.user.apellido
      }
    });

  } catch (error) {
    console.error('Error en verifyResetToken:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Restablecer contraseña
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
            apellido: true,
            activo: true
          }
        }
      }
    });

    if (!resetToken) {
      return res.status(400).json({
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    if (resetToken.used) {
      return res.status(400).json({
        message: 'Este enlace ya ha sido utilizado',
        code: 'TOKEN_USED'
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        message: 'El enlace ha expirado. Solicita uno nuevo.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (!resetToken.user.activo) {
      return res.status(400).json({
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña del usuario y marcar token como usado
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetToken.user.id },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      }),
      // Invalidar todos los otros tokens del usuario
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.user.id,
          used: false,
          id: { not: resetToken.id }
        },
        data: { used: true }
      })
    ]);

    // Enviar email de confirmación
    const emailTemplate = EmailService.generatePasswordChangedNotification(
      resetToken.user.email,
      `${resetToken.user.nombre} ${resetToken.user.apellido}`
    );

    const emailSent = await EmailService.sendEmail(emailTemplate);

    if (!emailSent) {
      console.error('Error enviando email de confirmación para:', resetToken.user.email);
    }

    res.json({
      message: 'Contraseña actualizada exitosamente',
      success: true
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};