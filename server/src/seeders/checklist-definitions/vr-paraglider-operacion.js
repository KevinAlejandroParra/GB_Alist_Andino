'use strict';

module.exports = {
  name: "Check List Atracciones – VR Paraglider - Operacion",
  description: "Check list diario de operación para la atracción VR Paraglider",
  frequency: "diario",
  version_label: "V1 OCT 2026",
  role_id: 4, // Corresponde a "Anfitrión"
  attraction_name: "VR Paraglider",
  premise_id: 2,
  specific_inspectable_names: ["VR Paraglider"],
  items: [
    {
      item_number: "1",
      question_text: "ENTORNO GENERAL",
      input_type: "section",
      children: [
        {
          item_number: "1.1",
          question_text: "VERIFIQUE QUE LA BARANDA ESTE ANCLADA FIRMEMENTE, MOVER CADA TRAMO CONFIRMANDO.",
          guidance_text: "Mueva suavemente cada tramo de la baranda para asegurarse de que no haya piezas flojas o desancladas.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.2",
          question_text: "VERIFICAR EL ESTADO DEL LECTOR: FUNCIONAMIENTO Y CONEXIÓN DE RED, PASE LA TARJETA",
          guidance_text: "Pase una tarjeta de prueba para confirmar la lectura y revise que el lector tenga conexión de red activa.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.3",
          question_text: "VERIFICAR CICLO SIN PASAJEROS, VERIFICAR RECORRIDO SUAVE, AUSENCIA DE RUIDOS Y VIBRACION",
          guidance_text: "Active un ciclo de prueba sin personas y confirme que el movimiento sea fluido, sin ruidos extraños ni vibraciones inusuales.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.4",
          question_text: "REVISAR ESTADO DE LOS CINTURONES DE SEGURIDAD PLASTICOS",
          guidance_text: "Inspeccione visualmente que los cinturones no tengan cortes, grietas o desgaste excesivo.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.5",
          question_text: "REVISAR ESTADO Y ASEO DEL ENTORNO TOTAL DE LA ATRACCIÓN, INCLUYENDO CERRAMIENTO Y ACRILICOS",
          guidance_text: "Asegúrese de que el área esté limpia, sin basura y que los acrílicos y cerramientos estén en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.6",
          question_text: "REVISAR Y VERIFICAR LA FIJACIÓN Y ESTADO DE LA REGLA Y EL STICKER DE ESTATURA MINIMA",
          guidance_text: "Confirme que la regla de medición esté firme y que el sticker de estatura mínima sea legible.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "2",
      question_text: "ASIENTOS, ARNESES Y SEGURIDAD",
      input_type: "section",
      children: [
        {
          item_number: "2.1",
          question_text: "VERIFICAR ARNES/CINTURON JUGADOR 1 Y 2 SIN CORTES Y DESGASTE.",
          guidance_text: "Revise minuciosamente los arneses y cinturones de ambos jugadores buscando daños estructurales.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "2.2",
          question_text: "REVISAR ASEO DE LAS SILLAS Y LOS ARNES",
          guidance_text: "Limpie y verifique que las superficies de contacto estén higienizadas para el próximo uso.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "2.3",
          question_text: "REVISAR CABLES, CONECTORES Y PROTECCIÓN EN LAS ZONAS MÓVILES; QUE NO ESTÉN PELLIZCADOS DE LOS MANILLARES DE CONTROL DE VUELO",
          guidance_text: "Inspeccione que el cableado en zonas de movimiento no esté atrapado o sufriendo fricción innecesaria.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "3",
      question_text: "SISTEMA ELÉCTRICO",
      input_type: "section",
      children: [
        {
          item_number: "3.1",
          question_text: "REVISAR ILUMINACION QUE ESTE TOTALMENTE ENCENDIDA",
          guidance_text: "Encienda todas las luces de la atracción y verifique que no haya bombillos fundidos o fallas de iluminación.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "4",
      question_text: "SISTEMA VR Y COMPUTADOR",
      input_type: "section",
      children: [
        {
          item_number: "4.1",
          question_text: "REVISAR QUE EL COMPUTADOR INICIA CORRECTAMENTE.",
          guidance_text: "Encienda el equipo y confirme que el sistema operativo cargue sin errores.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.2",
          question_text: "VERIFICAR QUE EL SOFTWARE DEL JUEGO INICIA SIN ERRORES EN LA PANTALLA DE CONTROL",
          guidance_text: "Inicie la aplicación del juego y asegúrese de que no aparezcan mensajes de error en el monitor de control.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.3",
          question_text: "REVISAR QUE LA PANTALLA O MONITOR FRONTAL FUNCIONA CORRECTAMENTE",
          guidance_text: "Verifique que la pantalla externa muestre la imagen del juego con claridad.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.4",
          question_text: "REVISAR QUE EL BOTON DE LLAMADO A SERVICIO ESTE FUNCIONANDO",
          guidance_text: "Presione el botón de servicio y confirme que la señal sea recibida correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "5",
      question_text: "LISTO PARA ENTREGAR A OPERACIÓN",
      input_type: "section",
      children: [
        {
          item_number: "5.1",
          question_text: "¿LISTO PARA ENTREGAR A OPERACIÓN? (SI-NO)",
          guidance_text: "Confirme si la atracción cumple con todos los requisitos para iniciar la operación al público.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
  ],
};
