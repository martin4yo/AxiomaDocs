# 🛣️ AXIOMA DOCS - ROADMAP DE MEJORAS IMPLEMENTACIÓN

**Versión**: 1.0  
**Fecha**: 17 de Agosto 2025  
**Tipo**: Guía de Implementación Técnica  

---

## 🎯 **PLAN DE IMPLEMENTACIÓN EJECUTIVO**

Este roadmap detalla la implementación práctica de las mejoras identificadas en el análisis del sistema, con especificaciones técnicas precisas, cronogramas realistas y métricas de éxito.

### **Resumen de Fases**
- **Fase 1**: Fundación Mejorada (2-4 semanas) - *Implementación Inmediata*
- **Fase 2**: Flujos Avanzados (1-2 meses) - *Q4 2025*
- **Fase 3**: Inteligencia (2-4 meses) - *Q1-Q2 2026*
- **Fase 4**: Ecosistema (4-6 meses) - *Q3-Q4 2026*

---

## 🚀 **FASE 1: FUNDACIÓN MEJORADA** ⏱️ Semanas 1-4

### **Sprint 1: Sistema de Almacenamiento de Documentos** (Semana 1-2)

#### **Day 1-2: Configuración de Infraestructura**
```bash
# 1. Configurar storage local/cloud
mkdir -p server/storage/{documents,temp,previews}

# 2. Instalar dependencias
npm install multer sharp pdf-parse mammoth crypto express-rate-limit

# 3. Configurar variables de entorno
echo "
# Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage/documents
STORAGE_MAX_FILE_SIZE=50MB
STORAGE_ALLOWED_TYPES=pdf,doc,docx,jpg,jpeg,png,txt
VIRUS_SCAN_ENABLED=false
" >> server/.env
```

#### **Day 3-5: Modelo de Datos y Migración**
```sql
-- Migration: 001_add_documento_archivos.sql
CREATE TABLE documento_archivos (
    id SERIAL PRIMARY KEY,
    documentacion_id INTEGER REFERENCES documentacion(id) ON DELETE CASCADE,
    recurso_documentacion_id INTEGER REFERENCES recurso_documentacion(id),
    entidad_documentacion_id INTEGER REFERENCES entidad_documentacion(id),
    
    -- Información del archivo
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL UNIQUE, -- UUID + extension
    ruta_archivo TEXT NOT NULL,
    tipo_mime VARCHAR(100),
    tamaño_bytes BIGINT,
    hash_md5 VARCHAR(32),
    
    -- Versionado
    version INTEGER DEFAULT 1,
    version_anterior_id INTEGER REFERENCES documento_archivos(id),
    
    -- Metadatos extraídos
    metadatos JSONB DEFAULT '{}'::jsonb,
    
    -- Procesamiento
    estado_procesamiento VARCHAR(20) DEFAULT 'pendiente',
    texto_extraido TEXT,
    miniatura_ruta TEXT,
    
    -- Auditoría
    fecha_subida TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    usuario_subida_id INTEGER REFERENCES usuario(id),
    activo BOOLEAN DEFAULT true,
    
    -- Índices
    CONSTRAINT unique_md5_active UNIQUE (hash_md5, activo) DEFERRABLE
);

-- Índices optimizados
CREATE INDEX idx_doc_archivos_documentacion ON documento_archivos(documentacion_id);
CREATE INDEX idx_doc_archivos_recurso_doc ON documento_archivos(recurso_documentacion_id);
CREATE INDEX idx_doc_archivos_entidad_doc ON documento_archivos(entidad_documentacion_id);
CREATE INDEX idx_doc_archivos_hash ON documento_archivos(hash_md5);
CREATE INDEX idx_doc_archivos_usuario ON documento_archivos(usuario_subida_id);
CREATE INDEX idx_doc_archivos_fecha ON documento_archivos(fecha_subida);
CREATE INDEX idx_doc_archivos_metadatos USING GIN (metadatos);
CREATE INDEX idx_doc_archivos_estado ON documento_archivos(estado_procesamiento);

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_documento_archivo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documento_archivo_timestamp
    BEFORE UPDATE ON documento_archivos
    FOR EACH ROW
    EXECUTE FUNCTION update_documento_archivo_timestamp();
```

