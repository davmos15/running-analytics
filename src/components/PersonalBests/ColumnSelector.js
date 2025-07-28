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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Columns className="w-4 h-4" />
        <span className="text-sm font-medium">Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Customize Columns</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {AVAILABLE_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {column.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {column.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  const defaultColumns = AVAILABLE_COLUMNS
                    .filter(col => col.default)
                    .map(col => col.key);
                  setVisibleColumns(defaultColumns);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
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