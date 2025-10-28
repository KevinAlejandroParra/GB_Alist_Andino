'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistQrItemAssociation extends Model {
    static associate(models) {
      // Una asociación pertenece a un código QR
      ChecklistQrItemAssociation.belongsTo(models.ChecklistQrCode, {
        foreignKey: 'qr_id',
        as: 'qrCode'
      });

      // Una asociación pertenece a un item del checklist
      ChecklistQrItemAssociation.belongsTo(models.ChecklistItem, {
        foreignKey: 'checklist_item_id',
        as: 'checklistItem'
      });
    }
  }

  ChecklistQrItemAssociation.init(
    {
      association_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      qr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_qr_codes',
          key: 'qr_id',
        },
        onDelete: 'CASCADE',
        comment: 'ID del código QR que desbloquea este item',
      },
      checklist_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id',
        },
        onDelete: 'CASCADE',
        comment: 'ID del item del checklist que se desbloquea con este QR',
      },
      is_unlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el item está desbloqueado por el QR',
      },
      unlocked_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se desbloqueó el item',
      },
    },
    {
      sequelize,
      modelName: 'ChecklistQrItemAssociation',
      tableName: 'checklist_qr_item_associations',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['qr_id', 'checklist_item_id'],
          name: 'unique_qr_item_association'
        },
        {
          fields: ['qr_id'],
          name: 'idx_associations_qr_id'
        },
        {
          fields: ['checklist_item_id'],
          name: 'idx_associations_checklist_item_id'
        },
        {
          fields: ['is_unlocked'],
          name: 'idx_associations_is_unlocked'
        }
      ]
    }
  );

  return ChecklistQrItemAssociation;
};