'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('retroactive_access_requests', {
      request_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      admin_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Administrador que realizó la solicitud',
      },
      checklist_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'checklist_types', key: 'checklist_type_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Tipo de checklist solicitado',
      },
      target_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Fecha retroactiva solicitada (YYYY-MM-DD)',
      },
      action_type: {
        type: Sequelize.ENUM('access_existing', 'create_new'),
        allowNull: false,
        comment: 'Tipo de acción: retomar checklist existente o crear uno nuevo',
      },
      target_checklist_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'checklists', key: 'checklist_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Checklist a retomar (solo cuando action_type = access_existing)',
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Justificación del administrador (10-500 chars)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Estado de la solicitud',
      },
      request_token: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
        comment: 'UUID único para los enlaces del correo de revisión',
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora de aprobación',
      },
      rejected_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora de rechazo',
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que el admin ejecutó la primera acción (token consumido)',
      },
      checklist_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'checklists', key: 'checklist_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Checklist resultante de la operación retroactiva',
      },
      reviewer_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP del técnico al momento de aprobar/rechazar',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Índices para consultas frecuentes
    await queryInterface.addIndex('retroactive_access_requests', ['admin_user_id'], {
      name: 'idx_rar_admin_user_id',
    });
    await queryInterface.addIndex('retroactive_access_requests', ['status'], {
      name: 'idx_rar_status',
    });
    await queryInterface.addIndex('retroactive_access_requests', ['request_token'], {
      name: 'idx_rar_request_token',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('retroactive_access_requests');
  },
};
