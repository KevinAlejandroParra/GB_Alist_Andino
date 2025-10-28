'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistQrScan extends Model {
    static associate(models) {
      // Un escaneo pertenece a un checklist
      ChecklistQrScan.belongsTo(models.Checklist, {
        foreignKey: 'checklist_id',
        as: 'checklist'
      });

      // Un escaneo pertenece a un código QR
      ChecklistQrScan.belongsTo(models.ChecklistQrCode, {
        foreignKey: 'qr_id',
        as: 'qrCode'
      });

      // Un escaneo es realizado por un usuario
      ChecklistQrScan.belongsTo(models.User, {
        foreignKey: 'scanned_by',
        as: 'scanner'
      });
    }
  }

  ChecklistQrScan.init(
    {
      scan_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      checklist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checklists',
          key: 'checklist_id',
        },
      },
      qr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_qr_codes',
          key: 'qr_id',
        },
      },
      scanned_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
      },
      scanned_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      checklist_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'in_progress',
        comment: 'Estado del checklist al momento del escaneo (in_progress, completed, etc.)',
      },
    },
    {
      sequelize,
      modelName: 'ChecklistQrScan',
      tableName: 'checklist_qr_scans',
      timestamps: true,
      indexes: [
        {
          fields: ['checklist_id'],
        },
        {
          fields: ['qr_id'],
        },
        {
          fields: ['scanned_by'],
        },
        {
          fields: ['scanned_at'],
        },
        {
          fields: ['checklist_id', 'scanned_at'],
        },
      ],
    }
  );

  return ChecklistQrScan;
};