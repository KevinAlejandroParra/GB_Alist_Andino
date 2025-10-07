const { ChecklistType } = require('../models')
const checklistService = require('../services/checklistService')

const generateFamilyChecklist = async (req, res) => {
  try {
    console.log('🚀 Iniciando generateFamilyChecklist (versión corregida)');
    const { checklistTypeId } = req.params;
    const { date } = req.query;
    const { user_id, role_id } = req.user;

    // 1. Validar que el usuario y rol existan
    if (!user_id || !role_id) {
      return res.status(401).json({ error: 'Usuario no autenticado correctamente.' });
    }

    // 2. Llamar directamente al servicio que contiene la lógica correcta y completa
    const fullChecklist = await checklistService.getLatestChecklistByType({
      checklistTypeId: Number.parseInt(checklistTypeId),
      date,
      user_id,
      role_id
    });

    if (!fullChecklist) {
        console.warn('⚠️ El servicio no devolvió un checklist. Puede que no haya dispositivos en la familia o que el tipo de checklist no sea de familia.');
        return res.status(404).json({ error: 'No se pudo generar el checklist para la familia.' });
    }

    console.log('✅ Checklist de familia generado exitosamente por el servicio.');
    res.status(200).json(fullChecklist);

  } catch (error) {
    console.error('💥 Error en generateFamilyChecklist:', error.message);
    console.error('Stack trace completo:', error.stack);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  generateFamilyChecklist
}
