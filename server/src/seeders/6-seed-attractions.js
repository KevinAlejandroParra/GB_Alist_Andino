'use strict';

// ins_id: 2 está libre en la BD — se usa para VR Paraglider
const VR_PARAGLIDER_INS_ID = 2;

module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT ins_id FROM inspectables WHERE ins_id = :id LIMIT 1',
      { replacements: { id: VR_PARAGLIDER_INS_ID }, type: Sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      console.log(`ins_id ${VR_PARAGLIDER_INS_ID} ya existe, omitiendo inserción de VR Paraglider.`);
      return;
    }

    await queryInterface.bulkInsert('inspectables', [{
      ins_id: VR_PARAGLIDER_INS_ID,
      name: "VR Paraglider",
      description: "Atracción de realidad virtual con simulador de vuelo en parapente para 2 jugadores",
      photo_url: null,
      type_code: "attraction",
      premise_id: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    await queryInterface.bulkInsert('attractions', [{
      ins_id: VR_PARAGLIDER_INS_ID,
      public_flag: "Sí",
      capacity: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('attractions', { ins_id: VR_PARAGLIDER_INS_ID }, {});
    await queryInterface.bulkDelete('inspectables', { ins_id: VR_PARAGLIDER_INS_ID }, {});
  }
};
