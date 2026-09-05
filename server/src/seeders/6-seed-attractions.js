'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Primero insertamos los inspectables originales (ignorar si ya existen)
    const inspectables = [
      {
        ins_id: 2,
        name: "Baby House",
        description: "baby house",
        photo_url: "/media/photo-1756401526854-742811394.png",
        type_code: "attraction",
        premise_id: 3,
        createdAt: new Date("2025-08-28T13:53:18.000Z"),
        updatedAt: new Date("2025-08-28T17:18:46.000Z")
      },
      {
        ins_id: 3,
        name: "Congo",
        description: "Playground para niños con estatura superior a 1.10",
        photo_url: "/media/photo-1756401894017-371731366.png",
        type_code: "attraction",
        premise_id: 2,
        createdAt: new Date("2025-08-28T16:50:53.000Z"),
        updatedAt: new Date("2025-08-28T17:24:54.000Z")
      },
      {
        ins_id: 4,
        name: "Baby House",
        description: "Atracción para bebes con sus acompañantes",
        photo_url: "/media/photo-1756401753394-848752622.png",
        type_code: "attraction",
        premise_id: 2,
        createdAt: new Date("2025-08-28T16:51:17.000Z"),
        updatedAt: new Date("2025-08-28T17:22:33.000Z")
      },
      {
        ins_id: 5,
        name: "Tren del oeste",
        description: "Tren para 3 pasajeros con un maximo de estatura de 1 mt",
        photo_url: "/media/photo-1756401951291-650953581.jpg",
        type_code: "attraction",
        premise_id: 2,
        createdAt: new Date("2025-08-28T16:51:23.000Z"),
        updatedAt: new Date("2025-08-28T17:25:51.000Z")
      },
      {
        ins_id: 6,
        name: "VR Paraglider",
        description: "Atracción de realidad virtual con simulador de vuelo en parapente para 2 jugadores",
        photo_url: null,
        type_code: "attraction",
        premise_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const attractions = [
      {
        ins_id: 2,
        public_flag: "Sí",
        capacity: 20,
        createdAt: new Date("2025-08-28T13:53:18.000Z"),
        updatedAt: new Date("2025-08-28T17:18:46.000Z")
      },
      {
        ins_id: 3,
        public_flag: "Sí",
        capacity: 28,
        createdAt: new Date("2025-08-28T16:50:53.000Z"),
        updatedAt: new Date("2025-08-28T17:24:54.000Z")
      },
      {
        ins_id: 4,
        public_flag: "Sí",
        capacity: 30,
        createdAt: new Date("2025-08-28T16:51:17.000Z"),
        updatedAt: new Date("2025-08-28T17:22:33.000Z")
      },
      {
        ins_id: 5,
        public_flag: "Sí",
        capacity: 3,
        createdAt: new Date("2025-08-28T16:51:23.000Z"),
        updatedAt: new Date("2025-08-28T17:25:51.000Z")
      },
      {
        ins_id: 6,
        public_flag: "Sí",
        capacity: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insertar solo los registros que no existan aún (upsert por ins_id)
    for (const ins of inspectables) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT ins_id FROM inspectables WHERE ins_id = :id LIMIT 1',
        { replacements: { id: ins.ins_id }, type: Sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('inspectables', [ins], {});
      }
    }

    for (const attr of attractions) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT ins_id FROM attractions WHERE ins_id = :id LIMIT 1',
        { replacements: { id: attr.ins_id }, type: Sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('attractions', [attr], {});
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Solo elimina el registro nuevo de VR Paraglider
    await queryInterface.bulkDelete('attractions', { ins_id: 6 }, {});
    await queryInterface.bulkDelete('inspectables', { ins_id: 6 }, {});
  }
};
