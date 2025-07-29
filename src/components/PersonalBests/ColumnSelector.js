import React, { useState } from 'react';
import { Columns, X } from 'lucide-react';
import { AVAILABLE_COLUMNS } from '../../utils/constants';

const ColumnSelector = ({ visibleColumns, setVisibleColumns }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleColumn = (columnKey) => {
    if (visibleColumns.includes(columnKey)) {
      // Don't allow removing the last column
      if (visibleColumns.length <= 1) return;
      setVisibleColumns(visibleColumns.filter(col => col !== columnKey));
    } else {
      setVisibleColumns([...visibleColumns, columnKey]);
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
      >
        <Columns className="w-4 h-4" />
        <span className="text-sm font-medium">Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-lg shadow-2xl border border-blue-500/30" style={{ zIndex: 9999, background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Customize Columns</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-500/20 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {AVAILABLE_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  className="flex items-start space-x-3 p-2 hover:bg-blue-500/10 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {column.label}
                    </div>
                    <div className="text-xs text-slate-300">
                      {column.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-blue-500/20">
              <button
                onClick={() => {
                  const defaultColumns = AVAILABLE_COLUMNS
                    .filter(col => col.default)
                    .map(col => col.key);
                  setVisibleColumns(defaultColumns);
                }}
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Reset to default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;