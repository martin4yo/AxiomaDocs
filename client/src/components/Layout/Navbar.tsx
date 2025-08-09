import React, { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../Common/Logo';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
      <div className="px-3 py-3 lg:px-5 lg:pl-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <button
              className="p-2 text-gray-600 rounded cursor-pointer lg:hidden hover:text-gray-900 hover:bg-gray-100"
              onClick={onToggleSidebar}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="ml-2 md:mr-24">
              <Logo size="sm" showText={true} />
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center ml-3">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-3 hidden md:block">
                  {user?.nombre} {user?.apellido}
                </span>
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                  <User size={20} className="text-gray-600 mx-2" />
                </div>
                <button
                  onClick={logout}
                  className="ml-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
          <span className="block px-3 py-2 text-sm text-gray-500">
            {user?.nombre} {user?.apellido}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;