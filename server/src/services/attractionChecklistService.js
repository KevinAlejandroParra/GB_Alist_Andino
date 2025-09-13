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
  Sequelize,
} = require("../models")
const Op = Sequelize.Op

// Helper function for natural sort
const naturalSort = (a, b) => {
  const parse = (s) => s.split(".").map(Number);
  const aa = parse(a.item_number);
  const bb = parse(b.item_number);

  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    if (aa[i] !== bb[i]) {
      return (aa[i] || 0) - (bb[i] || 0);
    }
  }
  return 0;
};

/**
 * Asegura que la instancia de la lista de comprobación diaria existe para una atracción y fecha dadas.
 * Si no existe, crea una nueva junto con respuestas iniciales (vacías) para todos los ítems contestables.
 * Esta función está restringida a los técnicos de mantenimiento (role_id 7).
 */
const ensureDailyInstance = async ({ attraction_id, premise_id, date, created_by, role_id }) => {
  let transaction
  try {
    transaction = await connection.transaction()

    if (role_id !== 7) {
      throw new Error("Solo el técnico de mantenimiento puede crear o acceder a su checklist diario.")
    }

    const checklist = await Checklist.findOne({ where: { attraction_id, date, created_by }, transaction })

    if (checklist) {
      await transaction.commit()
      return getDailyChecklist({ attraction_id, date })
    }

    const checklistType = await ChecklistType.findOne({
      where: { attraction_id, role_id: 7, frequency: "diario" },
      transaction,
    })

    if (!checklistType) {
      throw new Error(`Tipo de checklist diario para atracción ${attraction_id} y rol de técnico no encontrado.`)
    }

    const newChecklist = await Checklist.create(
      {
        checklist_type_id: checklistType.checklist_type_id,
        premise_id,
        attraction_id,
        date,
        created_by,
        version_label: checklistType.version_label,
      },
      { transaction },
    )

    // Las respuestas se crearán a través de la función submitResponses (con upsert)
    // la primera vez que el técnico las envíe. No es necesario pre-crear respuestas vacías.
    await transaction.commit()

    // Return checklist
    return getDailyChecklist({ attraction_id, date })
  } catch (error) {
    if (transaction) await transaction.rollback()
    throw error
  }
}

/**
 * Recupera una lista de comprobación diaria para una atracción y fecha concretas, estructurada jerárquicamente.
 * Incluye ítems, subítems, respuestas, firmas y cualquier fallo pendiente de listas de control anteriores.
 * MODIFICADO: Ahora busca el checklist independientemente del role_id para que todos puedan verlo
 */
