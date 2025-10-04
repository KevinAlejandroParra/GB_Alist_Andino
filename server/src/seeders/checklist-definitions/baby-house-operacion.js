module.exports = {
  name: "Atracciones – Baby House - Operacion (V1 SEP 2025  - BY: Alejandro Parra)",
  description: "Checklist diario de operacion para la atracción Baby House",
  frequency: "diario",
  version_label: "V1 SEP 2025 - BY: Alejandro Parra",
  role_id: 8, // Corresponde a anfitrión
  attraction_name: "Baby House", // Nombre del inspectable para buscar su ID
  premise_id: 2, // ID del local al que pertenece la atracción
  items: [
    {
      item_number: "1",
      question_text: "ENTORNO GENERAL",
      input_type: "section",
      children: [
        {
          item_number: "1.1",
          question_text:
            "VERIFIQUE ASEO, ESTADO DEL AVISO DE REGLAMENTO Y REGLA DE MEDIDA DE LOS NIÑOS",
          guidance_text:
            "Asegúrese de que el aviso del reglamento y la regla de medida estén limpios, legibles y en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.2",
          question_text: "VERIFIQUE ESTADO, APERTURA Y CIERRE DE PUERTAS",
          guidance_text: "Revise que las puertas abran y cierren sin dificultad y que los seguros funcionen correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.3",
          question_text: "VERIFIQUE EL ASEO Y ESTADO DE LAS COLCHONETAS DEL PISO",
          guidance_text: "Inspeccione que las colchonetas estén limpias, sin roturas y correctamente ubicadas.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.4",
          question_text: "VERIFICAR EL ESTADO Y FUNCIONAMIENTO DEL LECTOR",
          guidance_text: "Pase una tarjeta de prueba para confirmar que el lector funciona y está conectado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.5",
          question_text: "VERIFICAR ESTADO Y FUNCIONAMIENTO DEL CRONOMETRO (HACER PRUEBA)",
          guidance_text: "Inicie y detenga el cronómetro para asegurar su correcto funcionamiento y visibilidad.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.6",
          question_text: "VERIFIQUE ESTADO Y ASEO DE LOS PUFF Y SILLAS",
          guidance_text: "Revise que los puffs y sillas estén limpios, sin daños en su estructura o tapizado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.7",
          question_text: "VERIFICAR EL SONIDO DEL TIMBRE (CALIDAD Y VOLUMEN)",
          guidance_text: "Active el timbre para comprobar que el sonido es claro y tiene un volumen adecuado.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.8",
          question_text: "VERIFICAR EL ESTADO Y ENCENDIDO DE LA ILUMINACIÓN SOBRE ESTA ZONA",
          guidance_text: "Encienda todas las luces para confirmar que funcionan correctamente y no hay bombillos quemados.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.9",
          question_text: "VERIFICAR EL AMBIENTADOR APLICADO A LA ATRACCIÓN (AROMA)",
          guidance_text: "Asegúrese de que el ambientador esté presente y el aroma sea el adecuado para el área.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.10",
          question_text:
            "VERIFICAR DAÑO O DETERIORO DEL ACOLCHADO DE LOS FORROS EN LOS SITIOS MAS CRITICOS DE LA ATRACCION",
          guidance_text:
            "Inspeccione las zonas de mayor uso en busca de desgastes o roturas en los forros acolchados.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "1.11",
          question_text: "VALIDAR LA DISPONIBILIDAD DE LAS POLAINAS PARA LOS CLIENTES",
          guidance_text: "Confirme que haya suficientes polainas limpias y disponibles para el uso de los visitantes.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "2",
      question_text: "CAMA ELASTICA",
      input_type: "section",
      children: [
        {
          item_number: "2.1",
          question_text: "REVISAR ESTADO DE LOS RESORTES (ENTRE LA LONA Y LA ESTRUCTURA)",
          guidance_text: "Verifique que todos los resortes estén completos, sin óxido y correctamente tensionados.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "3",
      question_text: "CASA INTERACTIVA",
      input_type: "section",
      children: [
        {
          item_number: "3.1",
          question_text: "VERIFICAR EL ASEO Y ESTADO DE LA CASA Y SUS ACCESOS",
          guidance_text: "Inspeccione la limpieza general de la estructura y que las entradas y salidas estén despejadas.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "3.2",
          question_text: "VERIFIQUE ASEO Y ESTADO DE LAS COLCHONETAS DE LOS DESCENSOS DE LA CASA",
          guidance_text: "Asegúrese de que las colchonetas en toboganes y rampas estén limpias y sin desperfectos.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "4",
      question_text: "CARRUSEL DE PONYS",
      input_type: "section",
      children: [
        {
          item_number: "4.1",
          question_text: "VERIFICAR EL ASEO Y ESTADO DE LOS PONY'S (Manilares, Ojos, Sillas y Ponis)",
          guidance_text: "Revise cada pony, asegurándose de que todas sus partes estén limpias, completas y seguras.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.2",
          question_text: "VERIFICAR EL ASEO Y ESTADO DEL PISO DEL CARRUSEL Y BOTON DE START",
          guidance_text: "Confirme que el piso esté limpio y el botón de inicio funcione correctamente al presionarlo.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "4.3",
          question_text: "VERIFICAR LA OPERACIÓN DEL CARRUSEL (Sonido, Luces y Movimiento)",
          guidance_text: "Active el carrusel para comprobar que el movimiento es suave y que las luces y el sonido funcionan.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "5",
      question_text: "FICHAS EN FOMY ARMATODO",
      input_type: "section",
      children: [
        {
          item_number: "5.1",
          question_text: "VERIFICAR EL ASEO Y ESTADO DE CADA FICHA",
          guidance_text: "Inspeccione que todas las fichas de fomy estén limpias y sin roturas o mordeduras.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "5.2",
          question_text: "ORGANIZAR FICHAS EN EL LUGAR DESIGNADO",
          guidance_text: "Asegúrese de que todas las fichas estén ordenadas y guardadas en su área correspondiente.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "6",
      question_text: "LEON Y ACCESORIOS",
      input_type: "section",
      children: [
        {
          item_number: "6.1",
          question_text: "VERIFICAR EL ASEO Y ESTADO DEL ACOLCHADO Y PEGUES DEL DISPOSITIVO",
          guidance_text: "Revise que el acolchado del león esté limpio y que todas las uniones y pegues estén firmes.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "6.2",
          question_text: "VERIFICAR AJUSTE DE DIENTES, COLA, OREJAS, MELENA Y OJOS",
          guidance_text: "Asegúrese de que todas las partes del león estén bien sujetas y no presenten riesgo de desprendimiento.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "7",
      question_text: "VOLCAN",
      input_type: "section",
      children: [
        {
          item_number: "7.1",
          question_text: "VERIFICAR FUNCIONAMIENTO DEL BOTON Y BLOWER DEL VOLCAN",
          guidance_text: "Presione el botón para confirmar que el soplador (blower) se activa y funciona correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "7.2",
          question_text: "VERIFIQUE EL ESTADO Y ASEO DE LAS PELOTAS (Cantidad de bolas a la mitad de la Piscina)",
          guidance_text: "Revise que las pelotas estén limpias y que el nivel en la piscina sea el adecuado (aproximadamente a la mitad).",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "8",
      question_text: "JUEGO INTERACTIVO GUITARRA Y BANDA TRANSPORTADORA",
      input_type: "section",
      children: [
        {
          item_number: "8.1",
          question_text: "VERIFIQUE EL ESTADO Y FUNCIONAMIENTO DE CADA UNO DE LOS ELEMENTOS DEL JUEGO",
          guidance_text: "Pruebe cada componente interactivo de la guitarra para asegurar que todos funcionan.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "8.2",
          question_text: "VERIFIQUE EL ASEO Y ESTADO DE PELOTAS Y ATRACCION",
          guidance_text: "Asegúrese de que tanto las pelotas como la estructura general de la atracción estén limpias.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "8.3",
          question_text: "VERIFICAR FUNCIONAMIENTO DE SENSORES Y BLOWER DE CADA TUBO DE SUCCION",
          guidance_text: "Pruebe cada tubo para confirmar que los sensores detectan y activan el soplador correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "8.4",
          question_text: "VERIFICAR ESTADO, ASEO Y FIRMEZA DE LOS ACOLCHADOS DE LA PISCINA",
          guidance_text: "Inspeccione los acolchados de la piscina para verificar que estén limpios, firmes y sin daños.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "8.5",
          question_text: "VERIFICAR EL FUNCIONAMIENTO Y ASEO DE LA BANDA TRANSPORTADORA",
          guidance_text: "Active la banda para asegurar que se mueve suavemente y que su superficie está limpia.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "9",
      question_text: "ARBOL CON OJOS EN MOVIMIENTO Y PAJARO QQ",
      input_type: "section",
      children: [
        {
          item_number: "9.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DE LOS OJOS (OPRIMIENDO EL BOTON)",
          guidance_text: "Presione el botón para confirmar que los ojos se mueven, el sonido se activa y todo está limpio.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "10",
      question_text: "OSITO AVIADOR",
      input_type: "section",
      children: [
        {
          item_number: "10.1",
          question_text: "VERIFIQUE FIJACION GENERAL Y ASEO DE LA ATRACCION",
          guidance_text: "Asegúrese de que el osito esté firmemente sujeto a su base y que toda la atracción esté limpia.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "10.2",
          question_text: "VERIFICAR QUE SE ESTE REALIZANDO EL MOVIMIENTO GIRATORIO DE LA ATRACCION",
          guidance_text: "Active el osito para comprobar que su movimiento giratorio es constante y sin ruidos extraños.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "10.3",
          question_text: "VERIFICAR ESTADO DE PROTECTORES (COSTURAS Y DESGASTE)",
          guidance_text: "Inspeccione los elementos de protección en busca de costuras rotas o desgaste excesivo.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "11",
      question_text: "ARBOL DEL TUCCAN",
      input_type: "section",
      children: [
        {
          item_number: "11.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DEL TUCAN (OPRIMIENDO EL BOTON)",
          guidance_text: "Presione el botón para asegurar que el tucán emite su sonido y funciona correctamente.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "12",
      question_text: "ELEMENTOS INTERACTIVOS BOXEADORES",
      input_type: "section",
      children: [
        {
          item_number: "12.1",
          question_text: "VERIFIQUE FIJACION GENERAL, COSTURAS Y ESTADO DE CADA BOXEADOR",
          guidance_text: "Revise cada boxeador para confirmar que esté bien sujeto y sin roturas en las costuras.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "12.2",
          question_text: "VERIFICAR LA COSTURA DE LA REATA CON RESPECTO A LA LONA",
          guidance_text: "Inspeccione cuidadosamente la unión de la reata a la lona para descartar desgarros.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "13",
      question_text: "ELEMENTOS INTERACTIVOS Y PUFF",
      input_type: "section",
      children: [
        {
          item_number: "13.1",
          question_text: "VERIFICAR EL FUNCIONAMIENTO DE CADA UNO DE LOS ELEMENTOS INTERACTIVOS DE LA ATRACCION",
          guidance_text: "Pruebe todos los elementos interactivos para asegurar que responden y funcionan como se espera.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "14",
      question_text: "JUEGO INTERACTIVO (VACA)",
      input_type: "section",
      children: [
        {
          item_number: "14.1",
          question_text: "REVISAR CADA UNO DE LOS ELEMENTOS QUE COMPONEN LA ATRACCION",
          guidance_text: "Inspeccione visual y funcionalmente cada parte del juego de la vaca.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "14.2",
          question_text: "REVISAR ASEO DE PELOTAS Y ACOLCHADOS DE CERRAMIENTO",
          guidance_text: "Asegúrese de que tanto las pelotas como los acolchados del área estén limpios y en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "15",
      question_text: "PIANO DE PISO",
      input_type: "section",
      children: [
        {
          item_number: "15.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DE LAS TECLAS (OPRIMIENDOLAS)",
          guidance_text: "Pise cada tecla para confirmar que está limpia, suena correctamente y responde al tacto.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "16",
      question_text: "ASEO",
      input_type: "section",
      children: [
        {
          item_number: "16.1",
          question_text: "SE REALIZO EL ASEO Y LA DESINFECCIÓN CORRECTA DE LA ATRACCIÓN?",
          guidance_text: "Confirme que se han seguido todos los protocolos de limpieza y desinfección en toda el área.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "17",
      question_text: "LISTO PARA OPERAR (SI-NO)",
      input_type: "section",
      children: [
        {
          item_number: "17.1",
          question_text: "VERIFICAR QUE SE CUENTE CON GEL ANTIBACTERIAL",
          guidance_text: "Asegúrese de que haya dispensadores con suficiente gel antibacterial para los visitantes.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "17.2",
          question_text: "VERIFICAR QUE LA ATRACCION CUENTE CON STICKERS DE FELIX Y ALEGRA Y/O DULCES",
          guidance_text: "Confirme que los insumos como stickers o dulces estén disponibles según corresponda.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "17.3",
          question_text: "VERIFICAR LA CANTIDAD DE MANILLAS DISPONIBLES PARA LA OPERACIÓN",
          guidance_text: "Asegúrese de que haya suficientes manillas de acceso para la jornada.",
          input_type: "radio",
          allow_comment: true,
        },
        {
          item_number: "17.4",
          question_text: "VERIFICAR EL ESTADO DE LA FICHA DE SERVICIO Y AVISOS EN GENERAL",
          guidance_text: "Revise que la ficha de servicio esté visible y que todos los avisos informativos estén en buen estado.",
          input_type: "radio",
          allow_comment: true,
        },
      ],
    },
  ],
}