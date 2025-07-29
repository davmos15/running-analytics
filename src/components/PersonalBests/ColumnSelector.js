import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Columns, X, GripVertical, Lock } from 'lucide-react';
import { AVAILABLE_COLUMNS } from '../../utils/constants';

const ColumnSelector = ({ visibleColumns, setVisibleColumns }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target) && 
          !event.target.closest('[data-column-selector-dropdown]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleColumn = (columnKey) => {
    // Don't allow toggling the rank column
    if (columnKey === 'rank') return;
    
    if (visibleColumns.includes(columnKey)) {
      // Don't allow removing the last column (excluding rank)
      if (visibleColumns.length <= 2) return;
      setVisibleColumns(visibleColumns.filter(col => col !== columnKey));
    } else {
      setVisibleColumns([...visibleColumns, columnKey]);
    }
  };

  const handleDragStart = (e, index) => {
    // Don't allow dragging the rank column
    if (visibleColumns[index] === 'rank') {
      e.preventDefault();
      return;
    }
    setDraggedItem(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    // Don't allow dropping on rank column position
    if (index === 0) return;
    setDragOverItem(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    // Don't allow dropping on rank column position
    if (dropIndex === 0 || draggedItem === null) return;

    const draggedColumn = visibleColumns[draggedItem];
    const newColumns = [...visibleColumns];
    
    // Remove dragged item
    newColumns.splice(draggedItem, 1);
    
    // Insert at new position
    const insertIndex = draggedItem < dropIndex ? dropIndex - 1 : dropIndex;
    newColumns.splice(insertIndex, 0, draggedColumn);
    
    setVisibleColumns(newColumns);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        data-column-selector-dropdown
        className="fixed w-80 max-w-[calc(100vw-2rem)] rounded-lg shadow-2xl border border-blue-500/30"
        style={{ 
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          zIndex: 9999,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
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
          
          {/* Column Order Section */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Column Order</h4>
            <div className="space-y-1">
              {visibleColumns.map((columnKey, index) => {
                const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
                const isRank = columnKey === 'rank';
                return (
                  <div
                    key={columnKey}
                    draggable={!isRank}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center space-x-2 p-2 rounded ${
                      isRank 
                        ? 'bg-slate-700/50 cursor-not-allowed' 
                        : 'bg-slate-700/30 hover:bg-slate-700/50 cursor-move'
                    } ${dragOverItem === index ? 'border-t-2 border-orange-500' : ''}`}
                  >
                    {isRank ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : (
                      <GripVertical className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-sm text-white flex-1">{column?.label || columnKey}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column Visibility Section */}
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Visible Columns</h4>
          <div className="space-y-2">
            {AVAILABLE_COLUMNS.map((column) => {
              const isRank = column.key === 'rank';
              return (
                <label
                  key={column.key}
                  className={`flex items-start space-x-3 p-2 rounded ${
                    isRank 
                      ? 'bg-slate-700/50 cursor-not-allowed' 
                      : 'hover:bg-blue-500/10 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    disabled={isRank}
                    className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {column.label}
                      </span>
                      {isRank && (
                        <span className="text-xs text-slate-500">(Always visible)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300">
                      {column.description}
                    </div>
                  </div>
                </label>
              );
            })}
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
      </div>,
      document.body
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
      >
        <Columns className="w-4 h-4" />
        <span className="text-sm font-medium">Columns</span>
      </button>
      {renderDropdown()}
    </>
  );
};

export default ColumnSelector;