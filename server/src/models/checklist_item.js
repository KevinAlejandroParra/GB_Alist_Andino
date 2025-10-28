'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistItem extends Model {
    /**
     * Método auxiliar para definir asociaciones.
     * Este método no forma parte del ciclo de vida de Sequelize.
     * El archivo `models/index` llamará a este método automáticamente.
     */
    static associate(models) {
      // Define la relación de autorreferencia para los elementos padre-hijo.
      ChecklistItem.hasMany(models.ChecklistItem, {
        as: 'subItems',
        foreignKey: 'parent_item_id',
        useJunctionTable: false
      });
      ChecklistItem.belongsTo(models.ChecklistItem, {
        as: 'parent',
        foreignKey: 'parent_item_id',
      });

      // Una respuesta está vinculada a un elemento específico de la lista de comprobación (normalmente un subelemento).
      ChecklistItem.hasMany(models.ChecklistResponse, {
        foreignKey: 'checklist_item_id',
        as: 'responses'
      });

      // Un item puede estar asociado a múltiples códigos QR (relación many-to-many)
      ChecklistItem.belongsToMany(models.ChecklistQrCode, {
        through: models.ChecklistQrItemAssociation,
        foreignKey: 'checklist_item_id',
        otherKey: 'qr_id',
        as: 'associatedQrCodes'
      });

      // Un item puede tener muchas asociaciones QR
      ChecklistItem.hasMany(models.ChecklistQrItemAssociation, {
        foreignKey: 'checklist_item_id',
        as: 'qrAssociations'
      });
    }
  }
  ChecklistItem.init(
    {
      checklist_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      parent_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'checklist_items',
          key: 'checklist_item_id',
        },
      },
      checklist_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      item_number: {
        type: DataTypes.STRING, 
        allowNull: false,
      },
      question_text: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      guidance_text: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      input_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      allow_comment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ChecklistItem',
      tableName: 'checklist_items',
      timestamps: true,
    }
  );
  return ChecklistItem;
};
