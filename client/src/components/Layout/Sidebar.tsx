import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Building2, 
  UserCog, 
  BarChart3,
  Circle,
  ArrowRightLeft,
  Workflow,
  Activity
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    
    // Configuración Básica
    { to: '/estados', icon: Circle, label: 'Estados' },
    { to: '/documentacion', icon: FileText, label: 'Documentación' },
    { to: '/recursos', icon: Users, label: 'Recursos' },
    { to: '/entidades', icon: Building2, label: 'Entidades' },
    
    // Gestión de Intercambios - Funcionalidad Principal
    { to: '/intercambios', icon: ArrowRightLeft, label: 'Intercambios' },
    { to: '/workflows', icon: Workflow, label: 'Configurar Flujos' },
    { to: '/procesos', icon: Activity, label: 'Monitoreo' },
    
    // Análisis y Administración
    { to: '/reportes', icon: BarChart3, label: 'Reportes' },
    { to: '/usuarios', icon: UserCog, label: 'Usuarios' },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed top-16 left-0 z-40 w-64 h-screen pt-4 transition-transform bg-white border-r border-gray-200 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full px-3 pb-4 overflow-y-auto bg-white">
          <ul className="space-y-2 font-medium">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group ${
                      isActive ? 'bg-gray-100 text-primary-600' : ''
                    }`
                  }
                >
                  <item.icon 
                    size={20} 
                    className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900" 
                  />
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;