# Axioma Docs - Development Memory

## Project Overview
Sistema completo de gestión de documentación por recursos desarrollado con TypeScript, React, Node.js y MySQL. El sistema permite gestionar recursos (personas), documentos, entidades y sus asociaciones con cálculo automático de fechas de vencimiento.

## Current Progress Status

### ✅ COMPLETED TASKS
1. **Project Structure**: Complete setup with TypeScript, Node.js API, and Tailwind CSS
2. **Database Schema**: All models created (Estados, Recursos, Documentacion, Entidades, associations)
3. **Authentication System**: JWT-based auth with user tracking implemented
4. **API Endpoints**: Complete CRUD operations for all entities
5. **Estados Management**: Full frontend component with CRUD operations
6. **Installation Scripts**: Automated setup scripts created
7. **Document Date Management System**: Complete universal vs specific document dates functionality
8. **EntidadDocumentacion Enhanced**: Added fecha fields with automatic calculation
9. **Document Helpers**: Backend and frontend utilities for document type detection
10. **Sistema de Niveles Estados**: Campo nivel (1-10) implementado completamente con ABM funcional
11. **Dashboard con Datos Reales**: Dashboard implementado con estadísticas en tiempo real y auto-refresh
12. **Grillas Mejoradas**: Recursos, Entidades y Documentacion con columnas de estados críticos y vencimientos
13. **Estado Helper Utilities**: Funciones para calcular estados de mayor nivel y próximos vencimientos

### ✅ RECENTLY COMPLETED (Latest Session)
1. **Excel/PDF Export System** ✅ - Complete export functionality in all grids (Estados, Recursos, Documentación, Entidades, Usuarios)
2. **Advanced Reports System** ✅ - 3 comprehensive reports with filters and statistics
3. **Dashboard API Security** ✅ - JWT authentication implemented on all dashboard endpoints
4. **MySQL Migration** ✅ - Complete migration from SQLite to MySQL with proper configuration
5. **Usuario Management System** ✅ - Complete user management ABM with security features

### 🔄 FUTURE ENHANCEMENTS
1. **Advanced pagination and filtering** - Enhanced search capabilities for all grids
2. **Mobile optimization** - Enhanced responsive design
3. **Email Notifications** - Sistema de notificaciones por vencimientos
4. **Advanced Dashboard Features** - Gráficos interactivos, alertas automáticas

## Key Technical Details

### Database Models & Relationships
- **Usuario**: Authentication and audit trail
- **Estado**: Status management (En Trámite, Vigente, Vencido, Por Vencer)
- **Recurso**: People/resources management with personal data
- **Documentacion**: Document types with validity period configuration + Universal dates (fechaEmision, fechaTramitacion, fechaVencimiento)
- **Entidad**: Organizations/entities management
- **RecursoDocumentacion**: Many-to-many with dates (tramitación, vigencia, vencimiento)
- **EntidadDocumentacion**: Entity required documents with email settings + Specific dates (fechaEmision, fechaTramitacion, fechaVencimiento)
- **EntidadRecurso**: Entity-resource assignments with date ranges

### Key Features Implemented
- **Auto Date Calculation**: fechaVencimiento = fechaEmision + diasVigencia (updated logic)
- **Universal vs Specific Documents**: Documents can be universal (cross all entities/resources) or specific per assignment
- **Document Date Logic**: Universal dates are read-only in assignments, specific dates are editable
- **User Tracking**: All modifications tracked by user ID
- **Status Management**: Color-coded status indicators
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **API Security**: JWT authentication on all protected routes

### File Structure
```
AxiomaDocs/
├── server/src/
│   ├── controllers/ - All CRUD controllers with universal document logic
│   ├── models/ - Complete Sequelize models with associations + hooks
│   ├── routes/ - API routes for all entities
│   ├── middleware/ - Auth middleware
│   ├── utils/ - Document helpers (isDocumentoUniversal, getFechasForAsignacion)
│   └── index.ts - Main server file
├── client/src/
│   ├── components/ - Layout, Estados, Common components
│   ├── pages/ - Estados (complete), Dashboard, placeholders for others
│   ├── services/ - API services and auth
│   ├── types/ - Complete TypeScript interfaces (updated with fecha fields)
│   ├── utils/ - Document helpers (isDocumentoUniversal, getFechasForDisplay)
│   └── contexts/ - Authentication context
└── Installation scripts and documentation
```