#### **Day 6-8: Servicios Backend**
```typescript
// server/src/services/StorageService.ts
export interface StorageProvider {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  async upload(file: Express.Multer.File, path: string): Promise<string> {
    const fullPath = join(this.basePath, path);
    await ensureDir(dirname(fullPath));
    await writeFile(fullPath, file.buffer);
    return path;
  }
  
  async download(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    return await readFile(fullPath);
  }
  
  // ... implementar otros métodos
}

// server/src/services/DocumentProcessingService.ts
export class DocumentProcessingService {
  async processDocument(archivo: DocumentoArchivo): Promise<void> {
    try {
      // 1. Extraer texto según tipo de archivo
      const textoExtraido = await this.extractText(archivo);
      
      // 2. Generar miniatura si es imagen/PDF
      const miniatura = await this.generateThumbnail(archivo);
      
      // 3. Extraer metadatos
      const metadatos = await this.extractMetadata(archivo);
      
      // 4. Actualizar registro en BD
      await DocumentoArchivo.update({
        texto_extraido: textoExtraido,
        miniatura_ruta: miniatura,
        metadatos: metadatos,
        estado_procesamiento: 'completado'
      }, {
        where: { id: archivo.id }
      });
      
    } catch (error) {
      await DocumentoArchivo.update({
        estado_procesamiento: 'error',
        metadatos: { error: error.message }
      }, {
        where: { id: archivo.id }
      });
    }
  }
  
  private async extractText(archivo: DocumentoArchivo): Promise<string> {
    const buffer = await storageService.download(archivo.ruta_archivo);
    
    switch (archivo.tipo_mime) {
      case 'application/pdf':
        return await pdfParse(buffer).then(data => data.text);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await mammoth.extractRawText({ buffer }).then(result => result.value);
      default:
        return '';
    }
  }
  
  private async generateThumbnail(archivo: DocumentoArchivo): Promise<string> {
    if (!archivo.tipo_mime.startsWith('image/')) return null;
    
    const buffer = await storageService.download(archivo.ruta_archivo);
    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    const thumbnailPath = `thumbnails/${archivo.id}_thumb.jpg`;
    await storageService.upload({
      buffer: thumbnailBuffer,
      mimetype: 'image/jpeg'
    } as any, thumbnailPath);
    
    return thumbnailPath;
  }
}
```

