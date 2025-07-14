'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Users', [
      {
        user_id: 1,
        user_name: 'Usuario1',
        user_email: 'usuario1@example.com',
        user_password: 'password1',
        user_document_type: 'CC',
        user_document: 123456789,
        user_phone: 987654321,
        user_image: 'image1.png',
        user_state: 'activo',
        role_id: 'role-id-1',
        premise_id: 'premise-id-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 2,
        user_name: 'Usuario2',
        user_email: 'usuario2@example.com',
        user_password: 'password2',
        user_document_type: 'TI',
        user_document: 987654321,
        user_phone: 123456789,
        user_image: 'image2.png',
        user_state: 'activo',
        role_id: 'role-id-2',
        premise_id: 'premise-id-2',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
}; 