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
        role_id: 1, // Administrador -> Administrador
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
        role_id: 2, //  -> Soporte
        premise_id: 2,
        entity_id: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 3,
        user_name: 'Jefe adriana',
        user_email: 'jefeadriana@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 123456700,
        user_phone: 3256987400,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 1, // Administrador -> Administrador
        premise_id: 2,
        entity_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 4,
        user_name: 'sebastian',
        user_email: 'sebastian@example.com',
        user_password: '$2b$10$MEVwrngfYxqsgTNBS0hEw.GY8tRmjtiYLRuh2CHFrqJfVDueqBWQC',
        user_document_type: 'CC',
        user_document: 123456000,
        user_phone: 3256987000,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 3, //  Tecnico
        premise_id: 2,
        entity_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 5,
        user_name: 'Daniel Clavijo',
        user_email: 'johandanielclavijoobando@gmail.com',
        user_password: '$2b$10$VQbgCcsSm3Wzl2M5Cm6x1OWYzRYS5YbjXRT6xxRmFZ.3LACVNnXC2',
        user_document_type: 'CC',
        user_document: 1030629477,
        user_phone: 3025475248,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 3, // Tecnico de mantenimiento -> Tecnico
        premise_id: 2,
        entity_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
        user_id: 6,
        user_name: "Juan Sebastian",
        user_email: "sebastian@example.com",
        user_password: "$2b$10$miWeTqKyo0qm1MKA3TT4vOilthPNZkk4N4XJsHkXUE5Gx9eaLaUNO",
        user_document_type: "CC",
        user_document: 1000376572,
        user_phone: 3005209788,
        user_image: "images/resources/nf.jpg",
        user_state: "activo",
        role_id: 3, // Tecnico de mantenimiento -> Tecnico
        premise_id: 2,
        entity_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
            user_id: 7,
            user_name: "Jairo romero",
            user_email: "jromerop080@gmail.com",
          user_password: "$2b$10$OWg5ynFtssZt6dMT6AXCeOFmm/ChF.3BW899g2sLaNv44LmLhG4ra",
            user_document_type: "CC",
            user_document: 1022397080,
            user_phone: 3213167943,
          user_image: "images/users/user-6-1764254702579.jpg",
            user_state: "activo",
            role_id: 3, // Tecnico de mantenimiento -> Tecnico
            premise_id: 2,
            entity_id: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 8,
        user_name: 'Miguel Colmenares',
        user_email: 'miguelcol200506@gmail.com',
        user_password: '$2b$10$bimS4Rypf418LhA29EYKi..RCIXa9lZ738pOHSuiFKmzwncLFY1Q6',
        user_document_type: 'CC',
        user_document: 1013593455,
        user_phone: 3044521958,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 4, // Técnico
        premise_id: 2,
        entity_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 9,
        user_name: 'Kevin Rendon',
        user_email: 'kevindavidrendon24@gmail.com',
        user_password: '$2b$10$AQevNCyzxGab0N5BOZnZyuvbZ0xfqWXwQw.1w1yLtziXs03C6qSj2',
        user_document_type: 'CC',
        user_document: 1019902289,
        user_phone: 3108537856,
        user_image: 'images/users/user-9-1765294910185.jpg',
        user_state: 'activo',
        role_id: 4, // Soporte
        premise_id: 2,
        entity_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 10,
        user_name: 'Santiago Cifuentes',
        user_email: 'santiagocifuentes.19@hotmail.com',
        user_password: '$2b$10$OWHRJJJc407kQSpu7jU.iuFDOT8gjx/OMufHSxo.i50xiOGHTvFaW',
        user_document_type: 'CC',
        user_document: 1020838197,
        user_phone: 3107872365,
        user_image: 'images/resources/nf.jpg',
        user_state: 'activo',
        role_id: 1, // Administrador
        premise_id: 1,
        entity_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 11,
        user_name: 'Juan david Garnica',
        user_email: 'Davidtfm85@gmail.com',
        user_password: '$2b$10$cz4Y3AvCHZ8MNiBg8shQ/.sl2nlD5Egwj6q1qHpcpoewLu4fff9AG',
        user_document_type: 'CC',
        user_document: 1000517611,
        user_phone: 3219033923,
        user_image: 'images/users/user-11-1765480653257.jpg',
        user_state: 'activo',
        role_id: 4, // Técnico
        premise_id: 2,
        entity_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 12,
        user_name: 'Maria Jose Torres',
        user_email: 'Torresgalvismariajose@gmail.com',
        user_password: '$2b$10$oLPX1wZANC8R34VaEtnGmeVGBQec8zV666CgB9GgujYaEo/TrVk2y',
        user_document_type: 'CC',
        user_document: 1007969453,
        user_phone: 3118925465,
        user_image: 'images/users/user-11-1765393737467.jpg',
        user_state: 'activo',
        role_id: 4, // Anfitrión
        premise_id: 2,
        entity_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};