/**
 * Script para probar el endpoint de checklist directamente
 * Simula lo que hace el frontend
 */

const { ChecklistType } = require('../src/models');
const checklistService = require('../src/services/checklistService');

async function testApiEndpoint() {
  try {
    console.log('🧪 PRUEBA DE ENDPOINT API\n');
    console.log('='.repeat(60));

    // Obtener el checklist type de Redencion - Anfitrión (ID 11 según el diagnóstico)
    const checklistTypeId = 11;
    const user_id = 14; // El usuario que creó el checklist según el diagnóstico
    const role_id = 4; // Anfitrión

    console.log('\n📋 Parámetros de prueba:');
    console.log(`   checklistTypeId: ${checklistTypeId}`);
    console.log(`   user_id: ${user_id}`);
    console.log(`   role_id: ${role_id}`);

    // Verificar el tipo de checklist
    const checklistType = await ChecklistType.findByPk(checklistTypeId);
    console.log('\n📝 Tipo de checklist:');
    console.log(`   Nombre: ${checklistType.name}`);
    console.log(`   Categoría: ${checklistType.type_category}`);
    console.log(`   Frecuencia: ${checklistType.frequency}`);
    console.log(`   Family ID: ${checklistType.associated_id}`);

    // Llamar al servicio (igual que el controlador)
    console.log('\n🔄 Llamando a checklistService.getLatestChecklistByType...\n');
    
    const result = await checklistService.getLatestChecklistByType({
      checklistTypeId,
      user_id,
      role_id
    });

    console.log('\n✅ Resultado del servicio:');
    console.log(`   checklist_id: ${result.checklist_id}`);
    console.log(`   week_identifier: ${result.week_identifier}`);
    console.log(`   createdAt: ${result.createdAt}`);
    console.log(`   updatedAt: ${result.updatedAt}`);
    
    if (result.type) {
      console.log(`\n   type.name: ${result.type.name}`);
      console.log(`   type.type_category: ${result.type.type_category}`);
      console.log(`   type.frequency: ${result.type.frequency}`);
    }
    
    if (result.week_info) {
      console.log(`\n   week_info.week_identifier: ${result.week_info.week_identifier}`);
      console.log(`   week_info.week_range: ${result.week_info.week_range}`);
      console.log(`   week_info.days_remaining: ${result.week_info.days_remaining}`);
    } else {
      console.log(`\n   ⚠️  week_info: NO PRESENTE`);
    }

    console.log(`\n   items: ${result.items?.length || 0} items`);
    console.log(`   signatures: ${result.signatures?.length || 0} firmas`);

    // Simular lo que hace el frontend
    console.log('\n\n🖥️  SIMULACIÓN DEL FRONTEND:');
    console.log('-'.repeat(60));
    
    const instance = result;
    const type = result.type;
    
    console.log(`\n1. ¿Tiene instancia? ${!!instance}`);
    console.log(`2. Frecuencia: ${type?.frequency}`);
    console.log(`3. Categoría: ${type?.type_category}`);
    
    const frequency = (type?.frequency || '').toLowerCase().trim();
    const isWeekly = frequency === 'semanal' || frequency === 'weekly';
    const isDaily = frequency === 'diaria' || frequency === 'diario' || frequency === 'daily';
    const shouldBeTreatedAsDaily = isDaily || (!isWeekly && type?.type_category !== 'family');
    
    console.log(`\n4. Análisis de frecuencia:`);
    console.log(`   - normalizedFrequency: "${frequency}"`);
    console.log(`   - isWeekly: ${isWeekly}`);
    console.log(`   - isDaily: ${isDaily}`);
    console.log(`   - shouldBeTreatedAsDaily: ${shouldBeTreatedAsDaily}`);
    
    let isOldDaily = false;
    if (instance && type && shouldBeTreatedAsDaily) {
      const instanceDate = new Date(instance.createdAt).toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];
      console.log(`\n5. Comparación de fechas (DIARIO):`);
      console.log(`   - instanceDate: ${instanceDate}`);
      console.log(`   - todayDate: ${todayDate}`);
      console.log(`   - isDifferent: ${instanceDate !== todayDate}`);
      if (instanceDate !== todayDate) {
        isOldDaily = true;
      }
    } else if (instance && isWeekly) {
      console.log(`\n5. Checklist SEMANAL - no se compara fecha`);
    }
    
    console.log(`\n6. ¿Se marcará como viejo? ${isOldDaily}`);
    console.log(`7. ¿Se mostrará el checklist? ${!isOldDaily}`);
    
    if (!isOldDaily) {
      console.log(`\n✅ RESULTADO: El checklist DEBERÍA mostrarse correctamente`);
    } else {
      console.log(`\n❌ RESULTADO: El checklist se marcará como viejo y NO se mostrará`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Prueba completada\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar la prueba
testApiEndpoint();
