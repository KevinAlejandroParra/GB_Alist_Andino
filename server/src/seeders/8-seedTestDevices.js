'use strict';

const deviceData = [
        {
        family_id: 4,
        public_flag: "Sí",
        arrival_date: "2005-10-13T00:00:00.000Z",
        brand: "test",
        inspectable: {
            name: "Toy Box",
            description: "maquina de peluches",
            photo_url: "/media/photo-1756401480489-432766838.png",
            premise_id: 2
        }
    },
         {
        family_id: 4,
        public_flag: "Sí",
        arrival_date: "2005-10-13T00:00:00.000Z",
        brand: "test",
        inspectable: {
            name: "Toy family",
            description: "maquina de peluches familia",
            photo_url: "/media/photo-1756401480489-432766838.png",
            premise_id: 2
        }
    },
            {
        family_id: 4,
        public_flag: "Sí",
        arrival_date: "2005-10-13T00:00:00.000Z",
        brand: "test",
        inspectable: {
            name: "work zone",
            description: "maquina de pelotas",
            photo_url: "/media/photo-1756401480489-432766838.png",
            premise_id: 2
        }
    },
    {
        family_id: 1,
        public_flag: "Sí",
        arrival_date: "2005-10-13T00:00:00.000Z",
        brand: "test",
        inspectable: {
            name: "Fast and furious",
            description: "Fast and furious",
            photo_url: "/media/photo-1756401480489-432766838.png",
            premise_id: 3
        }
    },
    {
        family_id: 1,
        public_flag: "Sí",
        arrival_date: "2025-08-11T00:00:00.000Z",
        brand: "Microsoft",
        inspectable: {
            name: "fruit ninja",
            description: "videojuego tipo arcade",
            photo_url: "/media/photo-1756400251978-987664854.jpg",
            premise_id: 2
        }
    },
    {
        family_id: 1,
        public_flag: "Sí",
        arrival_date: "2025-08-25T20:29:51.000Z",
        brand: "raw trills",
        inspectable: {
            name: "typhoon",
            description: "5847684",
            photo_url: "/media/photo-1756401272560-499521207.jpg",
            premise_id: 3
        }
    },
    {
        family_id: 3,
        public_flag: "Sí",
        arrival_date: "2025-01-08T00:00:00.000Z",
        brand: "Raw Trills",
        inspectable: {
            name: "Fast And Furious",
            description: "Arcade multijugador con movimientos interactivos",
            photo_url: "/media/photo-1756401403564-291096026.png",
            premise_id: 2
        }
    },
    {
        family_id: 2,
        public_flag: "Sí",
        arrival_date: "2025-01-01T00:00:00.000Z",
        brand: "Genérica",
        inspectable: {
            name: "CAPSULE MP5",
            description: "Kiddie ride CAPSULE",
            photo_url: "/images/resources/nf.jpg",
            premise_id: 2
        }
    },
    {
        family_id: 2,
        public_flag: "Sí",
        arrival_date: "2025-01-01T00:00:00.000Z",
        brand: "Genérica",
        inspectable: {
            name: "CARGO EXPRESS",
            description: "Kiddie ride CARGO EXPRESS",
            photo_url: "/images/resources/nf.jpg",
            premise_id: 2
        }
    }
];

module.exports = {
  async up (queryInterface, Sequelize) {
    for (const data of deviceData) {
      // 1. Insert inspectable
      await queryInterface.bulkInsert('inspectables', [{
        name: data.inspectable.name,
        description: data.inspectable.description,
        photo_url: data.inspectable.photo_url,
        type_code: 'device',
        premise_id: data.inspectable.premise_id,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});

      // 2. Find the inserted inspectable's ID
      const [insertedInspectable] = await queryInterface.sequelize.query(
        `SELECT ins_id FROM inspectables WHERE name = :name ORDER BY ins_id DESC LIMIT 1`,
        { replacements: { name: data.inspectable.name }, type: Sequelize.QueryTypes.SELECT }
      );
      
      if (!insertedInspectable) {
        console.error(`Could not find inspectable with name ${data.inspectable.name} after insertion.`);
        continue;
      }

      // 3. Insert device
      await queryInterface.bulkInsert('devices', [{
        ins_id: insertedInspectable.ins_id,
        family_id: data.family_id,
        public_flag: data.public_flag,
        arrival_date: new Date(data.arrival_date),
        brand: data.brand,
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    }
  },

  async down (queryInterface, Sequelize) {
    const inspectableNames = deviceData.map(d => d.inspectable.name);
    if (inspectableNames.length > 0) {
        await queryInterface.bulkDelete('inspectables', { name: { [Sequelize.Op.in]: inspectableNames } }, {});
    }
  }
};