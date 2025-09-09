
module.exports = {
  name: 'Atracciones – Baby House (V2 OCT 2018)',
  description: 'Checklist diario de mantenimiento para la atracción Baby House',
  frequency: 'diario',
  version_label: 'V2 OCT 2018',
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
  attraction_name: 'Baby House', // Nombre del inspectable para buscar su ID
  premise_id: 2, // ID del local al que pertenece la atracción
  items: [
    {
      item_number: '1',
      question_text: 'Verificación de Estructura General',
      input_type: 'section',
      children: [
        {
          item_number: '1.1',
          question_text: 'Verificar que no existan elementos sueltos o faltantes en la atracción.',
          guidance_text: 'Inspección visual completa de la estructura y componentes.',
          input_type: 'boolean',
          allow_comment: true,
        },
        {
          item_number: '1.2',
          question_text: 'Verificar que no existan fisuras o daños en la estructura.',
          guidance_text: 'Inspección detallada de soldaduras y puntos de unión.',
          input_type: 'boolean',
          allow_comment: true,
        },
      ],
    },
    {
      item_number: '2',
      question_text: 'Verificar el estado de los pisos y superficies antideslizantes.',
      input_type: 'section',
      children: [
        {
          item_number: '2.1',
          question_text: 'Comprobar desgaste y adherencia de superficies.',
          guidance_text: null,
          input_type: 'boolean',
          allow_comment: true,
        },
      ],
    },
    {
      item_number: '3',
      question_text: 'Verificar el estado de las barandas y protecciones.',
      input_type: 'section',
      children: [
        {
          item_number: '3.1',
          question_text: 'Asegurarse de que estén firmes y sin daños.',
          guidance_text: null,
          input_type: 'boolean',
          allow_comment: true,
        },
      ],
    },
  ],
};
