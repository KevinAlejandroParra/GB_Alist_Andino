'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChecklistResponse extends Model {
    static associate(models) {
      // Las asociaciones se definen en index.js
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
      jugadas_acumuladas: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_acumulados: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      jugadas_desde_ultima: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_desde_ultima: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      promedio_premios: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_esperados: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      configuracion_maquina: {
        type: DataTypes.TEXT,
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
