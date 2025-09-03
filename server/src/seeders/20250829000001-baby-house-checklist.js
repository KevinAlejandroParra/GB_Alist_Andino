'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    let checklistTypeId;
    try {
      console.log('Iniciando seeder de Baby House checklist...');
      console.log('Iniciando seeder de Baby House checklist...');
      
      // 1. Buscar o crear el tipo de checklist usando SQL directo
      console.log('Buscando tipo de checklist existente...');
      
      // Primero verificar si existe
      const [existingType] = await queryInterface.sequelize.query(
        `SELECT checklist_type_id FROM checklist_types WHERE name = 'Atracciones – Baby House (V2 OCT 2018)' LIMIT 1;`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (existingType) {
        console.log('Tipo de checklist encontrado:', existingType);
        checklistTypeId = existingType.checklist_type_id;
      } else {
        console.log('Tipo de checklist no encontrado, creando uno nuevo...');
        // Primero, obtener el ID de la atracción Baby House desde inspectables
        // Usaremos premise_id = 3 para asegurarnos de obtener la Baby House correcta
        const [attraction] = await queryInterface.sequelize.query(
          `SELECT i.ins_id 
           FROM inspectables i 
           INNER JOIN attractions a ON i.ins_id = a.ins_id 
           WHERE i.name = 'Baby House' AND i.premise_id = 3;`,
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (!attraction) {
          throw new Error('No se encontró la atracción Baby House en el local especificado');
        }

        // Si no existe, crear nuevo tipo de checklist
        await queryInterface.sequelize.query(
          `INSERT INTO checklist_types (name, description, frequency, version_label, role_id, attraction_id, createdAt, updatedAt)
           VALUES (
             'Atracciones – Baby House (V2 OCT 2018)',
             'Checklist diario de mantenimiento para la atracción Baby House',
             'diario',
             'V2 OCT 2018',
             7,
             ${attraction.ins_id},
             NOW(),
             NOW()
           );`,
          { type: queryInterface.sequelize.QueryTypes.INSERT }
        );
        // Obtener el ID del tipo de checklist recién creado
        const [results] = await queryInterface.sequelize.query(
          `SELECT checklist_type_id FROM checklist_types WHERE name = 'Atracciones – Baby House (V2 OCT 2018)' LIMIT 1;`,
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        checklistTypeId = results.checklist_type_id;
      }

      if (!checklistTypeId) {
        throw new Error('No se pudo obtener el ID del tipo de checklist');
      }

      console.log('ID del tipo de checklist obtenido:', checklistTypeId);

      // 2. Verificar si ya existen items para este tipo de checklist
      const [existingItems] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM checklist_items WHERE checklist_type_id = ${checklistTypeId};`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      console.log('Existing items count:', existingItems.count);
      
      if (!existingItems || parseInt(existingItems.count) === 0) {
        console.log('No se encontraron items existentes, procediendo a crear nuevos...');
        console.log('Preparando items para inserción...');
        // 3. Crear los items del checklist
        const checklistItems = [
          {
            item_number: 1,
            question_text: 'Verificar que no existan elementos sueltos o faltantes en la atracción.',
            guidance_text: 'Inspección visual completa de la estructura y componentes.',
            input_type: 'boolean',
            allow_comment: true,
            checklist_type_id: checklistTypeId,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            item_number: 2,
            question_text: 'Verificar que no existan fisuras o daños en la estructura.',
            guidance_text: 'Inspección detallada de soldaduras y puntos de unión.',
            input_type: 'boolean',
            allow_comment: true,
            checklist_type_id: checklistTypeId,
            createdAt: new Date(),
            updatedAt: new Date()
          },
        {
          item_number: 3,
          question_text: 'Verificar el estado de los pisos y superficies antideslizantes.',
          guidance_text: 'Comprobar desgaste y adherencia de superficies.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 4,
          question_text: 'Verificar el estado de las barandas y protecciones.',
          guidance_text: 'Asegurarse de que estén firmes y sin daños.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 5,
          question_text: 'Verificar el estado de los tornillos y uniones mecánicas.',
          guidance_text: 'Asegurarse de que estén ajustados y sin corrosión.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 6,
          question_text: 'Verificar el funcionamiento de los dispositivos de seguridad.',
          guidance_text: 'Probar frenos, bloqueos y otros sistemas de seguridad.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 7,
          question_text: 'Verificar la señalización y rotulación de la atracción.',
          guidance_text: 'Asegurarse de que las señales sean visibles y legibles.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 8,
          question_text: 'Verificar el estado de los sistemas eléctricos y de iluminación.',
          guidance_text: 'Comprobar cables, conexiones y funcionamiento de luces.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 9,
          question_text: 'Verificar el estado de los sistemas de sonido y comunicación.',
          guidance_text: 'Probar altavoces, micrófonos y otros dispositivos de sonido.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 10,
          question_text: 'Verificar la limpieza y estado general de la atracción.',
          guidance_text: 'Inspeccionar y limpiar todas las áreas accesibles.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 11,
          question_text: 'Verificar el estado de los sistemas de climatización y ventilación.',
          guidance_text: 'Comprobar el funcionamiento de aires acondicionados y ventiladores.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 12,
          question_text: 'Verificar el estado de los extintores y equipos contra incendios.',
          guidance_text: 'Asegurarse de que estén cargados y en buen estado.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 13,
          question_text: 'Verificar la disponibilidad y estado de los primeros auxilios.',
          guidance_text: 'Comprobar botiquines y equipos de emergencia.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 14,
          question_text: 'Verificar el estado de las áreas de acceso y circulación.',
          guidance_text: 'Asegurarse de que estén despejadas y en buen estado.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 15,
          question_text: 'Verificar el estado de los sistemas de monitoreo y control.',
          guidance_text: 'Probar cámaras, sensores y otros dispositivos de monitoreo.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 16,
          question_text: 'Verificar el cumplimiento de las normas de seguridad.',
          guidance_text: 'Asegurarse de que se sigan todos los procedimientos de seguridad.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          item_number: 17,
          question_text: 'Verificar el estado de los informes y registros de mantenimiento.',
          guidance_text: 'Comprobar que estén actualizados y disponibles.',
          input_type: 'boolean',
          allow_comment: true,
          checklist_type_id: checklistTypeId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        ];

        // Definir los items aquí, no antes
        const items = [
          {
            item_number: 1,
            question_text: 'Verificar que no existan elementos sueltos o faltantes en la atracción.',
            guidance_text: 'Inspección visual completa de la estructura y componentes.',
            input_type: 'boolean',
            allow_comment: true,
            checklist_type_id: checklistTypeId,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          // ... resto de los items ...
        ];

        console.log('Array de items creado');
        console.log('Número de items a insertar:', items.length);

        try {
          await queryInterface.bulkInsert('checklist_items', items, {});
          console.log('Items insertados correctamente');
        } catch (error) {
          console.error('Error al insertar items:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error en la migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Obtener el ID del tipo de checklist
      const [results] = await queryInterface.sequelize.query(
        `SELECT checklist_type_id FROM checklist_types WHERE name = 'Atracciones – Baby House (V2 OCT 2018)' LIMIT 1;`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (results) {
        // 2. Eliminar los items asociados
        await queryInterface.sequelize.query(
          `DELETE FROM checklist_items WHERE checklist_type_id = ?;`,
          {
            replacements: [results.checklist_type_id],
            type: queryInterface.sequelize.QueryTypes.DELETE
          }
        );

        // 3. Eliminar el tipo de checklist
        await queryInterface.sequelize.query(
          `DELETE FROM checklist_types WHERE checklist_type_id = ?;`,
          {
            replacements: [results.checklist_type_id],
            type: queryInterface.sequelize.QueryTypes.DELETE
          }
        );
      }
    } catch (error) {
      console.error('Error en el rollback:', error);
      throw error;
    }
  }
};
