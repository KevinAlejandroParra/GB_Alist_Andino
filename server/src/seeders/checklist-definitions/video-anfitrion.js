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
    question_text: "CONDICION DE SEGURIDAD", 
    guidance_text: "Inspeccionar la seguridad en busca de fisuras, roturas o desgaste",
  }
];

module.exports = {
  name: 'Check List Familia Video - Anfitrión',
  description: 'Check list semanal de operacion para la familia Video',
  frequency: 'semanal',
  version_label: 'V1 Dynamic Families SEP 2025 BY: Alejandro Parra',
  role_id: 8, // Corresponde a anfitrión
  family_name: 'Video',
  dynamic_items: 'device', 
  items: subItemTemplates, 
};
