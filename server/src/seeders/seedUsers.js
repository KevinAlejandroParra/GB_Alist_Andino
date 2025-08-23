'use strict';

const entity = require("../models/entity");

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
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 1,
        premise_id: 1,
        entity_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 2,
        user_name: 'Juan',
        user_email: 'juan@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'TI',
        user_document: 123456789,
        user_phone: 3256987458,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 3,
        premise_id: 2,
        entity_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 3,
        user_name: 'Carlos',
        user_email: 'carlos@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 123456700,
        user_phone: 3256987400,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 2,
        premise_id: 1,
        entity_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 4,
        user_name: 'Daniel',
        user_email: 'Daniel@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 123456000,
        user_phone: 3256987000,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 6,
        premise_id: 2,
        entity_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 5,
        user_name: 'Santiago',
        user_email: 'santiago@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 120456700,
        user_phone: 3206987400,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 7,
        premise_id: 2,
        entity_id: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
}; 