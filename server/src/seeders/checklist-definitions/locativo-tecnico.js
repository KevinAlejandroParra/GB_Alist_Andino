'use strict';

const locativoChecklistRaw = [
  {
    section: "1. PLAY GROUND",
    items: [
      { question_text: "1.1 LUCES INDIRECTAS", guidance_text: "Verificar encendido y estado general de las luces indirectas del área." },
      { question_text: "1.2 LUCES DE TECHO", guidance_text: "Revisar funcionamiento de las luminarias principales de techo." },
      { question_text: "1.3 LUCES INTERNAS", guidance_text: "Confirmar que todas las luces internas estén operativas y sin parpadeos." },
      { question_text: "1.4 ESTADO DE PINTURA Y PAREDES DEL ENTORNO", guidance_text: "Inspeccionar que la pintura y paredes se encuentren en buen estado, sin golpes ni desgaste." },
      { question_text: "1.5 ESTADO DE TOMACORRIENTE Y CLAVIJAS DE TODA LA ATRACCIÓN", guidance_text: "Verificar que los tomacorrientes y clavijas no estén expuestos, dañados o flojos." },
      { question_text: "1.6 OTROS", guidance_text: "Registrar cualquier novedad adicional observada en el área." },
    ],
  },
  {
    section: "2. BABY HOUSE",
    items: [
      { question_text: "2.1 LUCES INDIRECTAS", guidance_text: "Revisar funcionamiento y estado general de las luces indirectas." },
      { question_text: "2.2 LUCES DE TECHO", guidance_text: "Comprobar el correcto funcionamiento de las luminarias de techo." },
      { question_text: "2.3 LUCES INTERNAS", guidance_text: "Validar que todas las luces internas funcionen correctamente." },
      { question_text: "2.4 ESTADO DE PINTURA Y PAREDES DEL ENTORNO", guidance_text: "Inspeccionar pintura, paredes y estado visual general del entorno." },
      { question_text: "2.5 ESTADO DE TOMACORRIENTE Y CLAVIJAS DE TODA LA ATRACCIÓN", guidance_text: "Verificar que las conexiones eléctricas estén en perfecto estado." },
      { question_text: "2.6 OTROS", guidance_text: "Registrar cualquier observación adicional encontrada." },
    ],
  },
  {
    section: "3. ADMINISTRACIÓN - WINNER - TAQUILLA",
    items: [
      { question_text: "3.1 LUCES INDIRECTAS", guidance_text: "Revisar luces indirectas del área administrativa y taquilla." },
      { question_text: "3.2 LUCES DE TECHO", guidance_text: "Verificar el correcto funcionamiento de las luces de techo." },
      { question_text: "3.3 LUCES INTERNAS", guidance_text: "Confirmar la operatividad de todas las luces internas." },
      { question_text: "3.4 ESTADO DE PINTURA Y PAREDES DEL ENTORNO", guidance_text: "Inspeccionar pintura, paredes y estado general del entorno." },
      { question_text: "3.5 ESTADO DE TOMACORRIENTE Y CLAVIJAS DE TODA EL ÁREA", guidance_text: "Verificar tomas y clavijas, asegurando que estén seguras y funcionales." },
      { question_text: "3.6 OTROS", guidance_text: "Registrar cualquier situación adicional encontrada." },
    ],
  },
  {
    section: "4. PLANTA PISO 1",
    items: [
      { question_text: "4.1 LUCES INDIRECTAS", guidance_text: "Revisar luces indirectas del nivel." },
      { question_text: "4.2 LUCES DE TECHO", guidance_text: "Comprobar iluminación principal del nivel." },
      { question_text: "4.3 LUCES INTERNAS", guidance_text: "Confirmar iluminación secundaria/interna del nivel." },
      { question_text: "4.4 ESTADO DE PINTURA Y PAREDES DEL ENTORNO", guidance_text: "Revisar estado del entorno visual, pintura y paredes." },
      { question_text: "4.5 ESTADO DE TOMACORRIENTE Y CLAVIJAS", guidance_text: "Verificar conexiones eléctricas del nivel." },
      { question_text: "4.6 LIMPIEZA Y FUNCIONAMIENTO DE TELEVISORES DE PUBLICIDAD", guidance_text: "Inspeccionar limpieza, fijación y funcionamiento de pantallas." },
      { question_text: "4.7 OTROS", guidance_text: "Registrar cualquier observación extra." },
    ],
  },
  {
    section: "5. PLANTA PISO 2",
    items: [
      { question_text: "5.1 LUCES INDIRECTAS", guidance_text: "Validar que las luces indirectas estén en buen estado." },
      { question_text: "5.2 LUCES DE TECHO", guidance_text: "Comprobar las luces principales de techo." },
      { question_text: "5.3 LUCES INTERNAS", guidance_text: "Revisar iluminación interna del nivel." },
      { question_text: "5.4 ESTADO VENTILADORES DE TECHO", guidance_text: "Comprobar funcionamiento, limpieza y balanceo de ventiladores." },
      { question_text: "5.5 ESTADO DE PINTURA Y PAREDES DEL ENTORNO", guidance_text: "Inspeccionar pintura y paredes del entorno." },
      { question_text: "5.6 ESTADO DE TOMACORRIENTE Y CLAVIJAS", guidance_text: "Verificar seguridad y funcionamiento de tomacorrientes y clavijas." },
      { question_text: "5.7 LIMPIEZA Y FUNCIONAMIENTO DE TELEVISORES DE PUBLICIDAD", guidance_text: "Revisar pantallas publicitarias, su limpieza y funcionamiento." },
      { question_text: "5.8 OTROS", guidance_text: "Registrar situaciones adicionales observadas." },
    ],
  },
  {
    section: "6. LUCES DE EMERGENCIA",
    items: [
      { question_text: "6.1 CORRECTO FUNCIONAMIENTO Y CANTIDAD", guidance_text: "Verificar que todas las luces de emergencia estén instaladas, funcionen correctamente y cumplan con la cantidad requerida." },
    ],
  },
];

// Conversión de items al formato del sistema
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
  name: "Checklist Locativo – Mantenimiento General",
  description: "Checklist general de revisión locativa para áreas internas del local. Disponible para técnicos y anfitriones.",
  frequency: "diario",
  version_label: "V2 DIC 2025 BY: Alejandro Parra",
  role_id: 3, // Rol genérico para técnicos
  attraction_name: null, // No asociado a ninguna atracción específica
  premise_id: null, // No asociado a ninguna premisa específica
  items: transformItems(locativoChecklistRaw),
};
