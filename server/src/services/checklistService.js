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
  Entity,
} = require("../models")
const { Sequelize } = require("../models");
const Op = Sequelize.Op

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

const getChecklistTypeForInspectable = async (inspectableId, request_role_id, transaction) => {
  const inspectable = await Inspectable.findByPk(inspectableId, {
    include: [{ model: Device, as: "deviceData", include: ["family"] }],
    transaction,
  })

  if (!inspectable) {
    throw new Error(`Inspectable with ID ${inspectableId} not found.`)
  }

  // buscar el tipo de checklist asociado al rol que opera el checklist 
  const targetRoleId = (request_role_id === 4 || request_role_id === 1) ? 7 : request_role_id; 

  let checklistType
  if (inspectable.type_code === "attraction") {
    checklistType = await ChecklistType.findOne({
      where: { attraction_id: inspectableId, role_id: targetRoleId },
      transaction,
    })
  } else if (inspectable.type_code === "device" && inspectable.deviceData && inspectable.deviceData.family) {
    checklistType = await ChecklistType.findOne({
      where: { family_id: inspectable.deviceData.family.family_id, role_id: targetRoleId },
      transaction,
    })
  } else {
    throw new Error(`Could not determine checklist type for inspectable ${inspectableId}.`)
  }

  if (!checklistType) {
    throw new Error(`No checklist type found for inspectable ${inspectableId} and role ${request_role_id}.`)
  }

  return checklistType
}

const getDateRange = (date, frequency) => {
  const targetDate = new Date(date);

  if (isNaN(targetDate.getTime())) {
    return { dateError: `Invalid date: ${date}` }; 
  }

  const normalizedTargetDate = new Date(targetDate.setUTCHours(0, 0, 0, 0));

  if (frequency === "diario") {
    const startDate = new Date(normalizedTargetDate);
    startDate.setUTCHours(0, 0, 0, 0); 
    const endDate = new Date(normalizedTargetDate);
    endDate.setUTCHours(23, 59, 59, 999);
    return { [Op.between]: [startDate, endDate] };
  } else if (frequency === "semanal") {
    const dayOfWeek = normalizedTargetDate.getUTCDay();
    const startDate = new Date(normalizedTargetDate);
    startDate.setUTCDate(normalizedTargetDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    return { [Op.between]: [startDate, endDate] };
  }

  return { [Op.eq]: normalizedTargetDate };
};

const ensureChecklistInstance = async ({ inspectableId, premise_id, date, created_by, role_id }) => {
  let transaction
  try {
    transaction = await connection.transaction()

    const checklistType = await getChecklistTypeForInspectable(inspectableId, role_id, transaction)
    const dateCondition = getDateRange(date, checklistType.frequency)

    let existingChecklist = await Checklist.findOne({
      where: { inspectable_id: inspectableId, date: dateCondition },
      transaction,
    })

    if (existingChecklist) {
      await transaction.commit()
      return getLatestChecklist({ inspectableId, date, role_id })
    }

    // Si no existe un checklist, solo el técnico de mantenimiento puede crearlo
    if (role_id !== 7) {
      throw new Error("Solo el técnico de mantenimiento puede crear un nuevo checklist.")
    }

    await Checklist.create(
      {
        checklist_type_id: checklistType.checklist_type_id,
        premise_id,
        inspectable_id: inspectableId,
        date: new Date(new Date(date).setUTCHours(0, 0, 0, 0)),
        created_by,
        version_label: checklistType.version_label,
      },
      { transaction },
    )

    await transaction.commit()
    return getLatestChecklist({ inspectableId, date, role_id })
  } catch (error) {
    if (transaction) await transaction.rollback()
    throw error
  }
}

const getLatestChecklist = async ({ inspectableId, date, role_id }) => {
  const normalizedInputDate = new Date(new Date(date).setUTCHours(0, 0, 0, 0));
  const queryRole = role_id || 7;
  const definitiveChecklistType = await getChecklistTypeForInspectable(inspectableId, queryRole);
  const dateCondition = getDateRange(normalizedInputDate, definitiveChecklistType.frequency);
  const whereClause = { inspectable_id: inspectableId, date: dateCondition };
  const checklist = await Checklist.findOne({
    where: whereClause,
    order: [["createdAt", "ASC"]],
    include: [{ model: ChecklistType, as: "type" }],
  });

  if (!checklist) return null

  if (!checklist.type) {
    throw new Error(`Checklist with ID ${checklist.checklist_id} has a missing or invalid checklist type.`);
  }

  let items = []

  // si es un checklist de familia, se deben obtener los dispositivos de la familia
  if (checklist.type.family_id) {
    const devices = await Device.findAll({
      where: { family_id: checklist.type.family_id },
      include: { model: Inspectable, as: "inspectable" },
    })

    const templateItems = await ChecklistItem.findAll({
      where: { checklist_type_id: checklist.checklist_type_id },
    })

    const allResponses = await ChecklistResponse.findAll({
        where: { checklist_id: checklist.checklist_id },
        include: [{ model: Failure, as: "failure" }]
    });

    const responseMap = new Map();
    allResponses.forEach(r => {
        const key = `${r.inspectable_id}-${r.checklist_item_id}`;
        responseMap.set(key, r);
    });

    items = devices.map((device, index) => {
      const deviceSection = {
        checklist_item_id: `device-${device.ins_id}`,
        item_number: `${index + 1}`,
        question_text: device.inspectable.name,
        input_type: "section",
        subItems: templateItems.map((template) => {
            const key = `${device.ins_id}-${template.checklist_item_id}`;
            const response = responseMap.get(key);
            return {
                ...template.toJSON(),
                // This is the real item ID, but we need to distinguish it per device on the frontend
                unique_frontend_id: `${device.ins_id}-${template.checklist_item_id}`,
                inspectable_id_for_response: device.ins_id, // Pass device ID for submitting response
                responses: response ? [response] : [], // response.value ya es ENUM
            }
        })
      }
      return deviceSection;
    });

  } else {
    // si no es un checklist de familia, se deben obtener los items estáticamente
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
                  model: Failure,
                  as: "failure",
                  required: false,
                  include: [{ model: User, as: "closedByUser", attributes: ["user_id", "user_name"] }],
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
              model: Failure,
              as: "failure",
              required: false,
              include: [{ model: User, as: "closedByUser", attributes: ["user_id", "user_name"] }],
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
    include: [{ model: User, as: "user", attributes: ["user_id", "user_name"] }],
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
            as: 'item',
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
        include: [{ model: User, as: "user", attributes: ["user_name"] }],
      },
    ],
    order: [["date", "DESC"]],
  })
  return checklists
}

