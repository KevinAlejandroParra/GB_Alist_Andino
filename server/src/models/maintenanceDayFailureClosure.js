"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceDayFailureClosure extends Model {
        static associate(models) {
            MaintenanceDayFailureClosure.belongsTo(models.User, {
                foreignKey: 'technician_id',
                as: 'technician'
            });
            MaintenanceDayFailureClosure.belongsTo(models.FailureOrder, {
                foreignKey: 'failure_order_id',
                as: 'failureOrder'
            });
            MaintenanceDayFailureClosure.belongsTo(models.Inspectable, {
                foreignKey: 'affected_ins_id',
                as: 'inspectable'
            });
        }
    }
    MaintenanceDayFailureClosure.init({
        closure_date: { type: DataTypes.DATEONLY, allowNull: false },
        technician_id: { type: DataTypes.INTEGER, allowNull: false },
        failure_order_id: { type: DataTypes.INTEGER, allowNull: false },
        affected_ins_id: { type: DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        modelName: "MaintenanceDayFailureClosure",
        tableName: "maintenance_day_failure_closures",
        timestamps: true
    });
    return MaintenanceDayFailureClosure;
};
