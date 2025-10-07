const {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  ChecklistSignature,
  Failure,
  connection,
  Role,
  ChecklistType,
  User,
  Inspectable,
  Device,
  Attraction,
  Family,
  Premise,
  Entity
} = require("../models");
const { Sequelize } = require("../models");
const Op = Sequelize.Op

const getTodayNormalizedUTC = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

const naturalSort = (a, b) => {
  const parse = (s) => (s || "").split(".").map(Number)
  const aa = parse(a.item_number)
  const bb = parse(b.item_number)

  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    if (aa[i] !== bb[i]) {
      return (aa[i] || 0) - (bb[i] || 0)
    }
  }
  return 0
}

const processSpecificChecklistItems = async (checklistTypeId, checklists = [], allResponses = []) => {
  const specificInspectables = await ChecklistType.findByPk(checklistTypeId, {
    include: [{ model: Inspectable, as: 'specificInspectables' }],
  }).then(ct => ct ? ct.specificInspectables : []);

  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId },
  });

  const parentItems = templateItems.filter(item => item.parent_item_id === null);
  const childItems = templateItems.filter(item => item.parent_item_id !== null);

  const responseMap = new Map();
  allResponses.forEach(r => {
    const key = `${r.inspectable_id}-${r.checklist_item_id}`;
    const responseData = {
      ...r.toJSON(),
      response_type: r.response_compliance ? (
        r.response_compliance === 'cumple' ? 'cumple' :
        r.response_compliance === 'no cumple' ? 'no_cumple' :
        r.response_compliance === 'observación' ? 'observaciones' : null
      ) : null,
      response_compliance: r.response_compliance
    };
    responseMap.set(key, responseData);
  });

  const items = specificInspectables.map((inspectable, index) => {
    const correspondingParent = parentItems.find(p => p.question_text.toLowerCase() === inspectable.name.toLowerCase());
    if (!correspondingParent) {
      console.warn(`No matching parent item found for inspectable: ${inspectable.name}`);
      return null;
    }

    const subItemsForParent = childItems.filter(child => child.parent_item_id === correspondingParent.checklist_item_id);

    return {
      checklist_item_id: `inspectable-${inspectable.ins_id}`,
      item_number: `${index + 1}`,
      question_text: inspectable.name,
      input_type: "section",
      subItems: subItemsForParent.map(subItem => {
        const key = `${inspectable.ins_id}-${subItem.checklist_item_id}`;
        const response = responseMap.get(key);
        return {
          ...subItem.toJSON(),
          unique_frontend_id: `${inspectable.ins_id}-${subItem.checklist_item_id}`,
          inspectable_id_for_response: inspectable.ins_id,
          responses: response ? [response] : [],
        }
      }),
    };
  }).filter(Boolean);

  return items;
}

const processFamilyChecklistItems = async (checklistTypeId, checklistId) => {
  const checklistType = await ChecklistType.findByPk(checklistTypeId);
  const devices = await Device.findAll({
    where: { family_id: checklistType.associated_id },
    include: { model: Inspectable, as: "parentInspectable" },
  });

  if (!devices || devices.length === 0) {
    throw new Error(`No se encontraron dispositivos para la familia con ID ${checklistType.associated_id}`);
  }

  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId },
  });

  const allResponses = await ChecklistResponse.findAll({
    where: { checklist_id: checklistId },
  });

  const responseMap = new Map();
  allResponses.forEach(r => {
    const key = `${r.inspectable_id}-${r.checklist_item_id}`;
    responseMap.set(key, r);
  });

  const items = devices.map((device, index) => {
    const deviceSection = {
      checklist_item_id: `device-${device.ins_id}`,
      item_number: `${index + 1}`,
      question_text: device.parentInspectable.name,
      input_type: "section",
      subItems: templateItems.map((template) => {
        const key = `${device.ins_id}-${template.checklist_item_id}`;
        const response = responseMap.get(key);
        const mappedResponse = response ? [response] : [];
        return {
          ...template.toJSON(),
          unique_frontend_id: `${device.ins_id}-${template.checklist_item_id}`,
          inspectable_id_for_response: device.ins_id,
          responses: mappedResponse,
          response_compliance: mappedResponse[0]?.response_compliance || null,
          response_type: mappedResponse[0]?.response_type || null,
          comment: mappedResponse[0]?.comment || null,
          evidence_url: mappedResponse[0]?.evidence_url || null
        }
      })
    }
    return deviceSection;
  });

  return items;
}

const processAttractionChecklistItems = async (checklistTypeId, checklistId, inspectableId) => {
  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId },
  });

  const allResponses = await ChecklistResponse.findAll({
    where: { checklist_id: checklistId },
  });

  const responseMap = new Map(allResponses.map(r => [r.checklist_item_id, r]));

  const items = templateItems.map((template) => {
    const response = responseMap.get(template.checklist_item_id);
    return {
      ...template.toJSON(),
      unique_frontend_id: `${inspectableId}-${template.checklist_item_id}`,
      inspectable_id_for_response: inspectableId,
      responses: response ? [response] : [],
    }
  });

  return items;
}

const processStaticChecklistItems = async (checklistTypeId, checklistId) => {
  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId },
  });

  const allResponses = await ChecklistResponse.findAll({
    where: { checklist_id: checklistId },
  });

  const responseMap = new Map(allResponses.map(r => [r.checklist_item_id, r]));

  const parentItems = templateItems.filter(item => item.parent_item_id === null);
  const items = parentItems.map(item => ({
    ...item.toJSON(),
    responses: responseMap.has(item.checklist_item_id) ? [responseMap.get(item.checklist_item_id)] : [],
    subItems: templateItems.filter(sub => sub.parent_item_id === item.checklist_item_id).map(subItem => ({
      ...subItem.toJSON(),
      responses: responseMap.has(subItem.checklist_item_id) ? [responseMap.get(subItem.checklist_item_id)] : [],
    })).sort(naturalSort),
  }));

  return items;
}

const getChecklistTypeForInspectable = async (inspectableId, request_role_id, transaction) => {
  const inspectable = await Inspectable.findByPk(inspectableId, {
    include: [
      { model: Device, as: "deviceData", include: ["family"] },
      { model: Attraction, as: "attractionData" },
    ],
    transaction,
  });

  if (!inspectable) {
    throw new Error(`Inspectable with ID ${inspectableId} not found.`);
  }

  const targetRoleId = (request_role_id === 4 || request_role_id === 1) ? 7 : request_role_id;

  // 1. Check for a ChecklistType specifically linked to this Inspectable (type_category: 'specific')
  let checklistType = await ChecklistType.findOne({
    where: { role_id: targetRoleId, type_category: 'specific' },
    include: [{
      model: Inspectable,
      as: 'specificInspectables',
      where: { ins_id: inspectableId },
      required: true,
      through: { attributes: [] }
    }],
    transaction
  });

  // 2. If not found, check for ChecklistType linked to this Inspectable as an attraction (type_category: 'attraction')
  if (!checklistType && inspectable.type_code === 'attraction') {
    checklistType = await ChecklistType.findOne({
      where: { role_id: targetRoleId, type_category: 'attraction', associated_id: inspectableId },
      transaction,
    });
  }

  // 3. If not found, check for ChecklistType linked to the family of this Inspectable (type_category: 'family')
  if (!checklistType && inspectable.type_code === 'device' && inspectable.deviceData && inspectable.deviceData.family) {
    checklistType = await ChecklistType.findOne({
      where: { role_id: targetRoleId, type_category: 'family', associated_id: inspectable.deviceData.family.family_id },
      transaction,
    });
  }

  // 4. If still not found, check for a static checklist type
  if (!checklistType) {
    checklistType = await ChecklistType.findOne({
      where: { role_id: targetRoleId, type_category: 'static' },
      transaction,
    });
  }

  if (!checklistType) {
    throw new Error(`No checklist type found for inspectable ${inspectableId} and role ${request_role_id}.`);
  }

  return checklistType;
}

