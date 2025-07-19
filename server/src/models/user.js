"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        // Método para comparar contraseñas en el login
        async comparePassword(candidatePassword) {
            return await bcrypt.compare(candidatePassword, this.user_password);
        }
    }
    // Definimos el modelo
    User.init(
        {
            user_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
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
                defaultValue: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.flaticon.com%2Ffree-icon%2Fuser_149071&psig=AOvVaw0971-0-0-0&ust=1721060000000000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCLi0-42-_4ADFQAAAAAdAAAAABAE'
            },
            user_state: {
                type: DataTypes.ENUM('activo', 'inactivo'),
                allowNull: false,
                defaultValue: 'activo'
            },
            role_id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: '9'
            },
            premise_id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: '1'
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