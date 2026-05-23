const { Checklist, ChecklistSignature, User, ChecklistType, Inspectable, Premise } = require("./src/models");
const { Op } = require("sequelize");

async function testEndpoint() {
  try {
    console.log('🔍 Probando endpoint de checklists sin firma...\n');

    // Buscar todos los checklists
    const allChecklists = await Checklist.findAll({
      include: [
        {
          model: ChecklistType,
          as: 'type',
          attributes: ['checklist_type_id', 'type_name', 'description']
        },
        {
          model: Premise,
          as: 'premise',
          attributes: ['premise_id', 'premise_name']
        },
        {
          model: Inspectable,
          as: 'inspectable',
          attributes: ['inspectable_id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'user_name', 'user_email']
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['user_id', 'user_name', 'user_email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    console.log(`✅ Encontrados ${allChecklists.length} checklists`);

    // Filtrar solo los que NO tienen firma de Administrador (role_id: 1)
    const unsignedChecklists = allChecklists.filter(checklist => {
      const hasAdminSignature = checklist.signatures.some(
        sig => sig.role_id === 1
      );
      return !hasAdminSignature;
    });

    console.log(`📋 Checklists sin firma de admin: ${unsignedChecklists.length}\n`);

    unsignedChecklists.forEach(checklist => {
      console.log(`  - ID: ${checklist.checklist_id}`);
      console.log(`    Tipo: ${checklist.type?.type_name || 'N/A'}`);
      console.log(`    Sede: ${checklist.premise?.premise_name || 'N/A'}`);
      console.log(`    Firmas: ${checklist.signatures.length}`);
      console.log('');
    });

    console.log('✅ Test completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en el test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEndpoint();
