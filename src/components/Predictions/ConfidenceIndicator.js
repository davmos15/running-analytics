import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const ConfidenceIndicator = ({ confidence, size = 'medium' }) => {
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) {
      return {
        level: 'high',
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        icon: CheckCircle,
        label: 'High Confidence',
        description: 'Very reliable prediction'
      };
    } else if (confidence >= 0.6) {
      return {
        level: 'medium',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        icon: AlertTriangle,
        label: 'Medium Confidence',
        description: 'Reasonably reliable'
      };
    } else {
      return {
        level: 'low',
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        icon: XCircle,
        label: 'Low Confidence',
        description: 'Limited data available'
      };
    }
  };

  const getSizeClasses = (size) => {
    const sizes = {
      small: {
        container: 'px-2 py-1',
        icon: 'w-3 h-3',
        text: 'text-xs',
        percentage: 'text-xs'
      },
      medium: {
        container: 'px-3 py-2',
        icon: 'w-4 h-4',
        text: 'text-sm',
        percentage: 'text-sm'
      },
      large: {
        container: 'px-4 py-3',
        icon: 'w-5 h-5',
        text: 'text-base',
        percentage: 'text-base'
      }
    };
    return sizes[size] || sizes.medium;
  };

  const confidenceInfo = getConfidenceLevel(confidence);
  const sizeClasses = getSizeClasses(size);
  const Icon = confidenceInfo.icon;

  return (
    <div className={`flex items-center space-x-2 rounded-lg border ${confidenceInfo.bg} ${confidenceInfo.border} ${sizeClasses.container}`}>
      <Icon className={`${sizeClasses.icon} ${confidenceInfo.color}`} />
      <div className="flex flex-col">
        <div className={`font-medium ${confidenceInfo.color} ${sizeClasses.text}`}>
          {confidenceInfo.label}
        </div>
        {size !== 'small' && (
          <div className={`text-slate-400 ${sizeClasses.percentage}`}>
            {Math.round(confidence * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfidenceIndicator;