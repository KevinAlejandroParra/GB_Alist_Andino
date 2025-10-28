'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistQrCode extends Model {
    static associate(models) {
      // Un código QR pertenece a un tipo de checklist
      ChecklistQrCode.belongsTo(models.ChecklistType, {
        foreignKey: 'checklist_type_id',
        as: 'checklistType'
      });

      // Un código QR es creado por un usuario (admin)
      ChecklistQrCode.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      // Un código QR puede tener muchos escaneos
      ChecklistQrCode.hasMany(models.ChecklistQrScan, {
        foreignKey: 'qr_id',
        as: 'scans'
      });

      // Un código QR puede estar asociado a múltiples items del checklist
      ChecklistQrCode.belongsToMany(models.ChecklistItem, {
        through: models.ChecklistQrItemAssociation,
        foreignKey: 'qr_id',
        otherKey: 'checklist_item_id',
        as: 'associatedItems'
      });

      // Un código QR puede tener muchas asociaciones de items
      ChecklistQrCode.hasMany(models.ChecklistQrItemAssociation, {
        foreignKey: 'qr_id',
        as: 'itemAssociations'
      });
    }
  }

  ChecklistQrCode.init(
    {
      qr_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      checklist_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checklist_types',
          key: 'checklist_type_id',
        },
      },
      qr_code: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      attraction_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
      },
      usage_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Campo simplificado para asociar con el grupo de items padre
      group_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Número del grupo de items padre que valida este QR',
      },
    },
    {
      sequelize,
      modelName: 'ChecklistQrCode',
      tableName: 'checklist_qr_codes',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['qr_code'],
        },
        {
          fields: ['checklist_type_id'],
        },
      ],
    }
  );

  return ChecklistQrCode;
};