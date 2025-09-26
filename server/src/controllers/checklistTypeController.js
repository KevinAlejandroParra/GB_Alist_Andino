const { ChecklistType, Inspectable, Premise } = require('../models');

const getAllChecklistTypes = async (req, res) => {
  try {
    const { role_id } = req.query;
    let whereClause = {};

    if (role_id) {
      whereClause.role_id = role_id;
    }

    const checklistTypes = await ChecklistType.findAll({
      where: whereClause,
      include: [
        {
          model: Inspectable,
          as: 'specificInspectables',
          through: { attributes: [] }, // No necesitamos atributos de la tabla intermedia
        },
      ],
    });

    const formattedChecklistTypes = checklistTypes.map(ct => {
      const plainCt = ct.get({ plain: true });

      // Asegurarse de que type_category y associated_id estén presentes para el frontend
      plainCt.type_category = ct.type_category;
      plainCt.associated_id = ct.associated_id;

      // Eliminar la propiedad specificInspectables para limpiar la respuesta si no es necesaria en el frontend
      delete plainCt.specificInspectables;

      return plainCt;
    });

    res.status(200).json(formattedChecklistTypes);
  } catch (error) {
    console.error('Error fetching checklist types:', error);
    res.status(500).json({ message: 'Error fetching checklist types', error: error.message });
  }
};

module.exports = { getAllChecklistTypes };
