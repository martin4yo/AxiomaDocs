-- Script para crear la base de datos MySQL para AxiomaDocs
-- Ejecutar este script en MySQL Workbench o línea de comandos mysql

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS axiomadocs 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Seleccionar la base de datos
USE axiomadocs;

-- Crear usuario específico para la aplicación (opcional)
-- Descomenta las siguientes líneas si quieres crear un usuario específico
-- CREATE USER IF NOT EXISTS 'axioma_user'@'localhost' IDENTIFIED BY 'axioma_password';
-- GRANT ALL PRIVILEGES ON axiomadocs.* TO 'axioma_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Mostrar información de la base de datos creada
SELECT 
    SCHEMA_NAME as 'Base de datos',
    DEFAULT_CHARACTER_SET_NAME as 'Charset',
    DEFAULT_COLLATION_NAME as 'Collation'
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'axiomadocs';