#### **Day 9-10: API Endpoints**
```typescript
// server/src/controllers/ArchivoController.ts
export class ArchivoController {
  // POST /api/documentos/:documentacionId/archivos
  async subirArchivo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { documentacionId } = req.params;
      const file = req.file;
      const { recursoDocumentacionId, entidadDocumentacionId } = req.body;
      
      // Validaciones
      await this.validarPermisos(req.user.id, documentacionId);
      this.validarArchivo(file);
      
      // Calcular hash para detectar duplicados
      const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
      
      // Verificar duplicado
      const duplicado = await DocumentoArchivo.findOne({
        where: { hash_md5: hash, activo: true }
      });
      
      if (duplicado) {
        return res.status(409).json({
          error: 'Archivo duplicado',
          archivo_existente: duplicado
        });
      }
      
      // Generar nombre único
      const extension = path.extname(file.originalname);
      const nombreArchivo = `${uuidv4()}${extension}`;
      const rutaArchivo = `documents/${new Date().getFullYear()}/${nombreArchivo}`;
      
      // Subir archivo
      await storageService.upload(file, rutaArchivo);
      
      // Crear registro
      const archivo = await DocumentoArchivo.create({
        documentacion_id: documentacionId,
        recurso_documentacion_id: recursoDocumentacionId,
        entidad_documentacion_id: entidadDocumentacionId,
        nombre_original: file.originalname,
        nombre_archivo: nombreArchivo,
        ruta_archivo: rutaArchivo,
        tipo_mime: file.mimetype,
        tamaño_bytes: file.size,
        hash_md5: hash,
        usuario_subida_id: req.user.id
      });
      
      // Procesar archivo en background
      backgroundJobQueue.add('process-document', { archivoId: archivo.id });
      
      res.status(201).json({
        message: 'Archivo subido exitosamente',
        archivo: archivo
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // GET /api/archivos/:id/download
  async descargarArchivo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const archivo = await DocumentoArchivo.findByPk(id, {
        include: [{ model: Documentacion }]
      });
      
      if (!archivo) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }
      
      // Validar permisos
      await this.validarPermisosDescarga(req.user.id, archivo);
      
      // Obtener archivo del storage
      const buffer = await storageService.download(archivo.ruta_archivo);
      
      // Log de descarga para auditoría
      await this.logDescarga(req.user.id, archivo.id);
      
      res.set({
        'Content-Type': archivo.tipo_mime,
        'Content-Disposition': `attachment; filename="${archivo.nombre_original}"`,
        'Content-Length': archivo.tamaño_bytes.toString()
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  // PUT /api/archivos/:id/nueva-version
  async subirNuevaVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Implementar versionado manteniendo historial
  }
  
  // DELETE /api/archivos/:id
  async eliminarArchivo(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Soft delete para mantener auditoría
  }
}

// Rutas con middleware de validación
const router = express.Router();

router.post('/documentos/:documentacionId/archivos',
  authenticateToken,
  checkPermission('documentos', 'editar'),
  upload.single('archivo'),
  validateFileUpload,
  archivoController.subirArchivo
);

router.get('/archivos/:id/download',
  authenticateToken,
  checkPermission('documentos', 'leer'),
  archivoController.descargarArchivo
);
```

#### **Day 11-14: Frontend Components**
```typescript
// client/src/components/Archivos/UploadArchivo.tsx
interface UploadArchivoProps {
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  onUploadComplete: (archivo: DocumentoArchivo) => void;
}

export const UploadArchivo: React.FC<UploadArchivoProps> = ({
  documentacionId,
  recursoDocumentacionId,
  entidadDocumentacionId,
  onUploadComplete
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const { mutate: uploadFile } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('archivo', file);
      if (recursoDocumentacionId) {
        formData.append('recursoDocumentacionId', recursoDocumentacionId.toString());
      }
      if (entidadDocumentacionId) {
        formData.append('entidadDocumentacionId', entidadDocumentacionId.toString());
      }
      
      return axios.post(`/api/documentos/${documentacionId}/archivos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(progress);
        }
      });
    },
    onSuccess: (response) => {
      onUploadComplete(response.data.archivo);
      toast.success('Archivo subido exitosamente');
      setProgress(0);
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error('Este archivo ya existe en el sistema');
      } else {
        toast.error('Error al subir archivo');
      }
      setProgress(0);
    },
    onSettled: () => {
      setUploading(false);
    }
  });
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (validateFile(file)) {
        setUploading(true);
        uploadFile(file);
      }
    });
  }, [uploadFile]);
  
  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 
                         'application/msword', 'text/plain'];
    
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande (máximo 50MB)');
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido');
      return false;
    }
    
    return true;
  };
  
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <div className="space-y-4">
          <Upload className="h-8 w-8 mx-auto text-blue-500 animate-pulse" />
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">Subiendo... {progress}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="h-12 w-12 mx-auto text-gray-400" />
          <div>
            <p className="text-lg font-medium">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500">
              PDF, DOC, DOCX, JPG, PNG, TXT (máximo 50MB)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(file => {
                if (validateFile(file)) {
                  setUploading(true);
                  uploadFile(file);
                }
              });
            }}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

