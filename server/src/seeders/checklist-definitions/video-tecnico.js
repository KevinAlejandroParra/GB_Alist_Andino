'use strict';

const subItemTemplates = [
  { 
    item_number: '1', 
    question_text: "ESTADO CONEXIÓN ELÉCTRICA Y CANALETA", 
    guidance_text: "Verificar que el cableado esté en buen estado, sin empalmes defectuosos y correctamente canalizado.",
  },
  { 
    item_number: '2', 
    question_text: "ESTADO DE LOS CONTROLES Y FUNCIONAMIENTO EN GENERAL", 
    guidance_text: "Asegurar que todos los botones, palancas y controles funcionen correctamente y no presenten desgaste excesivo.",
  },
  { 
    item_number: '3', 
    question_text: "CICLO DE MÁQUINA", 
    guidance_text: "Comprobar que el ciclo de operación (tiempo, movimientos, sonidos) se complete según las especificaciones del fabricante.",
  }
];

module.exports = {
  name: 'Video - Técnico',
  description: 'Checklist semanal de mantenimiento para la familia Video',
  frequency: 'semanal',
  version_label: 'V1 Dynamic Families SEP 2025 BY: Alejandro Parra',
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
  family_name: 'Video',
  dynamic_items: 'device', 
  items: subItemTemplates, 
};
