'use strict';

const vrParagliderRaw = [
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
        question_text: "Verificar ciclo sin pasajeros: recorrido suave, ausencia de ruidos y vibración.",
        guidance_text: "Active la máquina sin pasajeros y confirme que el recorrido sea suave y sin ruidos ni vibraciones anormales.",
      },
      {
        question_text: "Revisar estado de los cinturones de seguridad plásticos.",
        guidance_text: "Inspeccione que no estén rotos ni desgastados y que las hebillas funcionen correctamente.",
      },
      {
        question_text: "Revisar estado y aseo de sillas y entorno.",
        guidance_text: "Verifique la limpieza general de las sillas y el área circundante de la atracción.",
      },
    ],
  },
  {
    section: "Asientos, Arneses y Seguridad",
    items: [
      {
        question_text: "Verificar arnés/cinturón jugador 1 y 2 sin cortes y desgaste.",
        guidance_text: "Inspeccione visualmente cada arnés buscando cortes, deshilachados o desgaste que comprometan su resistencia.",
      },
      {
        question_text: "Revisar cinturones, hebillas y cierres que funcionan correctamente.",
        guidance_text: "Pruebe el enganche y desenganche de cada hebilla y cierre confirmando que operen sin dificultad.",
      },
      {
        question_text: "Revisar puntos de anclaje de los asientos/arnés firmes.",
        guidance_text: "Verifique que todos los puntos de anclaje estén apretados y sin holgura.",
      },
      {
        question_text: "Revisar elementos de suspensión sin desgaste, deformación o daño visible.",
        guidance_text: "Inspeccione cables, correas y elementos de suspensión buscando cualquier deformación o daño estructural.",
      },
    ],
  },
  {
    section: "Sistema Mecánico y Movimiento",
    items: [
      {
        question_text: "Revisar mecanismo de movimiento sin piezas flojas.",
        guidance_text: "Revise todo el mecanismo de movimiento confirmando que no haya tornillos, tuercas o piezas sueltas.",
      },
      {
        question_text: "Revisar motores/actuadores sin ruidos anormales.",
        guidance_text: "Encienda los motores y actuadores escuchando atentamente cualquier ruido inusual que indique desgaste.",
      },
      {
        question_text: "Revisar rodamientos, articulaciones y soportes sin holgura evidente.",
        guidance_text: "Mueva manualmente las articulaciones y soportes verificando que no tengan juego excesivo.",
      },
      {
        question_text: "Revisar que la máquina regresa correctamente a posición de reposo.",
        guidance_text: "Al finalizar el ciclo, confirme que la máquina retorna suavemente a la posición inicial de reposo.",
      },
    ],
  },
  {
    section: "Sistema Eléctrico",
    items: [
      {
        question_text: "Revisar cable de alimentación en buen estado.",
        guidance_text: "Inspeccione el cable de alimentación en toda su longitud buscando cortes, aplastamientos o daños en el aislante.",
      },
      {
        question_text: "Revisar ventilación del gabinete libre de obstrucciones.",
        guidance_text: "Verifique que las rejillas y ventiladores del gabinete eléctrico estén limpios y sin bloqueos.",
      },
      {
        question_text: "Revisar conectores eléctricos correctamente ajustados.",
        guidance_text: "Confirme que todos los conectores eléctricos estén firmes y bien insertados sin signos de sobrecalentamiento.",
      },
      {
        question_text: "Revisar iluminación que esté totalmente encendida.",
        guidance_text: "Encienda todas las luces de la atracción verificando que todas funcionen correctamente.",
      },
    ],
  },
  {
    section: "Sistema VR y Computador",
    items: [
      {
        question_text: "Revisar que el computador inicia correctamente.",
        guidance_text: "Encienda el computador y espere a que cargue completamente el sistema operativo sin errores.",
      },
      {
        question_text: "Verificar que el software del juego inicia sin errores.",
        guidance_text: "Abra la aplicación del juego y confirme que cargue hasta la pantalla principal sin mensajes de error.",
      },
      {
        question_text: "Verificar que el visor VR jugador 1 funciona correctamente.",
        guidance_text: "Coloque y encienda el visor VR del jugador 1, verifique imagen clara y sin distorsiones.",
      },
      {
        question_text: "Verificar que el visor VR jugador 2 funciona correctamente.",
        guidance_text: "Coloque y encienda el visor VR del jugador 2, verifique imagen clara y sin distorsiones.",
      },
      {
        question_text: "Verificar que el juego y movimiento de la máquina están sincronizados.",
        guidance_text: "Inicie una sesión de prueba y confirme que el movimiento físico de la máquina corresponde con lo que se ve en los visores.",
      },
    ],
  },
  {
    section: "Efectos y Accesorios",
    items: [
      {
        question_text: "Revisar que los ventiladores funcionan correctamente.",
        guidance_text: "Encienda los ventiladores verificando que giren a la velocidad correcta sin ruidos anormales.",
      },
      {
        question_text: "Revisar que las rejillas de ventilación estén limpias.",
        guidance_text: "Limpie o verifique la limpieza de todas las rejillas de ventilación para garantizar el flujo de aire.",
      },
      {
        question_text: "Revisar que la pantalla o monitor frontal funciona correctamente.",
        guidance_text: "Encienda el monitor frontal y verifique que muestre imagen correcta sin píxeles muertos ni distorsión.",
      },
      {
        question_text: "Revisar que el sonido funciona correctamente.",
        guidance_text: "Pruebe el sistema de audio verificando claridad, volumen adecuado y ausencia de distorsión.",
      },
    ],
  },
  {
    section: "Sistema de Seguridad",
    items: [
      {
        question_text: "Revisar que al activar la parada de emergencia, el movimiento se detiene correctamente.",
        guidance_text: "Con la máquina en movimiento, active el botón de parada de emergencia y confirme detención inmediata.",
      },
      {
        question_text: "Revisar que el sistema puede restablecerse normalmente después de la prueba.",
        guidance_text: "Tras la prueba de emergencia, siga el procedimiento de restablecimiento y confirme que la máquina vuelve a operar con normalidad.",
      },
    ],
  },
  {
    section: "Listo para Entregar a Operación",
    items: [
      {
        question_text: "¿El juego está listo para entregar a operación? (Sí/No)",
        guidance_text: "Confirme que la atracción ha sido inspeccionada completamente según las recomendaciones del fabricante y condiciones de servicio.",
      },
    ],
  },
];

const transformItems = (rawItems) => {
  return rawItems.map((section, sectionIndex) => ({
    item_number: String(sectionIndex + 1),
    question_text: section.section.toUpperCase(),
    input_type: 'section',
    children: section.items.map((item, itemIndex) => ({
      item_number: `${sectionIndex + 1}.${itemIndex + 1}`,
      question_text: item.question_text.toUpperCase(),
      guidance_text: item.guidance_text,
      input_type: 'radio',
      allow_comment: true,
    })),
  }));
};

module.exports = {
  name: "Check List Atracciones – VR Paraglider - Tecnico",
  description: "Check list diario de mantenimiento para la atracción VR Paraglider",
  frequency: "diario",
  version_label: "V1 AGO 2026",
  role_id: 3, // Técnico de mantenimiento
  attraction_name: "VR Paraglider",
  premise_id: 2,
  items: transformItems(vrParagliderRaw),
};
