export interface Usuario {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  createdAt: string;
}

export interface Estado {
  id: number;
  nombre: string;
  codigo?: string;
  color: string;
  nivel: number;
  descripcion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recurso {
  id: number;
  codigo: string;
  apellido: string;
  nombre: string;
  telefono?: string;
  cuil?: string;
  direccion?: string;
  localidad?: string;
  fechaAlta: string;
  fechaBaja?: string;
  recursoDocumentacion?: RecursoDocumentacion[];
  createdAt: string;
  updatedAt: string;
}

export interface Documentacion {
  id: number;
  codigo: string;
  descripcion: string;
  diasVigencia: number;
  diasAnticipacion: number;
  esObligatorio: boolean;
  esUniversal: boolean;
  estadoVencimientoId: number;
  estadoVencimiento?: Estado;
  estadoId?: number;
  estado?: Estado;
  // Campos de fechas universales
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  recursoDocumentacion?: RecursoDocumentacion[];
  createdAt: string;
  updatedAt: string;
}

export interface Entidad {
  id: number;
  razonSocial: string;
  cuit: string;
  domicilio?: string;
  telefono?: string;
  localidad?: string;
  urlPlataformaDocumentacion?: string;
  entidadDocumentacion?: EntidadDocumentacion[];
  entidadRecurso?: EntidadRecurso[];
  createdAt: string;
  updatedAt: string;
}

export interface RecursoDocumentacion {
  id: number;
  recursoId: number;
  documentacionId: number;
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  estadoId?: number;
  observaciones?: string;
  recurso?: Recurso;
  documentacion?: Documentacion;
  estado?: Estado;
  createdAt: string;
  updatedAt: string;
}

export interface EntidadDocumentacion {
  id: number;
  entidadId: number;
  documentacionId: number;
  esInhabilitante: boolean;
  enviarPorMail: boolean;
  mailDestino?: string;
  // Campos de fechas específicas por entidad
  fechaEmision?: string;
  fechaTramitacion?: string;
  fechaVencimiento?: string;
  entidad?: Entidad;
  documentacion?: Documentacion;
  createdAt: string;
  updatedAt: string;
}

export interface EntidadRecurso {
  id: number;
  entidadId: number;
  recursoId: number;
  fechaInicio: string;
  fechaFin?: string;
  activo: boolean;
  entidad?: Entidad;
  recurso?: Recurso;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApiResponse<T> {
  data?: T;
  pagination?: PaginationInfo;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user: Usuario;
  message: string;
}