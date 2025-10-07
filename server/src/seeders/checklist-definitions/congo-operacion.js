module.exports = {
  name: "Atracciones – Congo / Play Ground (V1 SEP 2025 - BY: Alejandro Parra)",
  description: "Checklist diario de operación para la atracción Congo / Play Ground",
  frequency: "diario",
  version_label: "V1 SEP 2025 - BY: Alejandro Parra",
  role_id: 8, // Corresponde a "Anfitrión"
  attraction_name: "Congo", // Nombre del inspectable para buscar su ID
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
            "VERIFIQUE ESTADO DE AVISO DE REGLAMENTO Y REGLA DE MEDIDA NIÑOS",
          guidance_text:
            "Asegúrese de que el aviso del reglamento y la regla de medida estén visibles, legibles y en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.2",
          question_text: "VERIFIQUE LA APERTURA Y CIERRE DE PUERTAS",
          guidance_text: "Confirme que todas las puertas de acceso abran y cierren correctamente, y que los seguros funcionen.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.3",
          question_text: "VERIFIQUE EL ASEO DE LAS COLCHONETAS Y TAPETE DEL PISO",
          guidance_text: "Inspeccione que las colchonetas y tapetes estén limpios, secos y sin objetos extraños.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.4",
          question_text: "VERIFICAR EL FUNCIONAMIENTO DEL LECTOR",
          guidance_text: "Realice una prueba con una tarjeta para confirmar que el lector de acceso funciona correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.5",
          question_text: "VERIFICAR EL FUNCIONAMIENTO DEL CRONOMETRO",
          guidance_text: "Inicie y reinicie el cronómetro para asegurar que está operando y es visible para el control del tiempo.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.6",
          question_text: "VERIFICAR EL SONIDO DEL TIMBRE (CALIDAD Y VOLUMEN)",
          guidance_text: "Active el timbre para comprobar que el sonido es claro y tiene un volumen adecuado para ser escuchado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.7",
          question_text: "VERIFICAR DAÑO O DETERIORO DEL ACOLCHADO DE LOS FORROS EN LOS SITIOS MAS CRITICOS DE LA ATRACCION",
          guidance_text:
            "Revise las zonas de alto tráfico y contacto en busca de rasgaduras o desgaste en los forros protectores.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.8",
          question_text: "VERIFICAR EL ASEO Y ENCENDIDO DE LA ILUMINACIÓN DE ESTA ATRACCIÓN",
          guidance_text: "Encienda todas las luces del área para confirmar que funcionan y que la zona está bien iluminada y limpia.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "2",
      question_text: "DESLIZADEROS",
      input_type: "section",
      children: [
        {
          item_number: "2.1",
          question_text: "VERIFIQUE ASEO, UBICACIÓN Y ESTADO DE LAS COLCHONETAS DE PISO",
          guidance_text: "Asegúrese de que las colchonetas al final de los deslizaderos estén limpias, en buen estado y bien posicionadas.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "2.2",
          question_text: "REVISE EL ASEO Y ESTADO DE LOS DESLIZADEROS",
          guidance_text: "Inspeccione la superficie de todos los deslizaderos para verificar que estén limpios y sin fisuras o daños.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "3",
      question_text: "TOBOGAN ESPIRAL",
      input_type: "section",
      children: [
        {
          item_number: "3.1",
          question_text: "VERIFIQUE ESTADO, ASEO Y UBICACIÓN DE LA COLCHONETA DE LA SALIDA",
          guidance_text: "Confirme que la colchoneta de recepción del tobogán esté limpia, sin daños y correctamente ubicada para la seguridad.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "3.2",
          question_text: "VERIFICAR ESTADO Y ASEO HACIENDO EL DESCENSO POR EL TOGOGAN ESPIRAL",
          guidance_text: "Realice un descenso de prueba para asegurarse de que el interior del tobogán está limpio y no tiene obstrucciones.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "4",
      question_text: "ELEMENTOS INTERACTIVOS BOXEADORES",
      input_type: "section",
      children: [
        {
          item_number: "4.1",
          question_text: "REVISE EL ESTADO Y ASEO DE CADA BOXEADOR",
          guidance_text: "Inspeccione cada boxeador (saco) para verificar que esté limpio, bien inflado y sin rasgaduras.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.2",
          question_text: "VERIFICAR LA COSTURA DE LA REATA CON RESPECTO A LA LONA",
          guidance_text: "Revise las costuras que unen la cinta (reata) de sujeción con el cuerpo del boxeador, buscando hilos sueltos o desgarros.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.3",
          question_text: "VERIFICAR EL DESGASTE DEL ACOPLE Y QUE SE ENCUENTRE BIEN CERRADO, HALANDO",
          guidance_text: "Tire firmemente del acople de sujeción para asegurar que no presenta desgaste excesivo y está bien cerrado.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
        {
      item_number: "5",
      question_text: "ELEMENTOS INTERACTIVOS BONGOS",
      input_type: "section",
      children: [
        {
          item_number: "5.1",
          question_text: "VERIFIQUE ASEO Y LA CORRECTA OPERACIÓN DE CADA BONGO",
          guidance_text: "Golpee suavemente cada bongo para confirmar que emite sonido y que su superficie está limpia.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "5.2",
          question_text: "REVISE ESTADO GENERAL DE CADA BONGO: TUBO, PINTURA Y FIBRA",
          guidance_text: "Inspeccione la estructura completa de los bongos, incluyendo el tubo de soporte, la pintura y la fibra, buscando daños.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "6",
      question_text: "CANGUROS",
      input_type: "section",
      children: [
        {
          item_number: "6.1",
          question_text: "REVISAR ESTADO, ASEO Y ESTRUCTURA (NINGUN ELEMENTO DEBE ESTAR SUELTO O FLOJO)",
          guidance_text: "Mueva cada canguro para asegurarse de que su estructura esté firme, limpia y sin partes sueltas.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "7",
      question_text: "PLATAFORMAS",
      input_type: "section",
      children: [
        {
          item_number: "7.1",
          question_text: "VERIFIQUE EL ESTADO, AJUSTE, ASEO Y PERFECTO ACOLCHADO DE LAS PLATAFORMAS",
          guidance_text: "Revise todas las plataformas, asegurándose de que estén limpias, bien ajustadas y que el acolchado cubra todas las partes necesarias.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "8",
      question_text: "PISCINA DE PELOTAS",
      input_type: "section",
      children: [
        {
          item_number: "8.1",
          question_text: "VERIFIQUE EL ESTADO Y ASEO DE LAS PELOTAS, PROTECTORES Y CERRAMIENTO",
          guidance_text: "Inspeccione que las pelotas, los acolchados protectores y la malla de cerramiento estén limpios y en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
     {
      item_number: "9",
      question_text: "CAMARAS Y ELEMENTOS INTERACTIVOS (LUCES, SENSORES Y SONIDO)",
      input_type: "section",
      children: [
        {
          item_number: "9.1",
          question_text: "VERIFIQUE EL FUNCIONAMIENTO DE LOS SENSORES, LUCES Y SONIDOS DE CADA UNO DE LOS MODULOS",
          guidance_text: "Active cada módulo interactivo para confirmar que los sensores, luces y sonidos funcionan como se espera.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "9.2",
          question_text: "VERIFICAR POSICION Y VISUALIZACION EN LA PANTALLA DE CADA UNA DE LAS CAMARAS",
          guidance_text: "Observe el monitor para asegurar que todas las cámaras están encendidas, bien posicionadas y transmitiendo video.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "10",
      question_text: "PISO EN REATA, MALLA, PUENTES DE MADERA Y PASOS DE ATILA",
      input_type: "section",
      children: [
        {
          item_number: "10.1",
          question_text: "VERIFIQUE ASEO, AJUSTE Y ESTADO DE CADA ELEMENTO DE ESTOS PASOS",
          guidance_text: "Recorra y revise cada uno de estos pasajes, verificando que estén limpios, tensados y sin elementos rotos o sueltos.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "11",
      question_text: "ZONA CARGA Y PRECARGA",
      input_type: "section",
      children: [
        {
          item_number: "11.1",
          question_text: "VERIFIQUE EL ESTADO Y ASEO DE BALONES, TAPETE Y JUEGOS INTERACTIVOS",
          guidance_text: "Asegúrese de que todos los elementos en la zona de espera (balones, tapetes, etc.) estén limpios y en buenas condiciones.",
          input_type: "radio",
          allow_comment: true,
        },
        {
            item_number: "11.2",
            question_text: "VERIFIQUE FIJACION Y ASEO DE LA ZAPATERA",
            guidance_text: "Confirme que la zapatera esté limpia y firmemente anclada, sin riesgo de volcarse.",
            input_type: "radio",
            allow_comment: true,
        },
      ],
    },
    {
      item_number: "12",
      question_text: "CONTROLES FINALES",
      input_type: "section",
      children: [
        {
          item_number: "12.1",
          question_text: "SE REALIZO EL ASEO Y LA DESINFECCIÓN CORRECTA DE LA ATRACCIÓN?",
          guidance_text: "Confirme que se ha completado el protocolo de limpieza y desinfección general de toda la atracción.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "12.2",
          question_text: "REVISAR EL ASEO Y ESTADO FISICO DE LA ZAPATERA",
          guidance_text: "Realice una última verificación de la limpieza y estabilidad de la zapatera.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "12.3",
          question_text: "VERIFICAR QUE SE CUENTE CON GEL ANTIBACTERIAL",
          guidance_text: "Asegúrese de que los dispensadores de gel antibacterial estén llenos y funcionales.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "12.4",
          question_text: "VERIFICAR QUE LA ATRACCION CUENTE CON STICKERS DE FELIX Y ALEGRA Y/O DULCES",
          guidance_text: "Confirme que hay suficientes stickers o dulces disponibles para entregar a los visitantes, si aplica.",
          input_type: "radio",
          allow_comment: true,
        },
        {
            item_number: "12.5",
            question_text: "VERIFICAR EL ESTADO DE LA FICHA DE SERVICIO",
            guidance_text: "Revise que la ficha de servicio esté actualizada, visible y en buen estado.",
            input_type: "radio",
            allow_comment: true,
        },
        {
            item_number: "12.6",
            question_text: "VERIFICAR QUE LA ATRACCION CUENTE CON MANILLAS DE CONTROL",
            guidance_text: "Asegúrese de tener a mano la cantidad necesaria de manillas de control para la operación del día.",
            input_type: "radio",
            allow_comment: true,
        },
      ],
    },
    {
      item_number: "13",
      question_text: "LISTO PARA OPERAR",
      input_type: "section",
      children: [
        {
          item_number: "13.1",
          question_text: "¿La atracción está lista para entregar a operación? (SI/NO)",
          guidance_text: "Marque SÍ solo si ha completado todas las verificaciones y considera que la atracción es segura para los visitantes.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
  ],
}
