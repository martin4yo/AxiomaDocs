-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "es_admin" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "dias_vigencia" INTEGER NOT NULL DEFAULT 365,
    "dias_anticipacion" INTEGER NOT NULL DEFAULT 30,
    "es_universal" BOOLEAN NOT NULL DEFAULT false,
    "fecha_emision" DATE,
    "fecha_tramitacion" DATE,
    "fecha_vencimiento" DATE,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recursos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(20),
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "direccion" VARCHAR(255),
    "fecha_nacimiento" DATE,
    "fecha_ingreso" DATE,
    "fecha_baja" DATE,
    "observaciones" TEXT,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entidades" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "url" VARCHAR(500),
    "contacto" VARCHAR(255),
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "direccion" VARCHAR(255),
    "fecha_ingreso" DATE,
    "observaciones" TEXT,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso_documentacion" (
    "id" SERIAL NOT NULL,
    "recurso_id" INTEGER NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "fecha_emision" DATE,
    "fecha_tramitacion" DATE,
    "fecha_vencimiento" DATE,
    "observaciones" TEXT,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurso_documentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entidad_documentacion" (
    "id" SERIAL NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "es_inhabilitante" BOOLEAN NOT NULL DEFAULT false,
    "notificar_email" BOOLEAN NOT NULL DEFAULT false,
    "fecha_emision" DATE,
    "fecha_tramitacion" DATE,
    "fecha_vencimiento" DATE,
    "observaciones" TEXT,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entidad_documentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entidad_recurso" (
    "id" SERIAL NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "recurso_id" INTEGER NOT NULL,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entidad_recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intercambios" (
    "id" SERIAL NOT NULL,
    "entidad_origen_id" INTEGER NOT NULL,
    "entidad_destino_id" INTEGER NOT NULL,
    "fecha_intercambio" DATE NOT NULL,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intercambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_envios" (
    "id" SERIAL NOT NULL,
    "recurso_id" INTEGER NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "fecha_envio" DATE NOT NULL,
    "fecha_recepcion" DATE,
    "observaciones" TEXT,
    "estado_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_eventos" (
    "id" SERIAL NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "tipo_evento" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "fecha_evento" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_archivos" (
    "id" SERIAL NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "tamano" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_documento_logs" (
    "id" SERIAL NOT NULL,
    "documentacion_id" INTEGER NOT NULL,
    "estado_anterior" INTEGER,
    "estado_nuevo" INTEGER NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estado_documento_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estados_nombre_key" ON "estados"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "recursos_dni_key" ON "recursos"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "recurso_documentacion_recurso_id_documentacion_id_key" ON "recurso_documentacion"("recurso_id", "documentacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "entidad_documentacion_entidad_id_documentacion_id_key" ON "entidad_documentacion"("entidad_id", "documentacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "entidad_recurso_entidad_id_recurso_id_key" ON "entidad_recurso"("entidad_id", "recurso_id");

-- AddForeignKey
ALTER TABLE "estados" ADD CONSTRAINT "estados_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estados" ADD CONSTRAINT "estados_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentacion" ADD CONSTRAINT "documentacion_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentacion" ADD CONSTRAINT "documentacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentacion" ADD CONSTRAINT "documentacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recursos" ADD CONSTRAINT "recursos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidades" ADD CONSTRAINT "entidades_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidades" ADD CONSTRAINT "entidades_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidades" ADD CONSTRAINT "entidades_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_documentacion" ADD CONSTRAINT "recurso_documentacion_recurso_id_fkey" FOREIGN KEY ("recurso_id") REFERENCES "recursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_documentacion" ADD CONSTRAINT "recurso_documentacion_documentacion_id_fkey" FOREIGN KEY ("documentacion_id") REFERENCES "documentacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_documentacion" ADD CONSTRAINT "recurso_documentacion_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_documentacion" ADD CONSTRAINT "recurso_documentacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_documentacion" ADD CONSTRAINT "recurso_documentacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_documentacion" ADD CONSTRAINT "entidad_documentacion_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_documentacion" ADD CONSTRAINT "entidad_documentacion_documentacion_id_fkey" FOREIGN KEY ("documentacion_id") REFERENCES "documentacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_documentacion" ADD CONSTRAINT "entidad_documentacion_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_documentacion" ADD CONSTRAINT "entidad_documentacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_documentacion" ADD CONSTRAINT "entidad_documentacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_recurso" ADD CONSTRAINT "entidad_recurso_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_recurso" ADD CONSTRAINT "entidad_recurso_recurso_id_fkey" FOREIGN KEY ("recurso_id") REFERENCES "recursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_recurso" ADD CONSTRAINT "entidad_recurso_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidad_recurso" ADD CONSTRAINT "entidad_recurso_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intercambios" ADD CONSTRAINT "intercambios_entidad_origen_id_fkey" FOREIGN KEY ("entidad_origen_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intercambios" ADD CONSTRAINT "intercambios_entidad_destino_id_fkey" FOREIGN KEY ("entidad_destino_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intercambios" ADD CONSTRAINT "intercambios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intercambios" ADD CONSTRAINT "intercambios_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_recurso_id_fkey" FOREIGN KEY ("recurso_id") REFERENCES "recursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_documentacion_id_fkey" FOREIGN KEY ("documentacion_id") REFERENCES "documentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_envios" ADD CONSTRAINT "documento_envios_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_eventos" ADD CONSTRAINT "documento_eventos_documentacion_id_fkey" FOREIGN KEY ("documentacion_id") REFERENCES "documentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_eventos" ADD CONSTRAINT "documento_eventos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_eventos" ADD CONSTRAINT "documento_eventos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_archivos" ADD CONSTRAINT "documento_archivos_documentacion_id_fkey" FOREIGN KEY ("documentacion_id") REFERENCES "documentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_archivos" ADD CONSTRAINT "documento_archivos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_archivos" ADD CONSTRAINT "documento_archivos_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_documento_logs" ADD CONSTRAINT "estado_documento_logs_estado_anterior_fkey" FOREIGN KEY ("estado_anterior") REFERENCES "estados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_documento_logs" ADD CONSTRAINT "estado_documento_logs_estado_nuevo_fkey" FOREIGN KEY ("estado_nuevo") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_documento_logs" ADD CONSTRAINT "estado_documento_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estado_documento_logs" ADD CONSTRAINT "estado_documento_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
