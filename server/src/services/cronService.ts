import * as cron from 'node-cron';
// import estadoDocumentosService from './estadoDocumentosService'; // Temporalmente deshabilitado

class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private lastUpdateResult: any = null;

  /**
   * Inicia todos los trabajos programados
   */
  iniciar() {
    console.log('Iniciando servicios de actualización automática...');

    // Actualización de estados de documentos
    // Ejecutar todos los días a las 00:00 (medianoche)
    this.registrarTarea('actualizacion-estados', '0 0 * * *', async () => {
      await this.actualizarEstadosDocumentos();
    });

    // También ejecutar cada 6 horas para mantener actualizado durante el día
    this.registrarTarea('actualizacion-estados-frecuente', '0 */6 * * *', async () => {
      await this.actualizarEstadosDocumentos();
    });

    // Ejecutar una actualización inicial al arrancar el servidor
    // Esperamos 10 segundos para asegurar que todo esté inicializado
    setTimeout(async () => {
      console.log('Ejecutando actualización inicial de estados...');
      await this.actualizarEstadosDocumentos();
    }, 10000);
  }

  /**
   * Registra una nueva tarea programada
   */
  private registrarTarea(nombre: string, cronExpression: string, callback: () => Promise<void>) {
    if (this.jobs.has(nombre)) {
      console.log(`Deteniendo tarea existente: ${nombre}`);
      this.jobs.get(nombre)?.stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[CRON] Ejecutando tarea: ${nombre}`);
      try {
        await callback();
        console.log(`[CRON] Tarea completada: ${nombre}`);
      } catch (error) {
        console.error(`[CRON] Error en tarea ${nombre}:`, error);
      }
    }, {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires" // Ajustar según tu zona horaria
    });

    this.jobs.set(nombre, task);
    console.log(`Tarea programada registrada: ${nombre} - Expresión: ${cronExpression}`);
  }

  /**
   * Ejecuta la actualización de estados de documentos
   */
  private async actualizarEstadosDocumentos() {
    try {
      const inicio = new Date();
      console.log(`[CRON] Iniciando actualización de estados - ${inicio.toLocaleString()}`);

      // const resultado = await estadoDocumentosService.actualizarEstadosDocumentos(undefined, 'automatica'); // Temporalmente deshabilitado
      const resultado = {
        actualizados: 0,
        totalRevisados: 0,
        errores: [] as any[],
        detalles: [] as any[]
      }; // Mock result

      const fin = new Date();
      const duracion = (fin.getTime() - inicio.getTime()) / 1000;

      this.lastUpdateResult = {
        fecha: inicio,
        duracion,
        ...resultado
      };

      console.log(`[CRON] Actualización completada en ${duracion}s`);
      console.log(`[CRON] Documentos actualizados: ${resultado.actualizados}/${resultado.totalRevisados}`);

      if (resultado.errores.length > 0) {
        console.warn(`[CRON] Se encontraron ${resultado.errores.length} errores durante la actualización`);
      }

      // Log de cambios importantes
      if (resultado.detalles && resultado.detalles.length > 0) {
        console.log(`[CRON] Cambios realizados:`);
        resultado.detalles.slice(0, 10).forEach(detalle => {
          console.log(`  - ${detalle.tipo === 'recurso' ? 'Recurso' : 'Entidad'} ID ${detalle.recursoId || detalle.entidadId}: ${detalle.estadoAnterior} → ${detalle.estadoNuevo} (${detalle.razon})`);
        });

        if (resultado.detalles.length > 10) {
          console.log(`  ... y ${resultado.detalles.length - 10} cambios más`);
        }
      }
    } catch (error) {
      console.error('[CRON] Error crítico en actualización de estados:', error);
      this.lastUpdateResult = {
        fecha: new Date(),
        error: true,
        mensaje: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Detiene todos los trabajos programados
   */
  detener() {
    console.log('Deteniendo todos los trabajos programados...');
    this.jobs.forEach((task, nombre) => {
      console.log(`Deteniendo tarea: ${nombre}`);
      task.stop();
    });
    this.jobs.clear();
  }

  /**
   * Ejecuta manualmente la actualización de estados
   */
  async ejecutarActualizacionManual() {
    console.log('[MANUAL] Ejecutando actualización manual de estados...');
    await this.actualizarEstadosDocumentos();
    return this.lastUpdateResult;
  }

  /**
   * Obtiene el resultado de la última actualización
   */
  obtenerUltimaActualizacion() {
    return this.lastUpdateResult;
  }

  /**
   * Obtiene el estado de los trabajos programados
   */
  obtenerEstadoJobs() {
    const estado: any[] = [];
    this.jobs.forEach((task, nombre) => {
      estado.push({
        nombre,
        activo: true, // node-cron no expone directamente el estado
        ultimaEjecucion: this.lastUpdateResult?.fecha
      });
    });
    return estado;
  }
}

export default new CronService();