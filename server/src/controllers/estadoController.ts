import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getEstados = async (req: AuthRequest, res: Response) => {
  try {
    const estados = await prisma.estado.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(estados);
  } catch (error) {
    console.error('Error obteniendo estados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const estado = await prisma.estado.findUnique({
      where: { id: parseInt(id) },
    });

    if (!estado) {
      return res.status(404).json({ message: 'Estado no encontrado' });
    }

    res.json(estado);
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const createEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, color, nivel, descripcion } = req.body;
    const userId = req.user!.id;

    const estado = await prisma.estado.create({
      data: {
        nombre,
        color,
        nivel: nivel || 1,
        descripcion,
        createdBy: userId,
        updatedBy: userId,
      }
    });

    res.status(201).json(estado);
  } catch (error) {
    console.error('Error creando estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, color, nivel, descripcion } = req.body;
    const userId = req.user!.id;

    const estado = await prisma.estado.findUnique({
      where: { id: parseInt(id) },
    });

    if (!estado) {
      return res.status(404).json({ message: 'Estado no encontrado' });
    }

    const updatedEstado = await prisma.estado.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        color,
        nivel: nivel || 1,
        descripcion,
        updatedBy: userId,
      }
    });

    res.json(updatedEstado);
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteEstado = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const estado = await prisma.estado.findUnique({
      where: { id: parseInt(id) },
    });

    if (!estado) {
      return res.status(404).json({ message: 'Estado no encontrado' });
    }

    await prisma.estado.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Estado eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando estado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};