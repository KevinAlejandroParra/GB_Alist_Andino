module.exports = {
  name: "Atracciones – Tren del Oeste (V1 SEP 2025 - BY: Alejandro Parra)",
  description: "Checklist diario de operación para la atracción Tren del Oeste", // [cite: 2]
  frequency: "diario",
  version_label: "V1 SEP 2025 - BY: Alejandro Parra",
  role_id: 8, // Corresponde a "Anfitrión" 
  attraction_name: "Tren del Oeste", 
  premise_id: 2, 
  items: [
    {
      item_number: "1",
      question_text: "ENTORNO GENERAL", 
      input_type: "section",
      children: [
        {
          item_number: "1.1",
          question_text:
            "VERIFIQUE QUE LA BARANDA ESTE ANCLADA FIRMEMENTE, MOVER CADA TRAMO CONFIRMANDO.", 
          guidance_text:
            "Recorra todo el perímetro de la baranda y empuje cada sección para asegurar que está bien sujeta al suelo y no se mueve.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.2",
          question_text: "VERIFICAR EL ESTADO DEL LECTOR: FUNCIONAMIENTO Y CONEXIÓN DE RED", 
          guidance_text: "Pase una tarjeta de prueba para confirmar que el lector de acceso enciende, lee la tarjeta y está operativo.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.3",
          question_text: "REVISAR ESTADO DE LOS CINTURONES DE SEGURIDAD PLASTICOS", 
          guidance_text: "Inspeccione cada cinturón de seguridad, verificando que el plástico no esté roto y que la hebilla cierre correctamente.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.4",
          question_text: "REVISAR ESTADO Y ASEO DE LA CARRILERA", 
          guidance_text: "Asegúrese de que los rieles de la carrilera estén limpios, sin obstrucciones ni objetos extraños en todo su recorrido.",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "2",
      question_text: "LOCOMOTORA", 
      input_type: "section",
      children: [
        {
          item_number: "2.1",
          question_text: "REVISAR ARRANQUE Y PARADA DEL TREN", 
          guidance_text: "Realice una prueba de funcionamiento para confirmar que el tren arranca suavemente y se detiene por completo al accionar los controles.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.2",
          question_text: "REVISAR PASADORES DE LOCOMOTORA Y VAGON", 
          guidance_text: "Verifique que los pasadores que unen la locomotora con el vagón estén bien colocados y asegurados para evitar que se separen.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.3",
          question_text: "REVISAR ESTADO Y ASEO DE LA CARRILERA", 
          guidance_text: "Realice una segunda inspección de la carrilera para garantizar que no haya objetos que puedan interferir con el paso del tren.",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "3",
      question_text: "ESTRUCTURA", 
      input_type: "section",
      children: [
        {
          item_number: "3.1",
          question_text: "REVISAR ESTADO Y ASEO DE LA ATRACCION QUE NO EXISTAN OBJETOS EXTRAÑOS", 
          guidance_text: "Haga una revisión general de toda la atracción para asegurarse de que esté limpia y libre de cualquier objeto perdido o basura.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.2",
          question_text: "REVISAR UNIONES DE LAS SECCIONES DE LA PISTA", 
          guidance_text: "Inspeccione visualmente cada punto de unión de la pista, asegurándose de que estén alineados y sin separaciones ni desniveles.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.3",
          question_text: "REVISAR ESTADO DE LA CANALETA", 
          guidance_text: "Verifique que la canaleta por donde pasan los cables de alimentación esté en buen estado, bien cubierta y sin daños.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.4",
          question_text: "REVISAR ESTADO DE LA PINTURA DE MURAL Y LOS ACCESORIOS DE LA ATRACCION", 
          guidance_text: "Observe el mural y los elementos decorativos para asegurarse de que la pintura no esté desgastada y que los accesorios estén completos.",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.5",
          question_text: "REVISAR ESTADO Y ASEO DE LA LOCOMOTORA Y EL VAGON", 
          guidance_text: "Limpie e inspeccione la locomotora y el vagón, prestando atención a los asientos, el piso y las superficies para los visitantes.",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "4",
      question_text: "LISTO PARA ENTREGAR A OPERACIÓN", 
      input_type: "section",
      children: [
        {
          item_number: "4.1",
          question_text: "¿LISTO PARA ENTREGAR A OPERACIÓN? (SI-NO)", 
          guidance_text: "Confirme que todos los puntos anteriores han sido verificados y que la atracción es completamente segura para su funcionamiento.",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
  ],
}