const getDateRange = (date, frequency) => {
  const targetDate = new Date(date);

  if (isNaN(targetDate.getTime())) {
    return { dateError: `Invalid date: ${date}` }; 
  }

  const normalizedTargetDate = new Date(targetDate.setUTCHours(0, 0, 0, 0));

  if (frequency === "Diaria") { // Cambiado a "Diaria" para coincidir con la base de datos
    const startDate = new Date(normalizedTargetDate);
    startDate.setUTCHours(0, 0, 0, 0); 
    const endDate = new Date(normalizedTargetDate);
    endDate.setUTCHours(23, 59, 59, 999);
    return { [Op.between]: [startDate, endDate] };
  } else if (frequency === "Semanal") { // Cambiado a "Semanal" para coincidir con la base de datos
    const dayOfWeek = normalizedTargetDate.getUTCDay();
    const startDate = new Date(normalizedTargetDate);
    startDate.setUTCDate(normalizedTargetDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    return { [Op.between]: [startDate, endDate] };
  }
  // Para frecuencias que no son diarias ni semanales, se espera una fecha exacta.
  return { [Op.eq]: normalizedTargetDate };
};

const ensureChecklistInstance = async ({ inspectableId, premise_id, date, created_by, role_id, checklist_type_id }) => {
  let transaction;
  try {
    transaction = await connection.transaction();

    // Obtener el tipo de checklist
    let checklistTypeInstance;
    if (checklist_type_id) {
      checklistTypeInstance = await ChecklistType.findByPk(checklist_type_id, { transaction });
      if (!checklistTypeInstance) {
        throw new Error(`ChecklistType with ID ${checklist_type_id} not found.`);
      }
    } else {
      checklistTypeInstance = await getChecklistTypeForInspectable(inspectableId, role_id, transaction);
    }
    
    // Manejar la fecha
    let effectiveDate = date ? new Date(date) : getTodayNormalizedUTC(); // Usar fecha proporcionada o hoy
    effectiveDate.setUTCHours(0, 0, 0, 0); // Normalizar a medianoche UTC
    
    const dateCondition = getDateRange(effectiveDate, checklistTypeInstance.frequency);
    if (dateCondition.dateError) {
      throw new Error(dateCondition.dateError); // Manejar error de fecha inválida
    }

    // Construir la cláusula where para buscar checklist existente
    const whereClause = {
      checklist_type_id: checklistTypeInstance.checklist_type_id,
      date: dateCondition
    };
    if (inspectableId !== null && inspectableId !== undefined) {
      whereClause.inspectable_id = inspectableId;
    }

    // Determinar el premise_id antes de findOrCreate
    let effectivePremiseId = premise_id;

    // Si no se proporcionó premise_id, intentar obtenerlo del inspectable
    if (!effectivePremiseId && inspectableId) {
      const inspectable = await Inspectable.findByPk(inspectableId, { transaction });
      if (inspectable) {
        effectivePremiseId = inspectable.premise_id;
      }
    }

    // Si aún no tenemos premise_id, intentar obtenerlo del usuario
    if (!effectivePremiseId) {
      const user = await User.findByPk(created_by, { transaction });
      if (user) {
        effectivePremiseId = user.premise_id;
      }
    }

    // Si aún no tenemos premise_id, usar cualquier premise disponible
    if (!effectivePremiseId) {
      const anyPremise = await Premise.findOne({ transaction });
      if (anyPremise) {
        effectivePremiseId = anyPremise.premise_id;
      } else {
        throw new Error('No se pudo determinar el premise_id para la creación del checklist.');
      }
    }

    // Usar findOrCreate para evitar race conditions
    const [existingChecklist, created] = await Checklist.findOrCreate({
      where: whereClause,
      defaults: {
        checklist_type_id: checklistTypeInstance.checklist_type_id,
        inspectable_id: inspectableId,
        premise_id: effectivePremiseId,
        date: effectiveDate, // Usar la fecha normalizada aquí
        created_by,
        version_label: checklistTypeInstance.version_label,
      },
      transaction,
    });

    if (created) {
      console.log('Nuevo checklist creado:', {
        checklist_id: existingChecklist.checklist_id,
        inspectable_id: existingChecklist.inspectable_id,
        version_label: existingChecklist.version_label,
        date: existingChecklist.date // Log la fecha para verificar
      });
    } else {
      console.log('Checklist existente encontrado:', existingChecklist.checklist_id);
    }

    await transaction.commit();
    return existingChecklist;

  } catch (error) {
    console.error('Error en ensureChecklistInstance:', error);
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getLatestChecklist = async ({ inspectableId, date, role_id, checklist_type_id }) => {
  const normalizedInputDate = date ? new Date(date) : getTodayNormalizedUTC(); // Usar fecha proporcionada o hoy
  normalizedInputDate.setUTCHours(0, 0, 0, 0); // Normalizar a medianoche UTC
  
  let definitiveChecklistType;

  if (checklist_type_id) {
      definitiveChecklistType = await ChecklistType.findByPk(checklist_type_id);
      if (!definitiveChecklistType) {
          throw new Error(`ChecklistType with ID ${checklist_type_id} not found.`);
      }
  } else {
      const queryRole = role_id || 7;
      definitiveChecklistType = await getChecklistTypeForInspectable(inspectableId, queryRole);
  }

  let effectiveDate = normalizedInputDate;
  const dateCondition = getDateRange(normalizedInputDate, definitiveChecklistType.frequency);
  if (dateCondition.dateError) {
    // Use today's date as fallback for invalid dates
    effectiveDate = new Date();
    effectiveDate.setUTCHours(0, 0, 0, 0);
  }
  const correctedDateCondition = getDateRange(effectiveDate, definitiveChecklistType.frequency);
  const whereClause = { date: correctedDateCondition, checklist_type_id: definitiveChecklistType.checklist_type_id };
  if (inspectableId !== null && inspectableId !== undefined) {
    whereClause.inspectable_id = inspectableId;
  }
  
  // Solo buscar y retornar la instancia existente, sin crear una nueva
  const checklist = await Checklist.findOne({
    where: whereClause,
    order: [["createdAt", "ASC"]],
    include: [{ model: ChecklistType, as: "type" }],
  });

  // Si no existe una instancia, retornar null en lugar de crear una nueva
  if (!checklist) return null;

  if (!checklist.type) {
    throw new Error(`Checklist with ID ${checklist.checklist_id} has a missing or invalid checklist type.`);
  }

  let items = [];
  
  // Cargar la instancia del tipo de checklist con sus asociaciones específicas
  const checklistTypeInstance = await ChecklistType.findByPk(checklist.checklist_type_id, {
    include: [
      { model: Inspectable, as: 'specificInspectables' },
    ]
  });

  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklist.checklist_type_id },
  });

  const allResponses = await ChecklistResponse.findAll({
      where: { checklist_id: checklist.checklist_id },
      include: [
          {
              model: Failure, 
              as: "failure",
              include: [{ model: User, as: "failureCloser", attributes: ["user_id", "user_name"] }]
          },
          { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] },
          {
              model: ChecklistItem, 
              as: "checklistItem",
              attributes: ["checklist_item_id", "question_text", "input_type"]
          }
      ]
  });

  console.log('Respuestas encontradas:', allResponses.length);

  const responseMap = new Map();
  allResponses.forEach(r => {
      const key = `${r.inspectable_id}-${r.checklist_item_id}`;
      const responseData = {
          ...r.toJSON(),
          response_type: r.response_compliance ? (
              r.response_compliance === 'cumple' ? 'cumple' :
              r.response_compliance === 'no cumple' ? 'no_cumple' :
              r.response_compliance === 'observación' ? 'observaciones' : null
          ) : null,
          // Mantener response_compliance como está en la base de datos
          response_compliance: r.response_compliance
      };
      console.log(`Mapeando respuesta para key ${key}:`, {
          checklist_item_id: r.checklist_item_id,
          inspectable_id: r.inspectable_id,
          response_compliance: r.response_compliance,
          response_type: responseData.response_type
      });
      responseMap.set(key, responseData);
  });

  if (checklistTypeInstance.type_category === 'specific') {
    // --- CASO 1: Checklist para Inspectables Específicos ---
    items = await processSpecificChecklistItems(checklist.checklist_type_id, checklist, allResponses);
  } else if (checklistTypeInstance.type_category === 'family') {
    // --- CASO 2: Checklist para Familia Completa (Dinámico) ---
    items = await processFamilyChecklistItems(checklist.checklist_type_id, checklist.checklist_id);
  } else if (checklistTypeInstance.type_category === 'attraction') {
    // --- CASO 3: Checklist para Atracción Única (Dinámico) ---
    items = await processAttractionChecklistItems(checklist.checklist_type_id, checklist.checklist_id, checklistTypeInstance.associated_id);
  } else { // type_category === 'static'
    // --- CASO 4: Checklist Estático ---
    items = await ChecklistItem.findAll({
      where: {
        checklist_type_id: checklist.checklist_type_id,
        parent_item_id: null,
      },
      include: [
        {
          model: ChecklistItem,
          as: "subItems",
          separate: true,
          include: [
            {
              model: ChecklistResponse,
              as: "responses",
              where: { checklist_id: checklist.checklist_id },
              required: false,
              include: [
                { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] },
                { model: Failure, as: "failure", required: false,
                  include: [{ model: User, as: "failureCloser", attributes: ["user_id", "user_name"] }],
                },
              ],
            },
          ],
        },
        {
          model: ChecklistResponse,
          as: "responses",
          where: { checklist_id: checklist.checklist_id },
          required: false,
          include: [
            { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] },
            { model: Failure, as: "failure", required: false,
              include: [{ model: User, as: "failureCloser", attributes: ["user_id", "user_name"] }],
            },
          ],
        },
      ],
    });
  }

  items.forEach((item) => {
    if (item.subItems) item.subItems.sort(naturalSort)
  })
  items.sort(naturalSort)

  const signatures = await ChecklistSignature.findAll({
    where: { checklist_id: checklist.checklist_id },
    include: [
      { model: User, as: "user", attributes: ["user_id", "user_name"] },
      { model: Role, as: "role", attributes: ["role_name"] }
    ],
  })

  const pending_failures = await Failure.findAll({
    where: {
      status: 'pendiente'
    },
    include: [
      {
        model: ChecklistResponse,
        as: 'response',
        required: true,
        include: [
          {
            model: Checklist,
            as: 'checklist',
            where: {
              inspectable_id: inspectableId,
              date: { [Op.lt]: checklist.date }
            },
            required: true
          },
          {
            model: ChecklistItem,
            as: 'checklistItem',
            attributes: ['question_text']
          },
          {
            model: User,
            as: 'respondedBy',
            attributes: ['user_name']
          }
        ]
      }
    ],
    order: [['reported_at', 'ASC']]
  });

  return {
    ...checklist.toJSON(),
    items,
    signatures,
    pending_failures
  }
}


