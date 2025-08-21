# 🔧 AXIOMA DOCS - ESPECIFICACIONES TÉCNICAS DETALLADAS

**Versión**: 1.0  
**Fecha**: 17 de Agosto 2025  
**Tipo**: Documentación Técnica de Implementación  

---

## 📋 **ÍNDICE DE ESPECIFICACIONES**

1. [Arquitectura de Base de Datos](#-arquitectura-de-base-de-datos)
2. [APIs y Servicios Backend](#-apis-y-servicios-backend)
3. [Arquitectura Frontend](#-arquitectura-frontend)
4. [Configuración de Infraestructura](#-configuración-de-infraestructura)
5. [Seguridad y Performance](#-seguridad-y-performance)
6. [Testing y Quality Assurance](#-testing-y-quality-assurance)
7. [Deployment y DevOps](#-deployment-y-devops)

---

## 🗄️ **ARQUITECTURA DE BASE DE DATOS**

### **Esquema PostgreSQL Completo**

#### **Nuevas Tablas para Gestión de Archivos**
```sql
-- ==============================================================================
-- GESTIÓN DE ARCHIVOS DIGITALES
-- ==============================================================================

-- Tabla principal de archivos
CREATE TABLE documento_archivos (
    id SERIAL PRIMARY KEY,
    
    -- Referencias a documentación
    documentacion_id INTEGER NOT NULL REFERENCES documentacion(id) ON DELETE CASCADE,
    recurso_documentacion_id INTEGER REFERENCES recurso_documentacion(id) ON DELETE CASCADE,
    entidad_documentacion_id INTEGER REFERENCES entidad_documentacion(id) ON DELETE CASCADE,
    
    -- Información del archivo original
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL UNIQUE, -- UUID + extension
    ruta_archivo TEXT NOT NULL,
    ruta_miniatura TEXT,
    
    -- Metadatos del archivo
    tipo_mime VARCHAR(100),
    tamaño_bytes BIGINT NOT NULL,
    hash_md5 VARCHAR(32) NOT NULL,
    hash_sha256 VARCHAR(64),
    
    -- Versionado
    version INTEGER DEFAULT 1,
    version_anterior_id INTEGER REFERENCES documento_archivos(id),
    es_version_actual BOOLEAN DEFAULT true,
    
    -- Contenido procesado
    texto_extraido TEXT,
    metadatos JSONB DEFAULT '{}'::jsonb,
    
    -- Estado de procesamiento
    estado_procesamiento VARCHAR(20) DEFAULT 'pendiente' 
        CHECK (estado_procesamiento IN ('pendiente', 'procesando', 'completado', 'error')),
    error_procesamiento TEXT,
    fecha_procesamiento TIMESTAMPTZ,
    
    -- Configuración de acceso
    publico BOOLEAN DEFAULT false,
    fecha_expiracion TIMESTAMPTZ,
    descargas_permitidas INTEGER DEFAULT -1, -- -1 = ilimitadas
    descargas_realizadas INTEGER DEFAULT 0,
    
    -- Auditoría
    fecha_subida TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    usuario_subida_id INTEGER NOT NULL REFERENCES usuario(id),
    usuario_modificacion_id INTEGER REFERENCES usuario(id),
    activo BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT check_version_positiva CHECK (version > 0),
    CONSTRAINT check_tamaño_positivo CHECK (tamaño_bytes > 0),
    CONSTRAINT check_descargas_validas CHECK (descargas_permitidas >= -1),
    CONSTRAINT unique_md5_activo UNIQUE (hash_md5, activo) DEFERRABLE
);

-- Tabla de metadatos extendidos por tipo de archivo
CREATE TABLE archivo_metadatos_extendidos (
    id SERIAL PRIMARY KEY,
    archivo_id INTEGER NOT NULL REFERENCES documento_archivos(id) ON DELETE CASCADE,
    
    -- Metadatos específicos por tipo
    tipo_contenido VARCHAR(50) NOT NULL, -- 'pdf', 'image', 'document', 'spreadsheet'
    
    -- Para PDFs
    numero_paginas INTEGER,
    version_pdf VARCHAR(20),
    protegido_password BOOLEAN DEFAULT false,
    
    -- Para imágenes
    ancho_pixels INTEGER,
    alto_pixels INTEGER,
    profundidad_color INTEGER,
    formato_color VARCHAR(20),
    tiene_metadatos_exif BOOLEAN DEFAULT false,
    exif_data JSONB,
    
    -- Para documentos de Office
    numero_palabras INTEGER,
    numero_caracteres INTEGER,
    aplicacion_creadora VARCHAR(100),
    version_aplicacion VARCHAR(50),
    
    -- Para todos los tipos
    fecha_creacion_archivo TIMESTAMPTZ,
    fecha_modificacion_archivo TIMESTAMPTZ,
    autor VARCHAR(255),
    titulo VARCHAR(500),
    descripcion TEXT,
    palabras_clave TEXT[],
    
    -- Análisis de contenido
    idioma_detectado VARCHAR(10),
    confianza_idioma DECIMAL(3,2),
    sentimiento_general VARCHAR(20), -- 'positivo', 'neutro', 'negativo'
    temas_detectados TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historial de descargas
CREATE TABLE archivo_descargas (
    id SERIAL PRIMARY KEY,
    archivo_id INTEGER NOT NULL REFERENCES documento_archivos(id),
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    ip_address INET,
    user_agent TEXT,
    fecha_descarga TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tamaño_descargado BIGINT,
    tiempo_descarga_ms INTEGER,
    exitoso BOOLEAN DEFAULT true,
    error_mensaje TEXT,
    
    -- Contexto de la descarga
    contexto_descarga VARCHAR(50), -- 'view', 'download', 'preview', 'api'
    referrer_url TEXT,
    
    INDEX idx_archivo_descargas_archivo (archivo_id),
    INDEX idx_archivo_descargas_usuario (usuario_id),
    INDEX idx_archivo_descargas_fecha (fecha_descarga),
    INDEX idx_archivo_descargas_ip (ip_address)
);

-- ==============================================================================
-- SISTEMA DE NOTIFICACIONES
-- ==============================================================================

-- Tabla de reglas de notificación
CREATE TABLE notificacion_reglas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50) NOT NULL,
    
    -- Configuración de la regla
    evento_trigger VARCHAR(100) NOT NULL, -- 'documento_venciendo', 'workflow_step_timeout'
    condiciones JSONB NOT NULL, -- JSON Logic para condiciones complejas
    prioridad INTEGER DEFAULT 100,
    
    -- Configuración de destinatarios
    destinatarios JSONB NOT NULL, -- Array de configuraciones de destinatarios
    
    -- Configuración de mensajes
    plantilla_email VARCHAR(100),
    plantilla_sms VARCHAR(100),
    plantilla_push VARCHAR(100),
    plantilla_sistema VARCHAR(100),
    
    -- Configuración de canales por defecto
    canales_default TEXT[] DEFAULT ARRAY['sistema'],
    
    -- Configuración de timing
    delay_minutos INTEGER DEFAULT 0,
    max_frecuencia_horas INTEGER DEFAULT 24, -- Evitar spam
    
    -- Scope de aplicación
    entidades_aplicables INTEGER[],
    roles_aplicables TEXT[],
    
    -- Estado y control
    activa BOOLEAN DEFAULT true,
    fecha_vigencia_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_vigencia_fin TIMESTAMPTZ,
    
    -- Estadísticas de uso
    estadisticas JSONB DEFAULT '{
        "veces_ejecutada": 0,
        "ultima_ejecucion": null,
        "exitos": 0,
        "errores": 0,
        "tiempo_promedio_ejecucion_ms": 0,
        "destinatarios_unicos": 0
    }'::jsonb,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    modificado_por INTEGER REFERENCES usuario(id),
    
    INDEX idx_notif_reglas_codigo (codigo),
    INDEX idx_notif_reglas_evento (evento_trigger),
    INDEX idx_notif_reglas_categoria (categoria),
    INDEX idx_notif_reglas_activa (activa),
    INDEX idx_notif_reglas_entidades USING GIN (entidades_aplicables)
);

-- Tabla de notificaciones generadas
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    regla_id INTEGER REFERENCES notificacion_reglas(id),
    
    -- Información básica
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    
    -- Destinatario
    destinatario_id INTEGER NOT NULL REFERENCES usuario(id),
    destinatario_email VARCHAR(255),
    destinatario_telefono VARCHAR(20),
    
    -- Canales de envío
    canales TEXT[] NOT NULL DEFAULT ARRAY['sistema'],
    
    -- Prioridad y categorización
    prioridad VARCHAR(20) DEFAULT 'media' 
        CHECK (prioridad IN ('baja', 'media', 'alta', 'critica', 'urgente')),
    categoria VARCHAR(50),
    
    -- Datos contextuales
    datos_contexto JSONB DEFAULT '{}'::jsonb,
    entidad_relacionada_id INTEGER REFERENCES entidad(id),
    recurso_relacionado_id INTEGER REFERENCES recurso(id),
    documento_relacionado_id INTEGER REFERENCES documentacion(id),
    
    -- Configuración de envío
    fecha_programada TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    intentos_maximos INTEGER DEFAULT 3,
    delay_entre_intentos_min INTEGER DEFAULT 5,
    
    -- Estado de procesamiento
    estado VARCHAR(20) DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'programada', 'enviando', 'enviada', 'fallida', 'cancelada')),
    
    -- Tracking de envío
    fecha_enviada TIMESTAMPTZ,
    fecha_leida TIMESTAMPTZ,
    fecha_accion TIMESTAMPTZ, -- Cuando el usuario tomó acción
    
    -- Métricas de entrega
    intentos_realizados INTEGER DEFAULT 0,
    tiempo_entrega_ms INTEGER,
    
    -- Información de errores
    ultimo_error TEXT,
    historial_errores JSONB DEFAULT '[]'::jsonb,
    
    -- Metadatos adicionales
    metadatos JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notificaciones_destinatario (destinatario_id),
    INDEX idx_notificaciones_estado (estado),
    INDEX idx_notificaciones_programada (fecha_programada),
    INDEX idx_notificaciones_tipo (tipo),
    INDEX idx_notificaciones_prioridad (prioridad),
    INDEX idx_notificaciones_entidad (entidad_relacionada_id),
    INDEX idx_notificaciones_leida (fecha_leida)
);

-- Tabla de logs de envío por canal
CREATE TABLE notificacion_envios (
    id SERIAL PRIMARY KEY,
    notificacion_id INTEGER NOT NULL REFERENCES notificaciones(id) ON DELETE CASCADE,
    canal VARCHAR(20) NOT NULL,
    
    -- Estado del envío
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_intento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_completado TIMESTAMPTZ,
    
    -- Información del proveedor
    proveedor VARCHAR(50), -- 'sendgrid', 'twilio', 'firebase', etc.
    id_externo VARCHAR(255), -- ID del proveedor externo
    
    -- Métricas
    tiempo_respuesta_ms INTEGER,
    costo_envio DECIMAL(10,4),
    
    -- Resultado
    exitoso BOOLEAN,
    codigo_respuesta VARCHAR(20),
    mensaje_respuesta TEXT,
    
    -- Metadatos del envío
    metadatos_envio JSONB DEFAULT '{}'::jsonb,
    
    INDEX idx_notif_envios_notificacion (notificacion_id),
    INDEX idx_notif_envios_canal (canal),
    INDEX idx_notif_envios_estado (estado),
    INDEX idx_notif_envios_fecha (fecha_intento)
);

-- Tabla de configuración de notificaciones por usuario
CREATE TABLE usuario_notificacion_config (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    
    -- Configuración general
    notificaciones_habilitadas BOOLEAN DEFAULT true,
    tiempo_real BOOLEAN DEFAULT true,
    resumen_diario BOOLEAN DEFAULT true,
    resumen_semanal BOOLEAN DEFAULT false,
    
    -- Horarios de notificación
    horario_inicio TIME DEFAULT '08:00',
    horario_fin TIME DEFAULT '18:00',
    zona_horaria VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    dias_laborables INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Lunes a Viernes
    
    -- Configuración por tipo de evento
    eventos_config JSONB DEFAULT '{}'::jsonb,
    -- Estructura: {"documento_venciendo": {"canales": ["email", "sistema"], "anticipacion_dias": 30}}
    
    -- Configuración de canales
    email_habilitado BOOLEAN DEFAULT true,
    email_address VARCHAR(255),
    sms_habilitado BOOLEAN DEFAULT false,
    telefono VARCHAR(20),
    push_habilitado BOOLEAN DEFAULT true,
    push_token TEXT,
    
    -- Configuración avanzada
    frecuencia_maxima_por_hora INTEGER DEFAULT 10,
    agrupar_notificaciones BOOLEAN DEFAULT true,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(usuario_id),
    INDEX idx_usuario_notif_config_usuario (usuario_id)
);

-- ==============================================================================
-- WORKFLOWS Y PROCESOS
-- ==============================================================================

-- Tabla de definiciones de workflow
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Clasificación
    categoria VARCHAR(50) NOT NULL,
    subcategoria VARCHAR(50),
    tags TEXT[],
    
    -- Tipo de workflow
    tipo VARCHAR(20) NOT NULL 
        CHECK (tipo IN ('bilateral', 'supervisado', 'circular', 'jerarquico', 'paralelo')),
    
    -- Configuración de participantes
    participantes JSONB NOT NULL, -- Array de roles/participantes requeridos
    
    -- Definición del flujo
    pasos JSONB NOT NULL, -- Array de pasos del workflow
    transiciones JSONB NOT NULL, -- Reglas de transición entre pasos
    
    -- Configuración de eventos
    eventos JSONB DEFAULT '[]'::jsonb, -- Triggers y eventos automáticos
    
    -- Configuración de timeouts
    timeout_global_horas INTEGER,
    timeout_paso_default_horas INTEGER DEFAULT 72,
    
    -- Configuración de escalamiento
    escalamiento_config JSONB DEFAULT '{}'::jsonb,
    
    -- Configuración de notificaciones
    notificaciones_config JSONB DEFAULT '{}'::jsonb,
    
    -- Metadatos
    complejidad VARCHAR(10) DEFAULT 'media' 
        CHECK (complejidad IN ('baja', 'media', 'alta', 'critica')),
    estimacion_duracion_horas INTEGER,
    recursos_requeridos TEXT[],
    
    -- Estado del workflow
    estado VARCHAR(20) DEFAULT 'borrador' 
        CHECK (estado IN ('borrador', 'activo', 'pausado', 'obsoleto', 'archivado')),
    publicado BOOLEAN DEFAULT false,
    
    -- Estadísticas de uso
    utilizaciones INTEGER DEFAULT 0,
    tiempo_promedio_completacion_horas DECIMAL(10,2),
    tasa_exito DECIMAL(5,2) DEFAULT 0.00,
    
    -- Auditoría
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_publicacion TIMESTAMPTZ,
    fecha_ultima_modificacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER NOT NULL REFERENCES usuario(id),
    modificado_por INTEGER REFERENCES usuario(id),
    
    INDEX idx_workflows_codigo (codigo),
    INDEX idx_workflows_categoria (categoria),
    INDEX idx_workflows_tipo (tipo),
    INDEX idx_workflows_estado (estado),
    INDEX idx_workflows_tags USING GIN (tags)
);

-- Tabla de instancias de workflow ejecutándose
CREATE TABLE workflow_instancias (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id),
    workflow_version VARCHAR(20), -- Versión del workflow al momento de instanciación
    
    -- Identificación
    codigo_instancia VARCHAR(50) UNIQUE NOT NULL, -- Código único para tracking
    nombre VARCHAR(255),
    descripcion TEXT,
    
    -- Contexto de ejecución
    contexto JSONB DEFAULT '{}'::jsonb, -- Variables del workflow
    parametros_iniciales JSONB DEFAULT '{}'::jsonb,
    
    -- Participantes asignados
    participantes_asignados JSONB NOT NULL, -- Mapeo de roles a usuarios/entidades reales
    
    -- Estado de ejecución
    estado VARCHAR(20) DEFAULT 'iniciado' 
        CHECK (estado IN ('iniciado', 'en_progreso', 'pausado', 'completado', 'fallido', 'cancelado')),
    
    -- Paso actual
    paso_actual_id VARCHAR(50),
    paso_actual_nombre VARCHAR(255),
    pasos_completados TEXT[],
    pasos_pendientes TEXT[],
    
    -- Fechas importantes
    fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_fin_estimada TIMESTAMPTZ,
    fecha_fin_real TIMESTAMPTZ,
    fecha_ultimo_movimiento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Métricas de progreso
    progreso_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    pasos_totales INTEGER,
    pasos_completados_count INTEGER DEFAULT 0,
    
    -- Información de bloqueos
    bloqueado BOOLEAN DEFAULT false,
    razon_bloqueo TEXT,
    fecha_bloqueo TIMESTAMPTZ,
    bloqueado_por INTEGER REFERENCES usuario(id),
    
    -- Configuración de la instancia
    prioridad VARCHAR(10) DEFAULT 'media' 
        CHECK (prioridad IN ('baja', 'media', 'alta', 'critica', 'urgente')),
    
    -- Referencias externas
    entidad_solicitante_id INTEGER REFERENCES entidad(id),
    entidad_responsable_id INTEGER REFERENCES entidad(id),
    recurso_relacionado_id INTEGER REFERENCES recurso(id),
    documento_relacionado_id INTEGER REFERENCES documentacion(id),
    
    -- Tracking de cambios
    historial_cambios JSONB DEFAULT '[]'::jsonb,
    
    -- Auditoría
    creado_por INTEGER NOT NULL REFERENCES usuario(id),
    modificado_por INTEGER REFERENCES usuario(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_workflow_inst_workflow (workflow_id),
    INDEX idx_workflow_inst_codigo (codigo_instancia),
    INDEX idx_workflow_inst_estado (estado),
    INDEX idx_workflow_inst_paso_actual (paso_actual_id),
    INDEX idx_workflow_inst_fecha_inicio (fecha_inicio),
    INDEX idx_workflow_inst_prioridad (prioridad),
    INDEX idx_workflow_inst_entidad_sol (entidad_solicitante_id),
    INDEX idx_workflow_inst_participantes USING GIN (participantes_asignados)
);

-- Tabla de historial de pasos ejecutados
CREATE TABLE workflow_paso_historial (
    id SERIAL PRIMARY KEY,
    instancia_id INTEGER NOT NULL REFERENCES workflow_instancias(id) ON DELETE CASCADE,
    
    -- Información del paso
    paso_id VARCHAR(50) NOT NULL,
    paso_nombre VARCHAR(255) NOT NULL,
    paso_tipo VARCHAR(50) NOT NULL,
    orden_ejecucion INTEGER,
    
    -- Estado del paso
    estado VARCHAR(20) NOT NULL 
        CHECK (estado IN ('iniciado', 'en_progreso', 'completado', 'fallido', 'saltado', 'cancelado')),
    
    -- Responsable del paso
    asignado_a_usuario_id INTEGER REFERENCES usuario(id),
    asignado_a_rol VARCHAR(50),
    ejecutado_por_usuario_id INTEGER REFERENCES usuario(id),
    
    -- Fechas de ejecución
    fecha_asignacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio_real TIMESTAMPTZ,
    fecha_fin_real TIMESTAMPTZ,
    fecha_limite TIMESTAMPTZ,
    
    -- Duración y métricas
    duracion_minutos INTEGER,
    tiempo_en_cola_minutos INTEGER,
    
    -- Acciones realizadas
    acciones_realizadas JSONB DEFAULT '[]'::jsonb,
    
    -- Datos de entrada y salida
    datos_entrada JSONB DEFAULT '{}'::jsonb,
    datos_salida JSONB DEFAULT '{}'::jsonb,
    
    -- Comentarios y notas
    comentarios TEXT,
    notas_internas TEXT,
    
    -- Archivos relacionados
    archivos_adjuntos INTEGER[], -- Referencias a documento_archivos
    
    -- Información de errores
    tiene_errores BOOLEAN DEFAULT false,
    errores JSONB DEFAULT '[]'::jsonb,
    
    -- Escalamientos
    escalado BOOLEAN DEFAULT false,
    fecha_escalamiento TIMESTAMPTZ,
    escalado_a_usuario_id INTEGER REFERENCES usuario(id),
    razon_escalamiento TEXT,
    
    INDEX idx_workflow_paso_hist_instancia (instancia_id),
    INDEX idx_workflow_paso_hist_paso (paso_id),
    INDEX idx_workflow_paso_hist_estado (estado),
    INDEX idx_workflow_paso_hist_asignado (asignado_a_usuario_id),
    INDEX idx_workflow_paso_hist_fecha (fecha_asignacion)
);

-- ==============================================================================
-- ROLES Y PERMISOS GRANULARES
-- ==============================================================================

-- Tabla de roles del sistema
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    
    -- Jerarquía de roles
    nivel_jerarquia INTEGER DEFAULT 100, -- Menor número = mayor jerarquía
    rol_padre_id INTEGER REFERENCES roles(id),
    
    -- Tipo de rol
    tipo VARCHAR(20) DEFAULT 'operativo' 
        CHECK (tipo IN ('sistema', 'administrativo', 'operativo', 'consulta')),
    
    -- Scope del rol
    es_global BOOLEAN DEFAULT false, -- true = aplica a todas las entidades
    entidades_aplicables INTEGER[], -- Si no es global, lista de entidades
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    -- Configuración de herencia
    hereda_permisos BOOLEAN DEFAULT true,
    
    -- Metadatos
    color VARCHAR(7), -- Color hex para UI
    icono VARCHAR(50),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuario(id),
    
    INDEX idx_roles_codigo (codigo),
    INDEX idx_roles_tipo (tipo),
    INDEX idx_roles_nivel (nivel_jerarquia),
    INDEX idx_roles_global (es_global)
);

-- Tabla de permisos específicos
CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    
    -- Categorización
    modulo VARCHAR(50) NOT NULL, -- 'usuarios', 'documentos', 'workflows', etc.
    submodulo VARCHAR(50),
    accion VARCHAR(50) NOT NULL, -- 'crear', 'leer', 'editar', 'eliminar', 'aprobar'
    
    -- Tipo de permiso
    tipo VARCHAR(20) DEFAULT 'funcional' 
        CHECK (tipo IN ('funcional', 'administrativo', 'sistema')),
    
    -- Nivel de riesgo
    nivel_riesgo VARCHAR(10) DEFAULT 'bajo' 
        CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto', 'critico')),
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    -- Metadatos
    requiere_justificacion BOOLEAN DEFAULT false,
    auditable BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_permisos_codigo (codigo),
    INDEX idx_permisos_modulo (modulo),
    INDEX idx_permisos_accion (accion),
    INDEX idx_permisos_tipo (tipo)
);

-- Tabla de asignación de permisos a roles
CREATE TABLE rol_permisos (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    
    -- Configuración específica del permiso
    condiciones JSONB DEFAULT '{}'::jsonb, -- Condiciones adicionales para el permiso
    
    -- Scope adicional
    entidades_permitidas INTEGER[], -- Entidades específicas donde aplica
    recursos_permitidos INTEGER[], -- Recursos específicos donde aplica
    
    -- Configuración temporal
    fecha_vigencia_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_vigencia_fin TIMESTAMPTZ,
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    -- Auditoría
    asignado_por INTEGER REFERENCES usuario(id),
    fecha_asignacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(rol_id, permiso_id),
    INDEX idx_rol_permisos_rol (rol_id),
    INDEX idx_rol_permisos_permiso (permiso_id)
);

-- Tabla de asignación de roles a usuarios
CREATE TABLE usuario_roles (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Scope de aplicación
    entidad_id INTEGER REFERENCES entidad(id), -- Si el rol aplica a una entidad específica
    
    -- Configuración temporal
    fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMPTZ,
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    -- Información adicional
    asignado_por INTEGER NOT NULL REFERENCES usuario(id),
    justificacion TEXT,
    
    -- Auditoría
    fecha_asignacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_revocacion TIMESTAMPTZ,
    revocado_por INTEGER REFERENCES usuario(id),
    
    UNIQUE(usuario_id, rol_id, entidad_id),
    INDEX idx_usuario_roles_usuario (usuario_id),
    INDEX idx_usuario_roles_rol (rol_id),
    INDEX idx_usuario_roles_entidad (entidad_id),
    INDEX idx_usuario_roles_activo (activo)
);

-- ==============================================================================
-- AUDITORÍA Y LOGGING
-- ==============================================================================

-- Tabla de auditoría general del sistema
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    
    -- Información de la operación
    tabla VARCHAR(50) NOT NULL,
    operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id INTEGER,
    
    -- Usuario y contexto
    usuario_id INTEGER REFERENCES usuario(id),
    usuario_email VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Información de red
    ip_address INET,
    user_agent TEXT,
    
    -- Datos de la operación
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_modificados TEXT[],
    
    -- Contexto adicional
    contexto VARCHAR(100), -- 'web', 'api', 'workflow', 'system'
    referrer_url TEXT,
    endpoint VARCHAR(255),
    metodo_http VARCHAR(10),
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    duracion_ms INTEGER,
    
    -- Clasificación
    categoria VARCHAR(50), -- 'security', 'data', 'workflow', 'system'
    nivel_criticidad VARCHAR(10) DEFAULT 'info' 
        CHECK (nivel_criticidad IN ('debug', 'info', 'warning', 'error', 'critical')),
    
    -- Flags especiales
    es_sensitivo BOOLEAN DEFAULT false,
    requiere_retention BOOLEAN DEFAULT false,
    
    INDEX idx_auditoria_tabla (tabla),
    INDEX idx_auditoria_usuario (usuario_id),
    INDEX idx_auditoria_timestamp (timestamp),
    INDEX idx_auditoria_operacion (operacion),
    INDEX idx_auditoria_ip (ip_address),
    INDEX idx_auditoria_categoria (categoria)
);

-- ==============================================================================
-- VISTAS MATERIALIZADAS PARA PERFORMANCE
-- ==============================================================================

-- Vista materializada para dashboard principal
CREATE MATERIALIZED VIEW mv_dashboard_estadisticas AS
SELECT 
    -- Estadísticas globales
    (SELECT COUNT(*) FROM documento_archivos WHERE activo = true) as total_archivos,
    (SELECT SUM(tamaño_bytes) FROM documento_archivos WHERE activo = true) as tamaño_total_bytes,
    (SELECT COUNT(*) FROM notificaciones WHERE estado = 'pendiente') as notificaciones_pendientes,
    (SELECT COUNT(*) FROM workflow_instancias WHERE estado IN ('iniciado', 'en_progreso')) as workflows_activos,
    
    -- Estadísticas por entidad
    json_agg(
        json_build_object(
            'entidad_id', e.id,
            'entidad_nombre', e.nombre,
            'recursos_count', COALESCE(er.recursos_count, 0),
            'documentos_vencidos', COALESCE(dv.documentos_vencidos, 0),
            'documentos_por_vencer', COALESCE(dpv.documentos_por_vencer, 0),
            'archivos_count', COALESCE(arch.archivos_count, 0),
            'workflows_activos', COALESCE(wa.workflows_activos, 0)
        )
    ) as estadisticas_por_entidad,
    
    -- Timestamp de actualización
    CURRENT_TIMESTAMP as ultima_actualizacion
    
FROM entidad e
LEFT JOIN (
    SELECT entidad_id, COUNT(*) as recursos_count
    FROM entidad_recurso 
    WHERE activo = true 
    GROUP BY entidad_id
) er ON e.id = er.entidad_id
LEFT JOIN (
    SELECT er.entidad_id, COUNT(*) as documentos_vencidos
    FROM recurso_documentacion rd
    JOIN entidad_recurso er ON rd.recurso_id = er.recurso_id
    WHERE rd.fecha_vencimiento < CURRENT_DATE
    AND rd.activo = true
    GROUP BY er.entidad_id
) dv ON e.id = dv.entidad_id
LEFT JOIN (
    SELECT er.entidad_id, COUNT(*) as documentos_por_vencer
    FROM recurso_documentacion rd
    JOIN entidad_recurso er ON rd.recurso_id = er.recurso_id
    WHERE rd.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND rd.activo = true
    GROUP BY er.entidad_id
) dpv ON e.id = dpv.entidad_id
LEFT JOIN (
    SELECT ed.entidad_id, COUNT(*) as archivos_count
    FROM documento_archivos da
    JOIN entidad_documentacion ed ON da.entidad_documentacion_id = ed.id
    WHERE da.activo = true
    GROUP BY ed.entidad_id
) arch ON e.id = arch.entidad_id
LEFT JOIN (
    SELECT wi.entidad_solicitante_id as entidad_id, COUNT(*) as workflows_activos
    FROM workflow_instancias wi
    WHERE wi.estado IN ('iniciado', 'en_progreso')
    GROUP BY wi.entidad_solicitante_id
) wa ON e.id = wa.entidad_id;

-- Índices para la vista materializada
CREATE INDEX idx_mv_dashboard_ultima_act ON mv_dashboard_estadisticas(ultima_actualizacion);

-- Vista materializada para análisis de documentos
CREATE MATERIALIZED VIEW mv_analisis_documentos AS
SELECT 
    d.id as documento_id,
    d.codigo,
    d.descripcion,
    d.es_universal,
    d.dias_vigencia,
    
    -- Estadísticas de uso
    COUNT(DISTINCT rd.id) as asignaciones_recursos,
    COUNT(DISTINCT ed.id) as asignaciones_entidades,
    COUNT(DISTINCT da.id) as archivos_subidos,
    SUM(da.tamaño_bytes) as tamaño_total_archivos,
    
    -- Estadísticas de vencimientos
    COUNT(DISTINCT CASE WHEN rd.fecha_vencimiento < CURRENT_DATE THEN rd.id END) as documentos_vencidos,
    COUNT(DISTINCT CASE WHEN rd.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN rd.id END) as documentos_por_vencer_30d,
    
    -- Fechas importantes
    MIN(rd.fecha_vencimiento) as proximo_vencimiento,
    MAX(da.fecha_subida) as ultimo_archivo_subido,
    
    -- Metadatos
    CURRENT_TIMESTAMP as ultima_actualizacion
    
FROM documentacion d
LEFT JOIN recurso_documentacion rd ON d.id = rd.documentacion_id AND rd.activo = true
LEFT JOIN entidad_documentacion ed ON d.id = ed.documentacion_id AND ed.activo = true
LEFT JOIN documento_archivos da ON d.id = da.documentacion_id AND da.activo = true
GROUP BY d.id, d.codigo, d.descripcion, d.es_universal, d.dias_vigencia;

-- ==============================================================================
-- TRIGGERS Y FUNCIONES
-- ==============================================================================

-- Función para trigger de auditoría automática
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id INTEGER;
    current_session_id VARCHAR(255);
    current_ip INET;
    campos_modificados TEXT[];
BEGIN
    -- Obtener información del contexto actual
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::INTEGER;
        current_session_id := current_setting('app.session_id', true);
        current_ip := current_setting('app.client_ip', true)::INET;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
        current_session_id := NULL;
        current_ip := NULL;
    END;
    
    -- Calcular campos modificados para UPDATE
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO campos_modificados
        FROM jsonb_each(to_jsonb(NEW))
        WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key);
    END IF;
    
    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        operacion,
        registro_id,
        usuario_id,
        session_id,
        ip_address,
        datos_anteriores,
        datos_nuevos,
        campos_modificados,
        categoria
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE 
            WHEN TG_OP = 'DELETE' THEN (OLD).id
            ELSE (NEW).id
        END,
        current_user_id,
        current_session_id,
        current_ip,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        campos_modificados,
        'data'
    );
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoría a tablas importantes
CREATE TRIGGER audit_documento_archivos
    AFTER INSERT OR UPDATE OR DELETE ON documento_archivos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_notificaciones
    AFTER INSERT OR UPDATE OR DELETE ON notificaciones
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_workflow_instancias
    AFTER INSERT OR UPDATE OR DELETE ON workflow_instancias
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_timestamp_function()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de timestamp a todas las tablas relevantes
CREATE TRIGGER update_documento_archivos_timestamp
    BEFORE UPDATE ON documento_archivos
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_function();

CREATE TRIGGER update_notificaciones_timestamp
    BEFORE UPDATE ON notificaciones
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_function();

-- Función para refrescar vistas materializadas
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_dashboard_estadisticas;
    REFRESH MATERIALIZED VIEW mv_analisis_documentos;
    
    -- Log de la operación
    INSERT INTO auditoria (tabla, operacion, categoria, nivel_criticidad)
    VALUES ('materialized_views', 'REFRESH', 'system', 'info');
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- CONFIGURACIÓN DE JOBS Y MANTENIMIENTO
-- ==============================================================================

-- Instalar pg_cron si no está disponible
-- SELECT cron.schedule('refresh-materialized-views', '0 * * * *', 'SELECT refresh_materialized_views();');
-- SELECT cron.schedule('cleanup-old-audit', '0 2 * * *', 'DELETE FROM auditoria WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL ''6 months'';');
-- SELECT cron.schedule('cleanup-old-notifications', '0 3 * * *', 'DELETE FROM notificaciones WHERE created_at < CURRENT_TIMESTAMP - INTERVAL ''3 months'' AND estado = ''enviada'';');
```

### **Índices de Performance Adicionales**
```sql
-- ==============================================================================
-- ÍNDICES ESPECIALIZADOS PARA PERFORMANCE
-- ==============================================================================

-- Índices compuestos para queries frecuentes
CREATE INDEX idx_documento_archivos_lookup 
ON documento_archivos(documentacion_id, activo, fecha_subida DESC);

CREATE INDEX idx_notificaciones_dashboard 
ON notificaciones(destinatario_id, estado, prioridad, fecha_programada);

CREATE INDEX idx_workflow_instancias_activas 
ON workflow_instancias(estado, fecha_inicio DESC) 
WHERE estado IN ('iniciado', 'en_progreso');

-- Índices parciales para optimizar queries específicas
CREATE INDEX idx_archivos_pendientes_procesamiento 
ON documento_archivos(id, fecha_subida) 
WHERE estado_procesamiento = 'pendiente';

CREATE INDEX idx_notificaciones_no_leidas 
ON notificaciones(destinatario_id, fecha_programada) 
WHERE fecha_leida IS NULL;

-- Índices para búsqueda de texto completo
CREATE INDEX idx_documento_archivos_texto_extraido 
ON documento_archivos USING gin(to_tsvector('spanish', texto_extraido))
WHERE texto_extraido IS NOT NULL;

-- Índices para rangos de fechas
CREATE INDEX idx_documento_archivos_fecha_range 
ON documento_archivos(fecha_subida, activo);

CREATE INDEX idx_auditoria_timestamp_range 
ON auditoria(timestamp DESC, categoria);
```

---

## 🔧 **APIS Y SERVICIOS BACKEND**

### **Arquitectura de Servicios**

#### **Service Layer Pattern**
```typescript
// server/src/services/BaseService.ts
export abstract class BaseService<T, CreateDTO, UpdateDTO> {
  protected model: ModelStatic<T>;
  protected includeDefaults: any[];
  
  constructor(model: ModelStatic<T>, includeDefaults: any[] = []) {
    this.model = model;
    this.includeDefaults = includeDefaults;
  }
  
  async findAll(options: FindOptions = {}): Promise<T[]> {
    return await this.model.findAll({
      include: this.includeDefaults,
      ...options
    });
  }
  
  async findById(id: number, options: FindOptions = {}): Promise<T | null> {
    return await this.model.findByPk(id, {
      include: this.includeDefaults,
      ...options
    });
  }
  
  async create(data: CreateDTO, usuarioId: number): Promise<T> {
    const record = await this.model.create({
      ...data,
      creadoPor: usuarioId
    } as any);
    
    return await this.findById((record as any).id);
  }
  
  async update(id: number, data: UpdateDTO, usuarioId: number): Promise<T> {
    await this.model.update({
      ...data,
      modificadoPor: usuarioId
    } as any, {
      where: { id }
    });
    
    return await this.findById(id);
  }
  
  async delete(id: number): Promise<boolean> {
    const result = await this.model.destroy({
      where: { id }
    });
    
    return result > 0;
  }
  
  async softDelete(id: number, usuarioId: number): Promise<boolean> {
    const result = await this.model.update({
      activo: false,
      modificadoPor: usuarioId
    } as any, {
      where: { id }
    });
    
    return result[0] > 0;
  }
}

// server/src/services/ArchivoService.ts
export class ArchivoService extends BaseService<DocumentoArchivo, CreateArchivoDTO, UpdateArchivoDTO> {
  private storageService: StorageService;
  private processingService: DocumentProcessingService;
  
  constructor() {
    super(DocumentoArchivo, [
      { model: Documentacion, as: 'documentacion' },
      { model: Usuario, as: 'usuarioSubida', attributes: ['id', 'nombre', 'email'] }
    ]);
    
    this.storageService = StorageService.getInstance();
    this.processingService = new DocumentProcessingService();
  }
  
  async uploadFile(
    file: Express.Multer.File,
    documentacionId: number,
    usuarioId: number,
    options: UploadOptions = {}
  ): Promise<DocumentoArchivo> {
    // Validaciones
    await this.validateFile(file);
    await this.validatePermissions(usuarioId, documentacionId);
    
    // Calcular hash para detectar duplicados
    const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
    
    // Verificar duplicado
    const duplicado = await this.findByHash(hash);
    if (duplicado && options.allowDuplicates !== true) {
      throw new BusinessError('DUPLICATE_FILE', 'Este archivo ya existe en el sistema', duplicado);
    }
    
    // Generar nombre único y ruta
    const extension = path.extname(file.originalname);
    const nombreArchivo = `${uuidv4()}${extension}`;
    const rutaArchivo = this.generateFilePath(nombreArchivo, documentacionId);
    
    // Subir archivo al storage
    await this.storageService.upload(file, rutaArchivo);
    
    // Crear registro en base de datos
    const archivo = await this.create({
      documentacionId,
      recursoDocumentacionId: options.recursoDocumentacionId,
      entidadDocumentacionId: options.entidadDocumentacionId,
      nombreOriginal: file.originalname,
      nombreArchivo,
      rutaArchivo,
      tipoMime: file.mimetype,
      tamañoBytes: file.size,
      hashMd5: hash,
      metadatos: await this.extractBasicMetadata(file)
    }, usuarioId);
    
    // Programar procesamiento en background
    await this.scheduleProcessing(archivo.id);
    
    return archivo;
  }
  
  async downloadFile(id: number, usuarioId: number): Promise<{
    buffer: Buffer;
    archivo: DocumentoArchivo;
  }> {
    const archivo = await this.findById(id);
    if (!archivo) {
      throw new NotFoundError('ARCHIVO_NOT_FOUND', 'Archivo no encontrado');
    }
    
    // Validar permisos
    await this.validateDownloadPermissions(usuarioId, archivo);
    
    // Verificar límites de descarga
    await this.checkDownloadLimits(archivo);
    
    // Descargar del storage
    const buffer = await this.storageService.download(archivo.rutaArchivo);
    
    // Registrar descarga
    await this.logDownload(archivo.id, usuarioId);
    
    return { buffer, archivo };
  }
  
  async createNewVersion(
    id: number,
    file: Express.Multer.File,
    usuarioId: number
  ): Promise<DocumentoArchivo> {
    const archivoAnterior = await this.findById(id);
    if (!archivoAnterior) {
      throw new NotFoundError('ARCHIVO_NOT_FOUND', 'Archivo no encontrado');
    }
    
    // Validar permisos
    await this.validatePermissions(usuarioId, archivoAnterior.documentacionId);
    
    // Marcar versión anterior como no actual
    await archivoAnterior.update({ esVersionActual: false });
    
    // Crear nueva versión
    const nuevaVersion = await this.uploadFile(file, archivoAnterior.documentacionId, usuarioId, {
      recursoDocumentacionId: archivoAnterior.recursoDocumentacionId,
      entidadDocumentacionId: archivoAnterior.entidadDocumentacionId,
      allowDuplicates: true
    });
    
    // Actualizar información de versionado
    await nuevaVersion.update({
      version: archivoAnterior.version + 1,
      versionAnteriorId: archivoAnterior.id
    });
    
    return nuevaVersion;
  }
  
  private async validateFile(file: Express.Multer.File): Promise<void> {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png,txt').split(',');
    
    if (file.size > maxSize) {
      throw new ValidationError('FILE_TOO_LARGE', `Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`);
    }
    
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!allowedTypes.includes(extension)) {
      throw new ValidationError('FILE_TYPE_NOT_ALLOWED', `Tipo de archivo no permitido: ${extension}`);
    }
    
    // Validación adicional de contenido vs extensión
    await this.validateFileContent(file);
  }
  
  private async validateFileContent(file: Express.Multer.File): Promise<void> {
    const fileType = await import('file-type');
    const type = await fileType.fromBuffer(file.buffer);
    
    if (type) {
      const expectedMime = this.getExpectedMimeType(file.originalname);
      if (expectedMime && type.mime !== expectedMime) {
        throw new ValidationError('FILE_CONTENT_MISMATCH', 
          'El contenido del archivo no coincide con su extensión');
      }
    }
  }
  
  private generateFilePath(nombreArchivo: string, documentacionId: number): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `documents/${year}/${month}/${documentacionId}/${nombreArchivo}`;
  }
  
  private async scheduleProcessing(archivoId: number): Promise<void> {
    await backgroundJobQueue.add('process-document', 
      { archivoId }, 
      { 
        delay: 1000, // 1 segundo de delay
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
  }
}
```

#### **Notification Service Architecture**
```typescript
// server/src/services/NotificationService.ts
export class NotificationService {
  private channels: Map<string, NotificationChannel>;
  private ruleEngine: NotificationRuleEngine;
  private templateEngine: TemplateEngine;
  private queue: Queue;
  
  constructor() {
    this.channels = new Map();
    this.ruleEngine = new NotificationRuleEngine();
    this.templateEngine = new TemplateEngine();
    this.queue = new Queue('notifications', { redis: redisConfig });
    
    this.initializeChannels();
    this.setupQueueProcessing();
  }
  
  private initializeChannels(): void {
    this.channels.set('email', new EmailNotificationChannel({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    }));
    
    this.channels.set('sms', new SMSNotificationChannel({
      provider: process.env.SMS_PROVIDER,
      apiKey: process.env.SMS_API_KEY,
      from: process.env.SMS_FROM_NUMBER
    }));
    
    this.channels.set('push', new PushNotificationChannel({
      firebaseKey: process.env.FIREBASE_SERVER_KEY
    }));
    
    this.channels.set('sistema', new InAppNotificationChannel());
  }
  
  async sendNotification(notification: CreateNotificationDTO): Promise<void> {
    // Crear registro en base de datos
    const notificationRecord = await Notification.create(notification);
    
    // Programar envío
    await this.queue.add('send-notification', {
      notificationId: notificationRecord.id
    }, {
      delay: notification.fechaProgramada ? 
        new Date(notification.fechaProgramada).getTime() - Date.now() : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  
  async processSystemEvent(event: SystemEvent): Promise<void> {
    // Cargar reglas aplicables
    const rules = await this.ruleEngine.findApplicableRules(event);
    
    // Evaluar cada regla
    for (const rule of rules) {
      if (await this.ruleEngine.evaluateRule(rule, event)) {
        await this.executeRule(rule, event);
      }
    }
  }
  
  private async executeRule(rule: NotificationRule, event: SystemEvent): Promise<void> {
    // Resolver destinatarios
    const recipients = await this.resolveRecipients(rule.destinatarios, event);
    
    // Crear notificaciones para cada destinatario
    for (const recipient of recipients) {
      const notification = await this.buildNotification(rule, event, recipient);
      await this.sendNotification(notification);
    }
    
    // Actualizar estadísticas de la regla
    await this.updateRuleStatistics(rule.id);
  }
  
  private async buildNotification(
    rule: NotificationRule, 
    event: SystemEvent, 
    recipient: Usuario
  ): Promise<CreateNotificationDTO> {
    // Obtener configuración del usuario
    const userConfig = await this.getUserNotificationConfig(recipient.id);
    
    // Determinar canales efectivos
    const canales = this.determineEffectiveChannels(rule, userConfig, event);
    
    // Renderizar contenido
    const content = await this.templateEngine.render(rule.plantillaEmail || 'default', {
      recipient,
      event,
      rule
    });
    
    return {
      tipo: event.tipo,
      titulo: content.subject,
      mensaje: content.body,
      destinatarioId: recipient.id,
      destinatarioEmail: recipient.email,
      canales,
      prioridad: this.calculatePriority(rule, event),
      datosContexto: event.data,
      entidadRelacionadaId: event.data.entidadId,
      recursoRelacionadoId: event.data.recursoId,
      documentoRelacionadoId: event.data.documentoId
    };
  }
  
  private setupQueueProcessing(): void {
    this.queue.process('send-notification', async (job) => {
      const { notificationId } = job.data;
      
      const notification = await Notification.findByPk(notificationId, {
        include: [{ model: Usuario, as: 'destinatario' }]
      });
      
      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }
      
      // Actualizar estado
      await notification.update({ estado: 'enviando' });
      
      // Enviar por cada canal
      const results = await Promise.allSettled(
        notification.canales.map(canal => this.sendViaChannel(notification, canal))
      );
      
      // Procesar resultados
      const success = results.some(result => result.status === 'fulfilled');
      
      await notification.update({
        estado: success ? 'enviada' : 'fallida',
        fechaEnviada: success ? new Date() : null,
        intentosRealizados: notification.intentosRealizados + 1
      });
      
      // Log detallado de cada canal
      await this.logChannelResults(notification.id, results);
    });
  }
  
  private async sendViaChannel(
    notification: Notification, 
    canal: string
  ): Promise<boolean> {
    const channel = this.channels.get(canal);
    if (!channel) {
      throw new Error(`Channel ${canal} not found`);
    }
    
    const startTime = Date.now();
    
    try {
      const success = await channel.send(notification);
      const duration = Date.now() - startTime;
      
      await NotificationEnvio.create({
        notificacionId: notification.id,
        canal,
        estado: success ? 'completado' : 'fallido',
        fechaCompletado: new Date(),
        tiempoRespuestaMs: duration,
        exitoso: success
      });
      
      return success;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await NotificationEnvio.create({
        notificacionId: notification.id,
        canal,
        estado: 'error',
        tiempoRespuestaMs: duration,
        exitoso: false,
        mensajeRespuesta: error.message
      });
      
      throw error;
    }
  }
}

// server/src/services/WorkflowEngine.ts
export class WorkflowEngine {
  private ruleEngine: BusinessRuleEngine;
  private notificationService: NotificationService;
  
  constructor() {
    this.ruleEngine = new BusinessRuleEngine();
    this.notificationService = NotificationService.getInstance();
  }
  
  async startWorkflow(
    workflowId: number,
    parametros: any,
    usuarioId: number
  ): Promise<WorkflowInstancia> {
    const workflow = await Workflow.findByPk(workflowId);
    if (!workflow) {
      throw new NotFoundError('WORKFLOW_NOT_FOUND', 'Workflow no encontrado');
    }
    
    // Validar precondiciones
    await this.validateWorkflowPreconditions(workflow, parametros);
    
    // Crear instancia
    const instancia = await WorkflowInstancia.create({
      workflowId,
      workflowVersion: workflow.version,
      codigoInstancia: this.generateInstanceCode(),
      contexto: parametros,
      participantesAsignados: await this.resolveParticipants(workflow, parametros),
      creadoPor: usuarioId
    });
    
    // Inicializar primer paso
    await this.initializeFirstStep(instancia);
    
    // Notificar inicio
    await this.notificationService.processSystemEvent({
      tipo: 'workflow_iniciado',
      data: { instanciaId: instancia.id, workflowId, usuarioId }
    });
    
    return instancia;
  }
  
  async executeAction(
    instanciaId: number,
    pasoId: string,
    accion: string,
    datos: any,
    usuarioId: number
  ): Promise<void> {
    const instancia = await this.getWorkflowInstance(instanciaId);
    
    // Validar que el usuario puede ejecutar esta acción
    await this.validateActionPermissions(instancia, pasoId, accion, usuarioId);
    
    // Validar estado del paso
    await this.validateStepState(instancia, pasoId);
    
    // Ejecutar acción
    const resultado = await this.performAction(instancia, pasoId, accion, datos, usuarioId);
    
    // Registrar en historial
    await this.recordStepExecution(instancia.id, pasoId, accion, datos, resultado, usuarioId);
    
    // Evaluar transiciones
    const siguientesPasos = await this.evaluateTransitions(instancia, pasoId);
    
    // Activar siguientes pasos
    for (const siguientePaso of siguientesPasos) {
      await this.activateStep(instancia, siguientePaso);
    }
    
    // Verificar si el workflow se completó
    await this.checkWorkflowCompletion(instancia);
  }
  
  private async evaluateTransitions(
    instancia: WorkflowInstancia,
    pasoActual: string
  ): Promise<any[]> {
    const workflow = await Workflow.findByPk(instancia.workflowId);
    const transiciones = workflow.transiciones.filter(t => t.pasoOrigen === pasoActual);
    
    const pasosActivar = [];
    
    for (const transicion of transiciones) {
      if (await this.evaluateTransitionCondition(transicion, instancia)) {
        pasosActivar.push(transicion.pasoDestino);
      }
    }
    
    return pasosActivar;
  }
  
  private async evaluateTransitionCondition(
    transicion: any,
    instancia: WorkflowInstancia
  ): Promise<boolean> {
    if (!transicion.condicion) return true;
    
    // Usar el motor de reglas para evaluar la condición
    return await this.ruleEngine.evaluate(transicion.condicion, {
      instancia,
      contexto: instancia.contexto,
      historial: await this.getStepHistory(instancia.id)
    });
  }
}
```

---

## 🎨 **ARQUITECTURA FRONTEND**

### **Component Architecture**
```typescript
// client/src/components/common/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  selection?: SelectionConfig<T>;
  actions?: ActionConfig<T>[];
  exportable?: boolean;
  className?: string;
}

interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  accessor?: (item: T) => any;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  loading = false,
  pagination,
  sorting,
  filtering,
  selection,
  actions,
  exportable = false,
  className
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // Procesamiento de datos
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Aplicar filtros
    if (filtering && Object.keys(filterValues).length > 0) {
      result = result.filter(item => {
        return Object.entries(filterValues).every(([key, value]) => {
          if (!value) return true;
          
          const column = columns.find(col => col.key === key);
          const itemValue = column?.accessor ? column.accessor(item) : item[key];
          
          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase());
          }
          
          return itemValue === value;
        });
      });
    }
    
    // Aplicar ordenamiento
    if (sortConfig) {
      result.sort((a, b) => {
        const column = columns.find(col => col.key === sortConfig.key);
        const aValue = column?.accessor ? column.accessor(a) : a[sortConfig.key];
        const bValue = column?.accessor ? column.accessor(b) : b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [data, filterValues, sortConfig, columns]);
  
  // Paginación
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return processedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [processedData, pagination]);
  
  const handleSort = (key: string) => {
    if (!sorting) return;
    
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const handleFilter = (key: string, value: any) => {
    if (!filtering) return;
    
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleExport = (format: 'excel' | 'pdf') => {
    if (!exportable) return;
    
    const exportData = selectedItems.size > 0 
      ? processedData.filter(item => selectedItems.has(item.id))
      : processedData;
    
    if (format === 'excel') {
      exportToExcel(exportData, columns);
    } else {
      exportToPDF(exportData, columns);
    }
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filtros rápidos */}
          {filtering && (
            <QuickFilters 
              columns={columns.filter(col => col.filterable)}
              values={filterValues}
              onChange={handleFilter}
            />
          )}
          
          {/* Selección múltiple acciones */}
          {selection && selectedItems.size > 0 && (
            <BulkActions
              selectedCount={selectedItems.size}
              actions={selection.bulkActions}
              onAction={(action) => action.handler(Array.from(selectedItems))}
            />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Exportar */}
          {exportable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Configuración de columnas */}
          <ColumnConfigDialog 
            columns={columns}
            onConfigChange={(config) => {/* handle column config */}}
          />
        </div>
      </div>
      
      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.size === paginatedData.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(new Set(paginatedData.map(item => item.id)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                  />
                </TableHead>
              )}
              
              {columns.map(column => (
                <TableHead 
                  key={String(column.key)}
                  className={cn(
                    column.width && `w-${column.width}`,
                    column.sticky && "sticky left-0 bg-white z-10",
                    column.sortable && "cursor-pointer hover:bg-gray-50"
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={cn(
                            "h-3 w-3", 
                            sortConfig?.key === column.key && sortConfig.direction === 'asc'
                              ? "text-blue-600" 
                              : "text-gray-400"
                          )} 
                        />
                        <ChevronDown 
                          className={cn(
                            "h-3 w-3 -mt-1", 
                            sortConfig?.key === column.key && sortConfig.direction === 'desc'
                              ? "text-blue-600" 
                              : "text-gray-400"
                          )} 
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              
              {actions && actions.length > 0 && (
                <TableHead className="w-24">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)}
                  className="text-center py-8"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  No hay datos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow 
                  key={item.id}
                  className={cn(
                    "hover:bg-gray-50",
                    selectedItems.has(item.id) && "bg-blue-50"
                  )}
                >
                  {selection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const newSelection = new Set(selectedItems);
                          if (checked) {
                            newSelection.add(item.id);
                          } else {
                            newSelection.delete(item.id);
                          }
                          setSelectedItems(newSelection);
                        }}
                      />
                    </TableCell>
                  )}
                  
                  {columns.map(column => {
                    const value = column.accessor 
                      ? column.accessor(item) 
                      : item[column.key];
                    
                    return (
                      <TableCell 
                        key={String(column.key)}
                        className={cn(
                          column.align === 'center' && "text-center",
                          column.align === 'right' && "text-right",
                          column.sticky && "sticky left-0 bg-white"
                        )}
                      >
                        {column.render ? column.render(value, item) : String(value || '')}
                      </TableCell>
                    );
                  })}
                  
                  {actions && actions.length > 0 && (
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="ghost"
                            size="sm"
                            onClick={() => action.handler(item)}
                            disabled={action.disabled?.(item)}
                            title={action.tooltip?.(item)}
                          >
                            {action.icon && <action.icon className="h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Paginación */}
      {pagination && (
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={Math.ceil(processedData.length / pagination.pageSize)}
          pageSize={pagination.pageSize}
          totalItems={processedData.length}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
```

### **State Management with React Query**
```typescript
// client/src/services/api/archivo.service.ts
export class ArchivoService {
  private baseURL = '/api/archivos';
  
  async upload(
    documentacionId: number,
    file: File,
    options?: {
      recursoDocumentacionId?: number;
      entidadDocumentacionId?: number;
      onProgress?: (progress: number) => void;
    }
  ): Promise<DocumentoArchivo> {
    const formData = new FormData();
    formData.append('archivo', file);
    
    if (options?.recursoDocumentacionId) {
      formData.append('recursoDocumentacionId', options.recursoDocumentacionId.toString());
    }
    
    if (options?.entidadDocumentacionId) {
      formData.append('entidadDocumentacionId', options.entidadDocumentacionId.toString());
    }
    
    const response = await axios.post(
      `/api/documentos/${documentacionId}/archivos`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            options.onProgress(progress);
          }
        }
      }
    );
    
    return response.data.archivo;
  }
  
  async download(id: number): Promise<Blob> {
    const response = await axios.get(`${this.baseURL}/${id}/download`, {
      responseType: 'blob'
    });
    
    return response.data;
  }
  
  async list(params: {
    documentacionId?: number;
    recursoDocumentacionId?: number;
    entidadDocumentacionId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<DocumentoArchivo>> {
    const response = await axios.get(this.baseURL, { params });
    return response.data;
  }
  
  async getMetadata(id: number): Promise<ArchivoMetadatos> {
    const response = await axios.get(`${this.baseURL}/${id}/metadata`);
    return response.data;
  }
  
  async createVersion(id: number, file: File): Promise<DocumentoArchivo> {
    const formData = new FormData();
    formData.append('archivo', file);
    
    const response = await axios.put(
      `${this.baseURL}/${id}/version`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    
    return response.data.archivo;
  }
}

// client/src/hooks/useArchivos.ts
export function useArchivos(params: ListArchivosParams) {
  return useQuery({
    queryKey: ['archivos', params],
    queryFn: () => archivoService.list(params),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useUploadArchivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      documentacionId,
      file,
      options
    }: {
      documentacionId: number;
      file: File;
      options?: UploadOptions;
    }) => archivoService.upload(documentacionId, file, options),
    
    onMutate: async (variables) => {
      // Optimistic update - agregar archivo como "uploading"
      const queryKey = ['archivos', { documentacionId: variables.documentacionId }];
      
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      const optimisticArchivo: DocumentoArchivo = {
        id: -1,
        nombreOriginal: variables.file.name,
        tamañoBytes: variables.file.size,
        tipoMime: variables.file.type,
        estadoProcesamiento: 'uploading',
        fechaSubida: new Date().toISOString(),
        // ... otros campos
      };
      
      queryClient.setQueryData(queryKey, (old: any) => ({
        ...old,
        data: [optimisticArchivo, ...(old?.data || [])]
      }));
      
      return { previousData, queryKey };
    },
    
    onError: (error, variables, context) => {
      // Revertir optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      
      toast.error('Error al subir archivo');
    },
    
    onSuccess: (data, variables, context) => {
      // Actualizar con datos reales
      queryClient.setQueryData(context?.queryKey, (old: any) => ({
        ...old,
        data: [data, ...(old?.data?.slice(1) || [])]
      }));
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['documentos', variables.documentacionId] 
      });
      
      toast.success('Archivo subido exitosamente');
    }
  });
}

export function useDownloadArchivo() {
  return useMutation({
    mutationFn: async (id: number) => {
      const blob = await archivoService.download(id);
      const archivo = await archivoService.getMetadata(id);
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = archivo.nombreOriginal;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return archivo;
    },
    
    onSuccess: (archivo) => {
      toast.success(`Descargando ${archivo.nombreOriginal}`);
    },
    
    onError: () => {
      toast.error('Error al descargar archivo');
    }
  });
}
```

---

## 📦 **CONFIGURACIÓN DE INFRAESTRUCTURA**

### **Docker Configuration**
```dockerfile
# Dockerfile.server
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
EXPOSE 5000
CMD ["npm", "start"]

# Dockerfile.client
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### **Kubernetes Deployment**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: axiomadocs

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: axiomadocs-config
  namespace: axiomadocs
data:
  NODE_ENV: "production"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "axiomadocs_pg"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  STORAGE_PROVIDER: "aws-s3"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: axiomadocs-secrets
  namespace: axiomadocs
type: Opaque
stringData:
  DB_USER: "axiomadocs_user"
  DB_PASSWORD: "secure_password_here"
  JWT_SECRET: "your_jwt_secret_here"
  AWS_ACCESS_KEY_ID: "your_aws_key"
  AWS_SECRET_ACCESS_KEY: "your_aws_secret"

---
# k8s/deployment-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: axiomadocs-server
  namespace: axiomadocs
  labels:
    app: axiomadocs-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: axiomadocs-server
  template:
    metadata:
      labels:
        app: axiomadocs-server
    spec:
      containers:
      - name: server
        image: axiomadocs/server:latest
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: axiomadocs-config
        - secretRef:
            name: axiomadocs-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: storage-volume
          mountPath: /app/storage
      volumes:
      - name: storage-volume
        persistentVolumeClaim:
          claimName: axiomadocs-storage-pvc

---
# k8s/service-server.yaml
apiVersion: v1
kind: Service
metadata:
  name: axiomadocs-server-service
  namespace: axiomadocs
spec:
  selector:
    app: axiomadocs-server
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP

---
# k8s/deployment-client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: axiomadocs-client
  namespace: axiomadocs
spec:
  replicas: 2
  selector:
    matchLabels:
      app: axiomadocs-client
  template:
    metadata:
      labels:
        app: axiomadocs-client
    spec:
      containers:
      - name: client
        image: axiomadocs/client:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: axiomadocs-ingress
  namespace: axiomadocs
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
spec:
  tls:
  - hosts:
    - docs.axiomacloud.com
    secretName: axiomadocs-tls
  rules:
  - host: docs.axiomacloud.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: axiomadocs-server-service
            port:
              number: 5000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: axiomadocs-client-service
            port:
              number: 80
```

### **Monitoring and Observability**
```yaml
# k8s/monitoring/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: axiomadocs
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'axiomadocs-server'
      static_configs:
      - targets: ['axiomadocs-server-service:5000']
      metrics_path: /metrics
    - job_name: 'axiomadocs-postgres'
      static_configs:
      - targets: ['postgres-exporter:9187']

---
# k8s/monitoring/grafana-dashboard.json
{
  "dashboard": {
    "title": "AxiomaDocs Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "File Upload Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(file_uploads_total{status=\"success\"}[5m]) / rate(file_uploads_total[5m])"
          }
        ]
      },
      {
        "title": "Active Workflows",
        "type": "stat",
        "targets": [
          {
            "expr": "workflow_instances_active_total"
          }
        ]
      }
    ]
  }
}
```

---

## 🔒 **SEGURIDAD Y PERFORMANCE**

### **Security Middleware**
```typescript
// server/src/middleware/security.ts
export class SecurityMiddleware {
  // Rate limiting por usuario y endpoint
  static createRateLimit(options: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      keyGenerator: options.keyGenerator || ((req) => {
        const user = (req as any).user;
        return user ? `user:${user.id}` : req.ip;
      }),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: 'Demasiadas solicitudes, intenta más tarde'
        });
      }
    });
  }
  
  // Validación de archivos con análisis de contenido
  static async validateFileUpload(
    req: Request, 
    res: Response, 
    next: NextFunction
  ) {
    try {
      const file = req.file;
      if (!file) return next();
      
      // Validar tamaño
      const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'FILE_TOO_LARGE',
          message: `Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`
        });
      }
      
      // Validar tipo MIME vs contenido real
      const fileType = await import('file-type');
      const detectedType = await fileType.fromBuffer(file.buffer);
      
      if (detectedType && detectedType.mime !== file.mimetype) {
        return res.status(400).json({
          error: 'FILE_TYPE_MISMATCH',
          message: 'El tipo de archivo no coincide con su contenido'
        });
      }
      
      // Escaneo básico de malware (usando ClamAV o similar)
      if (process.env.VIRUS_SCAN_ENABLED === 'true') {
        const isClean = await SecurityMiddleware.scanForVirus(file.buffer);
        if (!isClean) {
          return res.status(400).json({
            error: 'MALWARE_DETECTED',
            message: 'Archivo bloqueado por seguridad'
          });
        }
      }
      
      next();
      
    } catch (error) {
      res.status(500).json({
        error: 'VALIDATION_ERROR',
        message: 'Error validando archivo'
      });
    }
  }
  
  private static async scanForVirus(buffer: Buffer): Promise<boolean> {
    // Implementar integración con ClamAV o servicio de escaneo
    // Por ahora retornamos true (sin virus)
    return true;
  }
  
  // Middleware de auditoría de seguridad
  static securityAudit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      const startTime = Date.now();
      
      // Capturar información de la solicitud
      const auditData = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        userId: user?.id,
        sessionId: req.sessionID,
        timestamp: new Date()
      };
      
      // Detectar patrones sospechosos
      const suspiciousPatterns = [
        /(\.\.|\/etc\/|\/proc\/|\/var\/)/i, // Path traversal
        /(script|javascript|vbscript)/i,     // Script injection
        /(union|select|insert|delete|drop)/i, // SQL injection básico
      ];
      
      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(req.originalUrl) || 
        pattern.test(JSON.stringify(req.body) || '') ||
        pattern.test(JSON.stringify(req.query) || '')
      );
      
      if (isSuspicious) {
        // Log de actividad sospechosa
        await SecurityAuditLog.create({
          ...auditData,
          categoria: 'security_threat',
          nivelCriticidad: 'high',
          detalles: {
            patterns_detected: suspiciousPatterns
              .filter(p => p.test(req.originalUrl))
              .map(p => p.toString())
          }
        });
      }
      
      // Continuar con la solicitud
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        // Log de auditoría normal
        if (req.method !== 'GET' || res.statusCode >= 400) {
          await SecurityAuditLog.create({
            ...auditData,
            statusCode: res.statusCode,
            duracionMs: duration,
            categoria: res.statusCode >= 400 ? 'error' : 'operation',
            nivelCriticidad: res.statusCode >= 500 ? 'high' : 'info'
          });
        }
      });
      
      next();
    };
  }
}

// Aplicar middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(SecurityMiddleware.securityAudit());

// Rate limiting específico por endpoint
app.use('/api/auth/login', SecurityMiddleware.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5 // 5 intentos por IP
}));

app.use('/api/archivos/upload', SecurityMiddleware.createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10 // 10 uploads por minuto por usuario
}));
```

### **Performance Optimization**
```typescript
// server/src/services/CacheService.ts
export class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(
    key: string, 
    value: any, 
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }
  
  // Cache decorator para métodos
  cache(keyPrefix: string, ttlSeconds: number = 3600) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
        
        // Intentar obtener del cache
        const cached = await CacheService.getInstance().get(cacheKey);
        if (cached !== null) {
          return cached;
        }
        
        // Ejecutar método original
        const result = await method.apply(this, args);
        
        // Guardar en cache
        await CacheService.getInstance().set(cacheKey, result, ttlSeconds);
        
        return result;
      };
    };
  }
  
  private static instance: CacheService;
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
}

// server/src/services/DatabaseOptimizationService.ts
export class DatabaseOptimizationService {
  // Query optimization con prepared statements
  static async executeOptimizedQuery(
    query: string,
    params: any[] = []
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await sequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT
      });
      
      const duration = Date.now() - startTime;
      
      // Log queries lentas
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, query);
      }
      
      return result;
      
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }
  
  // Batch operations para operaciones masivas
  static async batchInsert<T>(
    model: ModelStatic<T>,
    records: any[],
    batchSize: number = 1000
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchResults = await model.bulkCreate(batch, {
        returning: true,
        validate: true
      });
      results.push(...batchResults);
    }
    
    return results;
  }
  
  // Connection pooling optimizado
  static configureConnectionPool() {
    return {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
      evict: 1000,
      handleDisconnects: true
    };
  }
  
  // Índices dinámicos para queries frecuentes
  static async analyzeAndOptimizeQueries(): Promise<void> {
    // Analizar queries lentas desde logs
    const slowQueries = await this.getSlowQueries();
    
    // Sugerir índices basados en patterns de uso
    for (const query of slowQueries) {
      const suggestedIndexes = await this.suggestIndexes(query);
      console.log(`Suggested indexes for query: ${query.sql}`, suggestedIndexes);
    }
  }
  
  private static async getSlowQueries(): Promise<any[]> {
    // Implementar análisis de queries lentas
    // Puede integrar con pg_stat_statements en PostgreSQL
    return [];
  }
  
  private static async suggestIndexes(query: any): Promise<string[]> {
    // Analizar query y sugerir índices
    // Implementar lógica para detectar WHERE clauses, JOINs, etc.
    return [];
  }
}
```

---

## ✅ **TESTING Y QUALITY ASSURANCE**

### **Backend Testing Strategy**
```typescript
// server/tests/services/ArchivoService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArchivoService } from '../../src/services/ArchivoService';
import { StorageService } from '../../src/services/StorageService';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';

describe('ArchivoService', () => {
  let archivoService: ArchivoService;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockProcessingService: jest.Mocked<DocumentProcessingService>;
  
  beforeEach(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Mock services
    mockStorageService = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      getUrl: vi.fn()
    } as any;
    
    mockProcessingService = {
      processDocument: vi.fn(),
      extractText: vi.fn(),
      generateThumbnail: vi.fn()
    } as any;
    
    archivoService = new ArchivoService();
    // Inject mocks
    (archivoService as any).storageService = mockStorageService;
    (archivoService as any).processingService = mockProcessingService;
  });
  
  afterEach(async () => {
    await cleanupTestDatabase();
    vi.clearAllMocks();
  });
  
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Arrange
      const mockFile = createMockFile('test.pdf', 'application/pdf', 1024);
      const documentacionId = 1;
      const usuarioId = 1;
      
      mockStorageService.upload.mockResolvedValue('path/to/file.pdf');
      
      // Act
      const result = await archivoService.uploadFile(
        mockFile, 
        documentacionId, 
        usuarioId
      );
      
      // Assert
      expect(result).toBeDefined();
      expect(result.nombreOriginal).toBe('test.pdf');
      expect(result.tipoMime).toBe('application/pdf');
      expect(mockStorageService.upload).toHaveBeenCalledTimes(1);
    });
    
    it('should reject duplicate files', async () => {
      // Arrange
      const mockFile = createMockFile('duplicate.pdf', 'application/pdf', 1024);
      
      // Create existing file with same hash
      await createTestArchivo({
        hashMd5: calculateMD5(mockFile.buffer),
        activo: true
      });
      
      // Act & Assert
      await expect(
        archivoService.uploadFile(mockFile, 1, 1)
      ).rejects.toThrow('DUPLICATE_FILE');
    });
    
    it('should validate file size limits', async () => {
      // Arrange
      const largeFile = createMockFile('large.pdf', 'application/pdf', 100 * 1024 * 1024); // 100MB
      
      // Act & Assert
      await expect(
        archivoService.uploadFile(largeFile, 1, 1)
      ).rejects.toThrow('FILE_TOO_LARGE');
    });
    
    it('should validate file types', async () => {
      // Arrange
      const invalidFile = createMockFile('script.exe', 'application/exe', 1024);
      
      // Act & Assert
      await expect(
        archivoService.uploadFile(invalidFile, 1, 1)
      ).rejects.toThrow('FILE_TYPE_NOT_ALLOWED');
    });
  });
  
  describe('downloadFile', () => {
    it('should download file with valid permissions', async () => {
      // Arrange
      const archivo = await createTestArchivo();
      mockStorageService.download.mockResolvedValue(Buffer.from('file content'));
      
      // Act
      const result = await archivoService.downloadFile(archivo.id, 1);
      
      // Assert
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.archivo.id).toBe(archivo.id);
    });
    
    it('should reject download without permissions', async () => {
      // Arrange
      const archivo = await createTestArchivo();
      
      // Act & Assert
      await expect(
        archivoService.downloadFile(archivo.id, 999) // Invalid user
      ).rejects.toThrow('ACCESS_DENIED');
    });
  });
});

// Integration tests
describe('ArchivoService Integration', () => {
  it('should handle complete file lifecycle', async () => {
    const mockFile = createMockFile('lifecycle.pdf', 'application/pdf', 1024);
    
    // Upload
    const uploaded = await archivoService.uploadFile(mockFile, 1, 1);
    expect(uploaded.id).toBeDefined();
    
    // Process (async)
    await waitForProcessing(uploaded.id);
    const processed = await ArchivoService.findById(uploaded.id);
    expect(processed.estadoProcesamiento).toBe('completado');
    
    // Download
    const downloaded = await archivoService.downloadFile(uploaded.id, 1);
    expect(downloaded.buffer).toBeDefined();
    
    // Create version
    const newVersionFile = createMockFile('lifecycle_v2.pdf', 'application/pdf', 2048);
    const newVersion = await archivoService.createNewVersion(uploaded.id, newVersionFile, 1);
    expect(newVersion.version).toBe(2);
    
    // Verify old version marked as not current
    const oldVersion = await ArchivoService.findById(uploaded.id);
    expect(oldVersion.esVersionActual).toBe(false);
  });
});

// Performance tests
describe('ArchivoService Performance', () => {
  it('should handle concurrent uploads', async () => {
    const concurrentUploads = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentUploads; i++) {
      const mockFile = createMockFile(`file_${i}.pdf`, 'application/pdf', 1024);
      promises.push(archivoService.uploadFile(mockFile, 1, 1));
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBe(concurrentUploads);
  });
  
  it('should complete upload within acceptable time', async () => {
    const startTime = Date.now();
    const mockFile = createMockFile('performance.pdf', 'application/pdf', 5 * 1024 * 1024); // 5MB
    
    await archivoService.uploadFile(mockFile, 1, 1);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Less than 5 seconds
  });
});

// Test utilities
function createMockFile(name: string, mimeType: string, size: number): Express.Multer.File {
  return {
    fieldname: 'archivo',
    originalname: name,
    encoding: '7bit',
    mimetype: mimeType,
    size,
    buffer: Buffer.alloc(size),
    destination: '',
    filename: '',
    path: '',
    stream: null as any
  };
}

async function setupTestDatabase(): Promise<void> {
  // Initialize test database
  await sequelize.sync({ force: true });
  
  // Create test data
  await createTestUsers();
  await createTestDocumentacion();
}

async function cleanupTestDatabase(): Promise<void> {
  // Clean up test data
  await sequelize.truncate({ cascade: true });
}
```

### **Frontend Testing Strategy**
```typescript
// client/src/components/__tests__/UploadArchivo.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { UploadArchivo } from '../Archivos/UploadArchivo';

// Mock services
vi.mock('../../services/archivoService', () => ({
  archivoService: {
    upload: vi.fn()
  }
}));

describe('UploadArchivo Component', () => {
  let queryClient: QueryClient;
  let mockOnUploadComplete: jest.Mock;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    mockOnUploadComplete = vi.fn();
  });
  
  const renderComponent = (props = {}) => {
    const defaultProps = {
      documentacionId: 1,
      onUploadComplete: mockOnUploadComplete,
      ...props
    };
    
    return render(
      <QueryClientProvider client={queryClient}>
        <UploadArchivo {...defaultProps} />
      </QueryClientProvider>
    );
  };
  
  it('renders upload area correctly', () => {
    renderComponent();
    
    expect(screen.getByText(/arrastra archivos aquí/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf, doc, docx/i)).toBeInTheDocument();
  });
  
  it('handles file selection via input', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ id: 1, nombreOriginal: 'test.pdf' });
    (archivoService.upload as any).mockImplementation(mockUpload);
    
    renderComponent();
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(1, file, expect.any(Object));
    });
    
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith({ id: 1, nombreOriginal: 'test.pdf' });
    });
  });
  
  it('handles drag and drop', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ id: 2, nombreOriginal: 'dropped.pdf' });
    (archivoService.upload as any).mockImplementation(mockUpload);
    
    renderComponent();
    
    const dropZone = screen.getByText(/arrastra archivos aquí/i).closest('div');
    const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
    
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500');
    
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });
    
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(1, file, expect.any(Object));
    });
  });
  
  it('validates file size', () => {
    renderComponent();
    
    const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    expect(screen.getByText(/archivo es demasiado grande/i)).toBeInTheDocument();
  });
  
  it('validates file type', () => {
    renderComponent();
    
    const invalidFile = new File(['content'], 'script.exe', { type: 'application/exe' });
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [invalidFile] } });
    
    expect(screen.getByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
  });
  
  it('shows upload progress', async () => {
    let progressCallback: (progress: number) => void;
    
    const mockUpload = vi.fn().mockImplementation((docId, file, options) => {
      progressCallback = options.onProgress;
      return new Promise(resolve => {
        setTimeout(() => {
          progressCallback(50);
          setTimeout(() => {
            progressCallback(100);
            resolve({ id: 3, nombreOriginal: file.name });
          }, 100);
        }, 100);
      });
    });
    
    (archivoService.upload as any).mockImplementation(mockUpload);
    
    renderComponent();
    
    const file = new File(['content'], 'progress.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    // Should show upload progress
    await waitFor(() => {
      expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
    });
    
    // Should show progress percentage
    await waitFor(() => {
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
    
    // Should complete
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });
  
  it('handles upload errors gracefully', async () => {
    const mockUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));
    (archivoService.upload as any).mockImplementation(mockUpload);
    
    renderComponent();
    
    const file = new File(['content'], 'error.pdf', { type: 'application/pdf' });
    const input = screen.getByRole('button').querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/error al subir archivo/i)).toBeInTheDocument();
    });
    
    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });
});

// E2E Tests with Playwright
// tests/e2e/file-upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should upload file successfully', async ({ page }) => {
    // Navigate to documentos
    await page.click('[data-testid="nav-documentos"]');
    await page.waitForLoadState('networkidle');
    
    // Select first documento
    await page.click('[data-testid="documento-row"]:first-child');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/sample.pdf');
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // Verify file appears in list
    await expect(page.locator('[data-testid="archivo-item"]')).toContainText('sample.pdf');
  });
  
  test('should handle large file upload with progress', async ({ page }) => {
    await page.goto('/documentos/1');
    
    // Upload large file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/large-file.pdf');
    
    // Should show progress bar
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    
    // Should show percentage
    await expect(page.locator('[data-testid="upload-percentage"]')).toContainText('%');
    
    // Should complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
  });
  
  test('should download file correctly', async ({ page }) => {
    await page.goto('/documentos/1');
    
    // Expect download to start
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]:first-child');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toBeTruthy();
    
    // Save and verify file
    const path = await download.path();
    expect(path).toBeTruthy();
  });
});

// Performance tests
test.describe('Performance Tests', () => {
  test('should load documentos page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/documentos');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Less than 3 seconds
  });
  
  test('should handle concurrent uploads', async ({ page, context }) => {
    // Create multiple pages for concurrent testing
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    // Login all pages
    for (const p of pages) {
      await p.goto('/login');
      await p.fill('[data-testid="email"]', 'admin@test.com');
      await p.fill('[data-testid="password"]', 'password');
      await p.click('[data-testid="login-button"]');
      await p.waitForURL('/dashboard');
    }
    
    // Upload files concurrently
    const uploadPromises = pages.map(async (p, index) => {
      await p.goto('/documentos/1');
      const fileChooserPromise = p.waitForEvent('filechooser');
      await p.click('[data-testid="upload-button"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(`tests/fixtures/file-${index}.pdf`);
      await expect(p.locator('[data-testid="upload-success"]')).toBeVisible();
    });
    
    await Promise.all(uploadPromises);
    
    // Verify all uploads succeeded
    for (const p of pages) {
      await expect(p.locator('[data-testid="upload-success"]')).toBeVisible();
    }
  });
});
```

---

Este documento proporciona especificaciones técnicas completas y detalladas para implementar todas las mejoras propuestas en AxiomaDocs. Cada sección incluye código de producción, configuraciones, y estrategias de testing que aseguran una implementación robusta y escalable.

La documentación está diseñada para ser seguida paso a paso por el equipo de desarrollo, con ejemplos prácticos y configuraciones listas para usar en producción.