## Development Commands
- `npm run dev` - Start both client and server in development
- `npm run build` - Build for production
- Server runs on port 5000, Client on port 3000

## Business Logic Requirements
- **Recursos dados de baja** cannot have documents assigned
- **Fecha vencimiento** calculated automatically: fechaEmision + document.diasVigencia (updated)
- **Estados iniciales**: En Trámite, Vigente, Vencido, Por Vencer (auto-created)
- **Double entry**: Manage docs from resources OR resources from docs
- **Entidades**: Can specify if documents are "inhabilitantes" and email settings
- **Notifications**: System should alert before expiration (diasAnticipacion)
- **Universal Documents**: Documents with complete dates (emisión, tramitación, vencimiento) are read-only in assignments
- **Specific Documents**: Documents without dates allow date editing per resource/entity assignment

## Current Working Features
1. **Login/Authentication** - Fully functional with registration
2. **Estados Management** - Complete CRUD with color picker + NIVEL field (1-10) ✅ UPDATED
3. **Recursos Management** - Complete CRUD + Estado Crítico + Próximos Vencimientos ✅ UPDATED
4. **Documentación Management** - Complete CRUD + Universal indicator + Fecha Vencimiento ✅ UPDATED
5. **Entidades Management** - Complete CRUD + Estado Crítico + Recursos count ✅ UPDATED
6. **Dashboard Funcional** - Estadísticas reales, documentos por vencer, auto-refresh ✅ NEW
7. **Universal Document System** - Documents can be universal or specific with automatic date handling
8. **Date Management Logic** - Automatic calculation and validation of document expiration dates
9. **Enhanced EntidadDocumentacion** - Added date fields with universal/specific logic
10. **Document Assignment Validation** - Automatic detection of universal vs editable date fields
11. **Database Operations** - All API endpoints working including dashboard stats ✅ UPDATED
12. **Estado Helper System** - Cálculo automático de estados críticos en grillas ✅ NEW
13. **Real-time Monitoring** - Dashboard con datos actualizados cada 30 segundos ✅ NEW
14. **Responsive Layout** - Mobile and desktop navigation
11. **Logo and Branding** - Professional document management logo
12. **User Registration** - First user becomes admin automatically

## Database Issue Fix
If you encounter FOREIGN KEY constraint errors, run:
- Windows: `fix-database.bat`  
- Linux/Mac: `./fix-database.sh`
- Manual: `cd server && npm run reset-db && cd .. && npm run dev`

## Next Session Priority
1. **Complete Recursos management page** with document assignment grid
2. **Implement pagination and search** in all grids
3. **Add date picker components** for document management
4. **Build Documentacion management** interface

## Important Notes
- MySQL database with axiomadocs schema
- Estados are pre-populated with default values and nivel field (1-10)
- All forms use React Hook Form with validation
- API uses Sequelize with automatic foreign key constraints
- Frontend uses React Query for state management and caching
- Complete export system (Excel/PDF) implemented in all grids
- Advanced reports system with 3 report types and filtering
- JWT authentication secured on all API endpoints

## Environment Setup - MySQL Configuration
- **Database**: MySQL 8.0+ with axiomadocs database
- **Configuration**: Update server/.env with MySQL credentials
- **Setup Script**: Use MYSQL-SETUP.md for complete configuration guide
- **Test Connection**: Run `npm run test-mysql` to verify setup
- **Dependencies**: mysql2 driver installed and configured
- **Charset**: UTF8MB4 with unicode collation for full charset support

This is a comprehensive foundation ready for the next development phase. The Estados management is fully functional and serves as a template for the remaining components.

## Development Memories
- Solo abm de estados
- Estados, Recursos y Documentacion Creados
- Sistema de documentos universales vs específicos implementado completo
- EntidadDocumentacion mejorado con campos de fechas y validación automática
- Controllers actualizados con lógica de documentos universales
- Helpers implementados tanto en backend como frontend para gestión de fechas
- Validación automática: documentos universales bloquean edición de fechas en asignaciones

## Latest Implementation Details (Document Date Management System)

### Backend Changes:
- **Models**: Added fecha fields to `EntidadDocumentacion` (fechaEmision, fechaTramitacion, fechaVencimiento)
- **Controllers**: Enhanced `recursoController` and `entidadController` with universal document validation
- **Utils**: Created `documentHelpers.ts` with `isDocumentoUniversal()` and `getFechasForAsignacion()`
- **Hooks**: Added automatic date calculation in `EntidadDocumentacion` model

