'use strict';

// Definición de plantillas de preguntas para reutilizar
const oldQuestions = [
  { item_number: '1', question_text: "ESTADO CONEXIÓN ELÉCTRICA Y CANALETA", guidance_text: "Verificar que el cableado esté en buen estado, sin empalmes defectuosos y correctamente canalizado.", input_type: 'radio', allow_comment: true },
  { item_number: '2', question_text: "ESTADO DE LOS CONTROLES Y FUNCIONAMIENTO EN GENERAL", guidance_text: "Asegurar que todos los botones, palancas y controles funcionen correctamente y no presenten desgaste excesivo.", input_type: 'radio', allow_comment: true },
  { item_number: '3', question_text: "CICLO DE MÁQUINA", guidance_text: "Comprobar que el ciclo de operación (tiempo, movimientos, sonidos) se complete según las especificaciones del fabricante.", input_type: 'radio', allow_comment: true },
  { item_number: '4', question_text: "CINTURON DE SEGURIDAD PLASTICO", guidance_text: "Inspeccionar el cinturón de seguridad en busca de fisuras, roturas o desgaste. Asegurarse de que el anclaje sea firme.", input_type: 'radio', allow_comment: true },
];

const newQuestions = [
  { item_number: '5', question_text: "Porcentaje Semanal", guidance_text: "Registrar el porcentaje semanal de la máquina.", input_type: 'numeric', allow_comment: true },
  { item_number: '6', question_text: "JUGADAS", guidance_text: "Registrar la cantidad de jugadas.", input_type: 'numeric', allow_comment: true },
  { item_number: '7', question_text: "PREMIOS", guidance_text: "Registrar la cantidad de premios entregados.", input_type: 'numeric', allow_comment: true },
  { item_number: '8', question_text: "OBSERVACION", guidance_text: "Anotar cualquier observación general sobre el funcionamiento.", input_type: 'text', allow_comment: true },
];

// Combinar todas las preguntas aplicables
const allQuestions = [...oldQuestions, ...newQuestions];

const machines = ['TOY BOX', 'TOY FAMILY', 'WORK ZONE'];

// Generar la estructura de items estáticos
const items = machines.map((machine, index) => ({
  item_number: `${index + 1}`,
  question_text: machine,
  children: allQuestions.map((q, childIndex) => { 
    // Renumerar las preguntas viejas y nuevas para que sean consecutivas
    const originalQuestionNumber = q.item_number;
    return {
      ...q,
      item_number: `${index + 1}.${childIndex + 1}`,
    }
  })
}));

module.exports = {
  name: 'Apoyo - Técnico (Premios)',
  description: 'Checklist semanal de mantenimiento para máquinas de premios de la familia Apoyo',
  frequency: 'semanal',
  version_label: 'V1 Static Premios SEP 2025 BY: Alejandro Parra',
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
  specific_inspectable_names: ['TOY BOX', 'TOY FAMILY', 'WORK ZONE'], 
  dynamic_items: false, 
  items: items,
};
