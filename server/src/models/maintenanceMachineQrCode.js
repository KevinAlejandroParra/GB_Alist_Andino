"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceMachineQrCode extends Model {
        static associate(models) {
            MaintenanceMachineQrCode.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'inspectable'
            });
            MaintenanceMachineQrCode.belongsTo(models.User, {
                foreignKey: 'created_by',
                as: 'creator'
            });
        }
    }
    MaintenanceMachineQrCode.init({
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        ins_id: { type: DataTypes.INTEGER, unique: true, allowNull: false },
        qr_code: { type: DataTypes.STRING, unique: true, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        sequelize,
        modelName: "MaintenanceMachineQrCode",
        tableName: "maintenance_machine_qr_codes",
        timestamps: true
    });
    return MaintenanceMachineQrCode;
};
