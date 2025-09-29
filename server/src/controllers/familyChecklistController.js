const { Device, Family, ChecklistType, Checklist, ChecklistItem } = require('../models')
const checklistService = require('../services/checklistService')

const generateFamilyChecklist = async (req, res) => {
  try {
    const { checklistTypeId } = req.params
    const { date } = req.query
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    // 1. Obtener el tipo de checklist y validar que sea tipo familia
    const checklistType = await ChecklistType.findByPk(checklistTypeId)
    if (!checklistType || checklistType.type_category !== 'family') {
      return res.status(400).json({ error: 'Tipo de checklist inválido' })
    }

    // 2. Obtener la familia asociada a este tipo de checklist
    const family = await Family.findByPk(checklistType.associated_id)
    if (!family) {
      return res.status(404).json({ error: 'Familia no encontrada' })
    }

    // 3. Obtener todos los dispositivos activos de la familia
    const devices = await Device.findAll({
      where: {
        family_id: family.family_id,
        active: true
      },
      include: [{
        model: Inspectable,
        as: 'inspectable',
        include: [{ model: Premise, as: 'premise' }]
      }]
    })

    // 4. Crear o obtener la instancia del checklist para la fecha dada
    let checklist = await Checklist.findOne({
      where: {
        checklist_type_id: checklistTypeId,
        date: date
      }
    })

    if (!checklist) {
      // Crear nueva instancia de checklist
      checklist = await checklistService.createChecklistInstance({
        checklist_type_id: Number.parseInt(checklistTypeId),
        date,
        created_by: user_id,
        role_id
      })

      // Generar ítems dinámicamente para cada dispositivo
      for (const device of devices) {
        const baseItems = await ChecklistItem.findAll({
          where: {
            checklist_type_id: checklistTypeId,
            parent_item_id: null
          }
        })

        for (const baseItem of baseItems) {
          // Crear ítem específico para este dispositivo
          await ChecklistItem.create({
            checklist_id: checklist.checklist_id,
            checklist_type_id: checklistTypeId,
            question_text: `${device.inspectable.name}: ${baseItem.question_text}`,
            guidance_text: baseItem.guidance_text,
            item_number: `${device.device_code}-${baseItem.item_number}`,
            input_type: baseItem.input_type,
            required: baseItem.required,
            device_id: device.device_id,
            parent_item_id: null
          })
        }
      }
    }

    // 5. Devolver el checklist completo con todos sus ítems y respuestas
    const fullChecklist = await checklistService.getChecklistById(checklist.checklist_id)
    res.status(200).json(fullChecklist)

  } catch (error) {
    console.error('Error generando checklist de familia:', error)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  generateFamilyChecklist
}