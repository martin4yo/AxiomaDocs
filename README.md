# Axioma Docs - Sistema de Gestión de Documentación

Sistema completo para la gestión de documentación por recursos, desarrollado con TypeScript, React, Node.js y SQLite.

## Características

- **Gestión de Estados**: Configuración de estados para documentos (En Trámite, Vigente, Vencido, Por Vencer)
- **Gestión de Recursos**: ABM completo con información personal y grilla de documentos asignados
- **Gestión de Documentación**: ABM completo con configuración de vigencia y grilla de recursos asignados
- **Gestión de Entidades**: ABM completo con dobles grillas (documentación y recursos asignados)
- **Asociaciones Flexibles**: Sistema de doble entrada completo entre todos los módulos
- **Cálculo Automático**: Fechas de vencimiento calculadas en tiempo real (fechaEmision + diasVigencia)
- **Validaciones**: Prevención de duplicados y validación de recursos activos
- **Notificaciones**: Sistema de alertas para documentos próximos a vencer
- **Reportes**: Exportación a Excel/PDF y reportes personalizados
- **Autenticación**: Sistema de login con seguimiento de usuarios
- **Responsive**: Diseño adaptado para móvil y escritorio

## Tecnologías

### Backend
- Node.js con TypeScript
- Express.js
- Sequelize ORM
- SQLite (base de datos)
- JWT (autenticación)
- bcryptjs (encriptación)

### Frontend
- React 18 con TypeScript
- Tailwind CSS
- React Router DOM
- React Query (gestión de estado)
- React Hook Form
- Axios
- Lucide React (iconos)

## Instalación

### Prerrequisitos
- Node.js 16 o superior
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd AxiomaDocs
```

### 2. Instalar dependencias
```bash
# Instalar dependencias raíz
npm install

# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente
cd ../client
npm install
```

### 3. Configurar variables de entorno
```bash
# En el directorio server, el archivo .env ya está configurado con valores por defecto
# Opcional: modificar server/.env según necesidades
```

### 4. Inicializar la base de datos
```bash
# La base de datos se crea automáticamente al iniciar el servidor
# Los estados iniciales se crean automáticamente
```

### 5. Crear usuario administrador (opcional)
```bash
# Al registrar el primer usuario se convierte en administrador
```

## Ejecución

### Desarrollo
```bash
# Desde la raíz del proyecto (ejecuta cliente y servidor simultáneamente)
npm run dev
```

### O ejecutar por separado:

**Servidor (Puerto 5000):**
```bash
cd server
npm run dev
```

**Cliente (Puerto 3000):**
```bash
cd client
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## Estructura del Proyecto

```
AxiomaDocs/
├── server/                 # API Backend
│   ├── src/
│   │   ├── controllers/    # Controladores
│   │   ├── models/        # Modelos Sequelize
│   │   ├── routes/        # Rutas API
│   │   ├── middleware/    # Middlewares
│   │   ├── services/      # Lógica de negocio
│   │   └── index.ts       # Punto de entrada
│   ├── package.json
│   └── .env
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   ├── services/      # Servicios API
│   │   ├── types/         # Tipos TypeScript
│   │   ├── contexts/      # Contextos React
│   │   └── utils/         # Utilidades
│   ├── package.json
│   └── index.html
└── package.json           # Scripts principales
```

## Uso

### 1. Acceso al Sistema
- Abrir navegador en `http://localhost:3000`
- Registrar primer usuario o hacer login

### 2. Configuración Inicial
1. **Estados**: Ya incluye estados por defecto (En Trámite, Vigente, Vencido, Por Vencer)
2. **Documentos**: Crear tipos de documentos con días de vigencia
3. **Recursos**: Registrar personas/recursos
4. **Entidades**: Configurar organizaciones

### 3. Gestión de Documentos
1. **Desde Recursos**: Asignar documentos a recursos con fechas de emisión y tramitación
2. **Desde Documentación**: Asignar recursos a documentos con las mismas fechas
3. **Desde Entidades**: Asignar documentación (con opciones de inhabilitante y envío por mail)
4. **Cálculo automático**: La fecha de vencimiento se muestra en tiempo real en los formularios
5. **Validaciones**: Previene duplicados y asignaciones a recursos inactivos

### 4. Gestión de Entidades
1. **CRUD completo**: Crear, editar, eliminar entidades con datos completos (CUIT, razón social, etc.)
2. **Grilla de Documentación**: Expandible con información de documentos asignados, inhabilitantes y configuración de mail
3. **Grilla de Recursos**: Expandible con recursos asignados, fechas de inicio/fin y estados
4. **Doble asignación**: Tanto documentación como recursos pueden asignarse desde las entidades

### 5. Campos de Fechas (Cambios Recientes)
- **Fecha de Emisión**: Cuando se emitió el documento (reemplaza fecha de vigencia)
- **Fecha de Tramitación**: Cuando se inició el trámite
- **Fecha de Vencimiento**: Calculada automáticamente (Emisión + días de vigencia del documento)

