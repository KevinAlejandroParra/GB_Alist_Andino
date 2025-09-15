'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Primero insertamos los inspectables
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
      }
    ];

    // Luego insertamos las atracciones
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
      }
    ];

    // Insertamos los datos usando bulkInsert
    await queryInterface.bulkInsert('inspectables', inspectables, {});
    await queryInterface.bulkInsert('attractions', attractions, {});
  },

  async down(queryInterface, Sequelize) {
    // Eliminamos primero las atracciones debido a la restricción de clave foránea
    await queryInterface.bulkDelete('attractions', null, {});
    await queryInterface.bulkDelete('inspectables', null, {});
  }
};
