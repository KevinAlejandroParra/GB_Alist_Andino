"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class MaintenanceSessionEvidence extends Model {
        static associate(models) {
            MaintenanceSessionEvidence.belongsTo(models.MaintenanceSession, {
                foreignKey: 'session_id',
                as: 'session'
            });
            MaintenanceSessionEvidence.belongsTo(models.User, {
                foreignKey: 'uploaded_by_id',
                as: 'uploader'
            });
        }
    }
    MaintenanceSessionEvidence.init({
        session_id: { type: DataTypes.INTEGER, allowNull: false },
        phase: { type: DataTypes.ENUM('INICIO', 'PROCESO_1', 'PROCESO_2', 'FIN'), allowNull: false },
        file_url: { type: DataTypes.STRING, allowNull: false },
        uploaded_by_id: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        sequelize,
        modelName: "MaintenanceSessionEvidence",
        tableName: "maintenance_session_evidences",
        timestamps: true
    });
    return MaintenanceSessionEvidence;
};