const getChecklistHistory = async (inspectableId) => {
  const checklists = await Checklist.findAll({
    where: { inspectable_id: inspectableId },
    include: [
      { model: ChecklistType, as: "type", attributes: ["name", "description"] },
      { model: User, as: "creator", attributes: ["user_name"] },
      {
        model: ChecklistSignature,
        as: "signatures",
        attributes: ["role_at_signature", "signed_at"],
        include: [
          { model: User, as: "user", attributes: ["user_name"] },
          { model: Role, as: "role", attributes: ["role_name"] }
        ],
      },
    ],
    order: [["date", "DESC"]],
  })
  return checklists
}

const handlePremiosCalculations = async (checklist, transaction) => {
  // Find the responses for this checklist
  const checklistResponses = await ChecklistResponse.findAll({
    where: { checklist_id: checklist.checklist_id },
    include: [{ model: ChecklistItem, as: 'checklistItem' }],
    transaction,
  });

  // Find items by question_text
  const jugadasItem = checklistResponses.find(r => r.checklistItem.question_text === 'JUGADAS');
  const premiosItem = checklistResponses.find(r => r.checklistItem.question_text === 'PREMIOS');
  const configItem = checklistResponses.find(r => r.checklistItem.question_text === 'CONFIGURACION DE LA MAQUINA');

  if (!jugadasItem || !premiosItem) return;

  const jugadasActuales = jugadasItem.response_numeric || 0;
  const premiosActuales = premiosItem.response_numeric || 0;
  const configuracionActual = configItem?.response_text || '';

  // Find the last checklist for this inspectable
  const lastChecklist = await Checklist.findOne({
    where: {
      inspectable_id: checklist.inspectable_id,
      checklist_type_id: checklist.checklist_type_id,
      date: { [Op.lt]: checklist.date },
    },
    include: [
      {
        model: ChecklistResponse,
        as: 'responses',
        include: [{ model: ChecklistItem, as: 'checklistItem' }],
      },
    ],
    order: [['date', 'DESC']],
    transaction,
  });

  let jugadasAnteriores = 0;
  let premiosAnteriores = 0;
  let configAnterior = '';

  if (lastChecklist) {
    const lastJugadas = lastChecklist.responses.find(r => r.checklistItem.question_text === 'JUGADAS');
    const lastPremios = lastChecklist.responses.find(r => r.checklistItem.question_text === 'PREMIOS');
    const lastConfig = lastChecklist.responses.find(r => r.checklistItem.question_text === 'CONFIGURACION DE LA MAQUINA');

    jugadasAnteriores = lastJugadas?.jugadas_acumuladas || 0;
    premiosAnteriores = lastPremios?.premios_acumulados || 0;
    configAnterior = lastConfig?.configuracion_maquina || '';
  }

  const jugadasDesdeUltima = Math.max(0, jugadasActuales - jugadasAnteriores);
  const premiosDesdeUltima = Math.max(0, premiosActuales - premiosAnteriores);

  // La eficiencia se calcula como (premios reales / premios esperados) * 100.
  // Se espera 1 premio por cada 15 jugadas.
  const premiosEsperadosCalculados = jugadasDesdeUltima / 15;
  const promedio = premiosEsperadosCalculados > 0 ? (premiosDesdeUltima / premiosEsperadosCalculados) * 100 : 0;

  // Mantener el campo `premios_esperados` para compatibilidad, usando el nuevo cálculo.
  const premiosEsperados = premiosEsperadosCalculados;

  // Update responses
  if (jugadasItem) {
    await ChecklistResponse.update({
      jugadas_acumuladas: jugadasActuales,
      jugadas_desde_ultima: jugadasDesdeUltima,
    }, {
      where: { response_id: jugadasItem.response_id },
      transaction,
    });
  }

  if (premiosItem) {
    await ChecklistResponse.update({
      premios_acumulados: premiosActuales,
      premios_desde_ultima: premiosDesdeUltima,
      promedio_premios: promedio,
      premios_esperados: premiosEsperados,
    }, {
      where: { response_id: premiosItem.response_id },
      transaction,
    });
  }

  if (configItem) {
    await ChecklistResponse.update({
      configuracion_maquina: configuracionActual,
    }, {
      where: { response_id: configItem.response_id },
      transaction,
    });
  }
};