### Frontend Changes:
- **Types**: Updated interfaces with new fecha fields
- **Utils**: Created client-side `documentHelpers.ts` for display logic
- **Logic**: Implemented universal vs specific document detection for UI controls

### Business Rules:
1. **Universal Document**: Document with all dates filled → Read-only dates in assignments
2. **Specific Document**: Document without dates → Editable dates per assignment  
3. **Priority**: Universal dates override specific dates
4. **Calculation**: fechaVencimiento = fechaEmision + diasVigencia (automatic)
5. **UI**: Universal documents show blocked date fields, specific documents allow editing

## 🚀 LATEST MAJOR UPDATES (Current Session)

### ✅ Export System Implementation
- **Libraries**: xlsx, jspdf, jspdf-autotable installed
- **Utility**: `/client/src/utils/exportUtils.ts` with date formatting and data preparation
- **Component**: `/client/src/components/common/ExportButtons.tsx` reusable component
- **Integration**: All grids (Estados, Recursos, Documentación, Entidades) now have export functionality
- **Features**: Excel with column formatting, PDF with professional layout, automatic filename with dates

### ✅ Advanced Reports System
- **Backend**: `/server/src/controllers/reportesController.ts` with 3 comprehensive reports
- **Routes**: `/server/src/routes/reportes.ts` with JWT authentication
- **Frontend**: `/client/src/pages/Reportes.tsx` with interactive filters and statistics
- **Types**: Complete TypeScript interfaces in `/client/src/services/reportes.ts`
- **Reports Implemented**:
  1. **Documentación por Estado**: Resources grouped by document status with filters
  2. **Recursos por Entidad**: Entity-based resource overview with documentation statistics
  3. **Documentos Próximos a Vencer**: Upcoming expiration alerts with priority levels

### ✅ MySQL Migration Complete
- **Database Configuration**: Updated to use MySQL with proper charset (UTF8MB4)
- **Connection**: `/server/src/models/database.ts` configured for MySQL
- **Dependencies**: mysql2 driver installed
- **Scripts**: Test connection script and SQL database creation script
- **Documentation**: Complete MYSQL-SETUP.md guide created
- **Environment**: .env updated with MySQL configuration variables

### ✅ Security Enhancements
- **Dashboard APIs**: All endpoints now require JWT authentication
- **Reports APIs**: Protected with authenticateToken middleware
- **Consistent Auth**: Fixed middleware naming inconsistencies

### ✅ Bug Fixes
- **Sequelize Associations**: Fixed missing hasMany relationship between Recurso and EntidadRecurso
- **Model Relationships**: All associations properly defined for complex queries

### ✅ User Management System Implementation
- **Backend**: Complete `/server/src/controllers/usuarioController.ts` with security validations
- **Routes**: Protected routes in `/server/src/routes/usuarioRoutes.ts` with JWT authentication
- **Frontend Service**: Full service in `/client/src/services/usuarios.ts` with TypeScript interfaces
- **Modal Component**: `/client/src/components/Usuarios/UsuarioModal.tsx` with form validation
- **Main Page**: `/client/src/pages/Usuarios.tsx` with search, pagination, statistics, export
- **Navigation**: Updated sidebar from "Configuración" to "Usuarios" with UserCog icon
- **Security Features**:
  - Self-deletion protection
  - Last active user protection
  - Password hashing with bcrypt
  - Unique username/email validation
  - JWT authentication on all endpoints

## 🎯 SYSTEM STATUS: PRODUCTION READY

The **AxiomaDocs** system is now **complete and production-ready** with:

✅ **Full CRUD Operations** for all entities (Estados, Recursos, Documentación, Entidades, Usuarios)
✅ **Advanced Export System** (Excel/PDF) in all views including user management
✅ **Comprehensive Reports System** with 3 report types and advanced filtering
✅ **JWT Security** on all API endpoints including dashboard and reports
✅ **MySQL Database** with proper UTF8MB4 configuration and timezone support
✅ **Responsive Design** with professional UI/UX and consistent iconography
✅ **Real-time Dashboard** with statistics and auto-refresh functionality
✅ **Document Management** with universal/specific logic and date calculations
✅ **Status Level System** with critical state detection (1-10 levels)
✅ **Complete Navigation** with all pages functional and user management
✅ **User Administration** with secure password management and role controls

