'use strict';

// Definición de plantillas de preguntas para reutilizar
const newQuestions = [
  { item_number: '1', question_text: "JUGADAS", guidance_text: "Registrar la cantidad de jugadas.", input_type: 'numeric', allow_comment: true },
  { item_number: '2', question_text: "PREMIOS", guidance_text: "Registrar la cantidad de premios entregados.", input_type: 'numeric', allow_comment: true },
  { item_number: '3', question_text: "CONFIGURACION DE LA MAQUINA", guidance_text: "Configuración actual de la máquina.", input_type: 'text', allow_comment: true },
];

// Combinar todas las preguntas aplicables
const allQuestions = [...newQuestions];

const machines = ['TOY BOX', 'TOY FAMILY', 'WORK ZONE'];

// Generar la estructura de items estáticos
const items = machines.map((machine, index) => ({
  item_number: `${index + 1}`,
  question_text: machine,
  children: allQuestions.map((q, childIndex) => { 
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
  specific_inspectable_names: ["Toy Box", "Toy family", "work zone"],
  dynamic_items: false, 
  items: items,
};
