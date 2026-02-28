'use strict';

// Fecha estándar para todos los dispositivos
const arrivalDate = "2025-12-05T00:00:00.000Z";

// Descripciones creativas según familia
const familyDescriptions = {
    1: "Dispositivo de la familia Redención del parque Game Box Andino. Diseñado para entregar tickets según el desempeño del jugador.",
    2: "Dispositivo de la familia Kiddies del parque Game Box Andino. Equipo mecánico interactivo para los más pequeños.",
    3: "Dispositivo de la familia Video del parque Game Box Andino. Videojuego arcade de interacción directa con el jugador.",
    4: "Dispositivo de la familia Apoyo del parque Game Box Andino. Equipo complementario que no entrega tickets pero enriquece la experiencia del parque."
};

// Mapeo de familias
const mapFamily = {
    "REDENCION": 1,
    "KIDDIE": 2,
    "VIDEO": 3,
    "APOYO": 4
};

// Lista REAL de dispositivos (sin atracciones)
const rawDevices = [
"ALLIENS ARMAGEDON|VIDEO",
"BABY AIR|APOYO",
"COGAN HORSE|KIDDIE",
"CARGO EXPRESS|KIDDIE",
"CHEEKY MONKEY|REDENCION",
"CRAZY GLIDER|KIDDIE",
"DARK SKAPE|VIDEO",
"DEADSTORM PIRATES|VIDEO",
"DOLPHIN STAR|REDENCION",
"DUO DRIVE|REDENCION",
"DUO DRIVE|REDENCION",
"FAST SOCCER|APOYO",
"FIRE HOUSE ADVENTURE|REDENCION",
"FLYING TICKETS|REDENCION",
"FRUIT NINJA|REDENCION",
"FUN STOP PHOTOS|APOYO",
"GRID|VIDEO",
"GRID|VIDEO",
"GUITAR HERO|VIDEO",
"HAPPY BUS|KIDDIE",
"JUNGLE BOAT|KIDDIE",
"JURASSIC PARK|VIDEO",
"KC COBRA|REDENCION",
"KIDDIE SUB|KIDDIE",
"MIAMI|KIDDIE",
"MINI DUXX|REDENCION",
"MINI RACE ADVENTURE|KIDDIE",
"MONKEY SHAKE DOWN|REDENCION",
"MOTO GP 1 NARANJA|VIDEO",
"MOTO GP 2 VERDE|VIDEO",
"NBA HOOP BOSTON CELTICS|REDENCION",
"NBA HOOPS LOS ANGELES LAKERS|REDENCION",
"NBA HOOP INDIANA PACERS|REDENCION",
"OCEAN CARRUSEL|KIDDIE",
"PACMAN BATTLE ROYAL|VIDEO",
"PAC MAN SMASH|APOYO",
"PIRATE KING|KIDDIE",
"SPEEDY FEET|REDENCION",
"SUPER BIG RIG|REDENCION",
"SUPER BIKES 2|VIDEO",
"SUPER BIKES 2|VIDEO",
"TOM & JERRY|KIDDIE",
"TREN DEL OESTE|KIDDIE",
"TYPHOON|VIDEO",
"CHILDREN ESCAVATOR|KIDDIE",
"THE WALKING DEAD|VIDEO",
"ZOMBIE OUTBREAK-WATER SHOOTING|REDENCION",
"HERO OF ROBOTS - TRANSFORM|REDENCION",
"TREASURE COVE|REDENCION",
"LANE MASTER|REDENCION",
"TREASURE DOME|APOYO",
"HALO FIRETEAM RAVEN|VIDEO",
"SUPER KIXX PRO|APOYO",
"TARGET ZERO KC|KIDDIE",
"TO THA NET|REDENCION",
"TO THA NET|REDENCION",
"RAINBOW|REDENCION",
"BOXER MACHINE|APOYO",
"SLALOM EVO2|APOYO",
"DOBLE EVO|APOYO",
"BABY SALOM|APOYO",
"Capsule MP5|KIDDIE",
"DIRTY DRIVIN|VIDEO",
"DIRTY DRIVIN|VIDEO",
"Space Invaders Frenzy|VIDEO",
"FAST AND FURIOUS|VIDEO",
"FAST AND FURIOUS|VIDEO",
"SILLA MASAJES DAIWA 1|APOYO",
"SILLA MASAJES DAIWA 2|APOYO",
"CROSSY ROAD|REDENCION",
"TO THA NET JR|REDENCION",
"TO THA NET JR|REDENCION",
"ELEVATOR INVASION|VIDEO",
"RACCOON RAMPAGE|REDENCION",
"DUCKY SPLASH 3|REDENCION",
"COCONUT BASH|REDENCION",
"GREEDY FROG|REDENCION",
"SUPER WINGS|REDENCION",
"TOY BOX 4P MINI|APOYO",
"TOY BOX SINGLE XL|APOYO",
"WORK ZONE|APOYO",
"POWER PUCK FEVER|REDENCION",
"GODZILLA VS KONG|REDENCION",
"PIXEL PIX|APOYO",
"NERF|VIDEO",
"STEP MANIAX|APOYO",
"SUPER BIKES 3|VIDEO",
"SUPER BIKES 3|VIDEO",
"DINING CAR|REDENCION",
"RAINBOW 2.0|REDENCION"
];

// Convertir lista en estructura final
const deviceData = rawDevices.map(entry => {
    const [name, fam] = entry.split("|");
    const familyId = mapFamily[fam];

    return {
        family_id: familyId,
        public_flag: "Sí",
        arrival_date: arrivalDate,
        brand: "recreatec",
        inspectable: {
            name: name.trim(),
            description: familyDescriptions[familyId],
            photo_url: "/images/resources/nf.jpg",
            premise_id: 2
        }
    };
});

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

      // 2. Find inserted inspectable
      const [insertedInspectable] = await queryInterface.sequelize.query(
        `SELECT ins_id FROM inspectables WHERE name = :name ORDER BY ins_id DESC LIMIT 1`,
        { replacements: { name: data.inspectable.name }, type: Sequelize.QueryTypes.SELECT }
      );

      if (!insertedInspectable) {
        console.error(`Could not find inspectable with name ${data.inspectable.name}.`);
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
        await queryInterface.bulkDelete('inspectables', {
            name: { [Sequelize.Op.in]: inspectableNames }
        }, {});
    }
  }
};