const submitResponses = async ({ checklist_id, responses, responded_by, role_id }) => {
  const transaction = await connection.transaction()
  try {
    if (role_id !== 7) {
      throw new Error("Sólo los técnicos de mantenimiento pueden rellenar la lista de control.")
    }

    // Verificar si el checklist ya tiene firmas de técnico y jefe de operaciones
    if (checklist_id && checklist_id !== '0' && checklist_id !== 'null') {
      const existingSignatures = await ChecklistSignature.findAll({
        where: { checklist_id: checklist_id },
        include: [
          { model: User, as: "user", attributes: ["user_name"] },
          { model: Role, as: "role", attributes: ["role_name"] }
        ],
        transaction
      });

      // Verificar firmas por rol_id en lugar de nombre de rol para mayor precisión
      const hasTechnicalSignature = existingSignatures.some(sig => sig.role_at_signature === '7'); // Técnico de mantenimiento
      const hasOperationsSignature = existingSignatures.some(sig => sig.role_at_signature === '4'); // Jefe de Operaciones

      if (hasTechnicalSignature && hasOperationsSignature) {
        throw new Error("Este checklist ya ha sido firmado por el Técnico de mantenimiento y el Jefe de Operaciones. No se pueden realizar modificaciones.");
      }
    }

    let checklist;
    if (checklist_id && checklist_id !== '0' && checklist_id !== 'null') {
      checklist = await Checklist.findByPk(checklist_id, {
        include: [{ model: ChecklistType, as: "type" }],
        transaction
      })
      if (!checklist) throw new Error("Checklist not found")
    } else {
      // For specific checklists without checklist_id, find by type and date
      const firstResponse = responses[0];
      if (!firstResponse) throw new Error("No responses provided");

      const item = await ChecklistItem.findByPk(firstResponse.checklist_item_id, { transaction });
      if (!item) throw new Error("Checklist item not found");

      const checklistType = await ChecklistType.findByPk(item.checklist_type_id, { transaction });
      if (!checklistType) throw new Error("Checklist type not found");

      // Create a dummy checklist object
      checklist = {
        checklist_id: null,
        type: checklistType,
        date: new Date(),
        checklist_type_id: item.checklist_type_id
      };
    }

    if (!checklist.type) {
      throw new Error(`Checklist has a missing or invalid checklist type.`);
    }

    // For dynamic checklists (specific, family, attraction), ensure checklists exist for each inspectable
    const isDynamicChecklist = ['specific', 'family', 'attraction'].includes(checklist.type.type_category);
    const shouldCreateChecklists = isDynamicChecklist && (!checklist_id || checklist_id === 'null' || checklist_id === '0');
    
    if (shouldCreateChecklists) {
      console.log('=== Creando checklists dinámicos ===');
      const inspectableIds = [...new Set(responses.map(r => r.inspectable_id).filter(id => id))];
      console.log('inspectableIds encontrados para la creación dinámica:', inspectableIds);

      if (checklist.type.type_category === 'family') {
        console.log('Procesando checklist de FAMILIA');
        // Para checklists de familia, solo debe existir UNA instancia de checklist sin inspectable_id.
        // Esta instancia ya debería haber sido creada por getLatestChecklistByType.
        // Aquí, solo la buscamos para asignar el ID correcto a las respuestas.
        const familyChecklist = await Checklist.findOne({
          where: {
            checklist_type_id: checklist.checklist_type_id,
            date: getDateRange(new Date(), checklist.type.frequency),
            inspectable_id: null
          },
          transaction
        });

        if (familyChecklist) {
          console.log(`Checklist de familia encontrado. ID: ${familyChecklist.checklist_id}`);
          // Asignar el ID del checklist de familia a todas las respuestas
          responses.forEach(response => {
            response.checklist_id = familyChecklist.checklist_id;
          });
          
          // Verificar si todas las respuestas tienen un inspectable_id válido
          for (const response of responses) {
            if (!response.inspectable_id) {
              throw new Error("Todas las respuestas para un checklist de familia deben tener un inspectable_id válido");
            }
          }
        } else {
          // Esto es un fallback y no debería ocurrir en el flujo normal.
          console.warn('ADVERTENCIA: No se encontró un checklist de familia preexistente. Se intentará crear uno.');
          const firstInspectableId = responses[0]?.inspectable_id;
          if (firstInspectableId) {
            const inspectable = await Inspectable.findByPk(firstInspectableId, { transaction });
            const premise_id = inspectable ? inspectable.premise_id : null;

            if (premise_id) {
              const [createdChecklist] = await Checklist.findOrCreate({
                  where: {
                      checklist_type_id: checklist.checklist_type_id,
                      date: getDateRange(new Date(), checklist.type.frequency),
                      inspectable_id: null,
                  },
                  defaults: {
                      premise_id: premise_id,
                      created_by: responded_by,
                      version_label: checklist.type.version_label,
                      date: new Date(),
                  },
                  transaction,
              });
              console.log(`Checklist de familia CREADO (fallback). ID: ${createdChecklist.checklist_id}`);
              responses.forEach(response => {
                response.checklist_id = createdChecklist.checklist_id;
              });
            } else {
              throw new Error('No se pudo determinar el premise_id para crear el checklist de familia.');
            }
          }
        }

      } else { // Lógica para 'specific' y 'attraction'
        console.log(`Procesando checklist de tipo: ${checklist.type.type_category}`);
        if (inspectableIds.length > 0) {
          console.log('Creando/buscando checklists para inspectableIds:', inspectableIds);
          for (const insId of inspectableIds) {
            const inspectable = await Inspectable.findByPk(insId, { transaction });
            const [checklistInstance, created] = await Checklist.findOrCreate({
              where: {
                inspectable_id: insId,
                checklist_type_id: checklist.checklist_type_id,
                date: getDateRange(new Date(), checklist.type.frequency)
              },
              defaults: {
                created_by: responded_by,
                version_label: checklist.type.version_label,
                premise_id: inspectable ? inspectable.premise_id : null // Corregido: Obtener premise_id
              },
              transaction
            });
            console.log(`Checklist para inspectable ${insId}: ${created ? 'CREADO' : 'ENCONTRADO'} - ID: ${checklistInstance.checklist_id}`);
          }

          // Asignar el checklist_id correcto a cada respuesta
          const createdChecklists = await Checklist.findAll({
            where: {
              inspectable_id: { [Op.in]: inspectableIds },
              checklist_type_id: checklist.checklist_type_id,
              date: getDateRange(new Date(), checklist.type.frequency)
            },
            transaction
          });
          const checklistMap = new Map(createdChecklists.map(c => [c.inspectable_id, c.checklist_id]));

          responses.forEach(response => {
            if (response.inspectable_id) {
              response.checklist_id = checklistMap.get(response.inspectable_id);
            }
          });
        }
      }
    }

    console.log('=== PROCESANDO RESPONSES (POST-CREATION) ===');
    for (const response of responses) {
      const { checklist_item_id, inspectable_id, value, comment, evidence_url, response_id } = response;
      console.log(`Procesando response - item: ${checklist_item_id}, checklist_id: ${response.checklist_id}, inspectable_id: ${inspectable_id}, value: ${value}, response_type: ${response.response_type}`);

      if (!checklist_item_id) {
        console.error('ERROR: checklist_item_id es undefined para la respuesta:', response);
        throw new Error('Checklist item ID is required for each response.');
      }

      const item = await ChecklistItem.findByPk(checklist_item_id, { transaction })
      if (!item || item.checklist_type_id !== checklist.checklist_type_id) {
        // Loguear la razón del error
        if (!item) {
          console.error(`ERROR: No se encontró el ChecklistItem con ID: ${checklist_item_id}`);
        } else {
          console.error(`ERROR: El checklist_type_id del item (${item.checklist_type_id}) no coincide con el del checklist (${checklist.checklist_type_id}).`);
        }
        throw new Error(`Item with ID ${checklist_item_id} is not valid for this checklist.`);
      }

      const responseData = {
          response_id: response_id || undefined,
          checklist_id: response.checklist_id || checklist_id,
          checklist_item_id,
          inspectable_id: (checklist.type.type_category === 'specific' || checklist.type.type_category === 'family' || checklist.type.type_category === 'attraction') ? inspectable_id : null,
          comment: comment || null,
          evidence_url: evidence_url || null,
          responded_by,
          responded_at: new Date(),
      };
      console.log('responseData construido:', responseData);

      // Procesar el valor basado en el tipo de input y response_type
      console.log('Procesando respuesta:', {
        input_type: item.input_type,
        value,
        response_type: response.response_type
      });

      if (item.input_type === 'radio' || item.input_type === 'boolean') {
          // Determinar el valor de compliance basado en response_type o value
          let compliance_value = null;
          
          console.log('Analizando valores de entrada:', {
              value,
              response_type: response.response_type,
              input_type: item.input_type
          });

          // Primero, intentar usar value si ya está en formato correcto
          if (['cumple', 'no cumple', 'observación'].includes(value)) {
              compliance_value = value;
          } 
          // Si no, intentar convertir desde response_type
          else if (response.response_type) {
              switch(response.response_type) {
                  case 'no_cumple':
                      compliance_value = 'no cumple';
                      break;
                  case 'observaciones':
                      compliance_value = 'observación';
                      break;
                  case 'cumple':
                      compliance_value = 'cumple';
                      break;
              }
          }

          console.log('Valor de compliance determinado:', compliance_value);
          
          // Si no hay un valor determinado, dejarlo como null
          if (!compliance_value) {
              console.log(`No se ha determinado un valor para el item ${checklist_item_id}`);
              compliance_value = null;
          }

          responseData.response_compliance = compliance_value;
      } else if (item.input_type === 'numeric') {
          responseData.response_numeric = value;
      } else if (item.input_type === 'text' || item.input_type === 'textarea') {
          responseData.response_text = value;
      }

      let checklistResponse;
      if (responseData.response_id) {
        const existingResponse = await ChecklistResponse.findByPk(responseData.response_id, { transaction });
        if (existingResponse) {
          await existingResponse.update(responseData, { transaction });
          checklistResponse = existingResponse;
        } else {
          // If for some reason the response_id is invalid, create a new one.
          delete responseData.response_id; // Remove invalid id
          checklistResponse = await ChecklistResponse.create(responseData, { transaction });
        }
      } else {
        // Since response_id is not present, we look for a conflict manually before creating
        const conflictingResponse = await ChecklistResponse.findOne({
          where: {
            checklist_id: responseData.checklist_id,
            checklist_item_id: responseData.checklist_item_id,
            inspectable_id: responseData.inspectable_id,
          },
          transaction
        });

        if (conflictingResponse) {
          await conflictingResponse.update(responseData, { transaction });
          checklistResponse = conflictingResponse;
        } else {
          checklistResponse = await ChecklistResponse.create(responseData, { transaction });
        }
      }
      console.log('Upsert exitoso, response_id:', checklistResponse.response_id);

      // Manejar fallas basado en response_compliance
      const hasFailure = responseData.response_compliance === "no cumple" || responseData.response_compliance === "observación";
      if (hasFailure) {
        const severity = responseData.response_compliance === "no cumple" ? "crítica" : "leve";
        await Failure.upsert(
          {
            response_id: checklistResponse.response_id,
            description: comment || "Item does not meet criteria",
            status: "pendiente",
            reported_at: new Date(),
            responded_by: responded_by,
            severity: severity,
          },
          { transaction },
        );
      } else {
        await Failure.destroy({
          where: { response_id: checklistResponse.response_id, status: "pendiente" },
          transaction,
        });
      }
    }

    // Special logic for "Apoyo - Técnico (Premios)" checklist
    if (checklist.type.name === 'Apoyo - Técnico (Premios)' || checklist.type.name.includes('Premios')) {
      try {
        if (checklist.type.type_category === 'specific') {
          // For specific checklists, calculate for all checklists created
          const createdChecklists = await Checklist.findAll({
            where: {
              checklist_type_id: checklist.checklist_type_id,
              date: getDateRange(new Date(), checklist.type.frequency)
            },
            transaction
          });
          for (const createdChecklist of createdChecklists) {
            await handlePremiosCalculations(createdChecklist, transaction);
          }
        } else {
          await handlePremiosCalculations(checklist, transaction);
        }
        console.log('Cálculos de premios realizados correctamente');
      } catch (error) {
        console.error('Error al realizar cálculos de premios:', error);
        // No lanzamos el error para que no interrumpa el flujo principal
      }
    }

    await transaction.commit()
    console.log('=== TRANSACCIÓN EXITOSA ===');
    return { success: true, message: "Respuestas guardadas exitosamente" }
  } catch (error) {
    console.error('=== ERROR EN submitResponses ===', error);
    console.error('Stack trace:', error.stack);
    await transaction.rollback()
    throw error
  }
}


