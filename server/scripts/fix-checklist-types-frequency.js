/**
 * Script para actualizar el campo frequency en checklist_types
 * - Familias: frequency = 'semanal'
 * - Atracciones: frequency = 'diario'
 * - Otros: frequency = 'diario' (por defecto)
 */

const { ChecklistType } = require('../src/models');

async function fixChecklistTypesFrequency() {
  try {
    console.log('🔧 Iniciando corrección de frequency en checklist_types...\n');

    // 1. Actualizar checklists de familia a 'semanal'
    const [familyUpdated] = await ChecklistType.update(
      { frequency: 'semanal' },
      {
        where: {
          type_category: 'family'
        }
      }
    );
    console.log(`✅ ${familyUpdated} checklist(s) de familia actualizados a frequency='semanal'`);

    // 2. Actualizar checklists de atracción a 'diario'
    const [attractionUpdated] = await ChecklistType.update(
      { frequency: 'diario' },
      {
        where: {
          type_category: 'attraction'
        }
      }
    );
    console.log(`✅ ${attractionUpdated} checklist(s) de atracción actualizados a frequency='diario'`);

    // 3. Actualizar checklists específicos a 'diario'
    const [specificUpdated] = await ChecklistType.update(
      { frequency: 'diario' },
      {
        where: {
          type_category: 'specific'
        }
      }
    );
    console.log(`✅ ${specificUpdated} checklist(s) específicos actualizados a frequency='diario'`);

    // 4. Actualizar checklists estáticos a 'diario'
    const [staticUpdated] = await ChecklistType.update(
      { frequency: 'diario' },
      {
        where: {
          type_category: 'static'
        }
      }
    );
    console.log(`✅ ${staticUpdated} checklist(s) estáticos actualizados a frequency='diario'`);

    // 5. Mostrar resumen de todos los checklist types
    console.log('\n📊 Resumen de checklist_types:');
    const allTypes = await ChecklistType.findAll({
      attributes: ['checklist_type_id', 'name', 'type_category', 'frequency'],
      order: [['type_category', 'ASC'], ['name', 'ASC']]
    });

    const grouped = allTypes.reduce((acc, type) => {
      const category = type.type_category || 'sin_categoria';
      if (!acc[category]) acc[category] = [];
      acc[category].push(type);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([category, types]) => {
      console.log(`\n  ${category.toUpperCase()}:`);
      types.forEach(type => {
        console.log(`    - [${type.checklist_type_id}] ${type.name}: frequency='${type.frequency}'`);
      });
    });

    console.log('\n✅ Corrección completada exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al corregir frequency:', error);
    process.exit(1);
  }
}

// Ejecutar el script
fixChecklistTypesFrequency();
