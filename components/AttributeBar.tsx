
import React from 'react';
import { Attributes } from '../types';

interface AttributeBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const AttributeBar: React.FC<AttributeBarProps> = ({ label, value, color, icon }) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  
  return (
    <div className="flex flex-col mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase tracking-wider">
          <span>{icon}</span> {label}
        </span>
        <span className="text-sm font-semibold text-gray-700">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${color}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default AttributeBar;
