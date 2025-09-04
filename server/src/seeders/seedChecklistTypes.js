"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        const [attraction] = await queryInterface.sequelize.query(
            `SELECT a.ins_id FROM attractions a 
             INNER JOIN inspectables i ON a.ins_id = i.ins_id 
             WHERE i.name = 'Baby House' LIMIT 1;`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!attraction) {
            console.error("Attraction 'Baby House' not found. Please ensure it is seeded first.");
            return;
        }

        const [regulatorRole] = await queryInterface.sequelize.query(
            `SELECT role_id FROM roles WHERE role_name = 'Regulador' LIMIT 1;`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!regulatorRole) {
            console.error("Role 'Regulador' not found. Please ensure it is seeded first.");
            return;
        }

        await queryInterface.bulkInsert(
            "checklist_types",
            [
                {
                    name: "Atracciones – Baby House (V2 OCT 2018)", 
                    description: "Checklist diario de mantenimiento para la atracción Baby House.",
                    frequency: "diario",
                    version_label: "V2 OCT 2018",
                    attraction_id: attraction.ins_id,
                    role_id: 7, // Asignar al rol de Técnico de mantenimiento (ID 7)
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {}
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("checklist_types", null, {});
    },
};
