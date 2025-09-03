'use strict';
const babyHouseItems = require("../utils/baby_house_items.json");

module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('Iniciando seeder de items de checklist...');
        
        try {
            // Buscar el tipo de checklist
            const [checklistType] = await queryInterface.sequelize.query(
                `SELECT checklist_type_id FROM checklist_types WHERE name = 'Atracciones – Baby House (V2 OCT 2018)'`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (!checklistType) {
                console.error(
                    "ChecklistType 'Atracciones – Baby House (V2 OCT 2018)' not found. Please run the baby house checklist seeder first."
                );
                return;
            }

            const checklistTypeId = checklistType.checklist_type_id;
            console.log('Tipo de checklist encontrado:', checklistTypeId);

            // Eliminar items existentes para este tipo de checklist
            console.log('Eliminando items existentes para el checklist type:', checklistTypeId);
            await queryInterface.bulkDelete('checklist_items', { checklist_type_id: checklistTypeId });

            const [technicalRole] = await queryInterface.sequelize.query(
                `SELECT role_id FROM roles WHERE role_name = 'Tecnico de mantenimiento' LIMIT 1;`,
                { type: Sequelize.QueryTypes.SELECT }
            );
            const [hostRole] = await queryInterface.sequelize.query(
                `SELECT role_id FROM roles WHERE role_name = 'Anfitrión' LIMIT 1;`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (!technicalRole || !hostRole) {
                console.error("Roles 'Tecnico de mantenimiento' or 'Anfitrión' not found. Please ensure they are seeded first.");
                return;
            }
            const technicalRoleId = technicalRole.role_id;
            const hostRoleId = hostRole.role_id;

            // Usar los items del archivo JSON
            console.log('Preparando items desde baby_house_items.json...');
            const checklistItems = babyHouseItems.map(item => ({
                checklist_type_id: checklistTypeId,
                item_number: item.item_number,
                question_text: item.question_text,
                guidance_text: item.guidance_text,
                input_type: item.input_type,
                allow_comment: item.allow_comment,
                role_id: item.item_number <= 16 ? technicalRoleId : hostRoleId, 
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            console.log('Preparando para insertar', checklistItems.length, 'items');
            
            await queryInterface.bulkInsert("checklist_items", checklistItems, {});
            console.log('Items insertados correctamente');

        } catch (error) {
            console.error('Error en el seeder:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            // Eliminar solo los ítems asociados a "Atracciones – Baby House (V2 OCT 2018)"
            const [checklistType] = await queryInterface.sequelize.query(
                `SELECT checklist_type_id FROM checklist_types WHERE name = 'Atracciones – Baby House (V2 OCT 2018)'`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (checklistType) {
                console.log('Eliminando items del checklist...');
                await queryInterface.bulkDelete("checklist_items", {
                    checklist_type_id: checklistType.checklist_type_id,
                }, {});
                console.log('Items eliminados correctamente');
            }
        } catch (error) {
            console.error('Error en el rollback:', error);
            throw error;
        }
    }
};