'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistResponse extends Model {
    static associate(models) {
      // Una respuesta pertenece a un elemento específico de la lista de comprobación.
      ChecklistResponse.belongsTo(models.ChecklistItem, {
        foreignKey: 'checklist_item_id',
        as: 'item',
      });
      // Una respuesta forma parte de una instancia de lista de comprobación mayor.
      ChecklistResponse.belongsTo(models.Checklist, {
        foreignKey: 'checklist_id',
      });
      // Una respuesta puede tener un fallo asociado si el valor es “no cumple” o tiene un comentario.
      ChecklistResponse.hasOne(models.Failure, {
        foreignKey: 'response_id',
        as: 'failure',
      });
    }
  }
  ChecklistResponse.init(
    {
      response_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      checklist_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      checklist_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
        type: DataTypes.ENUM('cumple', 'no cumple', 'observación'),
        allowNull: true, // Inicialmente nulo hasta que se envíe una respuesta
      },
      comment: {
        type: DataTypes.STRING,
      },
      evidence_url: {
        type: DataTypes.STRING,
      },
      responded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ChecklistResponse',
      tableName: 'checklist_responses',
      timestamps: true,
    }
  );
  return ChecklistResponse;
};
