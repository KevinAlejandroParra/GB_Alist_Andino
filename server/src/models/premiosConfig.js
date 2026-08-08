'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PremiosConfig extends Model {
    static associate(models) {
      PremiosConfig.belongsTo(models.ChecklistType, {
        foreignKey: 'checklist_type_id',
        as: 'checklistType'
      });

      PremiosConfig.belongsTo(models.Inspectable, {
        foreignKey: 'inspectable_id',
        as: 'inspectable'
      });

      PremiosConfig.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      PremiosConfig.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updater'
      });
    }
  }

  PremiosConfig.init(
    {
      config_id: {
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
      inspectable_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'inspectables',
          key: 'ins_id',
        },
      },
      section_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      ratio_premios: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      precio_juego: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      tipo_premio: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PremiosConfig',
      tableName: 'premios_config',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['checklist_type_id', 'section_key'],
        },
        {
          fields: ['inspectable_id'],
        },
      ],
    }
  );

  return PremiosConfig;
};
