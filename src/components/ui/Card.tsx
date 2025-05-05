import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
  hover?: boolean;
  animate?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
  onClick,
  footer,
  hover = false,
  animate = false,
}) => {
  const CardComponent = animate ? motion.div : 'div';
  
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  } : {};

  return (
    <CardComponent
      className={`
        bg-white dark:bg-gray-800 
        rounded-2xl shadow-soft 
        overflow-hidden
        ${hover ? 'hover:shadow-md transition-shadow' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...animationProps}
    >
      {/* Card Header */}
      {(title || subtitle || icon) && (
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
            {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
          </div>
        </div>
      )}
      
      {/* Card Body */}
      <div className="p-5">
        {children}
      </div>
      
      {/* Card Footer */}
      {footer && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700">
          {footer}
        </div>
      )}
    </CardComponent>
  );
};

export default Card;