### 6. Reportes
- Documentos por estado agrupados por recurso
- Recursos por entidad con estado de documentación

## Gestión de Base de Datos

### Preservar Datos al Reiniciar
Por defecto, la aplicación ya NO resetea la base de datos al reiniciar el servidor. Los datos se mantienen entre reinicios.

### Variables de Entorno (server/.env)
```bash
# Forzar recreación completa de la BD (¡CUIDADO! Elimina todos los datos)
DB_FORCE_RESET=true

# Permitir alteraciones automáticas del esquema (true por defecto)
DB_ALLOW_ALTER=false
```

### Scripts de Base de Datos
```bash
# Desde la carpeta server/
npm run reset-db-safe    # Reset seguro con backup y confirmación
npm run reset-db         # Reset directo (para desarrollo)
```

### Comportamiento del Sistema
- **Inicio normal**: Solo crea tablas nuevas, no modifica las existentes
- **Con DB_ALLOW_ALTER=true**: Intenta modificar esquema automáticamente
- **Con DB_FORCE_RESET=true**: ⚠️ Elimina todo y recrea la base de datos
- **Archivos**: Base de datos en `server/database.sqlite`
- Exportación a Excel/PDF

## Estados por Defecto

El sistema incluye estos estados predefinidos:

- **En Trámite** (Naranja): Documento en proceso
- **Vigente** (Verde): Documento válido
- **Vencido** (Rojo): Documento vencido
- **Por Vencer** (Amarillo): Documento próximo a vencer

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/profile` - Perfil usuario

### Estados
- `GET /api/estados` - Listar estados
- `POST /api/estados` - Crear estado
- `PUT /api/estados/:id` - Actualizar estado
- `DELETE /api/estados/:id` - Eliminar estado

### Recursos
- `GET /api/recursos` - Listar recursos (con paginación y documentos)
- `POST /api/recursos` - Crear recurso
- `GET /api/recursos/:id` - Obtener recurso con documentos asignados
- `PUT /api/recursos/:id` - Actualizar recurso
- `DELETE /api/recursos/:id` - Eliminar recurso
- `POST /api/recursos/:id/documentos` - Asignar documento a recurso
- `PUT /api/recursos/documentos/:recursoDocId` - Actualizar documento asignado
- `DELETE /api/recursos/documentos/:recursoDocId` - Remover documento de recurso

### Documentación
- `GET /api/documentacion` - Listar documentos (con recursos asignados)
- `POST /api/documentacion` - Crear documento
- `GET /api/documentacion/:id` - Obtener documento con recursos
- `PUT /api/documentacion/:id` - Actualizar documento
- `DELETE /api/documentacion/:id` - Eliminar documento
- `POST /api/documentacion/:id/recursos` - Asignar recurso a documento

### Entidades
- `GET /api/entidades` - Listar entidades (con doc y recursos)
- `POST /api/entidades` - Crear entidad
- `GET /api/entidades/:id` - Obtener entidad completa
- `PUT /api/entidades/:id` - Actualizar entidad  
- `DELETE /api/entidades/:id` - Eliminar entidad
- `POST /api/entidades/:id/documentacion` - Asignar documentación
- `PUT /api/entidades/documentacion/:entidadDocId` - Actualizar asignación
- `DELETE /api/entidades/documentacion/:entidadDocId` - Remover documentación
- `POST /api/entidades/:id/recursos` - Asignar recurso
- `PUT /api/entidades/recursos/:entidadRecursoId` - Actualizar asignación
- `DELETE /api/entidades/recursos/:entidadRecursoId` - Remover recurso

## Características Técnicas

### Seguridad
- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Middleware de autenticación en todas las rutas protegidas
- Validación de datos en frontend y backend

### Base de Datos
- SQLite para facilidad de instalación
- Migraciones automáticas con Sequelize
- Índices optimizados para consultas frecuentes

### Frontend
- Diseño responsive con Tailwind CSS
- Componentes reutilizables
- Gestión de estado con React Query
- Formularios validados con React Hook Form
- Notificaciones con React Hot Toast

## Estado del Desarrollo

### ✅ Completado
- [x] Sistema completo de Estados
- [x] ABM completo de Recursos con grilla de documentos
- [x] ABM completo de Documentación con grilla de recursos  
- [x] ABM completo de Entidades con dobles grillas
- [x] Sistema de doble entrada (recursos ↔ documentos, entidades ↔ ambos)
- [x] Cálculo automático de fechas de vencimiento
- [x] Validaciones y prevención de duplicados
- [x] Autenticación completa con JWT
- [x] Base de datos persistente (no se resetea al reiniciar)
- [x] UI responsive con Tailwind CSS

### 🚧 Próximas Características
- [ ] Notificaciones automáticas por email
- [ ] Dashboard con gráficos estadísticos
- [ ] Importación masiva desde Excel
- [ ] Historial de cambios
- [ ] Roles y permisos avanzados
- [ ] Reportes avanzados con filtros

## Soporte

Para reportar problemas o solicitar características, crear un issue en el repositorio del proyecto.

## Licencia

MIT License