const getDailyChecklist = async ({ attraction_id, date }) => {
  // Buscar el checklist sin filtrar por created_by para que todos los roles puedan verlo
  const checklist = await Checklist.findOne({ 
    where: { attraction_id, date },
    order: [['createdAt', 'ASC']] // En caso de múltiples, tomar el primero
  })

  if (!checklist) return null

  // Obtener elementos jerárquicamente: los elementos raíz incluyen sus subelementos, que incluyen sus respuestas.
  const items = await ChecklistItem.findAll({
    where: {
      checklist_type_id: checklist.checklist_type_id,
      parent_item_id: null,
    },
    attributes: [
      "checklist_item_id",
      "parent_item_id",
      "checklist_type_id",
      "item_number",
      "question_text",
      "guidance_text",
      "input_type",
      "allow_comment",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: ChecklistItem,
        as: "subItems",
        separate: true,
        attributes: [
          "checklist_item_id",
          "parent_item_id",
          "checklist_type_id",
          "item_number",
          "question_text",
          "guidance_text",
          "input_type",
          "allow_comment",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: ChecklistResponse,
            as: "responses",
            where: { checklist_id: checklist.checklist_id },
            required: false,
            include: [
              {
                model: User,
                as: "respondedBy",
                attributes: ["user_id", "user_name"],
                required: false
              },
              {
                model: Failure,
                as: "failure",
                required: false,
                attributes: [
                  "failure_id",
                  "description",
                  "status",
                  "severity",
                  "solution_text",
                  "responsible_area",
                  "closed_at",
                ],
                include: [
                  { model: User, as: "closedByUser", attributes: ["user_id", "user_name"] },
                ],
              },
            ],
          },
        ],
        order: [["item_number", "ASC"]],
      },
      {
        model: ChecklistResponse,
        as: "responses",
        where: { checklist_id: checklist.checklist_id },
        required: false,
        include: [
          {
            model: User,
            as: "respondedBy",
            attributes: ["user_id", "user_name"],
            required: false
          },
          {
            model: Failure,
            as: "failure",
            required: false,
            attributes: [
              "failure_id",
              "description",
              "status",
              "severity",
              "solution_text",
              "responsible_area",
              "closed_at",
            ],
            include: [
              { model: User, as: "closedByUser", attributes: ["user_id", "user_name"] },
            ],
          },
        ],
      },
    ],
    order: [["item_number", "ASC"]],
  })

  // Convertir valores de respuesta de la DB (boolean) a string para el frontend
  const convertResponseValues = (item) => {
    if (item.responses && item.responses.length > 0) {
      item.responses.forEach(response => {
        if (response.value === false) { // 0 en la DB
          response.value = 'no cumple';
        } else if (response.value === true) { // 1 en la DB
          if (response.comment && response.comment.trim() !== '') {
            response.value = 'observación';
          } else {
            response.value = 'cumple';
          }
        }
      });
    }

    if (item.subItems && item.subItems.length > 0) {
      item.subItems.forEach(convertResponseValues);
    }
  };

  items.forEach(convertResponseValues);

  // Aplicar orden natural a los sub-ítems después de la carga
  items.forEach(item => {
    if (item.subItems && item.subItems.length > 0) {
      item.subItems.sort(naturalSort);
    }
  });

  // Aplicar orden natural a los ítems de nivel superior
  items.sort(naturalSort);

  // Incluir información del usuario que respondió en las firmas
  const signatures = await ChecklistSignature.findAll({ 
    where: { checklist_id: checklist.checklist_id },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "user_name"]
      }
    ]
  })

  const previousChecklists = await Checklist.findAll({
    where: { attraction_id, date: { [Op.lt]: date } },
    attributes: ["checklist_id"],
  })
  const previousChecklistIds = previousChecklists.map((c) => c.checklist_id)
  let pendingFailures = []

  if (previousChecklistIds.length > 0) {
    const previousResponses = await ChecklistResponse.findAll({
      where: { checklist_id: { [Op.in]: previousChecklistIds } },
      attributes: ["response_id"],
    })
    const previousResponseIds = previousResponses.map((r) => r.response_id)

    if (previousResponseIds.length > 0) {
      pendingFailures = await Failure.findAll({
        where: { status: "pendiente", response_id: { [Op.in]: previousResponseIds } },
        include: [
          {
            model: ChecklistResponse,
            as: "response",
            include: [
              { model: Checklist, as: "checklist" },
              { 
                model: ChecklistItem, 
                as: "item",
                attributes: ["question_text"] // Especificar atributos para evitar carga de asociaciones no deseadas
              },
              { model: User, as: "respondedBy", attributes: ["user_id", "user_name"] },
            ],
          },
          {
            model: User,
            as: "closedByUser", 
            attributes: ["user_id", "user_name"],
          },
        ],
      })
    }
  }

  return {
    ...checklist.toJSON(),
    items,
    signatures,
    pending_failures: pendingFailures,
  }
}

