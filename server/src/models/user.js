"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // Un usuario pertenece a un rol
            User.belongsTo(models.Role, {
                foreignKey: 'role_id',
                as: 'role'
            });

            // Un usuario pertenece a una sede (premise)
            User.belongsTo(models.Premise, {
                foreignKey: 'premise_id',
                as: 'premise'
            });

            // Un usuario pertenece a una entidad
            User.belongsTo(models.Entity, {
                foreignKey: 'entity_id',
                as: 'entity'
            });

            // Un usuario puede crear muchos checklists
            User.hasMany(models.Checklist, {
                foreignKey: 'created_by',
                as: 'createdChecklists'
            });

            // Un usuario puede tener muchas firmas
            User.hasMany(models.ChecklistSignature, {
                foreignKey: 'user_id',
                as: 'signatures'
            });

            // Un usuario puede realizar muchos escaneos de QR
            User.hasMany(models.ChecklistQrScan, {
                foreignKey: 'scanned_by',
                as: 'qrScans'
            });
        }
        // Método para comparar contraseñas en el login
        async comparePassword(candidatePassword) {
            return await bcrypt.compare(candidatePassword, this.user_password);
        }
    }
    // Definimos el modelo
    User.init(
        {
            user_id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            user_name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "El nombre es requerido"
                    }
                }
            },
            user_email: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: {
                        msg: "Debe proporcionar un email válido"
                    }
                }
            }, 
            user_password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [8, 100],
                        msg: "La contraseña debe tener al menos 8 caracteres"
                    }
                }
            },
            user_document_type: {
                type: DataTypes.ENUM("TI", "CC", "CE"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["TI", "CC", "CE"]],
                        msg: "El tipo de documento debe ser TI, CC o CE"
                    }
                }
            },
            user_document: {
                type: DataTypes.DECIMAL,
                allowNull: false,
                validate: {
                    isNumeric: {
                        msg: "El documento debe contener solo números"
                    }
                }
            },
            user_phone: {
                type: DataTypes.DECIMAL,
                allowNull: false,
                validate: {
                    isNumeric: {
                        msg: "El teléfono debe contener solo números"
                    }
                }
            },
            user_image: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'images/resources/nf.jpg'
            },
            user_state: {
                type: DataTypes.ENUM('activo', 'inactivo'),
                allowNull: false,
                defaultValue: 'activo'
            },
            role_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '9'
            },
            premise_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '1'
            },
            entity_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "User",
            freezeTableName: true,
            tableName: "users",
            timestamps: true,
            hooks: {
                // Hook para encriptar la contraseña antes de guardar
                beforeCreate: async (user) => {
                    if (user.user_password) {
                        const salt = await bcrypt.genSalt(10);
                        user.user_password = await bcrypt.hash(user.user_password, salt);
                    }
                },
            }
        }
    );
    return User;
};