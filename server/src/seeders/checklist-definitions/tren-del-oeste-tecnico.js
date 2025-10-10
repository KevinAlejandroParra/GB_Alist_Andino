'use strict';

const trenChecklistRaw = [
  {
    section: "Entorno General",
    items: [
      {
        question_text: "Verifique que la baranda esté anclada firmemente, mover cada tramo confirmando.",
        guidance_text: "Mueva suavemente cada tramo de la baranda para asegurarse de que no haya piezas flojas.",
      },
      {
        question_text: "Verificar el estado del lector: funcionamiento y conexión de red, pase la tarjeta.",
        guidance_text: "Pase una tarjeta de prueba para confirmar la lectura y revise que esté conectado a la red.",
      },
      {
        question_text: "Verificar el funcionamiento de la tarjeta electrónica, que dé las 4 vueltas, luces y sonido.",
        guidance_text: "Active la tarjeta electrónica y confirme que complete las vueltas y emita luces y sonido.",
      },
      {
        question_text: "Revisar estado de los cinturones de seguridad plásticos.",
        guidance_text: "Inspeccione que no estén rotos ni desgastados y que las hebillas funcionen bien.",
      },
    ],
  },
  {
    section: "Locomotora",
    items: [
      {
        question_text: "Revisar arranque y parada del tren.",
        guidance_text: "Encienda y apague la locomotora confirmando que responda de inmediato.",
      },
      {
        question_text: "Revisar pasador o tuerca de unión entre locomotora y vagón.",
        guidance_text: "Verifique que el pasador o tuerca estén bien asegurados y sin desgaste.",
      },
      {
        question_text: "Revisar el funcionamiento de los pulsadores de locomotora y vagón (sonido locomotora).",
        guidance_text: "Presione los pulsadores y confirme que emitan el sonido esperado.",
      },
      {
        question_text: "Revisar funcionamiento del sensor de parada de la parte frontal y puerta.",
        guidance_text: "Active el sensor y confirme que la locomotora se detenga de forma segura.",
      },
      {
        question_text: "Revisar conexiones electrónicas internas.",
        guidance_text: "Revise cables y conexiones internas para confirmar que estén firmes y sin daños.",
      },
    ],
  },
  {
    section: "Estructura",
    items: [
      {
        question_text: "Revisar estado y aseo de la atracción que no existan objetos extraños.",
        guidance_text: "Inspeccione que el área esté libre de objetos que puedan interferir con el funcionamiento.",
      },
      {
        question_text: "Revisar uniones de las secciones de la pista.",
        guidance_text: "Revise que no haya holguras ni desgaste en las uniones de la pista.",
      },
      {
        question_text: "Revisar estado de la canaleta.",
        guidance_text: "Asegúrese de que la canaleta esté limpia, libre de obstrucciones y sin daños.",
      },
      {
        question_text: "Revisar estado de la pintura de mural y los accesorios de la atracción.",
        guidance_text: "Verifique que la pintura esté en buen estado y los accesorios no presenten daños.",
      },
      {
        question_text: "Revisar el estado y aseo de las llantas metálicas y de teflón.",
        guidance_text: "Confirme que las llantas estén limpias, bien ajustadas y sin desgaste excesivo.",
      },
      {
        question_text: "Revisar estado y lubricación de la cadena.",
        guidance_text: "Verifique que la cadena esté bien lubricada y no tenga óxido ni desgaste.",
      },
      {
        question_text: "Revisar estado y aseo de la carrilera.",
        guidance_text: "Asegúrese de que la carrilera esté limpia y en buen estado para el paso del tren.",
      },
    ],
  },
  {
    section: "Listo para entregar a operación",
    items: [
      {
        question_text: "¿El juego está listo para entregar a operación? (Sí/No)",
        guidance_text: "Confirme que se ha realizado toda la revisión según las recomendaciones del fabricante y condiciones de servicio.",
      },
    ],
  },
];

const transformItems = (rawItems) => {
  return rawItems.map((section, sectionIndex) => ({
    item_number: String(sectionIndex + 1),
    question_text: section.section,
    input_type: 'section',
    children: section.items.map((item, itemIndex) => ({
      item_number: `${sectionIndex + 1}.${itemIndex + 1}`,
      question_text: item.question_text,
      guidance_text: item.guidance_text,
      input_type: 'radio',
      allow_comment: true,
    })),
  }));
};

module.exports = {
  name: "Check List Atracciones – Tren del Oeste - Tecnico",
  description: "Check list diario de mantenimiento para la atracción Tren del Oeste",
  frequency: "diario",
  version_label: "V1 SEP 2025 BY: Alejandro Parra",
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
  attraction_name: "Tren del Oeste", // Nombre del inspectable para buscar su ID
  premise_id: 2, // Asumiendo que es el mismo local que los otros
  items: transformItems(trenChecklistRaw),
};