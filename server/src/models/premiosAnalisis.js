'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PremiosAnalisis extends Model {
    static associate(models) {
      PremiosAnalisis.belongsTo(models.Checklist, {
        foreignKey: 'checklist_id',
        as: 'checklist'
      });

      PremiosAnalisis.belongsTo(models.ChecklistType, {
        foreignKey: 'checklist_type_id',
        as: 'checklistType'
      });

      PremiosAnalisis.belongsTo(models.Inspectable, {
        foreignKey: 'inspectable_id',
        as: 'inspectable'
      });

      PremiosAnalisis.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      PremiosAnalisis.belongsTo(models.User, {
        foreignKey: 'revisado_por',
        as: 'reviewer'
      });
    }
  }

  PremiosAnalisis.init(
    {
      analisis_id: {
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
      checklist_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      week_identifier: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      inspectable_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      section_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      item_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      jugadas_lectura: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_lectura: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      jugadas_anterior: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_anterior: {
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
      ratio_usado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      premios_esperados: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      eficiencia_pct: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      contador_reseteado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      config_section: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revisado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revisado_en: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      revisado_firma: {
        type: DataTypes.TEXT('medium'),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PremiosAnalisis',
      tableName: 'premios_analisis',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['checklist_id', 'section_key'],
        },
        {
          fields: ['checklist_type_id', 'week_identifier'],
        },
        {
          fields: ['inspectable_id'],
        },
        {
          fields: ['section_key'],
        },
      ],
    }
  );

  return PremiosAnalisis;
};
