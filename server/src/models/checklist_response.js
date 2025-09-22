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
      response_compliance: {
        type: DataTypes.ENUM("cumple", "observación", "no cumple"),
        allowNull: true,
      },
      response_numeric: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      response_text: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      inspectable_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
