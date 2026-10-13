"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceQrScan extends Model {
        static associate(models) {
            MaintenanceQrScan.belongsTo(models.Inspectable, {
                foreignKey: 'ins_id',
                as: 'inspectable'
            });
            MaintenanceQrScan.belongsTo(models.User, {
                foreignKey: 'technician_id',
                as: 'technician'
            });
        }
    }
    MaintenanceQrScan.init({
        qr_code: { type: DataTypes.STRING, allowNull: false },
        ins_id: { type: DataTypes.INTEGER, allowNull: false },
        technician_id: { type: DataTypes.INTEGER, allowNull: true },
        scanned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
        sequelize,
        modelName: "MaintenanceQrScan",
        tableName: "maintenance_qr_scans",
        timestamps: true
    });
    return MaintenanceQrScan;
};
