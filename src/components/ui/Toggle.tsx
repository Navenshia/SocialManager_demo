import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  color = 'blue',
  size = 'md'
}) => {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
    pink: 'bg-pink-600',
  };
  
  const sizes = {
    sm: { track: 'h-4 w-8', thumb: 'h-3 w-3', translate: 'translate-x-4' },
    md: { track: 'h-6 w-12', thumb: 'h-5 w-5', translate: 'translate-x-6' },
    lg: { track: 'h-8 w-16', thumb: 'h-7 w-7', translate: 'translate-x-8' },
  };
  
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };
  
  return (
    <div className={`flex items-center ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        className={`
          relative inline-flex flex-shrink-0 
          ${sizes[size].track}
          border-2 border-transparent rounded-full 
          transition-colors ease-in-out duration-200 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
          ${checked ? colors[color as keyof typeof colors] : 'bg-gray-200 dark:bg-gray-700'}
        `}
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
      >
        <motion.span 
          className={`
            ${sizes[size].thumb}
            rounded-full bg-white shadow transform
          `}
          initial={false}
          animate={{ x: checked ? parseInt(sizes[size].translate.split('-x-')[1]) : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      {label && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </div>
  );
};

export default Toggle;