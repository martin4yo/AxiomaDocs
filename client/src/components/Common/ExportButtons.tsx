import React from 'react';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface ExportConfig {
  filename: string;
  title: string;
  columns: { key: string; label: string; width?: number }[];
}

interface ExportButtonsProps {
  data: any[];
  exportConfig: ExportConfig;
  disabled?: boolean;
  className?: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  exportConfig,
  disabled = false,
  className = ''
}) => {
  const { filename, title, columns } = exportConfig;
  const exportToExcel = () => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Preparar datos para Excel
    const excelData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        const value = getNestedValue(item, col.key);
        row[col.label] = value || '';
      });
      return row;
    });

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Descargar archivo
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    // Título
    doc.setFontSize(16);
    doc.text(title, 20, y);
    y += 20;

    // Encabezados
    doc.setFontSize(10);
    let x = 20;
    columns.forEach(col => {
      doc.text(col.label, x, y);
      x += 40;
    });
    y += 10;

    // Datos
    data.forEach((item, _index) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      x = 20;
      columns.forEach(col => {
        const value = getNestedValue(item, col.key);
        doc.text(String(value || ''), x, y);
        x += 40;
      });
      y += 10;
    });

    doc.save(`${filename}.pdf`);
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={exportToExcel}
        className="btn btn-secondary btn-sm flex items-center gap-2"
        title="Exportar a Excel"
        disabled={disabled}
      >
        <Download size={16} />
        Excel
      </button>
      <button
        onClick={exportToPDF}
        className="btn btn-secondary btn-sm flex items-center gap-2"
        title="Exportar a PDF"
        disabled={disabled}
      >
        <FileText size={16} />
        PDF
      </button>
    </div>
  );
};

export default ExportButtons;