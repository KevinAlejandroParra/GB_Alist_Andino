module.exports = {
  name: "Atracciones – Baby House (V2 OCT 2018)",
  description: "Checklist diario de mantenimiento para la atracción Baby House",
  frequency: "diario",
  version_label: "V2 OCT 2018",
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
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
            "VERIFIQUE EL ESTADO Y TENSION DE LA MALLA DEL CERRAMIENTO TENIENDO EN CUENTA LA SEPARACION CON RESPECTO AL TUBO",
          guidance_text:
            "Inspeccionar visualmente la malla, verificar que no tenga roturas y que mantenga la distancia adecuada del tubo",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.2",
          question_text: "VERIFIQUE ESTADO DE LAS PUERTAS DEL CERRAMIENTO",
          guidance_text: "Revisar bisagras, cerraduras y que abran/cierren correctamente sin obstáculos",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.3",
          question_text: "VERIFIQUE EL ASEO Y ESTADO DE LAS COLCHONETAS Y TAPETE DEL PISO",
          guidance_text: "Verificar limpieza, ausencia de rasgaduras y que estén bien fijadas al piso",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.4",
          question_text: "VERIFICAR EL ESTADO DEL LECTOR: FUNCIONAMIENTO Y CONEXIÓN DE RED, PASE LA TARJETA",
          guidance_text: "Probar el lector con una tarjeta, verificar conectividad y respuesta del sistema",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.5",
          question_text: "VERIFICAR FUNCIONAMIENTO Y ASEO DE LOS VENTILADORES",
          guidance_text: "Probar ventiladores verificando rotación correcta y limpieza de aspas",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.6",
          question_text:
            "VERIFICAR DAÑO O DETERIORO DEL ACOLCHADO DE LOS FORROS EN LOS SITIOS MAS CRITICOS DE LA ATRACCION",
          guidance_text:
            "Inspeccionar zonas de mayor impacto por desgaste o daños en el acolchado, cambiar si es necesario",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.7",
          question_text: "VERIFICAR EL ASEO DEL ENTORNO DE LA ATRACCION (CERRAMIENTO, PERSIANAS Y PAREDES)",
          guidance_text: "Revisar limpieza general del área circundante, cerramiento, persianas y paredes",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.8",
          question_text: "VERIFICAR ESTADO Y AJUSTE DE LA ZAPATERA",
          guidance_text: "Revisar que la zapatera esté bien fijada y en buen estado",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.9",
          question_text: "VERIFICAR EL ENCENDIDO DE LA ILUMINACIÓN GENERAL",
          guidance_text: "Probar todas las luces del área general verificando encendido correcto",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.10",
          question_text: "VERIFICAR EL SONIDO GENERAL DEL SISTEMA (CALIDAD Y VOLUMEN)",
          guidance_text: "Probar sistema de sonido verificando claridad y volumen adecuado",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.11",
          question_text: "VERIFICAR FUNCIONAMIENTO DEL CRONÓMETRO Y VALIDAR PULSADORES",
          guidance_text: "Probar cronómetro iniciándolo y verificar funcionamiento de todos los botones",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "1.12",
          question_text: "VERIFICAR FUNCIONAMIENTO DE SENSORES Y BLOWER GENERALES",
          guidance_text: "Probar respuesta de sensores generales y funcionamiento de sopladores del área",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "2",
      question_text: "CASA INTERACTIVA",
      input_type: "section",
      children: [
        {
          item_number: "2.1",
          question_text: "INSPECCIONE EL ASEO Y ESTADO DE LOS ESCALONES (TAPIZADO Y ESTRUCTURA)",
          guidance_text: "Revisar que el tapizado esté limpio, sin roturas y bien adherido a la estructura",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.2",
          question_text: "REVISE ASEO Y ESTADO DE LA RAMPA DE DESCENSO Y SUS LATERALES",
          guidance_text: "Verificar superficie lisa, limpia y que los laterales estén seguros",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.3",
          question_text:
            "VERIFIQUE EL ESTADO Y TENSION DE LA MALLA DEL CERRAMIENTO TENIENDO EN CUENTA LA SEPARACION CON RESPECTO AL TUBO",
          guidance_text: "Inspeccionar malla perimetral, tensión adecuada y distancia de seguridad",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.4",
          question_text: "VERIFIQUE ASEO Y ESTADO DE LAS COSTURAS DE LA ESCALERA DE REATA",
          guidance_text: "Revisar que las costuras estén íntegras y bien cosidas sin hilos sueltos",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.5",
          question_text:
            "VERIFICAR DAÑO O DETERIORO DEL ACOLCHADO DE LOS FORROS EN LOS SITIOS MAS CRITICOS DE LA ATRACCION",
          guidance_text: "Inspeccionar zonas de mayor impacto, verificar grosor y integridad del acolchado",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "2.6",
          question_text: "VERIFIQUE ASEO Y ESTADO DE LA ESTRUCTURA Y TORNILLERIA DE LA CASA",
          guidance_text: "Revisar que todos los tornillos estén apretados y la estructura sin fisuras",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "3",
      question_text: "CAMA ELASTICA",
      input_type: "section",
      children: [
        {
          item_number: "3.1",
          question_text: "REVISAR ESTADO DE LOS RESORTES (ENTRE LA LONA Y LA ESTRUCTURA)",
          guidance_text: "Verificar que todos los resortes estén en buen estado, sin oxidación ni deformaciones",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.2",
          question_text: "REVISAR EL ESTADO DE LA LONA DEL SALTARÍN Y AJUSTARLA SI ES NECESARIO",
          guidance_text: "Inspeccionar la lona por roturas, desgaste y verificar tensión adecuada",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "3.3",
          question_text: "VERIFICAR EL PERFECTO ACOLCHADO ALREDEDOR DE LOS RESORTES",
          guidance_text: "Asegurar que el acolchado cubra completamente los resortes para evitar lesiones",
          input_type: "boolean",
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
          question_text: "VERIFICAR EL ASEO Y ESTADO DE LOS PONY´S (Manilares, Ojos, Sillas y Ponis)",
          guidance_text: "Inspeccionar limpieza y estado de cada componente del pony, verificar fijación",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "4.2",
          question_text: "VERIFICAR EL ASEO Y ESTADO DEL PISO DEL CARRUSEL Y BOTON DE START",
          guidance_text: "Revisar superficie del piso limpia y botón de inicio funcionando correctamente",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "4.3",
          question_text: "VERIFICAR LA OPERACIÓN DEL CARRUSEL (Sonido, Luces y Movimiento)",
          guidance_text: "Probar funcionamiento completo: rotación suave, música clara y luces operativas",
          input_type: "boolean",
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
          guidance_text: "Revisar que las fichas estén limpias, sin roturas y en cantidad completa",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "5.2",
          question_text: "ORGANIZAR FICHAS EN EL LUGAR DESIGNADO",
          guidance_text: "Colocar todas las fichas en su contenedor o área específica de almacenamiento",
          input_type: "boolean",
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
          guidance_text: "Inspeccionar limpieza del acolchado y que todos los pegues estén firmes",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "6.2",
          question_text: "VERIFICAR AJUSTE DE DIENTES, COLA, OREJAS, MELENA Y OJOS",
          guidance_text: "Revisar que todas las partes del león estén bien fijadas y sin desprendimientos",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "6.3",
          question_text: "VERIFICAR LIMPIEZA Y ESTADO DE LOS ACCESORIOS DEL LEON",
          guidance_text: "Inspeccionar todos los elementos adicionales del león por limpieza y daños",
          input_type: "boolean",
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
          guidance_text: "Probar que el botón active el soplador y genere el efecto volcánico esperado",
          input_type: "boolean",
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
          guidance_text: "Probar todos los componentes interactivos del juego de guitarra",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "8.2",
          question_text: "VERIFIQUE EL ASEO Y ESTADO DE PELOTAS Y ATRACCION",
          guidance_text: "Inspeccionar limpieza de pelotas y estado general de la atracción",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "8.3",
          question_text: "VERIFICAR EL FUNCIONAMIENTO Y ASEO DE LA BANDA TRANSPORTADORA",
          guidance_text: "Probar movimiento suave de la banda y verificar limpieza de la superficie",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "8.4",
          question_text: "VERIFICAR FUNCIONAMIENTO DE SENSORES Y BLOWER DE CADA TUBO DE SUCCION",
          guidance_text: "Probar respuesta de sensores y funcionamiento de sopladores en cada tubo de succión",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "8.5",
          question_text: "VERIFICAR ESTADO, ASEO Y FIRMEZA DE LOS ACOLCHADOS DE LA PISCINA",
          guidance_text: "Inspeccionar acolchados de la piscina por limpieza, integridad y fijación adecuada",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "9",
      question_text: "ARBOL PAJARO QQ",
      input_type: "section",
      children: [
        {
          item_number: "9.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DEL PAJARO QQ (OPRIMIENDO EL BOTON)",
          guidance_text: "Probar el botón del pájaro, verificar sonido claro y movimiento correcto",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "10",
      question_text: "ARBOL CON OJOS EN MOVIMIENTO",
      input_type: "section",
      children: [
        {
          item_number: "10.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DE LOS OJOS (OPRIMIENDO EL BOTON)",
          guidance_text: "Probar botón de activación, verificar movimiento de ojos y sonidos asociados",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "11",
      question_text: "OSITO AVIADOR",
      input_type: "section",
      children: [
        {
          item_number: "11.1",
          question_text: "VERIFIQUE FIJACION GENERAL Y ASEO DE LA ATRACCION",
          guidance_text: "Revisar que el osito esté bien fijado y limpio en todas sus partes",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "11.2",
          question_text: "VERIFICAR QUE SE ESTE REALIZANDO EL MOVIMIENTO GIRATORIO DE LA ATRACCION",
          guidance_text: "Probar que el osito gire correctamente sin trabas ni ruidos anormales",
          input_type: "boolean",
          allow_comment: true,
        },
                {
          item_number: "11.3",
          question_text: "VERIFICAR ESTADO DE PROTECTORES (COSTURAS Y DESGASTE)",
          guidance_text: "Probar que todo este en perfecto estado",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "12",
      question_text: "ARBOL DEL TUCCAN",
      input_type: "section",
      children: [
        {
          item_number: "12.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DEL TUCAN (OPRIMIENDO EL BOTON)",
          guidance_text: "Probar botón del tucán, verificar sonido claro y respuesta del mecanismo",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "13",
      question_text: "ELEMENTOS INTERACTIVOS BOXEADORES",
      input_type: "section",
      children: [
        {
          item_number: "13.1",
          question_text: "VERIFIQUE FIJACION GENERAL, COSTURAS Y ESTADO DE CADA BOXEADOR",
          guidance_text: "Inspeccionar que cada boxeador esté bien fijado, costuras íntegras y sin desgaste",
          input_type: "boolean",
          allow_comment: true,
        },
             {
          item_number: "13.2",
          question_text: " VERIFICAR EL DESGASTE DEL ACOPLE Y QUE SE ENCUENTRE BIEN CERRADO, HALANDO",
          guidance_text: "Inspeccionar que el acople esté en buen estado y bien asegurado",
          input_type: "boolean",
          allow_comment: true,
        },
             {
          item_number: "13.3",
          question_text: "VERIFICAR LA COSTURA DE LA REATA CON RESPECTO A LA LONA",
          guidance_text: "Inspeccionar que la costura de la reata esté firme y sin hilos sueltos",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "14",
      question_text: "ELEMENTOS INTERACTIVOS Y PUFF",
      input_type: "section",
      children: [
        {
          item_number: "14.1",
          question_text: "VERIFICAR ESTADO DE PROTECTORES (COSTURAS Y DESGASTE)",
          guidance_text: "Revisar integridad de costuras y nivel de desgaste de los protectores",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "14.2",
          question_text:
            "VERIFICAR ESTADO, ASEO Y UBICACIÓN DE LOS PUFF (NO DEBE ESTAR CERCA A ELEMENTOS QUE PUEDAN GENERAR ACCIDENTE)",
          guidance_text: "Verificar posición segura de puffs, alejados de zonas de riesgo y en buen estado",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "15",
      question_text: "JUEGO INTERACTIVO (VACA)",
      input_type: "section",
      children: [
        {
          item_number: "15.1",
          question_text: "VERIFICAR EL FUNCIONAMIENTO DE CADA UNO DE LOS ELEMENTOS INTERACTIVOS DE LA ATRACCION",
          guidance_text: "Probar todos los elementos interactivos del juego de la vaca individualmente",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "15.2",
          question_text: "VERIFICAR FUNCIONAMIENTO DE SENSORES Y BLOWER DE CADA TUBO DE SUCCION",
          guidance_text: "Probar respuesta de sensores y funcionamiento de sopladores en cada tubo",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "15.3",
          question_text: "VERIFICAR ESTADO, ASEO Y FIRMEZA DE LOS ACOLCHADOS DE LA PISCINA",
          guidance_text: "Inspeccionar acolchados por limpieza, integridad y fijación adecuada",
          input_type: "boolean",
          allow_comment: true,
        },
        {
          item_number: "15.4",
          question_text: "VERIFICAR EL FUNCIONAMIENTO DEL CRONÓMETRO PONGALO EN MARCHA Y VALIDE PULSADORES",
          guidance_text: "Probar cronómetro iniciándolo y verificar funcionamiento de todos los botones",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "16",
      question_text: "PIANO DE PISO",
      input_type: "section",
      children: [
        {
          item_number: "16.1",
          question_text: "VERIFICAR ASEO, SONIDO Y FUNCIONAMIENTO DE LAS TECLAS (OPRIMIENDOLAS)",
          guidance_text: "Probar cada tecla del piano verificando sonido y respuesta táctil",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
    {
      item_number: "17",
      question_text: "LISTO PARA ENTREGAR A OPERACIÓN",
      input_type: "section",
      children: [
        {
          item_number: "17.1",
          question_text: "¿LISTO PARA ENTREGAR A OPERACIÓN? (SI-NO)",
          guidance_text:
            "Confirmación final de que la atracción ha sido inspeccionada completamente y está lista para operar",
          input_type: "boolean",
          allow_comment: true,
        },
      ],
    },
  ],
}
