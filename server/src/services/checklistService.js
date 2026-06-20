const {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  ChecklistSignature,
  WorkOrder,
  FailureOrder,
  connection,
  Role,
  ChecklistType,
  User,
  Inspectable,
  Device,
  Attraction,
  Family,
  Premise,
  Entity,
  ChecklistQrCode,
  ChecklistQrItemAssociation,
  Requisition
} = require("../models");
const { Sequelize } = require("../models");
const workOrderService = require("./workOrderService");
const weekUtils = require("../utils/weekUtils");
const Op = Sequelize.Op

const getTodayNormalizedUTC = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

const resetQrCodesForChecklist = async (checklistId) => {
  try {
    const checklist = await Checklist.findByPk(checklistId);
    if (!checklist) {
      throw new Error("Checklist not found");
    }

    const qrCodes = await ChecklistQrCode.findAll({
      where: { checklist_type_id: checklist.checklist_type_id },
    });

    if (qrCodes.length === 0) {
      return { success: true, message: "No QR codes to reset for this checklist type." };
    }

    const qrIds = qrCodes.map(qr => qr.qr_id);

    const [affectedRows] = await ChecklistQrItemAssociation.update(
      { is_unlocked: 0, unlocked_at: null },
      {
        where: {
          qr_id: { [Op.in]: qrIds },
        },
      }
    );

    return {
      success: true,
      message: `${affectedRows} QR code associations have been reset.`,
    };
  } catch (error) {
    console.error("Error resetting QR codes for checklist:", error);
    throw error;
  }
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

  // Solo incluir dispositivos activos (public_flag === 'Sí')
  const devices = await Device.findAll({
    where: {
      family_id: checklistType.associated_id,
      public_flag: 'Sí'
    },
    include: { model: Inspectable, as: "parentInspectable" },
  });

  if (!devices || devices.length === 0) {
    console.error(`[processFamilyChecklistItems] No se encontraron dispositivos activos (public_flag='Sí') para la familia con ID ${checklistType.associated_id}`);
    return [];
  }

  const templateItems = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId },
  });

  // Separar items padre e hijos
  const parentTemplateItems = templateItems.filter(t => t.parent_item_id === null);
  const childTemplateItems = templateItems.filter(t => t.parent_item_id !== null);

  const allResponses = await ChecklistResponse.findAll({
    where: { checklist_id: checklistId },
  });

  const responseMap = new Map();
  allResponses.forEach(r => {
    const key = `${r.inspectable_id}-${r.checklist_item_id}`;
    responseMap.set(key, r);
  });

  const items = devices.map((device, index) => {
    // Construir sección por dispositivo con grupos jerarquicos (padre → hijos)
    const deviceSubItems = [];

    parentTemplateItems.forEach((parentItem) => {
      // Buscar respuesta para el item padre (en checklists de familia, el padre suele ser el item contestable si no hay hijos)
      const parentKey = `${device.ins_id}-${parentItem.checklist_item_id}`;
      const parentResponse = responseMap.get(parentKey);
      const mappedParentResponse = parentResponse ? [parentResponse] : [];

      deviceSubItems.push({
        ...parentItem.toJSON(),
        unique_frontend_id: `${device.ins_id}-${parentItem.checklist_item_id}`,
        inspectable_id_for_response: device.ins_id,
        parent_item_id: null,
        responses: mappedParentResponse,
        response_compliance: mappedParentResponse[0]?.response_compliance || null,
        response_type: mappedParentResponse[0]?.response_type || null
      });

      // Agregar hijos del padre
      const children = childTemplateItems.filter(
        (c) => c.parent_item_id === parentItem.checklist_item_id
      );
      children.forEach((childItem) => {
        const key = `${device.ins_id}-${childItem.checklist_item_id}`;
        const response = responseMap.get(key);
        const mappedResponse = response ? [response] : [];
        deviceSubItems.push({
          ...childItem.toJSON(),
          unique_frontend_id: `${device.ins_id}-${childItem.checklist_item_id}`,
          inspectable_id_for_response: device.ins_id,
          responses: mappedResponse,
          response_compliance: mappedResponse[0]?.response_compliance || null,
          response_type: mappedResponse[0]?.response_type || null,
        });
      });
    });

    return {
      checklist_item_id: `device-${device.ins_id}`,
      item_number: `${index + 1}`,
      question_text: device.parentInspectable.name,
      input_type: "section",
      device_id: device.ins_id,
      subItems: deviceSubItems,
    };
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



const ensureChecklistInstance = async ({ inspectableId, premise_id, created_by, role_id, checklist_type_id }) => {
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

    // Obtener los límites de fecha según el tipo de checklist (diario o semanal)
    const { startDate, endDate, identifier, isWeekly } = weekUtils.getDateBoundsForChecklistType(checklistTypeInstance);

    console.log(`[ensureChecklistInstance] Tipo: ${checklistTypeInstance.type_category}, Frecuencia: ${checklistTypeInstance.frequency}, Semanal: ${isWeekly}`);
    console.log(`[ensureChecklistInstance] Rango de búsqueda: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    if (identifier) {
      console.log(`[ensureChecklistInstance] Identificador de semana: ${identifier}`);
    }

    // Construir la cláusula where para buscar checklist existente
    const whereClause = {
      checklist_type_id: checklistTypeInstance.checklist_type_id,
      createdAt: {
        [Op.between]: [startDate, endDate],
      }
    };
    
    // Para checklists semanales de familia, agregar week_identifier
    if (isWeekly && identifier) {
      whereClause.week_identifier = identifier;
    }
    
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

    // Primero, buscar si ya existe un checklist con las condiciones dadas
    let existingChecklist = await Checklist.findOne({
      where: whereClause,
      transaction,
    });

    // Si el checklist existe, lo retornamos
    if (existingChecklist) {
      const message = isWeekly 
        ? `Checklist semanal existente encontrado (Semana ${identifier})`
        : 'Checklist diario existente encontrado';
      console.log(`[ensureChecklistInstance] ${message}:`, existingChecklist.checklist_id);
      await transaction.commit();
      return {
        checklist: existingChecklist,
        isNew: false,
        message,
        isWeekly,
        weekIdentifier: identifier
      };
    }

    // Si no existe, lo creamos
    const createData = {
      checklist_type_id: checklistTypeInstance.checklist_type_id,
      inspectable_id: inspectableId,
      premise_id: effectivePremiseId,
      created_by,
      version_label: checklistTypeInstance.version_label,
    };
    
    // Agregar week_identifier solo para checklists semanales
    if (isWeekly && identifier) {
      createData.week_identifier = identifier;
    }

    const newChecklist = await Checklist.create(createData, { transaction });

    const message = isWeekly
      ? `Nueva instancia de checklist semanal creada (Semana ${identifier})`
      : 'Nueva instancia de checklist diario creada exitosamente';

    console.log(`[ensureChecklistInstance] ${message}:`, {
      checklist_id: newChecklist.checklist_id,
      inspectable_id: newChecklist.inspectable_id,
      version_label: newChecklist.version_label,
      week_identifier: newChecklist.week_identifier
    });

    await transaction.commit();
    return {
      checklist: newChecklist,
      isNew: true,
      message,
      isWeekly,
      weekIdentifier: identifier
    };

  } catch (error) {
    console.error('Error en ensureChecklistInstance:', error);
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getLatestChecklist = async ({ inspectableId, role_id, checklist_type_id }) => {
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

  // Obtener los límites de fecha según el tipo de checklist (diario o semanal)
  const { startDate, endDate, identifier, isWeekly } = weekUtils.getDateBoundsForChecklistType(definitiveChecklistType);

  console.log(`[getLatestChecklist] Tipo: ${definitiveChecklistType.type_category}, Semanal: ${isWeekly}`);
  console.log(`[getLatestChecklist] Buscando en rango: ${startDate.toISOString()} - ${endDate.toISOString()}`);

  const whereClause = {
    createdAt: {
      [Op.between]: [startDate, endDate],
    },
    checklist_type_id: definitiveChecklistType.checklist_type_id
  };
  
  // Para checklists semanales, agregar week_identifier
  if (isWeekly && identifier) {
    whereClause.week_identifier = identifier;
  }
  
  if (inspectableId !== null && inspectableId !== undefined) {
    whereClause.inspectable_id = inspectableId;
  }

  // Solo buscar y retornar la instancia existente, sin crear una nueva
  const checklist = await Checklist.findOne({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    include: [{ model: ChecklistType, as: "type" }],
  });

  // Si no existe una instancia, retornar null en lugar de crear una nueva
  if (!checklist) {
    console.log(`[getLatestChecklist] No se encontró checklist para el ${isWeekly ? 'semana' : 'día'} actual`);
    return null;
  }

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
        model: WorkOrder,
        as: "workOrder",
        include: [{ model: User, as: "closer", attributes: ["user_id", "user_name"] }]
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
                {
                  model: WorkOrder, as: "workOrder", required: false,
                  include: [{ model: User, as: "closer", attributes: ["user_id", "user_name"] }],
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
            {
              model: WorkOrder, as: "workOrder", required: false,
              include: [{ model: User, as: "closer", attributes: ["user_id", "user_name"] }],
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

  const pending_work_orders = await WorkOrder.findAll({
    where: {
      status: 'pendiente'
    },
    include: [
      {
        model: ChecklistResponse,
        as: 'initialResponse',
        required: true,
        include: [
          {
            model: Checklist,
            as: 'checklist',
            where: {
              inspectable_id: inspectableId,
              createdAt: { [Op.lt]: checklist.createdAt }
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
    order: [['createdAt', 'ASC']]
  });

  // Agregar información de semana si es un checklist semanal
  const result = {
    ...checklist.toJSON(),
    items,
    signatures,
    pending_work_orders
  };

  if (isWeekly && identifier) {
    result.week_info = {
      week_identifier: identifier,
      week_range: weekUtils.formatWeekRange(startDate, endDate),
      days_remaining: weekUtils.getDaysRemainingInWeek(),
      start_date: startDate,
      end_date: endDate
    };
  }

  return result;
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
        attributes: ["role_id", "signed_at"],
        include: [
          { model: User, as: "user", attributes: ["user_name"] },
          { model: Role, as: "role", attributes: ["role_name"] }
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
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
      createdAt: { [Op.lt]: checklist.createdAt },
    },
    include: [
      {
        model: ChecklistResponse,
        as: 'responses',
        include: [{ model: ChecklistItem, as: 'checklistItem' }],
      },
    ],
    order: [['createdAt', 'DESC']],
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
    // Definir fechas para el rango de búsqueda
    const today = getTodayNormalizedUTC();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Permitir tanto técnicos de mantenimiento (role_id 3) como anfitriones (role_id 4)
    if (role_id !== 3 && role_id !== 4 && role_id !== 2) {
      throw new Error("Sólo los técnicos de mantenimiento y anfitriones pueden rellenar la lista de control.")
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
      const hasTechnicalSignature = existingSignatures.some(sig => sig.role_id === 3); // Técnico de mantenimiento (role_id 3)
      const hasOperationsSignature = existingSignatures.some(sig => sig.role_id === 4); // Anfitrión

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
      // For specific checklists without checklist_id, find by type and createdAt
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
        console.log('Procesando checklist de FAMILIA (SEMANAL)');
        
        // Obtener el identificador de la semana actual
        const { identifier: weekIdentifier } = weekUtils.getDateBoundsForChecklistType(checklist.type);
        console.log(`Buscando checklist de familia para semana: ${weekIdentifier}`);
        
        const familyChecklist = await Checklist.findOne({
          where: {
            checklist_type_id: checklist.checklist_type_id,
            week_identifier: weekIdentifier, // ⭐ Buscar por semana, no por día
            inspectable_id: null
          },
          transaction
        });

        if (familyChecklist) {
          console.log(`Checklist de familia semanal encontrado. ID: ${familyChecklist.checklist_id}, Semana: ${weekIdentifier}`);
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
          console.warn(`ADVERTENCIA: No se encontró un checklist de familia para la semana ${weekIdentifier}. Se intentará crear uno.`);
          const firstInspectableId = responses[0]?.inspectable_id;
          if (firstInspectableId) {
            const inspectable = await Inspectable.findByPk(firstInspectableId, { transaction });
            const premise_id = inspectable ? inspectable.premise_id : null;

            if (premise_id) {
              const [createdChecklist] = await Checklist.findOrCreate({
                where: {
                  checklist_type_id: checklist.checklist_type_id,
                  week_identifier: weekIdentifier, // ⭐ Usar week_identifier
                  inspectable_id: null,
                },
                defaults: {
                  premise_id: premise_id,
                  created_by: responded_by,
                  version_label: checklist.type.version_label,
                  week_identifier: weekIdentifier, // ⭐ Asegurar que se guarde
                },
                transaction,
              });
              console.log(`Checklist de familia semanal CREADO (fallback). ID: ${createdChecklist.checklist_id}, Semana: ${weekIdentifier}`);
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
                createdAt: {
                  [Op.between]: [startOfDay, endOfDay],
                }
              },
              defaults: {
                created_by: responded_by,
                version_label: checklist.type.version_label,
                premise_id: inspectable ? inspectable.premise_id : null
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
              createdAt: {
                [Op.between]: [startOfDay, endOfDay],
              }
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
      const { checklist_item_id, inspectable_id, value, response_id } = response;
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

      // Las validaciones de comment y evidence_url se eliminaron - ahora van en failure_orders
      if (response.response_type === "no_cumple" || value === "no cumple") {
        // La validación de campos obligatorios se traslada al sistema de fallas
      }

      if (response.response_type === "observaciones" || value === "observación") {
        // La validación de campos obligatorios se traslada al sistema de fallas
      }

      const responseData = {
        response_id: response_id || undefined,
        checklist_id: response.checklist_id || checklist_id,
        checklist_item_id,
        // Para family: respetar el inspectable_id del dispositivo (requerido)
        // Para todos los demás tipos: siempre null, aunque el frontend envíe undefined o un valor
        inspectable_id: checklist.type.type_category === 'family'
          ? (inspectable_id ?? null)
          : null,
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
          switch (response.response_type) {
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
        const conflictWhere = {
          checklist_id: responseData.checklist_id,
          checklist_item_id: responseData.checklist_item_id,
          inspectable_id: responseData.inspectable_id ?? null,
        };

        const conflictingResponse = await ChecklistResponse.findOne({
          where: conflictWhere,
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

      // Las fallas ya NO se crean automáticamente al guardar respuestas.
      // El usuario debe registrarlas manualmente a través del RecurringFailureModal.
      console.log(`Respuesta guardada para item ${checklist_item_id} con compliance: ${responseData.response_compliance}`);
    }

    // Special logic for "Apoyo - Técnico (Premios)" checklist
    if (checklist.type.name === 'Apoyo - Técnico (Premios)' || checklist.type.name.includes('Premios')) {
      try {
        if (checklist.type.type_category === 'specific') {
          // For specific checklists, calculate for all checklists created
          const createdChecklists = await Checklist.findAll({
            where: {
              checklist_type_id: checklist.checklist_type_id,
              createdAt: {
                [Op.between]: [startOfDay, endOfDay],
              }
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

    // Obtener datos del usuario para el campo signed_by_name
    const user = await User.findByPk(user_id, { transaction });
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    const userRole = await Role.findByPk(role_id, { transaction });
    if (!userRole) {
      throw new Error("Rol de usuario inválido.");
    }
    const role_name = userRole.role_name;

    // Verificar roles por ID en lugar de nombres para mayor precisión
    const allowed_role_ids = [1, 3, 4]; // 1: Administrador, 3: Técnico de mantenimiento, 4: Anfitrión
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
    // Obtener el tipo de checklist para determinar la estrategia de validación
    const checklistType = await ChecklistType.findByPk(checklist.checklist_type_id, { transaction });
    
    if (!checklistType) {
      throw new Error(`ChecklistType with ID ${checklist.checklist_type_id} not found`);
    }
    
    // Obtener todas las respuestas existentes
    const existingResponses = await ChecklistResponse.findAll({
      where: { checklist_id: checklist.checklist_id },
      transaction
    });

    // Obtener todos los ítems del checklist (excluyendo secciones)
    const checklistItems = await ChecklistItem.findAll({
      where: { 
        checklist_type_id: checklist.checklist_type_id,
        input_type: { [Op.ne]: 'section' } // Excluir secciones
      },
      transaction
    });

    // Verificar si hay ítems sin responder o con respuestas vacías
    const incompleteItems = [];
    
    if (checklistType.type_category === 'family') {
      // Para checklists de familia: cada dispositivo debe tener respuestas para todos los items
      const devices = await Device.findAll({
        where: {
          family_id: checklistType.associated_id,
          public_flag: 'Sí'
        },
        transaction
      });
      
      // Crear mapa de respuestas por dispositivo e item
      const responseMap = new Map();
      existingResponses.forEach(r => {
        const key = `${r.inspectable_id}-${r.checklist_item_id}`;
        responseMap.set(key, r);
      });
      
      // Validar que cada dispositivo tenga respuestas para todos los items
      devices.forEach(device => {
        checklistItems.forEach(item => {
          const key = `${device.ins_id}-${item.checklist_item_id}`;
          const response = responseMap.get(key);
          
          // Item sin respuesta
          if (!response) {
            incompleteItems.push({
              item_number: item.item_number,
              question_text: `${device.device_name || device.ins_id} - ${item.question_text}`
            });
            return;
          }
          
          // Item con respuesta pero sin valor válido
          const hasValidValue = 
            response.response_compliance || 
            (response.response_numeric !== null && response.response_numeric !== undefined) ||
            response.response_text;
          
          if (!hasValidValue) {
            incompleteItems.push({
              item_number: item.item_number,
              question_text: `${device.device_name || device.ins_id} - ${item.question_text}`
            });
          }
        });
      });
    } else {
      // Para checklists normales (atracción, estático, etc.)
      const responseMap = new Map(existingResponses.map(r => [r.checklist_item_id, r]));

      checklistItems.forEach(item => {
        const response = responseMap.get(item.checklist_item_id);
        
        // Item sin respuesta
        if (!response) {
          incompleteItems.push({
            item_number: item.item_number,
            question_text: item.question_text
          });
          return;
        }
        
        // Item con respuesta pero sin valor válido
        const hasValidValue = 
          response.response_compliance || 
          (response.response_numeric !== null && response.response_numeric !== undefined) ||
          response.response_text;
        
        if (!hasValidValue) {
          incompleteItems.push({
            item_number: item.item_number,
            question_text: item.question_text
          });
        }
      });
    }

    if (incompleteItems.length > 0) {
      const error = new Error(`El checklist tiene ${incompleteItems.length} ítems sin responder o con respuestas vacías.`);
      error.incompleteItems = incompleteItems;
      error.incompleteCount = incompleteItems.length;
      throw error;
    }

    // Verificar y cargar el ChecklistType manualmente si es necesario para la firma
    let checklistTypeForSignature = checklistType; // Reutilizar el tipo ya cargado
    
    // Si no tiene checklist_type_id, intentar encontrar el tipo correcto
    if (!checklistTypeForSignature) {
      console.log('Checklist sin checklist_type_id, buscando tipo apropiado...');
      // Buscar un ChecklistType estático para técnicos de mantenimiento
      checklistTypeForSignature = await ChecklistType.findOne({
        where: {
          role_id: 7, // Técnico de mantenimiento
          type_category: 'static'
        },
        transaction
      });

      if (checklistTypeForSignature) {
        // Actualizar el checklist con el tipo encontrado
        await checklist.update({
          checklist_type_id: checklistTypeForSignature.checklist_type_id
        }, { transaction });
        console.log('Checklist actualizado con checklist_type_id:', checklistTypeForSignature.checklist_type_id);
      }
    }

    if (!checklistTypeForSignature) {
      throw new Error(`No se pudo encontrar un ChecklistType válido para el checklist ${checklist_id}`);
    }

    // Agregar el tipo al checklist manualmente
    checklist.type = checklistTypeForSignature;

    console.log('=== DEBUG signChecklist ===');
    console.log('checklist_id:', checklist_id);
    console.log('checklist.checklist_type_id:', checklist.checklist_type_id);
    console.log('checklist.type:', checklist.type);

    if (!checklist.type) {
      throw new Error(`Checklist with ID ${checklist.checklist_id} has a missing or invalid checklist type. checklist_type_id: ${checklist.checklist_type_id}`);
    }

    // Determinar tipo de firma basado en rol
    console.log('🔍 [signChecklist] Firmando checklist con role_id:', role_id);

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
          signature_type: signatureType,
        },
        { transaction }

      );
      console.log(`Firma actualizada para usuario ${user_id} en checklist ${checklist.checklist_id}`);
    } else {
      // Crear una nueva firma
      await ChecklistSignature.create(
        {
          checklist_id: checklist.checklist_id,
          user_id: user_id,
          role_id: role_id,
          digital_token: digital_token,
          signed_at: new Date(),
          signed_by_name: user.user_name,
        },
        { transaction },
      );
      console.log(`Nueva firma creada para usuario ${user.user_name} en checklist ${checklist.checklist_id}`);
    }

    await transaction.commit();
    return { success: true, message: "Checklist firmado exitosamente" };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
};

const getLatestChecklistByType = async ({ checklistTypeId, user_id, role_id }) => {
  const normalizedInputDate = new Date();
  normalizedInputDate.setUTCHours(0, 0, 0, 0);

  const definitiveChecklistType = await ChecklistType.findByPk(checklistTypeId, {
    include: [{ model: Inspectable, as: 'specificInspectables' }]
  });

  if (!definitiveChecklistType) {
    throw new Error(`ChecklistType with ID ${checklistTypeId} not found.`);
  }

  let effectiveDate = normalizedInputDate;
  // Definir fechas al inicio para que estén disponibles en todo el scope
  const startOfDay = new Date(effectiveDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(effectiveDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  if (definitiveChecklistType.type_category === 'specific') {
    const specificInspectables = definitiveChecklistType.specificInspectables || [];
    const inspectableIds = specificInspectables.map(i => i.ins_id);

    const checklists = await Checklist.findAll({
      where: {
        inspectable_id: { [Op.in]: inspectableIds },
        checklist_type_id: checklistTypeId,
        createdAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      include: [{ model: ChecklistType, as: "type" }]
    });

    if (!checklists || checklists.length === 0) {
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
        type: definitiveChecklistType.toJSON(),
        items: items.sort(naturalSort),
        signatures: [],
        pending_work_orders: [],
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
      type: definitiveChecklistType.toJSON(),
    };

    if (checklists.length > 0) {
      checklistData.checklist_id = checklists[0].checklist_id;
    }

    return {
      ...checklistData,
      items,
      signatures,
      pending_work_orders: [],
    }

  } else if (definitiveChecklistType.type_category === 'static' || definitiveChecklistType.type_category === 'attraction') {
    const isStatic = definitiveChecklistType.type_category === 'static';
    const inspectableId = isStatic ? null : definitiveChecklistType.associated_id;

    // Determinar si es semanal o diario
    const { startDate: periodStart, endDate: periodEnd, identifier: weekIdentifier, isWeekly } =
      weekUtils.getDateBoundsForChecklistType(definitiveChecklistType);

    console.log(`[getLatestChecklistByType] ${definitiveChecklistType.type_category} - isWeekly: ${isWeekly}, identifier: ${weekIdentifier}`);

    // Construir el where para buscar/crear el checklist
    // Para semanales usamos week_identifier; para diarios usamos el rango de createdAt
    const searchWhere = isWeekly
      ? {
          checklist_type_id: definitiveChecklistType.checklist_type_id,
          week_identifier: weekIdentifier,
          inspectable_id: inspectableId,
        }
      : {
          checklist_type_id: definitiveChecklistType.checklist_type_id,
          inspectable_id: inspectableId,
        };

    let checklist = await Checklist.findOne({
      where: isWeekly
        ? searchWhere
        : {
            ...searchWhere,
            createdAt: { [Op.between]: [periodStart, periodEnd] },
          },
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
        if (anyPremise) premise_id = anyPremise.premise_id;
        else throw new Error('Could not determine premise_id for checklist creation.');
      }

      const createDefaults = {
        premise_id: premise_id,
        created_by: user_id,
        version_label: definitiveChecklistType.version_label,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(isWeekly && { week_identifier: weekIdentifier }),
      };

      const [createdChecklist] = await Checklist.findOrCreate({
        where: searchWhere,
        defaults: createDefaults,
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

    return {
      ...checklistData,
      items,
      signatures,
      pending_work_orders: [],
      ...(isWeekly && {
        week_info: {
          week_identifier: weekIdentifier,
          week_range: weekUtils.formatWeekRange(periodStart, periodEnd),
          days_remaining: weekUtils.getDaysRemainingInWeek(),
          start_date: periodStart,
          end_date: periodEnd,
        }
      }),
    };

  } else if (definitiveChecklistType.type_category === 'family') {
    // ===== LÓGICA SEMANAL PARA CHECKLISTS DE FAMILIA =====
    // Obtener los límites de la semana actual (Lunes-Domingo)
    const { startDate: startOfWeek, endDate: endOfWeek, identifier: weekIdentifier } = weekUtils.getDateBoundsForChecklistType(definitiveChecklistType);
    
    console.log(`[getLatestChecklistByType] Checklist de FAMILIA - Semana ${weekIdentifier}`);
    console.log(`[getLatestChecklistByType] Buscando en rango: ${startOfWeek.toISOString()} - ${endOfWeek.toISOString()}`);

    // Buscar checklist de la semana actual usando week_identifier
    let familyChecklist = await Checklist.findOne({
      where: {
        checklist_type_id: checklistTypeId,
        week_identifier: weekIdentifier,
        inspectable_id: null,
      },
      include: [{ model: ChecklistType, as: "type" }]
    });

    // Obtener dispositivos de la familia (solo activos)
    const devices = await Device.findAll({
      where: { 
        family_id: definitiveChecklistType.associated_id,
        public_flag: 'Sí' // Solo dispositivos activos
      },
      include: { model: Inspectable, as: "parentInspectable" },
    });

    // Si no existe checklist para esta semana, crearlo
    if (!familyChecklist) {
      if (devices.length === 0) {
        console.log('[getLatestChecklistByType] No hay dispositivos activos para esta familia');
        return {
          checklist_id: null,
          type: definitiveChecklistType.toJSON(),
          items: [],
          signatures: [],
          pending_work_orders: [],
          week_info: {
            week_identifier: weekIdentifier,
            week_range: weekUtils.formatWeekRange(startOfWeek, endOfWeek),
            days_remaining: weekUtils.getDaysRemainingInWeek(),
            start_date: startOfWeek,
            end_date: endOfWeek
          }
        };
      }
      
      const firstDeviceInspectable = devices[0].parentInspectable;
      if (!firstDeviceInspectable || !firstDeviceInspectable.premise_id) {
        throw new Error('Cannot create family checklist: premise_id not found on the first device.');
      }
      
      // Crear checklist semanal con week_identifier
      const checklistDefaults = {
        premise_id: firstDeviceInspectable.premise_id,
        created_by: user_id,
        version_label: definitiveChecklistType.version_label,
        week_identifier: weekIdentifier, // ⭐ Campo clave para checklists semanales
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log(`[getLatestChecklistByType] Creando nuevo checklist semanal para semana ${weekIdentifier}`);

      const [createdChecklist] = await Checklist.findOrCreate({
        where: {
          checklist_type_id: checklistTypeId,
          week_identifier: weekIdentifier,
          inspectable_id: null,
        },
        defaults: checklistDefaults,
      });
      
      familyChecklist = await Checklist.findByPk(createdChecklist.checklist_id, {
        include: [{ model: ChecklistType, as: "type" }]
      });
      
      console.log(`[getLatestChecklistByType] Checklist semanal creado con ID: ${familyChecklist.checklist_id}`);
    } else {
      console.log(`[getLatestChecklistByType] Checklist semanal existente encontrado (ID: ${familyChecklist.checklist_id})`);
    }

    if (devices.length === 0) {
      return {
        checklist_id: familyChecklist.checklist_id,
        type: definitiveChecklistType.toJSON(),
        items: [],
        signatures: [],
        pending_work_orders: [],
        week_info: {
          week_identifier: weekIdentifier,
          week_range: weekUtils.formatWeekRange(startOfWeek, endOfWeek),
          days_remaining: weekUtils.getDaysRemainingInWeek(),
          start_date: startOfWeek,
          end_date: endOfWeek
        }
      };
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
          response_type: mappedResponse[0]?.response_type || null
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

    // ⭐ Agregar información de la semana para el frontend
    return {
      ...checklistData,
      type: definitiveChecklistType.toJSON(),
      items,
      signatures,
      pending_work_orders: [],
      week_info: {
        week_identifier: weekIdentifier,
        week_range: weekUtils.formatWeekRange(startOfWeek, endOfWeek),
        days_remaining: weekUtils.getDaysRemainingInWeek(),
        start_date: startOfWeek,
        end_date: endOfWeek
      }
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
          attributes: ["role_id", "signed_at"],
          include: [{ model: User, as: "user", attributes: ["user_name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return checklists;
  }

  // Para el checklist de premios, crear formato tabular
  const historicalChecklists = await Checklist.findAll({
    where: { checklist_type_id: checklistTypeId },
    include: [{ model: User, as: "creator", attributes: ["user_name"] }],
    order: [["createdAt", "DESC"]],
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
        fecha: checklist.createdAt,
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

// Función para ordenamiento natural de números de ítems
const naturalSortItemNumbers = (items) => {
  return items.sort((a, b) => {
    const itemA = a.item_number || '';
    const itemB = b.item_number || '';

    // Dividir por puntos y convertir cada parte a número para comparación
    const partsA = itemA.split('.').map(part => parseInt(part, 10) || 0);
    const partsB = itemB.split('.').map(part => parseInt(part, 10) || 0);

    // Comparar parte por parte
    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA !== partB) {
        return partA - partB;
      }
    }

    // Si todas las partes son iguales, comparar como string como fallback
    return itemA.localeCompare(itemB);
  });
};

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
        {
          model: Inspectable,
          as: "inspectable",
          include: [
            { model: Premise, as: "premise", attributes: ["premise_name"] }
          ]
        },
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

    const isFamilyChecklist = checklist.type?.type_category === 'family';
    let items;

    if (isFamilyChecklist) {
      // Para checklists de familia: usar la función dinámica que mapea dispositivos + hijos + respuestas
      items = await processFamilyChecklistItems(checklist.checklist_type_id, checklistId);
    } else {
      // Para checklists normales (atracción, etc.)
      const rawItems = await ChecklistItem.findAll({
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
              { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] }
            ]
          }
        ]
      });
      items = naturalSortItemNumbers(rawItems);
    }

    // Obtener órdenes de falla
    let failuresData = { failures_by_item: {}, total_failures: 0 };
    try {
      failuresData = await getChecklistFailures(checklistId, isFamilyChecklist);
    } catch (failureError) {
      console.error('Error obteniendo fallas para PDF:', failureError);
    }

    // Obtener información de QR scans para checklists de atracción
    let qrScans = [];
    if (checklist.type?.type_category === 'attraction') {
      try {
        const { ChecklistQrScan, ChecklistQrCode } = require('../models');
        const scans = await ChecklistQrScan.findAll({
          where: { checklist_id: checklistId },
          include: [
            {
              model: ChecklistQrCode,
              as: 'qrCode',
              attributes: ['qr_code', 'group_number', 'attraction_name']
            }
          ],
          order: [['scanned_at', 'ASC']],
          attributes: ['scan_id', 'scanned_at', 'scanned_by']
        });
        
        // Formatear los datos para el PDF
        qrScans = scans.map(scan => ({
          qr_code: scan.qrCode?.qr_code || 'N/A',
          attraction_name: scan.qrCode?.attraction_name || 'N/A',
          scanned_at: scan.scanned_at,
          group_number: scan.qrCode?.group_number
        }));
        
        console.log('✅ QR Scans obtenidos para PDF:', qrScans.length);
      } catch (qrError) {
        console.error('Error obteniendo QR scans para PDF:', qrError);
      }
    }

    // Obtener información de semana para checklists de familia
    let weekInfo = null;
    if (isFamilyChecklist && checklist.week_identifier) {
      try {
        const { getWeekDates } = require('../utils/weekUtils');
        weekInfo = getWeekDates(checklist.week_identifier);
      } catch (weekError) {
        console.error('Error obteniendo información de semana para PDF:', weekError);
      }
    }

    // Obtener requisiciones pendientes para este checklist
    let pendingRequisitions = [];
    try {
      pendingRequisitions = await getPendingRequisitionsForChecklist(checklistId);
    } catch (reqError) {
      console.error('Error obteniendo requisiciones pendientes para PDF:', reqError);
    }

    return {
      ...checklist.toJSON(),
      items,
      failures: failuresData,
      qr_scans: qrScans,
      week_info: weekInfo,
      pending_requisitions: pendingRequisitions
    };
  } catch (error) {
    console.error('Error in getChecklistDataForPDF:', error);
    throw error;
  }
};


const getPendingRequisitionsForChecklist = async (checklistId) => {
  try {
    const checklist = await Checklist.findByPk(checklistId, {
      attributes: ['checklist_id', 'checklist_type_id']
    });
    if (!checklist) return [];

    const checklistItems = await ChecklistItem.findAll({
      where: { checklist_type_id: checklist.checklist_type_id },
      attributes: ['checklist_item_id']
    });
    const itemIds = checklistItems.map(i => i.checklist_item_id);
    if (itemIds.length === 0) return [];

    const failureOrders = await FailureOrder.findAll({
      where: { checklist_item_id: { [Op.in]: itemIds } },
      attributes: ['id']
    });
    const foIds = failureOrders.map(fo => fo.id);
    if (foIds.length === 0) return [];

    const workOrders = await WorkOrder.findAll({
      where: { failure_order_id: { [Op.in]: foIds } },
      attributes: ['id'],
      include: [{
        model: Requisition,
        as: 'requisitions',
        where: {
          status: { [Op.in]: ['SOLICITADO', 'PENDIENTE'] }
        },
        required: false
      }]
    });

    const pendingFromChain = workOrders
      .flatMap(wo => (wo.requisitions || []))
      .filter(Boolean)
      .map(r => ({
        id: r.id,
        part_reference: r.part_reference,
        quantity_requested: r.quantity_requested,
        status: r.status,
        created_at: r.createdAt,
        source: 'chain'
      }));

    const pendingDirect = await Requisition.findAll({
      where: {
        checklist_id: checklistId,
        status: { [Op.in]: ['SOLICITADO', 'PENDIENTE'] }
      }
    });

    const pendingFromDirect = pendingDirect.map(r => ({
      id: r.id,
      part_reference: r.part_reference,
      quantity_requested: r.quantity_requested,
      status: r.status,
      created_at: r.createdAt,
      source: 'direct'
    }));

    const combined = [...pendingFromChain, ...pendingFromDirect];
    const seen = new Set();
    return combined.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  } catch (error) {
    console.error('[getPendingRequisitionsForChecklist] Error:', error);
    return [];
  }
};

const getWorkOrdersByStatus = async ({ checklist_id, status }) => {
  try {
    console.log(`Buscando WorkOrders para checklist_id: ${checklist_id}, status: ${status}`);

    // Primero obtener las fallas asociadas al checklist específico
    const failureOrders = await FailureOrder.findAll({
      where: {
        checklist_item_id: {

        }
      },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'user_name']
        }
      ]
    });

    if (failureOrders.length === 0) {
      console.log('No se encontraron fallas para el checklist');
      return [];
    }

    const failureOrderIds = failureOrders.map(fo => fo.id);
    console.log(`Found ${failureOrderIds.length} failure orders:`, failureOrderIds);

    // Luego obtener las work orders asociadas a esas fallas
    const workOrders = await WorkOrder.findAll({
      where: {
        failure_order_id: {
          [Op.in]: failureOrderIds
        },
        status: status
      },
      include: [
        {
          model: FailureOrder,
          as: 'failureOrder',
          required: true,
          include: [
            {
              model: User,
              as: 'reporter',
              attributes: ['user_id', 'user_name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Encontradas ${workOrders.length} work orders para el checklist`);
    return workOrders;
  } catch (error) {

    throw error;
  }
};

const updateWorkOrder = async (updateData) => {
  const { work_order_id, ...rest } = updateData;

  if (!work_order_id) {
    throw new Error("Se requiere el ID de la orden de trabajo para actualizarla.");
  }

  const workOrder = await WorkOrder.findByPk(work_order_id);

  if (!workOrder) {
    throw new Error(`No se encontró una orden de trabajo con el ID ${work_order_id}.`);
  }

  // Si el estado cambia a 'resuelto', establecer la fecha de cierre
  if (rest.status && rest.status === 'resuelto' && workOrder.status !== 'resuelto') {
    rest.closed_at = new Date();
  }

  const updatedWorkOrder = await workOrder.update(rest);

  return updatedWorkOrder;
};

const getWorkOrdersByChecklistType = async ({ checklist_type_id }) => {
  try {
    console.log(`🔍 [getWorkOrdersByChecklistType] Filtrando por checklist_type_id: ${checklist_type_id}`);

    // PASO 1: Obtener los checklist_item_id que pertenecen al checklist_type_id específico
    const checklistItems = await ChecklistItem.findAll({
      where: { checklist_type_id },
      attributes: ['checklist_item_id']
    });

    const checklistItemIds = checklistItems.map(item => item.checklist_item_id);
    console.log(`🔍 [getWorkOrdersByChecklistType] Encontrados ${checklistItemIds.length} items para el checklist_type_id ${checklist_type_id}`);

    if (checklistItemIds.length === 0) {
      console.log(`🔍 [getWorkOrdersByChecklistType] No hay items para el checklist_type_id ${checklist_type_id}, retornando array vacío`);
      return [];
    }

    // PASO 2: Obtener las FailureOrders asociadas a esos checklist_item_id
    const failureOrders = await FailureOrder.findAll({
      where: {
        checklist_item_id: {
          [Op.in]: checklistItemIds
        }
      },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'user_name']
        },
        {
          model: ChecklistItem,
          as: 'checklistItem',
          attributes: ['checklist_item_id', 'question_text', 'item_number']
        }
      ]
    });

    console.log(`🔍 [getWorkOrdersByChecklistType] Encontradas ${failureOrders.length} failure orders`);

    if (failureOrders.length === 0) {
      return [];
    }

    // PASO 3: Cargar AR y OT de cada falla
    const failureOrderIds = failureOrders.map(fo => fo.id);
    const { RepairExecution } = require('../models');

    const enrichedFailures = await FailureOrder.findAll({
      where: { id: { [Op.in]: failureOrderIds } },
      include: [
        { model: User, as: 'reporter', attributes: ['user_id', 'user_name'] },
        { model: ChecklistItem, as: 'checklistItem', attributes: ['checklist_item_id', 'question_text', 'item_number'] },
        { model: RepairExecution, as: 'repairExecution', required: false },
        { model: WorkOrder, as: 'workOrder', required: false }
      ],
      order: [[{ model: RepairExecution, as: 'repairExecution' }, 'createdAt', 'DESC']]
    });

    const repairExecutionService = require('./repairExecutionService');
    const activeFailures = enrichedFailures.filter(fo =>
      !repairExecutionService.isClosed(fo)
    );

    console.log(`🔍 [getWorkOrdersByChecklistType] ${activeFailures.length} fallas activas`);

    return activeFailures.map(failureOrder => {
      const ar = failureOrder.repairExecution;
      const wo = failureOrder.workOrder;

      return {
        id: wo?.id || ar?.id || failureOrder.id,
        failureOrderId: failureOrder.id,
        workOrder: wo || (ar ? {
          id: ar.id,
          work_order_id: ar.repair_execution_id,
          status: ar.status,
          activity_performed: ar.activity_performed,
          start_time: ar.start_time,
          end_time: ar.end_time,
          isRepairAct: true
        } : null),
        repairExecution: ar,
        failure_order_id: failureOrder.failure_order_id,
        reported_at: failureOrder.createdAt,
        recurrence_count: failureOrder.recurrence_count,
        failure_description: failureOrder.description,
        failure_severity: failureOrder.severity,
        failure_assigned_to: failureOrder.assigned_to,
        failure_reporter_name: failureOrder.reporter?.user_name || 'Desconocido',
        checklist_item: failureOrder.checklistItem
      };
    });
  } catch (error) {
    console.error("getWorkOrdersByChecklistType Service: Error:", error.message);
    throw error;
  }
};

