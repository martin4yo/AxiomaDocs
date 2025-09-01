/**
 * Utilidades para manejo de fechas locales
 * Evita problemas con conversiones UTC
 */

/**
 * Formatea una fecha para mostrarla en formato DD/MM/YYYY
 * Corrige el problema de desfase de UTC al interpretar fechas del backend
 */
export const formatDateLocal = (dateString?: string | Date): string => {
  if (!dateString) return '-';
  
  let date: Date;
  
  if (typeof dateString === 'string') {
    // Si la fecha viene como string del backend, crear fecha local sin conversión UTC
    if (dateString.includes('T')) {
      // Formato ISO: 2023-12-25T03:00:00.000Z -> extraer solo la fecha
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      date = new Date(year, month - 1, day); // Crear fecha local
    } else {
      // Formato de fecha simple: 2023-12-25
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // Crear fecha local
    }
  } else {
    date = dateString;
  }
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) return '-';
  
  // Formatear usando componentes locales para evitar conversión de zona horaria
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formatea una fecha para input de tipo date (YYYY-MM-DD)
 * Corrige el problema de desfase de UTC al interpretar fechas del backend
 */
export const formatDateForInput = (dateString?: string | Date): string => {
  if (!dateString) return '';
  
  let date: Date;
  
  if (typeof dateString === 'string') {
    // Si la fecha viene como string del backend, crear fecha local sin conversión UTC
    if (dateString.includes('T')) {
      // Formato ISO: 2023-12-25T03:00:00.000Z -> extraer solo la fecha
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      date = new Date(year, month - 1, day); // Crear fecha local
    } else {
      // Formato de fecha simple: 2023-12-25
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // Crear fecha local
    }
  } else {
    date = dateString;
  }
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) return '';
  
  // Obtener componentes de fecha local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convierte una fecha de input (YYYY-MM-DD) a Date local
 */
export const parseDateFromInput = (inputValue: string): Date | null => {
  if (!inputValue) return null;
  
  const [year, month, day] = inputValue.split('-').map(Number);
  
  // Crear fecha local sin conversión UTC
  return new Date(year, month - 1, day);
};

/**
 * Calcula días entre dos fechas
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  return Math.floor((utc2 - utc1) / msPerDay);
};

/**
 * Verifica si una fecha está próxima a vencer
 */
export const isNearExpiration = (fechaVencimiento: string | Date, diasAnticipacion: number): boolean => {
  if (!fechaVencimiento) return false;
  
  const vencimiento = typeof fechaVencimiento === 'string' ? new Date(fechaVencimiento) : fechaVencimiento;
  const hoy = new Date();
  
  // Limpiar horas para comparar solo fechas
  const vencimientoDate = new Date(vencimiento.getFullYear(), vencimiento.getMonth(), vencimiento.getDate());
  const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  const diasHastaVencimiento = daysBetween(hoyDate, vencimientoDate);
  
  return diasHastaVencimiento <= diasAnticipacion && diasHastaVencimiento >= 0;
};

/**
 * Verifica si una fecha ya venció
 */
export const isExpired = (fechaVencimiento: string | Date): boolean => {
  if (!fechaVencimiento) return false;
  
  const vencimiento = typeof fechaVencimiento === 'string' ? new Date(fechaVencimiento) : fechaVencimiento;
  const hoy = new Date();
  
  // Limpiar horas para comparar solo fechas
  const vencimientoDate = new Date(vencimiento.getFullYear(), vencimiento.getMonth(), vencimiento.getDate());
  const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  return vencimientoDate < hoyDate;
};

/**
 * Obtiene la fecha actual en formato local
 */
export const getCurrentDateLocal = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};