const checklistService = require("../services/checklistService")

const ensureChecklistInstance = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { premise_id, date } = req.body
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    const checklist = await checklistService.ensureChecklistInstance({
      inspectableId: Number.parseInt(inspectableId),
      premise_id,
      date,
      created_by: user_id,
      role_id,
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getLatestChecklist = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { date } = req.query
    const checklist = await checklistService.getLatestChecklist({
      inspectableId: Number.parseInt(inspectableId),
      date,
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const submitResponses = async (req, res) => {
  try {
    const { id: checklist_id } = req.params
    const { responses } = req.body
    const user_id = req.user.user_id
    const role_id = req.user.role_id
    await checklistService.submitResponses({
      checklist_id: Number.parseInt(checklist_id),
      responses,
      responded_by: user_id,
      role_id,
    })
    res.status(200).json({ message: "Respuestas registradas exitosamente" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const updateFailure = async (req, res) => {
  try {
    const { id: failure_id } = req.params
    console.log("updateFailure Controller: Received failure_id:", failure_id)
    const {
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    } = req.body
   

    const updateData = {
      failure_id: Number.parseInt(failure_id),
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    }

    const updatedFailure = await checklistService.updateFailure(updateData)
    res.status(200).json({
      success: true,
      message: "Falla actualizada exitosamente",
      failure: updatedFailure,
    })
  } catch (error) {
    console.error("updateFailure Controller: Error:", error.message)
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
}

const listObservations = async (req, res) => {
  try {
    const { checklist_id, start_date, end_date } = req.query
    const observations = await checklistService.listObservations({
      checklist_id: checklist_id ? Number.parseInt(checklist_id) : undefined,
      start_date,
      end_date,
    })
    res.status(200).json(observations)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const signChecklist = async (req, res) => {
  try {
    const { id: checklist_id } = req.params
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    await checklistService.signChecklist({
      checklist_id: Number.parseInt(checklist_id),
      user_id,
      role_id,
    })

    res.status(200).json({ message: "Checklist firmado exitosamente" })
  } catch (error) {
    // Si el error contiene información de ítems incompletos, enviarla al cliente
    if (error.incompleteItems) {
      res.status(400).json({
        error: error.message,
        incompleteItems: error.incompleteItems,
        incompleteCount: error.incompleteCount,
      })
    } else {
      res.status(400).json({ error: error.message })
    }
  }
}
const getChecklistHistory = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const checklists = await checklistService.getChecklistHistory(Number.parseInt(inspectableId))
    res.status(200).json(checklists)
  } catch (error) {
    res.status(500).json({ error: error.message })
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
}