const submitResponses = async ({ checklist_id, responses, responded_by, role_id }) => {
  const transaction = await connection.transaction()
  try {
    if (role_id !== 7) {
      throw new Error("Sólo los técnicos de mantenimiento pueden rellenar la lista de control.")
    }

    const checklist = await Checklist.findByPk(checklist_id, { 
      include: [{ model: ChecklistType, as: "type" }],
      transaction 
    })
    if (!checklist) throw new Error("Checklist not found")

    if (!checklist.type) {
      throw new Error(`Checklist with ID ${checklist.checklist_id} has a missing or invalid checklist type.`);
    }

    for (const response of responses) {
      const { checklist_item_id, value, comment, evidence_url, response_id, inspectable_id } = response 

      const item = await ChecklistItem.findByPk(checklist_item_id, { transaction })
      if (!item || item.checklist_type_id !== checklist.checklist_type_id) {
        throw new Error(`Item with ID ${checklist_item_id} is not valid for this checklist.`)
      }

    

      const [checklistResponse] = await ChecklistResponse.upsert(
        {
          response_id: response_id || undefined,
          checklist_id,
          checklist_item_id,
          inspectable_id: checklist.type.family_id ? inspectable_id : null,
          value: value, 
          comment: comment || null,
          evidence_url: evidence_url || null,
          responded_by,
          responded_at: new Date(),
        },
        { 
            returning: true, 
            transaction,
            conflictFields: checklist.type.family_id ? ['checklist_id', 'checklist_item_id', 'inspectable_id'] : ['checklist_id', 'checklist_item_id']
        },
      )

      const hasFailure = value === "no cumple" || value === "observación"
      if (hasFailure) {
        const severity = value === "no cumple" ? "crítica" : "leve"
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
        )
      } else {
        await Failure.destroy({
          where: { response_id: checklistResponse.response_id, status: "pendiente" },
          transaction,
        })
      }
    }

    await ChecklistSignature.findOrCreate({
      where: { checklist_id, user_id: responded_by, role_at_signature: "Tecnico de mantenimiento" },
      defaults: { signed_at: new Date() },
      transaction,
    })

    await transaction.commit()
    return { success: true, message: "Respuestas guardadas exitosamente" }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}


