
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
      <div 
        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