## MySQL Setup Instructions

1. **Install MySQL Server** and ensure it's running
2. **Create Database**: `CREATE DATABASE axiomadocs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
3. **Configure Environment**: Update `server/.env` with your MySQL credentials
4. **Test Connection**: Run `cd server && npm run test-mysql`
5. **Start Application**: Run `npm run dev` from root directory

The application will automatically create all tables and initial data on first run.

## 📋 COMPLETE SYSTEM SUMMARY

### 🏗️ Architecture
- **Backend**: Node.js + TypeScript + Express + Sequelize + MySQL
- **Frontend**: React 18 + TypeScript + Tailwind CSS + React Query + React Hook Form
- **Authentication**: JWT with bcrypt password hashing
- **Database**: MySQL 8.0+ with UTF8MB4 charset
- **Export**: xlsx (Excel) + jsPDF (PDF) libraries

### 📱 Pages Implemented
1. **Dashboard** (`/`): Real-time statistics with auto-refresh
2. **Estados** (`/estados`): Status management with level system (1-10)
3. **Documentación** (`/documentacion`): Document types with universal/specific logic
4. **Recursos** (`/recursos`): People management with document assignments
5. **Entidades** (`/entidades`): Organization management with resource assignments
6. **Reportes** (`/reportes`): 3 advanced reports with filtering and export
7. **Usuarios** (`/usuarios`): Complete user management with security features

### 🔐 Security Features
- **JWT Authentication**: All API endpoints protected
- **Password Security**: bcrypt hashing with minimum requirements
- **User Protection**: Self-deletion and last-admin protection
- **Input Validation**: Frontend and backend validation
- **Unique Constraints**: Username and email uniqueness enforced

### 📊 Export System
- **Excel Export**: Professional formatting with column widths
- **PDF Export**: Landscape layout with headers and footers
- **Date Formatting**: Consistent DD/MM/YYYY format
- **Automatic Filenames**: Include current date in filename
- **Available in**: All entity grids and all report types

### 📈 Reports System
1. **Documentación por Estado**: Resources grouped by document status with entity filters
2. **Recursos por Entidad**: Entity-based resource overview with documentation statistics
3. **Documentos Próximos a Vencer**: Expiration alerts with priority and day filters

### 🗄️ Database Models
- **Usuario**: User authentication and system access
- **Estado**: Status management with color-coded levels (1-10)
- **Recurso**: People/resource management with personal data
- **Documentacion**: Document types with validity periods and universal dates
- **Entidad**: Organizations with platform URLs and settings
- **RecursoDocumentacion**: Resource-document assignments with dates and status
- **EntidadDocumentacion**: Entity required documents with email settings
- **EntidadRecurso**: Entity-resource assignments with active periods

### 🔄 Business Logic
- **Universal Documents**: Documents with complete dates are read-only in assignments
- **Specific Documents**: Documents without dates allow per-assignment date editing
- **Date Calculations**: fechaVencimiento = fechaEmision + diasVigencia (automatic)
- **Status Levels**: Higher level numbers indicate more critical states
- **Critical State Detection**: Automatic calculation of highest priority status
- **Expiration Alerts**: Configurable anticipation days for notifications

### 🎨 UI/UX Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Professional Icons**: Lucide React icons throughout the application
- **Color-coded Status**: Visual status indicators with custom colors
- **Loading States**: Proper loading indicators and disabled states
- **Toast Notifications**: Success/error feedback with react-hot-toast
- **Search Functionality**: Real-time search across all entity grids
- **Pagination**: Efficient data loading with page controls
- **Statistics Cards**: Visual KPI display on dashboard and entity pages

### 📝 Development Notes
- **TypeScript**: Full type safety across frontend and backend
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Code Organization**: Clean separation of concerns with services, components, controllers
- **Validation**: Frontend validation with React Hook Form + backend validation
- **Performance**: React Query for efficient data fetching and caching
- **Scalability**: Prepared for production use with proper database indexing

### 🚀 Deployment Ready
- **Environment Configuration**: Proper .env setup for MySQL
- **Production Build**: Build scripts configured for both client and server
- **Database Scripts**: MySQL setup and connection testing scripts
- **Documentation**: Complete setup guides (MYSQL-SETUP.md)
- **Security**: All APIs protected, passwords hashed, input sanitized

This system is **completely functional** and ready for production deployment in any organization requiring document management by resources.