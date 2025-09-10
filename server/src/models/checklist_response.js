'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistResponse extends Model {
    
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
