import axios from './api';

export interface ActualizacionResultado {
  totalRevisados: number;
  actualizados: number;
  errores: number;
  detalles: Array<{
    tipo: 'recurso' | 'entidad';
    documentoId: number;
    entidadId?: number;
    recursoId?: number;
    estadoAnterior: string;
    estadoNuevo: string;
    razon: string;
  }>;
}

export interface EstadisticasEstados {
  recursoDocumentacion: { [key: string]: number };
  entidadDocumentacion: { [key: string]: number };
  proximosVencer: Array<any>;
  recienVencidos: Array<any>;
}

export interface UltimaActualizacion {
  fecha: string;
  duracion?: number;
  totalRevisados?: number;
  actualizados?: number;
  errores?: number;
  error?: boolean;
  mensaje?: string;
}

export const estadoDocumentosService = {
  // Ejecutar actualización manual
  async actualizarEstados(): Promise<ActualizacionResultado> {
    const response = await axios.post('/api/estado-documentos/actualizar');
    return response.data.resultado;
  },

  // Obtener estadísticas
  async obtenerEstadisticas(): Promise<EstadisticasEstados> {
    const response = await axios.get('/api/estado-documentos/estadisticas');
    return response.data.estadisticas;
  },

  // Obtener información de la última actualización
  async obtenerUltimaActualizacion(): Promise<{
    ultimaActualizacion: UltimaActualizacion | null;
    tareasProgamadas: Array<{
      nombre: string;
      activo: boolean;
      ultimaEjecucion?: string;
    }>;
  }> {
    const response = await axios.get('/api/estado-documentos/ultima-actualizacion');
    return response.data;
  }
};