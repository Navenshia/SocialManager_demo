import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  PenSquare, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Instagram, 
  Youtube, 
  TrendingUp 
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      label: 'Dashboard',
      icon: <Home size={20} />,
      path: '/'
    },
    {
      label: 'Create Post',
      icon: <PenSquare size={20} />,
      path: '/create'
    },
    {
      label: 'Scheduler',
      icon: <Calendar size={20} />,
      path: '/scheduler'
    },
    {
      label: 'Comments',
      icon: <MessageSquare size={20} />,
      path: '/comments'
    },
    {
      label: 'Settings',
      icon: <Settings size={20} />,
      path: '/settings'
    }
  ];

  return (
    <aside className="bg-white dark:bg-gray-800 w-64 h-full min-h-screen shadow-md flex flex-col">
      {/* App name */}
      <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Social Automator</h1>
      </div>
      
      {/* Navigation menu */}
      <nav className="flex flex-col flex-1 p-4">
        <div className="mb-8">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path}
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Platform section */}
        <div className="mt-auto">
          <h2 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Connected Platforms
          </h2>
          <ul className="space-y-1">
            <li>
              <Link 
                to="#" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Instagram size={18} className="mr-2 text-pink-600" />
                <span>Instagram</span>
              </Link>
            </li>
            <li>
              <Link 
                to="#" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Youtube size={18} className="mr-2 text-red-600" />
                <span>YouTube</span>
              </Link>
            </li>
            <li>
              <Link 
                to="#" 
                className="flex items-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <TrendingUp size={18} className="mr-2 text-black dark:text-white" />
                <span>TikTok</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;