const signChecklist = async ({ checklist_id, user_id, role_id }) => {
  const transaction = await connection.transaction()
  try {
    if (role_id !== 4) {
      throw new Error(`Solo el Jefe de Operaciones puede firmar la lista de control.`)
    }

    const checklist = await Checklist.findByPk(checklist_id, { transaction })
    if (!checklist) throw new Error("Checklist not found")

    const answerableItems = await ChecklistItem.findAll({
      where: { checklist_type_id: checklist.checklist_type_id, parent_item_id: { [Op.ne]: null } },
      attributes: ["checklist_item_id"],
      transaction,
    })
    const answerableItemIds = answerableItems.map((item) => item.checklist_item_id)

    const responses = await ChecklistResponse.findAll({
      where: { checklist_id, checklist_item_id: { [Op.in]: answerableItemIds } },
      transaction,
    })

    const respondedItemIds = new Set(responses.map((r) => r.checklist_item_id))
    const incompleteItemIds = answerableItemIds.filter((id) => !respondedItemIds.has(id))

    if (incompleteItemIds.length > 0) {
      const incompleteItemsDetails = await ChecklistItem.findAll({
        where: { checklist_item_id: { [Op.in]: incompleteItemIds } },
        attributes: ["checklist_item_id", "question_text", "item_number"],
        order: [["item_number", "ASC"]],
        transaction,
      })
      const error = new Error("The checklist must be fully completed before the Head of Operations can sign.")
      error.incompleteItems = incompleteItemsDetails
      throw error
    }

    const technicianSignature = await ChecklistSignature.findOne({
      where: { checklist_id, role_at_signature: "Tecnico de mantenimiento" },
      transaction,
    })
    if (!technicianSignature) {
      throw new Error("The maintenance technician must sign first.")
    }

    const userRole = await Role.findByPk(role_id, { transaction })
    if (!userRole) throw new Error("Invalid user role.")

    await ChecklistSignature.create(
      { checklist_id, user_id, role_at_signature: userRole.role_name, signed_at: new Date() },
      { transaction },
    )

    await transaction.commit()
    return { success: true, message: "Checklist signed successfully" }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

const updateFailure = async ({ failure_id, solution_text, responsible_area, closed_by, status }) => {
    const transaction = await connection.transaction();
    try {
        const failure = await Failure.findByPk(failure_id, { transaction });
        if (!failure) {
            throw new Error("Falla no encontrada");
        }
        const updateData = { solution_text, responsible_area, status };
        if (status === "resuelto" && failure.status !== "resuelto") {
            updateData.closed_at = new Date();
            updateData.closed_by = closed_by;
        } else if (status !== "resuelto") {
            updateData.closed_at = null;
            updateData.closed_by = null;
        }
        await failure.update(updateData, { transaction });
        await transaction.commit();
        return failure.reload();
    } catch (error) {
        if (transaction) await transaction.rollback();
        throw error;
    }
};

const listObservations = async ({ checklist_id, start_date, end_date }) => {
    const whereClause = {};
    if (checklist_id) {
        whereClause["$ChecklistResponse.checklist_id$"] = checklist_id;
    }
    if (start_date && end_date) {
        whereClause.reported_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
    } else if (start_date) {
        whereClause.reported_at = { [Op.gte]: new Date(start_date) };
    } else if (end_date) {
        whereClause.reported_at = { [Op.lte]: new Date(end_date) };
    }
    const observations = await Failure.findAll({
        where: whereClause,
        include: [
            { model: ChecklistResponse, as: "response", include: [{ model: Checklist, as: "checklist" }, { model: ChecklistItem, as: "item" }] },
            { model: User, as: "reporter", attributes: ["user_id", "user_email", "user_name"] },
        ],
    });
    return observations;
};

const getChecklistDataForPDF = async (checklist_id) => {
  const checklist = await Checklist.findByPk(checklist_id, {
    include: [
      { model: ChecklistType, as: "type" },
      { 
        model: User, 
        as: "creator", 
        attributes: ["user_name", "user_image"],
        include: [{ model: Role, as: "role", attributes: ["role_name"] }]
      },
      {
        model: Inspectable,
        as: "inspectable",
        include: [
          {
            model: Attraction,
            as: "attractionData",
          },
          {
            model: Premise,
            as: "premise",
          },
          {
            model: Device,
            as: "deviceData",
            include: ["family"],
          },
        ],
      },
    ],
  })

  if (!checklist) {
    return null
  }

  let items = []
  if (checklist.type.family_id) {
    const devices = await Device.findAll({
      where: { family_id: checklist.type.family_id },
      include: { model: Inspectable, as: "inspectable" },
    })

    const templateItems = await ChecklistItem.findAll({
      where: { checklist_type_id: checklist.checklist_type_id },
    })

    const allResponses = await ChecklistResponse.findAll({
      where: { checklist_id: checklist.checklist_id },
      include: [{ model: Failure, as: "failure" }],
    })

    const responseMap = new Map()
    allResponses.forEach((r) => {
      const key = `${r.inspectable_id}-${r.checklist_item_id}`
      responseMap.set(key, r)
    })

    items = devices.map((device, index) => {
      const deviceSection = {
        checklist_item_id: `device-${device.ins_id}`,
        item_number: `${index + 1}`,
        question_text: device.inspectable.name,
        input_type: "section",
        subItems: templateItems.map((template) => {
          const key = `${device.ins_id}-${template.checklist_item_id}`
          const response = responseMap.get(key)
          return {
            ...template.toJSON(),
            responses: response ? [response] : [],
          }
        }),
      }
      return deviceSection
    })
  } else {
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
                { model: Failure, as: "failure", required: false },
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
            { model: Failure, as: "failure", required: false },
          ],
        },
      ],
    })
  }

  items.forEach((item) => {
    if (item.subItems) item.subItems.sort(naturalSort)
  })
  items.sort(naturalSort)

  const signatures = await ChecklistSignature.findAll({
    where: { checklist_id: checklist.checklist_id },
    include: [{ model: User, as: "user", attributes: ["user_id", "user_name"] }],
  })

  return {
    ...checklist.toJSON(),
    items,
    signatures,
  }
}

module.exports = {
  ensureChecklistInstance,
  getLatestChecklist,
  submitResponses,
  updateFailure,
  listObservations,
  signChecklist,
  getChecklistHistory,
  getChecklistDataForPDF,
}