const submitResponses = async ({ checklist_id, responses, responded_by, role_id }) => {
  const transaction = await connection.transaction()
  try {
    if (role_id !== 7) {
      throw new Error("Only maintenance technicians can fill out the checklist.")
    }

    const checklist = await Checklist.findByPk(checklist_id, { transaction })
    if (!checklist) throw new Error("Checklist not found")

    const responsePromises = []

    for (const response of responses) {
      const { checklist_item_id, value, comment, evidence_url, response_id } = response

      const item = await ChecklistItem.findByPk(checklist_item_id, {
        transaction,
        attributes: [
          "checklist_item_id",
          "parent_item_id",
          "checklist_type_id",
          "item_number",
          "question_text",
          "guidance_text",
          "input_type",
          "allow_comment",
          "createdAt",
          "updatedAt",
        ],
      })
      if (!item || item.checklist_type_id !== checklist.checklist_type_id) {
        throw new Error(`Item with ID ${checklist_item_id} is not valid for this checklist.`)
      }
      if (item.parent_item_id === null) {
        throw new Error(`Responses cannot be submitted for parent items. Item ID: ${checklist_item_id}`)
      }

      // Convert frontend string value to database boolean value (0 or 1)
      const dbValue = value === 'no cumple' ? 0 : 1;

      const responsePromise = ChecklistResponse.upsert(
        {
          response_id: response_id || undefined,
          checklist_id,
          checklist_item_id,
          value: dbValue, // Use the boolean value for DB
          comment: comment || null,
          evidence_url: evidence_url || null,
          responded_by,
          responded_at: new Date(),
        },
        { 
          returning: true, 
          transaction,
          conflictFields: ['checklist_id', 'checklist_item_id']
        },
      ).then(async ([checklistResponse, created]) => {
        // Use the original string `value` from the frontend for failure logic
        const hasFailure = value === "no cumple" || value === "observación";

        if (hasFailure) {
          // 'observación' -> 'leve', 'no cumple' -> 'crítica'
          const severity = value === "no cumple" ? "crítica" : "leve";

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
          // If the response is now "cumple", remove any existing pending failure
          await Failure.destroy({
            where: { response_id: checklistResponse.response_id, status: "pendiente" },
            transaction,
          })
        }

        return checklistResponse
      })

      responsePromises.push(responsePromise)
    }

    await Promise.all(responsePromises)

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
      throw new Error(`Only the Head of Operations can sign. Current role: ${role_id}`)
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

    const incompleteResponses = responses.filter((r) => r.value === null || r.value === undefined)
    const trulyIncompleteIds = new Set([...incompleteItemIds, ...incompleteResponses.map((r) => r.checklist_item_id)])

    if (trulyIncompleteIds.size > 0) {
      const incompleteItemsDetails = await ChecklistItem.findAll({
        where: { checklist_item_id: { [Op.in]: [...trulyIncompleteIds] } },
        attributes: ["checklist_item_id", "question_text", "item_number"],
        order: [["item_number", "ASC"]],
        transaction,
      })
      const error = new Error("The checklist must be fully completed before the Head of Operations can sign.")
      error.incompleteItems = incompleteItemsDetails
      error.incompleteCount = incompleteItemsDetails.length
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

/**
 * Updates an existing failure.
 * @param {object} params 
 * @param {number} params.failure_id 
 * @param {string} [params.solution_text] 
 * @param {string} [params.responsible_area] 
 * @param {number} [params.closed_by] 
 * @param {string} [params.status] 
 */
const updateFailure = async ({ failure_id, solution_text, responsible_area, closed_by, status }) => {
  const transaction = await connection.transaction()
  try {
    const failure = await Failure.findByPk(failure_id, { transaction })

    if (!failure) {
      throw new Error("Falla no encontrada")
    }

    const updateData = {
      solution_text,
      responsible_area,
      status,
    }

    if (status === "resuelto" && failure.status !== "resuelto") {
      updateData.closed_at = new Date()
      updateData.closed_by = closed_by
    } else if (status !== "resuelto") {
      updateData.closed_at = null
      updateData.closed_by = null
    }

    await failure.update(updateData, { transaction })

    await transaction.commit()
    return failure.reload()
  } catch (error) {
    if (transaction) await transaction.rollback()
    console.error("updateFailure Service: Error:", error.message)
    throw error
  }
}

const listObservations = async ({ checklist_id, start_date, end_date }) => {
  const whereClause = {}

  if (checklist_id) {
    whereClause["$ChecklistResponse.checklist_id$"] = checklist_id
  }

  if (start_date && end_date) {
    whereClause.reported_at = {
      [Op.between]: [new Date(start_date), new Date(end_date)],
    }
  } else if (start_date) {
    whereClause.reported_at = { [Op.gte]: new Date(start_date) }
  } else if (end_date) {
    whereClause.reported_at = { [Op.lte]: new Date(end_date) }
  }

  const observations = await Failure.findAll({
    where: whereClause,
    include: [
      {
        model: ChecklistResponse,
        as: "response",
        include: [
          { model: Checklist, as: "checklist" },
          { model: ChecklistItem, as: "item" },
        ],
      },
      { model: User, as: "reporter", attributes: ["user_id", "user_email", "user_name"] },
    ],
  })

  return observations
}

const listChecklistsByAttraction = async (attraction_id) => {
  const checklists = await Checklist.findAll({
    where: { attraction_id },
    include: [
      {
        model: ChecklistType,
        as: "type",
        attributes: ["name", "description"],
      },
      {
        model: User,
        as: "creator",
        attributes: ["user_name"],
      },
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

module.exports = {
  ensureDailyInstance,
  getDailyChecklist,
  submitResponses,
  updateFailure,
  listObservations,
  signChecklist,
  listChecklistsByAttraction,
}