const signChecklist = async ({ checklist_id, user_id, role_id, digital_token }) => {
  const transaction = await connection.transaction();
  try {
    if (!digital_token) {
      throw new Error("La firma digital (digital_token) es requerida.");
    }

    const userRole = await Role.findByPk(role_id, { transaction });
    if (!userRole) {
      throw new Error("Rol de usuario inválido.");
    }
    const role_name = userRole.role_name;

    // Verificar roles por ID en lugar de nombres para mayor precisión
    const allowed_role_ids = [7, 4]; // 7: Técnico de mantenimiento, 4: Jefe de Operaciones
    if (!allowed_role_ids.includes(Number(role_id))) {
      throw new Error(`El rol '${role_name}' no tiene permisos para firmar.`);
    }

    const checklist = await Checklist.findByPk(checklist_id, {
      transaction
    });
    if (!checklist) {
      throw new Error(`Checklist with ID ${checklist_id} not found`);
    }
    
    // Verificar si el checklist ya tiene todas las respuestas necesarias antes de firmar
    if (Number(role_id) === 7) { // Solo verificar para técnicos
      // Obtener todas las respuestas existentes
      const existingResponses = await ChecklistResponse.findAll({
        where: { checklist_id: checklist.checklist_id },
        transaction
      });
      
      // Obtener todos los ítems del checklist
      const checklistItems = await ChecklistItem.findAll({
        where: { checklist_type_id: checklist.checklist_type_id },
        transaction
      });
      
      // Verificar si hay ítems sin responder
      const incompleteItems = [];
      const responseMap = new Map(existingResponses.map(r => [r.checklist_item_id, r]));
      
      checklistItems.forEach(item => {
        if (!responseMap.has(item.checklist_item_id) && item.input_type !== 'section') {
          incompleteItems.push({
            item_number: item.item_number,
            question_text: item.question_text
          });
        }
      });
      
      if (incompleteItems.length > 0) {
        const error = new Error(`El checklist tiene ${incompleteItems.length} ítems sin responder.`);
        error.incompleteItems = incompleteItems;
        error.incompleteCount = incompleteItems.length;
        throw error;
      }
    }

    // Verificar y cargar el ChecklistType manualmente si es necesario
    let checklistType = null;
    if (checklist.checklist_type_id) {
      checklistType = await ChecklistType.findByPk(checklist.checklist_type_id, { transaction });
    }

    // Si no tiene checklist_type_id, intentar encontrar el tipo correcto
    if (!checklistType) {
      console.log('Checklist sin checklist_type_id, buscando tipo apropiado...');
      // Buscar un ChecklistType estático para técnicos de mantenimiento
      checklistType = await ChecklistType.findOne({
        where: {
          role_id: 7, // Técnico de mantenimiento
          type_category: 'static'
        },
        transaction
      });

      if (checklistType) {
        // Actualizar el checklist con el tipo encontrado
        await checklist.update({
          checklist_type_id: checklistType.checklist_type_id
        }, { transaction });
        console.log('Checklist actualizado con checklist_type_id:', checklistType.checklist_type_id);
      }
    }

    if (!checklistType) {
      throw new Error(`No se pudo encontrar un ChecklistType válido para el checklist ${checklist_id}`);
    }

    // Agregar el tipo al checklist manualmente
    checklist.type = checklistType;

    console.log('=== DEBUG signChecklist ===');
    console.log('checklist_id:', checklist_id);
    console.log('checklist.checklist_type_id:', checklist.checklist_type_id);
    console.log('checklist.type:', checklist.type);

    if (!checklist.type) {
      throw new Error(`Checklist with ID ${checklist.checklist_id} has a missing or invalid checklist type. checklist_type_id: ${checklist.checklist_type_id}`);
    }

    // Verificar si ya existe una firma para este usuario y checklist
    const existingSignature = await ChecklistSignature.findOne({
      where: {
        checklist_id: checklist.checklist_id,
        user_id: user_id
      },
      transaction
    });

    if (existingSignature) {
      // Actualizar la firma existente
      await existingSignature.update(
        {
          digital_token: digital_token,
          signed_at: new Date(),
        },
        { transaction }
    // NOTA: Esta función ahora maneja firmas únicas por usuario y checklist.
    // Si el usuario ya tiene una firma para este checklist, se actualiza el token digital y la fecha de firma.
    // Esto previene duplicados y asegura que solo haya una firma activa por usuario por checklist.
    // Se recomienda agregar una restricción única en la BD: UNIQUE(checklist_id, user_id) via migración si no existe.
      );
      console.log(`Firma actualizada para usuario ${user_id} en checklist ${checklist.checklist_id}`);
    } else {
      // Crear una nueva firma
      await ChecklistSignature.create(
        {
          checklist_id: checklist.checklist_id,
          user_id: user_id,
          role_at_signature: role_id,
          digital_token: digital_token,
          signed_at: new Date(),
        },
        { transaction },
      );
      console.log(`Nueva firma creada para usuario ${user_id} en checklist ${checklist.checklist_id}`);
    }

    await transaction.commit();
    return { success: true, message: "Checklist firmado exitosamente" };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getLatestChecklistByType = async ({ checklistTypeId, date, user_id, role_id }) => {
  const normalizedInputDate = new Date(new Date(date).setUTCHours(0, 0, 0, 0));
  
  const definitiveChecklistType = await ChecklistType.findByPk(checklistTypeId, {
      include: [{ model: Inspectable, as: 'specificInspectables' }]
  });

  if (!definitiveChecklistType) {
      throw new Error(`ChecklistType with ID ${checklistTypeId} not found.`);
  }

  let effectiveDate = normalizedInputDate;
  const dateCondition = getDateRange(normalizedInputDate, definitiveChecklistType.frequency);
  if (dateCondition.dateError) {
    effectiveDate = new Date();
    effectiveDate.setUTCHours(0, 0, 0, 0);
  }
  const correctedDateCondition = getDateRange(effectiveDate, definitiveChecklistType.frequency);

  if (definitiveChecklistType.type_category === 'specific') {
    const specificInspectables = definitiveChecklistType.specificInspectables || [];
    const inspectableIds = specificInspectables.map(i => i.ins_id);

    const checklists = await Checklist.findAll({
        where: {
        inspectable_id: { [Op.in]: inspectableIds },
        checklist_type_id: checklistTypeId,
        date: correctedDateCondition,
    },
    include: [{ model: ChecklistType, as: "type" }]
    });

    if (!checklists || checklists.length === 0) {
        // NOTA: La creación para checklists 'specific' es compleja y se maneja en 'submitResponses'.
        // Devolver una estructura vacía es el comportamiento esperado aquí para evitar crear instancias incompletas.
        const templateItems = await ChecklistItem.findAll({ where: { checklist_type_id: checklistTypeId } });
        const parentItems = templateItems.filter(item => item.parent_item_id === null);
        const childItems = templateItems.filter(item => item.parent_item_id !== null);

        const items = specificInspectables.map((inspectable, inspectableIndex) => {
            const correspondingParent = parentItems.find(p => p.question_text.toLowerCase() === inspectable.name.toLowerCase());
            if (!correspondingParent) return null;

            const subItemsForParent = childItems.filter(child => child.parent_item_id === correspondingParent.checklist_item_id);

            return {
                checklist_item_id: `inspectable-${inspectable.ins_id}`,
                item_number: `${inspectableIndex + 1}`,
                question_text: inspectable.name,
                input_type: "section",
                subItems: subItemsForParent.map(subItem => ({
                    ...subItem.toJSON(),
                    unique_frontend_id: `${inspectable.ins_id}-${subItem.checklist_item_id}`,
                    inspectable_id_for_response: inspectable.ins_id,
                    responses: [],
                })),
            };
        }).filter(Boolean);

        return {
            checklist_id: null,
            date: effectiveDate,
            type: definitiveChecklistType.toJSON(),
            items: items.sort(naturalSort),
            signatures: [],
            pending_failures: [],
        };
    }

    const checklistMap = new Map(checklists.map(c => [c.inspectable_id, c]));
    const checklistIds = checklists.map(c => c.checklist_id);

    const allResponses = await ChecklistResponse.findAll({
        where: { checklist_id: { [Op.in]: checklistIds } },
    });

    const responseMap = new Map();
    allResponses.forEach(r => {
        const key = `${r.inspectable_id}-${r.checklist_item_id}`;
        responseMap.set(key, r);
    });

    const templateItems = await ChecklistItem.findAll({
        where: { checklist_type_id: checklistTypeId },
    });

    const parentItems = templateItems.filter(item => item.parent_item_id === null);
    const childItems = templateItems.filter(item => item.parent_item_id !== null);

    const items = specificInspectables.map((inspectable, inspectableIndex) => {
      const correspondingParent = parentItems.find(p => p.question_text.toLowerCase() === inspectable.name.toLowerCase());
      if (!correspondingParent) {
        console.warn(`No matching parent item found for inspectable: ${inspectable.name}`);
        return null;
      }

      const subItemsForParent = childItems.filter(child => child.parent_item_id === correspondingParent.checklist_item_id);

      const deviceSection = {
        checklist_item_id: `inspectable-${inspectable.ins_id}`,
        item_number: `${inspectableIndex + 1}`,
        question_text: inspectable.name,
        input_type: "section",
        subItems: subItemsForParent.map(subItem => {
          const key = `${inspectable.ins_id}-${subItem.checklist_item_id}`;
          const response = responseMap.get(key);
          return {
            ...subItem.toJSON(),
            unique_frontend_id: `${inspectable.ins_id}-${subItem.checklist_item_id}`,
            inspectable_id_for_response: inspectable.ins_id,
            responses: response ? [response] : [],
          }
        }),
      }
      return deviceSection;
    }).filter(Boolean);

    items.sort(naturalSort);

    const signatures = await ChecklistSignature.findAll({
        where: { checklist_id: { [Op.in]: checklistIds } },
        include: [
          { model: User, as: "user", attributes: ["user_id", "user_name"] },
          { model: Role, as: "role", attributes: ["role_name"] }
        ],
    });

    const checklistData = checklists.length > 0 ? checklists[0].toJSON() : {
        checklist_id: null,
        date: normalizedInputDate,
        type: definitiveChecklistType.toJSON(),
    };
    
    if (checklists.length > 0) {
        checklistData.checklist_id = checklists[0].checklist_id;
    }

    return {
      ...checklistData,
      items,
      signatures,
      pending_failures: []
    }

  } else if (definitiveChecklistType.type_category === 'static' || definitiveChecklistType.type_category === 'attraction') {
    const isStatic = definitiveChecklistType.type_category === 'static';
    const inspectableId = isStatic ? null : definitiveChecklistType.associated_id;

    const whereClause = {
        date: correctedDateCondition,
        checklist_type_id: definitiveChecklistType.checklist_type_id,
        inspectable_id: inspectableId,
    };

    // Para checklists diarios, filtrar por la columna `date` que ya tiene la fecha normalizada
    // Se elimina la condición `createdAt` ya que no es relevante para la lógica de negocio de "checklist para hoy"
    // if (definitiveChecklistType.frequency === 'Diaria') {
    //     whereClause.createdAt = correctedDateCondition;
    // }

    let checklist = await Checklist.findOne({
      where: whereClause,
      order: [["createdAt", "ASC"]],
      include: [{ model: ChecklistType, as: "type" }],
    });

    if (!checklist) {
        let premise_id = null;
        if (inspectableId) {
            const inspectable = await Inspectable.findByPk(inspectableId);
            if (inspectable) premise_id = inspectable.premise_id;
        }
        if (!premise_id) {
            const user = await User.findByPk(user_id);
            if (user) premise_id = user.premise_id;
        }
        if (!premise_id) {
            const anyPremise = await Premise.findOne();
            if(anyPremise) premise_id = anyPremise.premise_id;
            else throw new Error('Could not determine premise_id for checklist creation.');
        }

        const [createdChecklist] = await Checklist.findOrCreate({
            where: whereClause,
            defaults: {
                premise_id: premise_id,
                created_by: user_id,
                version_label: definitiveChecklistType.version_label,
                date: effectiveDate, // Usar la fecha normalizada
            }
        });
        checklist = await Checklist.findByPk(createdChecklist.checklist_id, {
            include: [{ model: ChecklistType, as: "type" }]
        });
    }

    const checklistId = checklist.checklist_id;
    const templateItems = await ChecklistItem.findAll({ where: { checklist_type_id: definitiveChecklistType.checklist_type_id } });
    
    let items = [];
    const allResponses = checklistId ? await ChecklistResponse.findAll({ where: { checklist_id: checklistId } }) : [];
    const responseMap = new Map(allResponses.map(r => [r.checklist_item_id, r]));

    if (isStatic) {
        const parentItems = templateItems.filter(item => item.parent_item_id === null);
        items = parentItems.map(item => ({
            ...item.toJSON(),
            responses: responseMap.has(item.checklist_item_id) ? [responseMap.get(item.checklist_item_id)] : [],
            subItems: templateItems.filter(sub => sub.parent_item_id === item.checklist_item_id).map(subItem => ({
                ...subItem.toJSON(),
                responses: responseMap.has(subItem.checklist_item_id) ? [responseMap.get(subItem.checklist_item_id)] : [],
            })).sort(naturalSort),
        }));
    } else { // Attraction
        items = templateItems.map(template => ({
            ...template.toJSON(),
            unique_frontend_id: `${inspectableId}-${template.checklist_item_id}`,
            inspectable_id_for_response: inspectableId,
            responses: responseMap.has(template.checklist_item_id) ? [responseMap.get(template.checklist_item_id)] : [],
        }));
    }

    items.sort(naturalSort);

    const signatures = checklistId ? await ChecklistSignature.findAll({
      where: { checklist_id: checklistId },
      include: [
        { model: User, as: "user", attributes: ["user_id", "user_name"] },
        { model: Role, as: "role", attributes: ["role_name"] }
      ],
    }) : [];

    const checklistData = checklist.toJSON();
    const pendingFailures = await Failure.findAll({
      where: {
        status: 'pendiente'
      },
      include: [
        {
          model: ChecklistResponse,
          as: 'response',
          required: true,
          include: [
            {
              model: Checklist,
              as: 'checklist',
              where: {
                inspectable_id: inspectableId,
                // La fecha de un checklist ya es la fecha de interés, no la de creación
                // Si la frecuencia es 'Diaria', `correctedDateCondition` ya maneja el rango diario
                date: { [Op.lt]: normalizedInputDate } // Solo si es menor estricto, para fallas pendientes de DÍAS ANTERIORES
              },
              required: true
            },
            {
              model: ChecklistItem,
              as: 'checklistItem',
              attributes: ['question_text']
            },
            {
              model: User,
              as: 'respondedBy',
              attributes: ['user_name']
            }
          ]
        }
      ],
      order: [['reported_at', 'ASC']]
    });

    return {
      ...checklistData,
      items,
      signatures,
      pending_failures: pendingFailures,
    };

  } else if (definitiveChecklistType.type_category === 'family') {
    let familyChecklist = await Checklist.findOne({
        where: {
          checklist_type_id: checklistTypeId,
          date: correctedDateCondition,
          inspectable_id: null,
        },
    });

    const devices = await Device.findAll({
        where: { family_id: definitiveChecklistType.associated_id },
        include: { model: Inspectable, as: "parentInspectable" },
    });

    if (!familyChecklist) {
        if (devices.length === 0) {
            return { checklist_id: null, date: effectiveDate, type: definitiveChecklistType.toJSON(), items: [], signatures: [], pending_failures: [] };
        }
        const firstDeviceInspectable = devices[0].parentInspectable;
        if (!firstDeviceInspectable || !firstDeviceInspectable.premise_id) {
            throw new Error('Cannot create family checklist: premise_id not found on the first device.');
        }
        const [createdChecklist] = await Checklist.findOrCreate({
            where: {
                checklist_type_id: checklistTypeId,
                date: correctedDateCondition,
                inspectable_id: null,
            },
            defaults: {
                premise_id: firstDeviceInspectable.premise_id,
                created_by: user_id,
                version_label: definitiveChecklistType.version_label,
                date: effectiveDate, // Usar la fecha normalizada
            },
        });
        familyChecklist = createdChecklist;
    }

    if (devices.length === 0) {
      return { checklist_id: familyChecklist.checklist_id, date: effectiveDate, type: definitiveChecklistType.toJSON(), items: [], signatures: [], pending_failures: [] };
    }

    const templateItems = await ChecklistItem.findAll({ where: { checklist_type_id: checklistTypeId } });
    const allResponses = await ChecklistResponse.findAll({ where: { checklist_id: familyChecklist.checklist_id } });
    const responseMap = new Map();
    allResponses.forEach(r => {
      const key = `${r.inspectable_id}-${r.checklist_item_id}`;
      responseMap.set(key, r);
    });

    const items = devices.map((device, index) => ({
      checklist_item_id: `device-${device.ins_id}`,
      item_number: `${index + 1}`,
      question_text: device.parentInspectable.name,
      input_type: "section",
      subItems: templateItems.map((template) => {
          const key = `${device.ins_id}-${template.checklist_item_id}`;
          const response = responseMap.get(key);
          const mappedResponse = response ? [response.toJSON()] : [];
          return {
              ...template.toJSON(),
              unique_frontend_id: `${device.ins_id}-${template.checklist_item_id}`,
              inspectable_id_for_response: device.ins_id,
              responses: mappedResponse,
              response_compliance: mappedResponse[0]?.response_compliance || null,
              response_type: mappedResponse[0]?.response_type || null,
              comment: mappedResponse[0]?.comment || null,
              evidence_url: mappedResponse[0]?.evidence_url || null
          }
      })
    }));

    items.sort(naturalSort);

    const signatures = await ChecklistSignature.findAll({
      where: { checklist_id: familyChecklist.checklist_id },
      include: [
        { model: User, as: "user", attributes: ["user_id", "user_name"] },
        { model: Role, as: "role", attributes: ["role_name"] },
      ],
    });

    const checklistData = familyChecklist.toJSON();

    return {
      ...checklistData,
      type: definitiveChecklistType.toJSON(),
      items,
      signatures,
      pending_failures: [],
    };
  } else {
    throw new Error(`Checklist type category '${definitiveChecklistType.type_category}' is not supported by this function.`);
  }
}

const getChecklistHistoryByType = async (checklistTypeId) => {
  const checklistType = await ChecklistType.findByPk(checklistTypeId, {
    include: [{ model: ChecklistItem, as: "items", where: { parent_item_id: null } }],
  });

  if (!checklistType || checklistType.name !== 'Apoyo - Técnico (Premios)') {
    // Para otros checklists, devolver el formato genérico
    const checklists = await Checklist.findAll({
      where: { checklist_type_id: checklistTypeId },
      include: [
        { model: ChecklistType, as: "type", attributes: ["name", "description"] },
        { model: User, as: "creator", attributes: ["user_name"] },
        {
          model: ChecklistSignature,
          as: "signatures",
          attributes: ["role_at_signature", "signed_at"],
          include: [{ model: User, as: "user", attributes: ["user_name"] }],
        },
      ],
      order: [["date", "DESC"]],
    });
    return checklists;
  }

  // Para el checklist de premios, crear formato tabular
  const historicalChecklists = await Checklist.findAll({
    where: { checklist_type_id: checklistTypeId },
    include: [{ model: User, as: "creator", attributes: ["user_name"] }],
    order: [["date", "DESC"]],
  });

  const tableData = [];

  for (const checklist of historicalChecklists) {
    const responses = await ChecklistResponse.findAll({
      where: { checklist_id: checklist.checklist_id },
      include: [{ model: ChecklistItem, as: "checklistItem", attributes: ["question_text", "item_number"] }],
    });

    // Agrupar por máquina usando el primer número del item_number
    const machineGroups = {};
    const machines = {
      '1': 'TOY BOX',
      '2': 'TOY FAMILY',
      '3': 'WORK ZONE'
    };

    responses.forEach(response => {
      const itemNumber = response.checklistItem.item_number;
      const machineKey = itemNumber.split('.')[0];
      if (machines[machineKey]) {
        const machineName = machines[machineKey];
        if (!machineGroups[machineName]) machineGroups[machineName] = {};
        machineGroups[machineName][response.checklistItem.question_text] = response;
      }
    });

    // Para cada máquina, crear una fila
    Object.keys(machineGroups).forEach(machineName => {
      const group = machineGroups[machineName];
      const jugadas = group['JUGADAS'];
      const premios = group['PREMIOS'];
      const config = group['CONFIGURACION DE LA MAQUINA'];

      tableData.push({
        fecha: checklist.date,
        maquina: machineName,
        jugadas_acumuladas: jugadas ? jugadas.jugadas_acumuladas : null,
        premios_acumulados: premios ? premios.premios_acumulados : null,
        configuracion_maquina: config ? config.configuracion_maquina : null,
        jugadas_desde_ultima: jugadas ? jugadas.jugadas_desde_ultima : null,
        premios_entregados: premios ? premios.premios_desde_ultima : null,
        premios_esperados: premios ? premios.premios_esperados : null,
        porcentaje: premios ? premios.promedio_premios : null,
        diligenciado_por: checklist.creator ? checklist.creator.user_name : null,
      });
    });
  }

  return { isPremiosChecklist: true, tableData };
}

const getChecklistDataForPDF = async (checklistId) => {
  try {
    const checklist = await Checklist.findByPk(checklistId, {
      include: [
        { model: ChecklistType, as: "type" },
        {
          model: User,
          as: "creator",
          attributes: ["user_name", "user_image"],
          include: [
            { model: Role, as: "role", attributes: ["role_name"] }
          ]
        },
        { model: Inspectable, as: "inspectable" },
        {
          model: ChecklistSignature,
          as: "signatures",
          include: [
            { model: User, as: "user", attributes: ["user_name"] },
            { model: Role, as: "role", attributes: ["role_name"] }
          ]
        }
      ]
    });

    if (!checklist) {
      return null;
    }

    // Get all checklist items with responses
    const items = await ChecklistItem.findAll({
      where: {
        checklist_type_id: checklist.checklist_type_id
      },
      include: [
        {
          model: ChecklistResponse,
          as: "responses",
          where: { checklist_id: checklistId },
          required: false,
          include: [
            { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] },
            { model: Failure, as: "failure", required: false }
          ]
        }
      ],
      order: [["item_number", "ASC"]]
    });

    return {
      ...checklist.toJSON(),
      items: items
    };
  } catch (error) {
    console.error('Error in getChecklistDataForPDF:', error);
    throw error;
  }
};

const getFailuresByStatus = async ({ checklist_id, status }) => {
  try {
    const failures = await Failure.findAll({
      where: {
        status
      },
      include: [
        {
          model: ChecklistResponse,
          as: 'response',
          required: true,
          where: {
            checklist_id
          },
          include: [
            {
              model: ChecklistItem,
              as: 'checklistItem',
              attributes: ['question_text']
            }
          ]
        },
        {
          model: User,
          as: 'failureReporter',
          attributes: ['user_id', 'user_name']
        },
        {
          model: User,
          as: 'failureCloser',
          attributes: ['user_id', 'user_name']
        }
      ],
      order: [['reported_at', 'DESC']]
    });
    return failures;
  } catch (error) {
    console.error("getFailuresByStatus Service: Error:", error.message);
    throw error;
  }
};

const updateFailure = async (updateData) => {
  const { failure_id, ...rest } = updateData;

  if (!failure_id) {
    throw new Error("Se requiere el ID de la falla para actualizarla.");
  }

  const failure = await Failure.findByPk(failure_id);

  if (!failure) {
    throw new Error(`No se encontró una falla con el ID ${failure_id}.`);
  }

  // Si el estado cambia a 'resuelto', establecer la fecha de cierre
  if (rest.status && rest.status === 'resuelto' && failure.status !== 'resuelto') {
    rest.closed_at = new Date();
  }

  const updatedFailure = await failure.update(rest);

  return updatedFailure;
};

const getFailuresByChecklistType = async ({ checklist_type_id }) => {
  try {
    const failures = await Failure.findAll({
        include: [
            {
                model: ChecklistResponse,
                as: 'response',
                required: true,
                include: [
                    {
                        model: Checklist,
                        as: 'checklist',
                        required: true,
                        where: {
                            checklist_type_id
                        },
                        attributes: ['checklist_id', 'date']
                    },
                    {
                        model: ChecklistItem,
                        as: 'checklistItem',
                        attributes: ['item_number', 'question_text']
                    }
                ]
            },
            {
                model: User,
                as: 'failureReporter',
                attributes: ['user_id', 'user_name']
            },
            {
                model: User,
                as: 'failureCloser',
                attributes: ['user_id', 'user_name']
            }
        ],
        order: [['reported_at', 'DESC']]
    });
    return failures;
  } catch (error) {
    console.error("getFailuresByChecklistType Service: Error:", error.message);
    throw error;
  }
};

module.exports = {
  ensureChecklistInstance,
  getLatestChecklist,
  submitResponses,
  getChecklistHistory,
  signChecklist,
  getLatestChecklistByType,
  getChecklistHistoryByType,
  getChecklistDataForPDF,
  getFailuresByStatus,
  updateFailure,
  getFailuresByChecklistType,
};