// client/src/components/Archivos/ListaArchivos.tsx
export const ListaArchivos: React.FC<{
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
}> = ({ documentacionId, recursoDocumentacionId, entidadDocumentacionId }) => {
  const { data: archivos, isLoading } = useQuery({
    queryKey: ['archivos', documentacionId, recursoDocumentacionId, entidadDocumentacionId],
    queryFn: () => archivoService.listar({
      documentacionId,
      recursoDocumentacionId,
      entidadDocumentacionId
    })
  });
  
  const { mutate: descargarArchivo } = useMutation({
    mutationFn: archivoService.descargar,
    onSuccess: (blob, archivoId) => {
      const archivo = archivos?.find(a => a.id === archivoId);
      if (archivo) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.nombre_original;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    }
  });
  
  if (isLoading) return <div>Cargando archivos...</div>;
  
  return (
    <div className="space-y-4">
      {archivos?.map(archivo => (
        <div key={archivo.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIcon tipo={archivo.tipo_mime} />
              <div>
                <p className="font-medium">{archivo.nombre_original}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(archivo.tamaño_bytes)} • 
                  Subido {formatDistanceToNow(new Date(archivo.fecha_subida))}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {archivo.texto_extraido && (
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <Search className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => descargarArchivo(archivo.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded"
              >
                <Download className="h-4 w-4" />
              </button>
              
              {archivo.miniatura_ruta && (
                <button className="p-2 text-purple-600 hover:bg-purple-50 rounded">
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {archivo.version > 1 && (
            <div className="mt-2 text-sm text-blue-600">
              Versión {archivo.version} • Ver historial
            </div>
          )}
        </div>
      ))}
      
      {archivos?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay archivos subidos
        </div>
      )}
    </div>
  );
};
```

### **Sprint 2: Sistema de Notificaciones** (Semana 3-4)

#### **Day 1-3: Configuración de Servicios de Notificación**
```typescript
// server/src/services/NotificationService.ts
export interface NotificationChannel {
  send(notification: Notification): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

export class EmailNotificationChannel implements NotificationChannel {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  async send(notification: Notification): Promise<boolean> {
    try {
      const template = await this.loadTemplate(notification.template);
      const html = this.renderTemplate(template, notification.data);
      
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: notification.destinatario.email,
        subject: notification.titulo,
        html: html,
        attachments: notification.adjuntos || []
      });
      
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  }
  
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
    return await fs.readFile(templatePath, 'utf-8');
  }
  
  private renderTemplate(template: string, data: any): string {
    const compiled = handlebars.compile(template);
    return compiled(data);
  }
}

export class NotificationEngine {
  private channels: Map<string, NotificationChannel> = new Map();
  private queue: Queue;
  
  constructor() {
    this.queue = new Queue('notifications', {
      redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost'
      }
    });
    
    this.registerChannels();
    this.setupQueueProcessing();
  }
  
  private registerChannels(): void {
    this.channels.set('email', new EmailNotificationChannel());
    this.channels.set('sms', new SMSNotificationChannel());
    this.channels.set('push', new PushNotificationChannel());
    this.channels.set('sistema', new InAppNotificationChannel());
  }
  
  async enviarNotificacion(notification: Notification): Promise<void> {
    // Programar notificación
    await this.queue.add('send-notification', notification, {
      delay: notification.fechaProgramada ? 
        new Date(notification.fechaProgramada).getTime() - Date.now() : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  
  private setupQueueProcessing(): void {
    this.queue.process('send-notification', async (job) => {
      const notification = job.data;
      
      for (const canal of notification.canales) {
        const channel = this.channels.get(canal);
        if (channel) {
          const success = await channel.send(notification);
          
          // Actualizar estado en BD
          await NotificationLog.create({
            notificacion_id: notification.id,
            canal: canal,
            exitoso: success,
            fecha_envio: new Date(),
            error_mensaje: success ? null : 'Error al enviar'
          });
        }
      }
    });
  }
}
```

#### **Day 4-6: Motor de Reglas de Notificación**
```typescript
// server/src/services/NotificationRuleEngine.ts
export class NotificationRuleEngine {
  private rules: NotificationRule[] = [];
  
  async loadRules(): Promise<void> {
    this.rules = await NotificationRule.findAll({
      where: { activa: true },
      order: [['prioridad', 'ASC']]
    });
  }
  
  async evaluateRules(event: SystemEvent): Promise<void> {
    for (const rule of this.rules) {
      if (await this.matchesCondition(rule, event)) {
        await this.executeRule(rule, event);
      }
    }
  }
  
  private async matchesCondition(rule: NotificationRule, event: SystemEvent): Promise<boolean> {
    // Usar JSON Logic o similar para evaluar condiciones
    const engine = new JsonLogic();
    return engine.apply(rule.condiciones, event.data);
  }
  
  private async executeRule(rule: NotificationRule, event: SystemEvent): Promise<void> {
    const destinatarios = await this.resolveRecipients(rule.destinatarios, event);
    
    for (const destinatario of destinatarios) {
      const notification = await this.createNotification(rule, event, destinatario);
      await notificationEngine.enviarNotificacion(notification);
    }
    
    // Actualizar estadísticas de la regla
    await this.updateRuleStats(rule.id);
  }
  
  private async resolveRecipients(
    destinatarioConfig: any, 
    event: SystemEvent
  ): Promise<Usuario[]> {
    const recipients: Usuario[] = [];
    
    for (const config of destinatarioConfig) {
      switch (config.tipo) {
        case 'usuario_especifico':
          const usuario = await Usuario.findByPk(config.usuarioId);
          if (usuario) recipients.push(usuario);
          break;
          
        case 'responsable_recurso':
          if (event.data.recursoId) {
            const recurso = await Recurso.findByPk(event.data.recursoId, {
              include: [{ model: Usuario, as: 'responsable' }]
            });
            if (recurso?.responsable) recipients.push(recurso.responsable);
          }
          break;
          
        case 'admin_entidad':
          if (event.data.entidadId) {
            const admins = await Usuario.findAll({
              include: [{
                model: UsuarioRol,
                where: { 
                  entidadId: event.data.entidadId,
                  rolCodigo: 'ADMIN_ENTIDAD'
                }
              }]
            });
            recipients.push(...admins);
          }
          break;
          
        case 'rol':
          const usuariosRol = await Usuario.findAll({
            include: [{
              model: UsuarioRol,
              where: { rolCodigo: config.rolCodigo }
            }]
          });
          recipients.push(...usuariosRol);
          break;
      }
    }
    
    return recipients;
  }
}

// Reglas predefinidas de notificación
const defaultNotificationRules = [
  {
    codigo: 'DOC_VENCIENDO_30D',
    nombre: 'Documento venciendo en 30 días',
    descripcion: 'Notificar cuando un documento vence en 30 días',
    condiciones: {
      "and": [
        {"==": [{"var": "evento.tipo"}, "documento_check"]},
        {"<=": [{"var": "documento.dias_para_vencer"}, 30]},
        {">": [{"var": "documento.dias_para_vencer"}, 0]}
      ]
    },
    acciones: [{
      template: 'documento_venciendo',
      canales: ['email', 'sistema'],
      destinatarios: [
        { tipo: 'responsable_recurso' },
        { tipo: 'admin_entidad' }
      ]
    }],
    prioridad: 100
  },
  
  {
    codigo: 'DOC_VENCIDO',
    nombre: 'Documento vencido',
    descripcion: 'Notificar cuando un documento ya venció',
    condiciones: {
      "and": [
        {"==": [{"var": "evento.tipo"}, "documento_check"]},
        {"<": [{"var": "documento.dias_para_vencer"}, 0]}
      ]
    },
    acciones: [{
      template: 'documento_vencido',
      canales: ['email', 'sms', 'sistema'],
      destinatarios: [
        { tipo: 'responsable_recurso' },
        { tipo: 'admin_entidad' },
        { tipo: 'supervisor' }
      ]
    }],
    prioridad: 50
  }
];
```

#### **Day 7-10: Cron Jobs y Scheduler**
```typescript
// server/src/jobs/DocumentCheckJob.ts
export class DocumentCheckJob {
  private notificationRuleEngine: NotificationRuleEngine;
  
  constructor() {
    this.notificationRuleEngine = new NotificationRuleEngine();
  }
  
  async execute(): Promise<void> {
    console.log('Iniciando verificación de documentos...');
    
    try {
      // Cargar reglas de notificación
      await this.notificationRuleEngine.loadRules();
      
      // Obtener todos los documentos activos
      const documentos = await this.getActiveDocuments();
      
      // Evaluar cada documento
      for (const documento of documentos) {
        await this.checkDocument(documento);
      }
      
      console.log(`Verificación completada. ${documentos.length} documentos evaluados.`);
      
    } catch (error) {
      console.error('Error en verificación de documentos:', error);
    }
  }
  
  private async getActiveDocuments(): Promise<any[]> {
    return await sequelize.query(`
      SELECT 
        rd.id,
        rd.recurso_id,
        rd.documentacion_id,
        rd.fecha_vencimiento,
        rd.estado_id,
        r.nombre as recurso_nombre,
        r.email as recurso_email,
        d.descripcion as documento_descripcion,
        d.dias_anticipacion,
        e.id as entidad_id,
        e.nombre as entidad_nombre,
        EXTRACT(DAY FROM (rd.fecha_vencimiento - CURRENT_DATE)) as dias_para_vencer
      FROM recurso_documentacion rd
      JOIN recurso r ON rd.recurso_id = r.id
      JOIN documentacion d ON rd.documentacion_id = d.id
      LEFT JOIN entidad_recurso er ON r.id = er.recurso_id AND er.activo = true
      LEFT JOIN entidad e ON er.entidad_id = e.id
      WHERE rd.activo = true
        AND rd.fecha_vencimiento IS NOT NULL
        AND rd.fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days'
    `, {
      type: QueryTypes.SELECT
    });
  }
  
  private async checkDocument(documento: any): Promise<void> {
    const event: SystemEvent = {
      tipo: 'documento_check',
      fecha: new Date(),
      data: {
        documentoId: documento.id,
        recursoId: documento.recurso_id,
        entidadId: documento.entidad_id,
        documento: documento
      }
    };
    
    await this.notificationRuleEngine.evaluateRules(event);
  }
}

// server/src/jobs/JobScheduler.ts
export class JobScheduler {
  static initialize(): void {
    // Verificación de documentos cada hora
    cron.schedule('0 * * * *', async () => {
      const job = new DocumentCheckJob();
      await job.execute();
    });
    
    // Limpieza de notificaciones antiguas diariamente a las 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanOldNotifications();
    });
    
    // Actualización de estadísticas cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      await this.updateStatistics();
    });
  }
  
  private static async cleanOldNotifications(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Mantener 3 meses
    
    await Notification.destroy({
      where: {
        fecha_creacion: { [Op.lt]: cutoffDate },
        estado: 'enviado'
      }
    });
  }
  
  private static async updateStatistics(): Promise<void> {
    // Actualizar estadísticas de uso, performance, etc.
  }
}
```

#### **Day 11-14: Frontend de Notificaciones**
```typescript
// client/src/components/Notificaciones/NotificationCenter.tsx
export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: notificacionService.listar,
    refetchInterval: 30000 // Refrescar cada 30 segundos
  });
  
  const { mutate: marcarLeida } = useMutation({
    mutationFn: notificacionService.marcarLeida,
    onSuccess: () => {
      queryClient.invalidateQueries(['notificaciones']);
    }
  });
  
  const notificacionesNoLeidas = notificaciones?.filter(n => !n.fecha_leida) || [];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell className="h-6 w-6" />
        {notificacionesNoLeidas.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notificacionesNoLeidas.length > 9 ? '9+' : notificacionesNoLeidas.length}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notificaciones</h3>
              {notificacionesNoLeidas.length > 0 && (
                <button
                  onClick={() => {
                    notificacionesNoLeidas.forEach(n => marcarLeida(n.id));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">Cargando...</div>
            ) : notificaciones?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notificaciones?.map(notificacion => (
                <NotificationItem
                  key={notificacion.id}
                  notificacion={notificacion}
                  onMarcarLeida={marcarLeida}
                />
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200">
            <Link
              to="/notificaciones"
              className="block text-center text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setIsOpen(false)}
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// client/src/components/Notificaciones/NotificationSettings.tsx
export const NotificationSettings: React.FC = () => {
  const { data: configuracion, isLoading } = useQuery({
    queryKey: ['notificacion-configuracion'],
    queryFn: notificacionService.obtenerConfiguracion
  });
  
  const { mutate: actualizarConfiguracion } = useMutation({
    mutationFn: notificacionService.actualizarConfiguracion,
    onSuccess: () => {
      queryClient.invalidateQueries(['notificacion-configuracion']);
      toast.success('Configuración actualizada');
    }
  });
  
  const handleToggleChannel = (eventoTipo: string, canal: string, enabled: boolean) => {
    const nuevaConfig = { ...configuracion };
    if (!nuevaConfig.eventos[eventoTipo]) {
      nuevaConfig.eventos[eventoTipo] = { canales: [] };
    }
    
    if (enabled) {
      if (!nuevaConfig.eventos[eventoTipo].canales.includes(canal)) {
        nuevaConfig.eventos[eventoTipo].canales.push(canal);
      }
    } else {
      nuevaConfig.eventos[eventoTipo].canales = 
        nuevaConfig.eventos[eventoTipo].canales.filter(c => c !== canal);
    }
    
    actualizarConfiguracion(nuevaConfig);
  };
  
  if (isLoading) return <div>Cargando configuración...</div>;
  
  const eventosDisponibles = [
    { codigo: 'documento_venciendo', nombre: 'Documento próximo a vencer' },
    { codigo: 'documento_vencido', nombre: 'Documento vencido' },
    { codigo: 'flujo_iniciado', nombre: 'Flujo de intercambio iniciado' },
    { codigo: 'aprobacion_requerida', nombre: 'Aprobación requerida' },
    { codigo: 'flujo_completado', nombre: 'Flujo completado' }
  ];
  
  const canalesDisponibles = [
    { codigo: 'email', nombre: 'Email', icon: Mail },
    { codigo: 'sistema', nombre: 'Sistema', icon: Monitor },
    { codigo: 'sms', nombre: 'SMS', icon: Smartphone },
    { codigo: 'push', nombre: 'Push', icon: Bell }
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Configuración de Notificaciones</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configura cómo y cuándo deseas recibir notificaciones del sistema.
        </p>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium">Canales de Notificación por Evento</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {eventosDisponibles.map(evento => (
            <div key={evento.codigo} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{evento.nombre}</h4>
                  <p className="text-sm text-gray-500">
                    Selecciona los canales para este tipo de notificación
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {canalesDisponibles.map(canal => {
                  const Icon = canal.icon;
                  const isEnabled = configuracion?.eventos[evento.codigo]?.canales?.includes(canal.codigo) || false;
                  
                  return (
                    <label
                      key={canal.codigo}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isEnabled 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleToggleChannel(evento.codigo, canal.codigo, e.target.checked)}
                        className="sr-only"
                      />
                      <Icon className={`h-4 w-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isEnabled ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        {canal.nombre}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium">Configuración General</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Notificaciones en tiempo real</h4>
              <p className="text-sm text-gray-500">
                Recibir notificaciones inmediatamente cuando ocurran eventos
              </p>
            </div>
            <Switch
              checked={configuracion?.tiempoReal || false}
              onChange={(enabled) => {
                actualizarConfiguracion({
                  ...configuracion,
                  tiempoReal: enabled
                });
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Resumen diario</h4>
              <p className="text-sm text-gray-500">
                Recibir un resumen diario de actividades por email
              </p>
            </div>
            <Switch
              checked={configuracion?.resumenDiario || false}
              onChange={(enabled) => {
                actualizarConfiguracion({
                  ...configuracion,
                  resumenDiario: enabled
                });
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horario de notificaciones
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input
                  type="time"
                  value={configuracion?.horarioInicio || '08:00'}
                  onChange={(e) => {
                    actualizarConfiguracion({
                      ...configuracion,
                      horarioInicio: e.target.value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input
                  type="time"
                  value={configuracion?.horarioFin || '18:00'}
                  onChange={(e) => {
                    actualizarConfiguracion({
                      ...configuracion,
                      horarioFin: e.target.value
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Las notificaciones fuera de este horario se enviarán al siguiente día hábil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 📈 **MÉTRICAS DE ÉXITO FASE 1**

### **KPIs Técnicos**
- ✅ **Tiempo de carga de archivos**: < 5 segundos para archivos de 10MB
- ✅ **Disponibilidad del sistema**: 99.9% uptime
- ✅ **Tiempo de respuesta API**: < 200ms para operaciones CRUD
- ✅ **Tasa de error en uploads**: < 0.1%

### **KPIs de Negocio**
- ✅ **Reducción en documentos perdidos**: 95%
- ✅ **Mejora en cumplimiento de deadlines**: 80%
- ✅ **Reducción en tiempo de búsqueda de documentos**: 70%
- ✅ **Satisfacción del usuario**: > 4.5/5

### **Criterios de Aceptación**
1. **Sistema de Archivos**:
   - Upload/download de archivos funcional
   - Detección de duplicados por hash MD5
   - Versionado de documentos implementado
   - Extracción de texto y metadatos
   - Sistema de permisos granular

2. **Sistema de Notificaciones**:
   - Notificaciones por email funcionando
   - Reglas configurables implementadas
   - Centro de notificaciones en frontend
   - Configuración por usuario
   - Cron jobs ejecutándose correctamente

---

## 🔄 **PLAN DE TRANSICIÓN A FASE 2**

### **Preparación para Workflows (Semana 5)**
1. **Análisis de Procesos Actuales**: Documentar flujos existentes
2. **Diseño de Motor de Workflows**: Arquitectura detallada
3. **Prototipo de UI**: Mockups de interfaz de workflows
4. **Preparación de Base de Datos**: Esquemas para workflows

### **Validación y Testing**
- **Testing de Carga**: 1000+ usuarios concurrentes
- **Testing de Seguridad**: Penetration testing básico
- **Testing de Usabilidad**: Sessions con usuarios reales
- **Testing de Performance**: Optimización de queries

### **Documentación y Capacitación**
- **Manual de Usuario**: Nuevas funcionalidades
- **Documentación Técnica**: APIs y configuración
- **Videos de Capacitación**: Screen recordings
- **Knowledge Base**: FAQ y troubleshooting

---

**Este roadmap proporciona una guía detallada y práctica para implementar las mejoras más críticas del sistema AxiomaDocs, sentando las bases para una evolución continua hacia una plataforma de gestión documental inteligente y automatizada.**

---

**Documento preparado por**: Equipo de Desarrollo AxiomaDocs  
**Fecha**: 17 de Agosto 2025  
**Próxima revisión**: Al completar Fase 1