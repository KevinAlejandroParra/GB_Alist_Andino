'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FailureOrder extends Model {
    static associate(models) {
      // Relación con el usuario que reportó la falla
      FailureOrder.belongsTo(models.User, {
        foreignKey: 'reported_by_id',
        as: 'reporter'
      });
  
      // Relación con el ítem del checklist
      FailureOrder.belongsTo(models.ChecklistItem, {
        foreignKey: 'checklist_item_id',
        as: 'checklistItem',
        onDelete: 'CASCADE'
      });
  
      // Relación con el inspectable (atracción/dispositivo/área afectada)
      FailureOrder.belongsTo(models.Inspectable, {
        foreignKey: 'affected_id',
        as: 'affectedInspectable'
      });
  
      // Relación con la orden de trabajo (1:1 - si existe)
      FailureOrder.hasOne(models.WorkOrder, {
        foreignKey: 'failure_order_id',
        as: 'workOrder'
      });
    }
  }

  FailureOrder.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    failure_order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Identificador único de la orden de falla'
    },

    // Información básica de la falla
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Descripción detallada de la falla reportada'
    },
    evidence_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de la evidencia (imagen) de la falla'
    },

    // ✅ NUEVO: Campos de recurrencia
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si la falla es recurrente'
    },
    recurrence_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de veces que se ha reportado esta falla recurrente'
    },
    // ✅ NUEVO: Campo de firma para cierre
    closure_signature: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      comment: 'Firma digital para cierre de la falla'
    },

    // Asignación y categorización
    assigned_to: {
      type: DataTypes.ENUM('TECNICA', 'OPERATIVA'),
      allowNull: true,
      defaultValue: null,
      comment: 'Área asignada para atender la falla'
    },
    type_maintenance: {
      type: DataTypes.ENUM('TECNICA', 'LOCATIVA', 'OPERATIVA', 'SST'),
      allowNull: false,
      defaultValue: 'TECNICA',
      comment: 'Tipo de mantenimiento: técnica, locativa, operativa o SST'
    },
    severity: {
      type: DataTypes.ENUM('LEVE', 'MODERADA', 'CRITICA'),
      allowNull: false,
      defaultValue: 'LEVE',
      comment: 'Nivel de severidad/urgencia de la falla'
    },

    // Relaciones
    reported_by_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del usuario que reportó la falla'
    },
    affected_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del inspectable que sufrió el daño. NULL si no aplica.'
    },
    checklist_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del ítem del checklist donde se reportó. NULL si fue reporte independiente.'
    }
  }, {
    sequelize,
    modelName: 'FailureOrder',
    tableName: 'failure_orders',
    comment: 'Tabla para registro de fallas reportadas',
    indexes: [
      { fields: ['reported_by_id'] },
      { fields: ['assigned_to'] },
      { fields: ['severity'] },
      { fields: ['type_maintenance'] },
      { fields: ['affected_id'] },
      { fields: ['checklist_item_id'] },
      { fields: ['createdAt'] },
      // ✅ NUEVO: Índices para campos de recurrencia
      { fields: ['is_recurring'] },
      { fields: ['recurrence_count'] },
      { fields: ['closure_signature'] },
      { fields: ['assigned_to', 'severity'] },
      { fields: ['type_maintenance', 'severity'] },
      { fields: ['is_recurring', 'severity'] }
    ]
  });

  return FailureOrder;
};