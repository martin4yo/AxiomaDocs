-- Migración manual para sistema de actualización de estados
-- Ejecutar solo si es necesario

-- 1. Agregar campo codigo a tabla estados
ALTER TABLE estados
ADD COLUMN codigo VARCHAR(20) NULL UNIQUE
COMMENT 'Código único del estado para identificación del sistema (VIGENTE, POR_VENCER, VENCIDO, etc)';

-- 2. Actualizar códigos de estados existentes
UPDATE estados SET codigo = 'EN_TRAMITE' WHERE nombre = 'En Trámite';
UPDATE estados SET codigo = 'VIGENTE' WHERE nombre = 'Vigente';
UPDATE estados SET codigo = 'VENCIDO' WHERE nombre = 'Vencido';
UPDATE estados SET codigo = 'POR_VENCER' WHERE nombre = 'Por Vencer';

-- 3. Crear tabla de logs de auditoría
CREATE TABLE estado_documento_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipoDocumento ENUM('recurso', 'entidad') NOT NULL,
  documentacionId INT NOT NULL,
  recursoId INT NULL,
  entidadId INT NULL,
  estadoAnteriorId INT NULL,
  estadoNuevoId INT NOT NULL,
  razon VARCHAR(255) NOT NULL,
  fechaActualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuarioId INT NULL,
  tipoActualizacion ENUM('manual', 'automatica') NOT NULL DEFAULT 'automatica',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (documentacionId) REFERENCES documentacion(id),
  FOREIGN KEY (recursoId) REFERENCES recursos(id),
  FOREIGN KEY (entidadId) REFERENCES entidades(id),
  FOREIGN KEY (estadoAnteriorId) REFERENCES estados(id),
  FOREIGN KEY (estadoNuevoId) REFERENCES estados(id),
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id),

  INDEX idx_tipo_documento (tipoDocumento),
  INDEX idx_fecha_actualizacion (fechaActualizacion),
  INDEX idx_tipo_actualizacion (tipoActualizacion)
) COMMENT = 'Log de auditoría para cambios de estado de documentos';

-- 4. Verificar migración
SELECT 'Estados con códigos:' as verificacion, COUNT(*) as cantidad
FROM estados WHERE codigo IS NOT NULL;

SELECT 'Tabla logs creada:' as verificacion, COUNT(*) as registros
FROM estado_documento_logs;