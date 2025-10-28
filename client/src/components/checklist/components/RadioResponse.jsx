"use client";
import React from 'react';

const RadioResponse = ({ uniqueId, currentResponse, itemDisabled, handleResponseChange }) => {
  console.log('RadioResponse render:', {
    uniqueId,
    currentValue: currentResponse?.response_compliance,
    disabled: itemDisabled
  });

  const options = [
    { value: 'cumple', label: '✅ Cumple', colorClass: 'green' },
    { value: 'observación', label: '⚠️ Observación', colorClass: 'yellow' },
    { value: 'no cumple', label: '❌ No Cumple', colorClass: 'red' }
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {options.map((option) => {
        const isSelected = currentResponse?.response_compliance === option.value;
        const buttonClasses = `
          flex items-center justify-center p-3 border rounded-lg transition-all duration-200
          ${itemDisabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer hover:bg-${option.colorClass}-50`}
          ${isSelected ? `bg-${option.colorClass}-100 border-${option.colorClass}-500 border-2` : 'border-gray-200'}
        `;

        return (
          <button
            key={option.value}
            type="button"
            disabled={itemDisabled}
            className={buttonClasses}
            onClick={() => {
              if (!itemDisabled) {
                console.log(`🔄 Click en ${option.label}:`, uniqueId);
                handleResponseChange(uniqueId, "response_compliance", option.value);
              }
            }}
          >
            <div 
              className={`
                w-4 h-4 rounded-full border-2 mr-2
                ${isSelected ? `bg-${option.colorClass}-500 border-${option.colorClass}-600` : 'border-gray-400'}
              `}
            >
              {isSelected && (
                <div className="w-2 h-2 bg-white rounded-full m-0.5" />
              )}
            </div>
            <span className={`
              text-sm font-medium
              ${isSelected ? `text-${option.colorClass}-700` : 'text-gray-700'}
            `}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(RadioResponse);