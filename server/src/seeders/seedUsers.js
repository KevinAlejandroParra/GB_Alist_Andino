'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('users', [
      {
        user_id: 1,
        user_name: 'Alejandro',
        user_email: 'jefealist@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 123456789,
        user_phone: 3256987458,
        user_image: 'image1.png',
        user_state: 'activo',
        role_id: '1',
        premise_id: 'premise-id-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 3,
        user_name: 'Juan',
        user_email: 'juan@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'TI',
        user_document: 123456789,
        user_phone: 3256987458,
        user_image: 'image2.png',
        user_state: 'activo',
        role_id: '3',
        premise_id: 'premise-id-2',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
}; 