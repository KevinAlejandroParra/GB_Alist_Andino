'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RetroactiveAccessRequest extends Model {
    static associate(models) {
      RetroactiveAccessRequest.belongsTo(models.User, {
        foreignKey: 'admin_user_id',
        as: 'admin',
      });

      RetroactiveAccessRequest.belongsTo(models.ChecklistType, {
        foreignKey: 'checklist_type_id',
        as: 'checklistType',
      });

      RetroactiveAccessRequest.belongsTo(models.Checklist, {
        foreignKey: 'target_checklist_id',
        as: 'targetChecklist',
      });

      RetroactiveAccessRequest.belongsTo(models.Checklist, {
        foreignKey: 'checklist_id',
        as: 'resultChecklist',
      });
    }
  }

  RetroactiveAccessRequest.init(
    {
      request_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      admin_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      checklist_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      target_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha retroactiva solicitada (YYYY-MM-DD)',
      },
      action_type: {
        type: DataTypes.ENUM('access_existing', 'create_new'),
        allowNull: false,
      },
      target_checklist_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      justification: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      request_token: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checklist_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewer_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RetroactiveAccessRequest',
      tableName: 'retroactive_access_requests',
      timestamps: true,
    }
  );

  return RetroactiveAccessRequest;
};
