import React, { useState, useEffect } from 'react';
import { Sun, Moon, Bell } from 'lucide-react';

interface TopBarProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleTheme, isDarkMode }) => {
  const [date, setDate] = useState(new Date());
  
  // Update the date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 60000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <div className="bg-white dark:bg-gray-800 h-16 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      {/* Left side - Date */}
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</p>
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
        
        {/* Theme toggle */}
        <button 
          onClick={onToggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );
};

export default TopBar;