// ============================================
// FUNCIONES DE ÓRDENES DE FALLA Y PDF
// ============================================

const getChecklistFailures = async (checklistId, isFamilyChecklist = false, mode = 'full') => {
  try {
    const checklist = await Checklist.findByPk(checklistId, {
      include: [
        {
          model: ChecklistType,
          as: 'type',
          attributes: ['frequency', 'type_category']
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          attributes: ['signed_at'],
          order: [['signed_at', 'DESC']]
        }
      ]
    });
    
    if (!checklist) {
      throw new Error(`Checklist con ID ${checklistId} no encontrado`);
    }

    const responses = await ChecklistResponse.findAll({
      where: { checklist_id: checklistId },
      include: [{ model: ChecklistItem, as: 'checklistItem' }]
    });

    const checklistItemIds = responses.map(r => r.checklist_item_id).filter(id => id !== null);

    if (checklistItemIds.length === 0) {
      return { failures_by_item: {}, total_failures: 0 };
    }

    // ============================================
    // CALCULAR FECHA LÍMITE CORRECTA
    // ============================================
    let cutoffDate;
    
    // Determinar la fecha de finalización del checklist
    // Prioridad: última firma > fecha de creación
    let checklistCompletionDate;
    if (checklist.signatures && checklist.signatures.length > 0) {
      // Usar la fecha de la última firma
      const lastSignature = checklist.signatures.reduce((latest, sig) => {
        return new Date(sig.signed_at) > new Date(latest.signed_at) ? sig : latest;
      });
      checklistCompletionDate = new Date(lastSignature.signed_at);
    } else {
      // Si no hay firmas, usar la fecha de creación
      checklistCompletionDate = new Date(checklist.createdAt);
    }

    // Determinar si es checklist semanal
    const frequency = (checklist.type?.frequency || '').toLowerCase().trim();
    const isWeeklyFrequency = frequency === 'weekly' || frequency === 'semanal';
    const isWeeklyChecklist = (checklist.type?.type_category === 'family' && isWeeklyFrequency) || 
                              (checklist.week_identifier !== null && checklist.week_identifier !== undefined);

    if (isWeeklyChecklist) {
      // Para checklists semanales: usar el domingo de esa semana a las 23:59:59
      const { getSundayOfWeek } = require('../utils/weekUtils');
      cutoffDate = getSundayOfWeek(checklistCompletionDate);
      console.log(`[getChecklistFailures] Checklist ${checklistId} es SEMANAL. Fecha de corte: ${cutoffDate.toISOString()} (domingo de la semana)`);
    } else {
      // Para checklists diarios: usar el final del día de finalización
      cutoffDate = new Date(checklistCompletionDate);
      cutoffDate.setHours(23, 59, 59, 999);
      console.log(`[getChecklistFailures] Checklist ${checklistId} es DIARIO. Fecha de corte: ${cutoffDate.toISOString()} (fin del día de finalización)`);
    }

    const failureOrders = await FailureOrder.findAll({
      where: {
        checklist_item_id: {
          [Op.in]: checklistItemIds
        },
        createdAt: {
          [Op.lte]: cutoffDate
        }
      },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['user_id', 'user_name']
        },
        {
          model: ChecklistItem,
          as: 'checklistItem',
          attributes: ['item_number', 'question_text']
        },
        {
          model: require('../models').Inspectable,
          as: 'affectedInspectable',
          required: false,
          attributes: ['ins_id', 'name']

        },
        {
          model: require('../models').RepairExecution,
          as: 'repairExecution',
          required: false,
          include: [
            { model: User, as: 'resolver', attributes: ['user_name'], required: false },
            { model: User, as: 'cancelledBy', attributes: ['user_name'], required: false }
          ]
        },
        {
          model: WorkOrder,
          as: 'workOrder',
          required: false,
          include: [
            { model: User, as: 'resolver', attributes: ['user_name'], required: false },
            { model: User, as: 'cancelledBy', attributes: ['user_name'], required: false },
            {
              model: require('../models').WorkOrderPart,
              as: 'parts',
              required: false,
              include: [{ model: require('../models').Inventory, as: 'inventory', attributes: ['id', 'part_name'] }]
            },
            {
              model: require('../models').Requisition,
              as: 'requisitions',
              required: false,
              attributes: ['id', 'part_reference', 'quantity_requested', 'status']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const {
      computeTraceability,
      shouldIncludeFailureInPdf,
      CLOSED_STATUSES
    } = require('../utils/traceabilityUtil');
    const pdfGeneratedAt = cutoffDate;

    const visibleFailureOrders = failureOrders.filter(fo => {
      const traceability = computeTraceability({
        repairExecution: fo.repairExecution,
        workOrder: fo.workOrder,
        requisitions: fo.workOrder?.requisitions || [],
        parts: fo.workOrder?.parts || [],
        pdfGeneratedAt
      });

      // Modo 'active': solo fallas no cerradas (para pantalla)
      if (mode === 'active') {
        const status = traceability.status;
        return !CLOSED_STATUSES.includes(status);
      }

      // Modo 'full': usar lógica de PDF (por defecto)
      return shouldIncludeFailureInPdf(fo, traceability, cutoffDate, pdfGeneratedAt);
    });

    const failuresByItem = {};
    visibleFailureOrders.forEach(failureOrder => {
      let itemKey;
      if (isFamilyChecklist && failureOrder.affected_id) {
        itemKey = `${failureOrder.affected_id}-${failureOrder.checklist_item_id}`;
      } else {
        itemKey = failureOrder.checklist_item_id;
      }

      if (!failuresByItem[itemKey]) {
        failuresByItem[itemKey] = [];
      }

      const traceability = computeTraceability({
        repairExecution: failureOrder.repairExecution,
        workOrder: failureOrder.workOrder,
        requisitions: failureOrder.workOrder?.requisitions || [],
        parts: failureOrder.workOrder?.parts || [],
        pdfGeneratedAt
      });

      failuresByItem[itemKey].push({
        id: failureOrder.id,
        failure_order_id: failureOrder.failure_order_id,
        description: failureOrder.description,
        evidence_url: failureOrder.evidence_url,
        severity: failureOrder.severity,
        assigned_to: failureOrder.assigned_to,
        assigned_to_name: failureOrder.assigned_to || 'No asignado',
        reporter_name: failureOrder.reporter?.user_name || 'Desconocido',
        affected_machine: failureOrder.affectedInspectable?.name || 'No especificada',
        recurrence_count: failureOrder.recurrence_count || 0,
        is_recurring: failureOrder.is_recurring || false,
        created_at: failureOrder.createdAt,
        updated_at: failureOrder.updatedAt,
        traceability,
        repairExecution: failureOrder.repairExecution ? {
          repair_execution_id: failureOrder.repairExecution.repair_execution_id,
          status: failureOrder.repairExecution.status,
          activity_performed: failureOrder.repairExecution.activity_performed,
          evidence_url: failureOrder.repairExecution.evidence_url,
          closure_signature: failureOrder.repairExecution.closure_signature,
          start_time: failureOrder.repairExecution.start_time,
          end_time: failureOrder.repairExecution.end_time,
          resolver_name: failureOrder.repairExecution.resolver?.user_name || 'No registrado',
          cancellation_reason: failureOrder.repairExecution.cancellation_reason,
          cancelled_at: failureOrder.repairExecution.cancelled_at,
          cancelled_by_name: failureOrder.repairExecution.cancelledBy?.user_name || null
        } : null,
        workOrder: failureOrder.workOrder ? {
          work_order_id: failureOrder.workOrder.work_order_id,
          status: failureOrder.workOrder.status,
          activity_performed: failureOrder.workOrder.activity_performed,
          evidence_url: failureOrder.workOrder.evidence_url,
          cancellation_reason: failureOrder.workOrder.cancellation_reason,
          cancelled_at: failureOrder.workOrder.cancelled_at,
          cancelled_by_name: failureOrder.workOrder.cancelledBy?.user_name || null,
          resolver_name: failureOrder.workOrder.resolver?.user_name || null,
          parts: (failureOrder.workOrder.parts || []).map(p => ({
            name: p.inventory?.part_name || 'Repuesto',
            quantity: p.quantity_used
          })),
          requisitions: (failureOrder.workOrder.requisitions || []).map(r => ({
            part_reference: r.part_reference,
            quantity_requested: r.quantity_requested,
            status: r.status
          }))
        } : null,
        checklist_item: {
          item_number: failureOrder.checklistItem?.item_number || 'N/A',
          question_text: failureOrder.checklistItem?.question_text || 'N/A'
        }
      });
    });

    const { sameCalendarDay } = require('../utils/traceabilityUtil');
    const closedOnCutoff = failureOrders
      .filter((fo) => {
        const traceability = computeTraceability({
          repairExecution: fo.repairExecution,
          workOrder: fo.workOrder,
          requisitions: fo.workOrder?.requisitions || [],
          parts: fo.workOrder?.parts || [],
          pdfGeneratedAt
        });
        if (traceability.status !== 'RESUELTA') return false;
        const execution = fo.repairExecution || fo.workOrder;
        const closedAt = execution?.end_time || execution?.updatedAt;
        return closedAt && sameCalendarDay(closedAt, cutoffDate);
      })
      .map((fo) => {
        const traceability = computeTraceability({
          repairExecution: fo.repairExecution,
          workOrder: fo.workOrder,
          requisitions: fo.workOrder?.requisitions || [],
          parts: fo.workOrder?.parts || [],
          pdfGeneratedAt
        });
        return {
          failure_order_id: fo.failure_order_id,
          description: fo.description,
          traceability,
          closed_at: fo.repairExecution?.end_time || fo.workOrder?.end_time,
          resolver: fo.repairExecution?.resolver?.user_name || fo.workOrder?.resolver?.user_name
        };
      });

    return {
      checklist_id: checklistId,
      failures_by_item: failuresByItem,
      total_failures: visibleFailureOrders.length,
      closed_on_cutoff: closedOnCutoff,
      checklist_type_id: checklist.checklist_type_id
    };
  } catch (error) {
    console.error('[getChecklistFailures] Error:', error);
    throw error;
  }
};


/**
 * Obtener un checklist completo por ID
 * Usado por la funcionalidad de soporte
 */
const getChecklistById = async (checklistId) => {
  try {
    const checklist = await Checklist.findByPk(checklistId, {
      include: [
        {
          model: ChecklistType,
          as: 'type',
          include: [
            {
              model: ChecklistItem,
              as: 'items',
              where: { parent_item_id: null },
              required: false,
              include: [
                {
                  model: ChecklistItem,
                  as: 'subItems',
                  required: false,
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          include: [
            {
              model: Role,
              as: 'role'
            }
          ]
        },
        {
          model: User,
          as: 'support_user',
          attributes: ['user_id', 'user_name', 'user_email'],
          required: false
        },
        {
          model: Inspectable,
          as: 'inspectable',
          required: false,
          include: [
            {
              model: Premise,
              as: 'premise'
            }
          ]
        },
        {
          model: ChecklistResponse,
          as: 'responses',
          required: false,
          include: [
            {
              model: ChecklistItem,
              as: 'checklistItem'
            }
          ]
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          required: false,
          include: [
            {
              model: User,
              as: 'user'
            },
            {
              model: Role,
              as: 'role'
            }
          ]
        }
      ]
    });

    if (!checklist) {
      return null;
    }

    const failures = await getChecklistFailures(
      checklistId,
      checklist.type?.type_category === 'family'
    );

    let items;

    if (checklist.type?.type_category === 'family') {
      // Para checklists de familia, construir la estructura dinámica por dispositivo
      // igual que hace getLatestChecklistByType, para que el frontend reciba
      // los items padre (máquinas) con sus subItems (preguntas)
      items = await processFamilyChecklistItems(
        checklist.checklist_type_id,
        checklistId
      );

      // Calcular week_info a partir del week_identifier guardado o del tipo
      let week_info = null;
      try {
        const weekId = checklist.week_identifier;
        if (weekId) {
          const { startDate, endDate } = weekUtils.getDateBoundsForChecklistType(checklist.type);
          week_info = {
            week_identifier: weekId,
            week_range: weekUtils.formatWeekRange(startDate, endDate),
            days_remaining: weekUtils.getDaysRemainingInWeek(),
            start_date: startDate,
            end_date: endDate
          };
        }
      } catch (e) {
        console.warn('[getChecklistById] No se pudo calcular week_info:', e.message);
      }

      return {
        ...checklist.toJSON(),
        items,
        failures,
        ...(week_info && { week_info })
      };
    } else {
      // Para otros tipos, combinar template plano con respuestas
      const typeCategory = checklist.type?.type_category;
      // Para attraction, el inspectable_id está en el checklist mismo
      const inspectableId = checklist.inspectable_id || null;

      items = (checklist.type?.items || []).map(templateItem => {
        const responses = checklist.responses.filter(
          r => r.checklist_item_id === templateItem.checklist_item_id
        );
        const subItems = (templateItem.subItems || []).map(templateSubItem => {
          const subResponses = checklist.responses.filter(
            r => r.checklist_item_id === templateSubItem.checklist_item_id
          );
          return {
            ...templateSubItem.toJSON(),
            responses: subResponses,
            // Para attraction, propagar inspectable_id_for_response igual que getLatestChecklistByType
            ...(typeCategory === 'attraction' && inspectableId && {
              unique_frontend_id: `${inspectableId}-${templateSubItem.checklist_item_id}`,
              inspectable_id_for_response: inspectableId,
            }),
            ...((typeCategory !== 'attraction' || !inspectableId) && {
              unique_frontend_id: templateSubItem.checklist_item_id.toString(),
            }),
          };
        });
        return {
          ...templateItem.toJSON(),
          responses,
          subItems,
          // Para attraction, propagar inspectable_id_for_response igual que getLatestChecklistByType
          ...(typeCategory === 'attraction' && inspectableId && {
            unique_frontend_id: `${inspectableId}-${templateItem.checklist_item_id}`,
            inspectable_id_for_response: inspectableId,
          }),
          ...((typeCategory !== 'attraction' || !inspectableId) && {
            unique_frontend_id: templateItem.checklist_item_id.toString(),
          }),
        };
      });
    }

    return {
      ...checklist.toJSON(),
      items,
      failures
    };
  } catch (error) {
    console.error('[getChecklistById] Error:', error);
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
  getWorkOrdersByStatus,
  updateWorkOrder,
  getWorkOrdersByChecklistType,
  getChecklistFailures,
  resetQrCodesForChecklist,
  getChecklistById,
  getPendingRequisitionsForChecklist
};
