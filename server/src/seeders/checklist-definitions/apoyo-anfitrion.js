'use strict';

const subItemTemplates = [
  { 
    item_number: '1', 
    question_text: "ENCENDIDO DE LA MÁQUINA Y ESTADO GENERAL", 
    guidance_text: "Verificar que el cableado esté en buen estado, sin empalmes defectuosos y correctamente canalizado.",
  },
  { 
    item_number: '2', 
    question_text: "ASEO Y ESTÉTICA DE LA MÁQUINA", 
    guidance_text: "Asegurar que todos los botones, palancas y controles funcionen correctamente y no presenten desgaste excesivo.",
  },
  { 
    item_number: '3', 
    question_text: "CONDICIÓN DE SEGURIDAD", 
    guidance_text: "Comprobar que el ciclo de operación (tiempo, movimientos, sonidos) se complete según las especificaciones del fabricante.",
  }
];

module.exports = {
  name: 'Apoyo - Anfitriones',
  description: 'Checklist diario de operación para la familia Apoyo',
  frequency: 'diario',
  version_label: 'V1 Dynamic Families SEP 2025 BY: Alejandro Parra',
  role_id: 8, // Corresponde a "Anfitriones"
  family_name: 'Apoyo',
  dynamic_items: 'device', 
  items: subItemTemplates, 
};
