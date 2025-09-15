'use strict';

const playgroundItems = [
  {
    id: 1,
    question_text: "ENTORNO GENERAL",
    children: [
      {
        id: 1.1,
        question_text:
          "REVISAR QUE NO EXISTAN ELEMENTOS CORTANTES, REVISAR LA ESTRUCTURA (NINGUN ELEMENTO DEBE ESTAR SUELTO O FLOJO)",
        guidance_text:
          "Inspeccionar toda la estructura buscando elementos sueltos, flojos o cortantes que puedan causar lesiones",
      },
      {
        id: 1.2,
        question_text: "VERIFICAR EL ANCLAJE DE PIEZAS DECORATIVAS Y ACCESORIOS COLGANTES",
        guidance_text: "Revisar que todas las piezas decorativas y accesorios estén firmemente anclados",
      },
      {
        id: 1.3,
        question_text: "VERIFIQUE EL ASEO DE LAS COLCHONETAS Y TAPETE DEL PISO DE TODA LA ATRACCIÓN",
        guidance_text: "Verificar limpieza y estado de colchonetas y tapetes en toda el área",
      },
      {
        id: 1.4,
        question_text: "VERIFICAR ENCENDIDO DE LA ILUMINACIÓN Y ASEO DE LAMPARAS DE ESTA ATRACCIÓN",
        guidance_text: "Comprobar funcionamiento de luces y limpieza de lámparas",
      },
      {
        id: 1.5,
        question_text:
          "VERIFIQUE EL ESTADO Y TENSION DE LA MALLA DEL CERRAMIENTO TENIENDO EN CUENTA LA SEPARACION CON RESPECTO AL TUBO",
        guidance_text: "Revisar tensión de malla y separación adecuada con respecto a tubos",
      },
      {
        id: 1.6,
        question_text: "VERIFIQUE ASEO Y ESTADO DE LAS PUERTAS DEL CERRAMIENTO",
        guidance_text: "Verificar limpieza y funcionamiento de puertas de acceso",
      },
      {
        id: 1.7,
        question_text: "REVISAR QUE LA ESTRUCTURA DE LA ENTRADA A LA ATRACCION SE ENCUENTRE FIJA",
        guidance_text: "Comprobar que la estructura de entrada esté firmemente fijada",
      },
      {
        id: 1.8,
        question_text:
          "VERIFICAR DAÑO O DETERIORO DEL ACOLCHADO DE LOS FORROS EN LOS SITIOS MAS CRITICOS DE LA ATRACCION",
        guidance_text: "Inspeccionar acolchados en zonas críticas, cambiar si es necesario",
      },
      {
        id: 1.9,
        question_text: "VERIFICAR ASEO Y ESTADO DE LOS FORROS Y AMARRES DE TODA LA ATRACCION",
        guidance_text: "Revisar limpieza y estado de forros y sistemas de amarre",
      },
      {
        id: 1.10,
        question_text: "VERIFICAR EL ESTADO DEL LECTOR: FUNCIONAMIENTO Y CONEXIÓN DE RED, PASE LA TARJETA",
        guidance_text: "Probar funcionamiento del lector de tarjetas y conexión de red",
      },
      {
        id: 1.11,
        question_text: "VERIFICAR EL SONIDO DEL TIMBRE (CALIDAD Y VOLUMEN)",
        guidance_text: "Comprobar funcionamiento, calidad y volumen del timbre",
      },
      {
        id: 1.12,
        question_text: "VERIFICAR EL FUNCIONAMIENTO DEL CRONÓMETRO PONGALO EN MARCHA Y VALIDE PULSADORES",
        guidance_text: "Probar cronómetro y todos sus pulsadores de control",
      },
    ],
  },
  {
    id: 2,
    question_text: "DESLIZADEROS",
    children: [
      {
        id: 2.1,
        question_text:
          "VERIFIQUE ESTADO DE LA LAMINA PLÁSTICA DE LOS DELIZADEROS (NO DEBEN EXISTIR ROTURAS) HE IDENTIFICAR SI EXISTE ALGUN RIESGO PARA LOS VISITANTES",
        guidance_text: "Inspeccionar láminas plásticas buscando roturas o riesgos para usuarios",
      },
      {
        id: 2.2,
        question_text: "REVISE EL ESTADO Y TENSIONE DEL LAZO GUÍA (PARA ASCENDER O DESCENDER)",
        guidance_text: "Verificar estado y tensión adecuada del lazo guía de ascenso/descenso",
      },
      {
        id: 2.3,
        question_text: "REVISE EN GENERAL LA TORNILLERIA Y AJUSTELA SI ES NECESARIO",
        guidance_text: "Inspeccionar y ajustar toda la tornillería de los deslizaderos",
      },
    ],
  },
  {
    id: 3,
    question_text: "TOBOGAN ESPIRAL",
    children: [
      {
        id: 3.1,
        question_text: "VERIFIQUE LA ESTABILIDAD DE LA ESTRUCTURA",
        guidance_text: "Comprobar que la estructura del tobogán esté estable y firme",
      },
      {
        id: 3.2,
        question_text: "REVISE LAS UNIONES DE LOS TOBOGANES",
        guidance_text: "Inspeccionar todas las uniones entre secciones del tobogán",
      },
      {
        id: 3.3,
        question_text: "REVISE EN GENERAL TORNILLERIA COMPLETA Y AJUSTADA",
        guidance_text: "Verificar que toda la tornillería esté completa y bien ajustada",
      },
      {
        id: 3.4,
        question_text: "VERIFIQUE ESTADO Y UBICACIÓN DE LA COLCHONETA DE LA SALIDA",
        guidance_text: "Revisar estado y posición correcta de colchoneta en la salida",
      },
      {
        id: 3.5,
        question_text: "VERIFIQUE ESTADO DE LA FIBRA DEL TOBOGAN, NO DEBEN EXISTIR FISURAS",
        guidance_text: "Inspeccionar fibra del tobogán buscando fisuras o daños",
      },
      {
        id: 3.6,
        question_text: "VERIFICAR QUE LOS TUBOS DE SOPORTE ESTEN FORRADOS CORRECTAMENTE",
        guidance_text: "Comprobar que el forrado de tubos de soporte esté en buen estado",
      },
    ],
  },
  {
    id: 4,
    question_text: "ELEMENTOS INTERACTIVOS BOXEADORES",
    children: [
      {
        id: 4.1,
        question_text: "VERIFIQUE FIJACION GENERAL Y ESTADO DE CADA BOXEADOR",
        guidance_text: "Revisar fijación y estado general de todos los boxeadores",
      },
      {
        id: 4.2,
        question_text: "VERIFICAR LA COSTURA DE LA REATA CON RESPECTO A LA LONA",
        guidance_text: "Inspeccionar costuras entre reata y lona buscando desgaste",
      },
      {
        id: 4.3,
        question_text: "VERIFICAR EL DESGASTE DEL ACOPLE Y QUE SE ENCUENTRE BIEN CERRADO, HALANDO",
        guidance_text: "Probar acople halando para verificar cierre y desgaste",
      },
    ],
  },
  {
    id: 5,
    question_text: "ELEMENTOS INTERACTIVOS BONGOS",
    children: [
      {
        id: 5.1,
        question_text: "VERIFIQUE FIJACION AL PISO DE CADA BONGO",
        guidance_text: "Comprobar que cada bongo esté firmemente fijado al piso",
      },
      {
        id: 5.2,
        question_text: "REVISE ESTADO GENERAL DE CADA BONGO: TUBO, PINTURA Y FIBRA",
        guidance_text: "Inspeccionar tubo, pintura y fibra de cada bongo",
      },
            {
        id: 5.3,
        question_text: "COMPRUEBE LA ADECUADA FIJACION DE LOS SOPORTES SUPERIORES",
        guidance_text: "Verificar fijación segura de todos los soportes superiores",
      },
    ],
  },
  {
    id: 6,
    question_text: "CANGUROS",
    children: [
      {
        id: 6.1,
        question_text: "REVISAR ESTRUCTURA (NINGUN ELEMENTO DEBE ESTAR SUELTO O FLOJO)",
        guidance_text: "Inspeccionar estructura completa buscando elementos sueltos",
      },
      {
        id: 6.2,
        question_text: "REVISAR EL BUEN ESTADO DE LOS PLATOS DONDE LOS NIÑOS SE PARAN",
        guidance_text: "Verificar estado de plataformas donde se paran los niños",
      },
      {
        id: 6.3,
        question_text: "REVISAR Y COMPROBAR QUE LOS CANGUROS RESORTAN",
        guidance_text: "Probar funcionamiento del sistema de resorte de cada canguro",
      },
    ],
  },
  {
    id: 7,
    question_text: "PLATAFORMAS",
    children: [
      {
        id: 7.1,
        question_text: "VERIFIQUE EL ESTADO, AJUSTE Y ASEO DE LAS PLATAFORMAS PLASTICAS O TIPO REJILLA",
        guidance_text: "Revisar estado, ajuste y limpieza de plataformas plásticas",
      },
      {
        id: 7.2,
        question_text:
          "VERIFIQUE EL PERFECTO ACOLCHADO DE LAS PLATAFORMAS DE LOS ASCENSORES NO DEBEN EXISTIR PARTES EXPUESTAS",
        guidance_text: "Comprobar acolchado completo sin partes expuestas en ascensores",
      },
    ],
  },
  {
    id: 8,
    question_text: "PISCINA DE PELOTAS",
    children: [
      {
        id: 8.1,
        question_text: "VERIFIQUE EL ESTADO Y ASEO DE LAS PELOTAS, PROTECTORES Y CERRAMIENTO",
        guidance_text: "Inspeccionar estado y limpieza de pelotas, protectores y cerramiento",
      },
    ],
  },
  {
    id: 9,
    question_text: "PISO EN REATA - MALLA - PUENTES DE MADERA Y PASOS DE ATILA",
    children: [
      {
        id: 9.1,
        question_text: "VERIFIQUE ASEO, AJUSTE Y ESTADO DE CADA ELEMENTO DE ESTOS PASOS",
        guidance_text: "Revisar limpieza, ajuste y estado de reata, malla y puentes",
      },
    ],
  },
  {
    id: 10,
    question_text: "ZONA CARGA Y PRECARGA",
    children: [
      {
        id: 10.1,
        question_text: "VERIFIQUE EL ESTADO Y ASEO DE BALONES Y JUEGOS INTERACTIVOS",
        guidance_text: "Inspeccionar estado y limpieza de balones y juegos interactivos",
      },
      {
        id: 10.2,
        question_text: "VERIFIQUE FIJACION Y ASEO DE LA ZAPATERA",
        guidance_text: "Comprobar fijación y limpieza de la zapatera",
      },
    ],
  },
  {
    id: 11,
    question_text: "CAMARAS -- ELEMENTOS INTERACTIVOS (LUCES, SENSORES Y SONIDO)",
    children: [
      {
        id: 11.1,
        question_text: "VERIFIQUE EL FUNCIONAMIENTO DE LOS SENSORES, LUCES Y SONIDOS DE CADA UNO DE LOS MODULOS",
        guidance_text: "Probar funcionamiento de sensores, luces y sonidos en todos los módulos",
      },
      {
        id: 11.2,
        question_text: "VERIFIRAR POSICION Y VISUALIZACION EN LA PANTALLA DE CADA UNA DE LAS CAMARAS",
        guidance_text: "Comprobar posición y visualización correcta de todas las cámaras",
      },
    ],
  },
  {
    id: 12,
    question_text: "LUCES DE EMERGENCIA",
    children: [
      {
        id: 12.1,
        question_text: "CORRECTO ENCENDIDO",
        guidance_text: "Comprobar encendido correcto de todas las luces de emergencia",
      },
    ],
  },
  {
    id: 13,
    question_text: "LISTO PARA ENTREGAR A OPERACIÓN? (SI-NO)",
    children: [
      {
        id: 13.1,
        question_text:
          "ESTE JUEGO HA SIDO PROFUNDAMENTE INSPECCIONADO Y SE LE HA DADO ESPECIFICACIONES DE REVISION DIARIA DE ACUERDO A LAS RECOMENDACIONES DEL FABRICANTE Y A LAS CONDICIONES DE SERVICIO DE ACUERDO CON LAS DE OPERACIÓN DEL PARQUE",
        guidance_text: "Confirmación de inspección completa según especificaciones del fabricante",
      },
    ],
  },
];

const transformItems = (items) => {
  return items.map(section => ({
    item_number: String(section.id),
    question_text: section.question_text,
    input_type: 'section',
    children: section.children.map(child => ({
      item_number: String(child.id),
      question_text: child.question_text,
      guidance_text: child.guidance_text,
      input_type: 'boolean',
      allow_comment: true,
    })),
  }));
};

module.exports = {
  name: "Atracciones – Congo (V1 SEP 2025)",
  description: "Checklist diario de mantenimiento para la atracción Congo",
  frequency: "diario",
  version_label: "V1 SEP 2025 BY: Alejandro Parra",
  role_id: 7, // Corresponde a "Tecnico de mantenimiento"
  attraction_name: "Congo", // Nombre del inspectable para buscar su ID
  premise_id: 2, // ID del local al que pertenece la atracción
  items: transformItems(playgroundItems),
};