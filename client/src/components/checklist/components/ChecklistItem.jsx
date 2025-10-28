"use client";
import React from 'react';
import RadioResponse from './RadioResponse';

const ChecklistItem = ({ item, currentResponse, itemDisabled, handleResponseChange }) => {
  if (item.input_type === 'radio') {
    return (
      <RadioResponse
        uniqueId={item.unique_frontend_id || item.checklist_item_id}
        currentResponse={currentResponse}
        itemDisabled={itemDisabled}
        handleResponseChange={handleResponseChange}
      />
    );
  }

  if (item.input_type === 'numeric') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta Numérica:</label>
        <input
          type="number"
          className={`w-full p-2 border rounded-md ${itemDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          value={currentResponse?.response_numeric ?? ''}
          onChange={(e) => !itemDisabled && handleResponseChange(item.unique_frontend_id || item.checklist_item_id, "response_numeric", e.target.value)}
          placeholder="Ingrese un valor numérico"
          disabled={itemDisabled}
        />
      </div>
    );
  }

  if (item.input_type === 'text') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observación:</label>
        <textarea
          className={`w-full p-2 border rounded-md ${itemDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          rows="3"
          value={currentResponse?.response_text ?? ''}
          onChange={(e) => !itemDisabled && handleResponseChange(item.unique_frontend_id || item.checklist_item_id, "response_text", e.target.value)}
          placeholder="Ingrese texto libre"
          disabled={itemDisabled}
        />
      </div>
    );
  }

  return <p className="text-sm text-gray-500">Input type '{item.input_type}' no soportado.</p>;
};

export default React.memo(ChecklistItem);