import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: any[];
  title?: string;
}

// Función para exportar a Excel
export const exportToExcel = ({ filename, columns, data }: ExportOptions) => {
  // Crear el workbook
  const workbook = XLSX.utils.book_new();
  
  // Preparar los datos para Excel
  const excelData = data.map(row => {
    const excelRow: any = {};
    columns.forEach(col => {
      let value = row[col.key];
      
      // Formatear fechas
      if (value instanceof Date) {
        value = format(value, 'dd/MM/yyyy');
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        value = format(new Date(value), 'dd/MM/yyyy');
      }
      
      excelRow[col.label] = value || '';
    });
    return excelRow;
  });
  
  // Crear la hoja
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Ajustar el ancho de las columnas
  const colWidths = columns.map(col => ({
    wch: col.width || Math.max(col.label.length, 15)
  }));
  worksheet['!cols'] = colWidths;
  
  // Agregar la hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  
  // Exportar el archivo
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Función para exportar a PDF
export const exportToPDF = ({ filename, columns, data, title }: ExportOptions) => {
  const doc = new jsPDF('landscape');
  
  // Título del documento
  if (title) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);
  }
  
  // Preparar headers y datos para la tabla
  const headers = columns.map(col => col.label);
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.key];
      
      // Formatear fechas
      if (value instanceof Date) {
        value = format(value, 'dd/MM/yyyy');
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        value = format(new Date(value), 'dd/MM/yyyy');
      }
      
      return value || '';
    })
  );
  
  // Crear la tabla
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    tableWidth: 'auto',
    margin: { top: 20, right: 14, bottom: 20, left: 14 },
  });
  
  // Agregar fecha de generación
  const today = format(new Date(), 'dd/MM/yyyy HH:mm');
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${today}`, 14, pageHeight - 10);
  
  // Descargar el PDF
  doc.save(`${filename}.pdf`);
};

// Función helper para preparar datos de estado con colores
export const prepareEstadoData = (estados: any[]) => {
  return estados.map(estado => ({
    ...estado,
    color: estado.color || '#6B7280',
    nivel: estado.nivel || 1,
    fechaCreacion: estado.createdAt ? format(new Date(estado.createdAt), 'dd/MM/yyyy') : '',
    fechaModificacion: estado.updatedAt ? format(new Date(estado.updatedAt), 'dd/MM/yyyy') : ''
  }));
};

// Función helper para preparar datos de recursos
export const prepareRecursoData = (recursos: any[]) => {
  return recursos.map(recurso => ({
    ...recurso,
    estadoNombre: recurso.Estado?.nombre || 'Sin Estado',
    estadoCritico: recurso.estadoCritico || 'Normal',
    proximosVencimientos: recurso.proximosVencimientos || 0,
    fechaBaja: recurso.fechaBaja ? format(new Date(recurso.fechaBaja), 'dd/MM/yyyy') : '',
    fechaCreacion: recurso.createdAt ? format(new Date(recurso.createdAt), 'dd/MM/yyyy') : ''
  }));
};

// Función helper para preparar datos de documentación
export const prepareDocumentacionData = (documentos: any[]) => {
  return documentos.map(doc => ({
    ...doc,
    esUniversal: doc.fechaEmision && doc.fechaTramitacion && doc.fechaVencimiento ? 'Sí' : 'No',
    fechaEmision: doc.fechaEmision ? format(new Date(doc.fechaEmision), 'dd/MM/yyyy') : '',
    fechaTramitacion: doc.fechaTramitacion ? format(new Date(doc.fechaTramitacion), 'dd/MM/yyyy') : '',
    fechaVencimiento: doc.fechaVencimiento ? format(new Date(doc.fechaVencimiento), 'dd/MM/yyyy') : '',
    fechaCreacion: doc.createdAt ? format(new Date(doc.createdAt), 'dd/MM/yyyy') : ''
  }));
};

// Función helper para preparar datos de entidades
export const prepareEntidadData = (entidades: any[]) => {
  return entidades.map(entidad => ({
    ...entidad,
    estadoCritico: entidad.estadoCritico || 'Normal',
    totalRecursos: entidad.totalRecursos || 0,
    fechaCreacion: entidad.createdAt ? format(new Date(entidad.createdAt), 'dd/MM/yyyy') : ''
  }));
};