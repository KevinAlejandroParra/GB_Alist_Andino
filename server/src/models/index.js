const { Sequelize, DataTypes } = require("sequelize");
const { development: config } = require("../config/config.json");

const connection = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    dialectModule: require("mysql2"),
    logging: false,
});

(async () => {
    try {
        await connection.authenticate();
        console.log("Base de datos conectada exitosamente");
    } catch (error) {
        console.log("Error al conectar a la base de datos", error);
    }
})();

// Importar modelos
const UserModel = require("./user.js");
const RoleModel = require("./role.js");
const PremiseModel = require("./premise.js");
const ChecklistTypeModel = require("./checklist_type.js");
const ChecklistModel = require("./checklist.js");
const ChecklistItemModel = require("./checklist_item.js");
const ChecklistResponseModel = require("./checklist_response.js");
const ChecklistSignatureModel = require("./checklist_signature.js");
const FailureModel = require("./failure.js");
const MaintenanceActionModel = require("./maintenance_action.js");
const RequisitionModel = require("./requisition.js");
const RequisitionItemModel = require("./requisition_item.js");
const PartModel = require("./part.js");
const InventoryModel = require("./inventory.js");
const InspectableModel = require("./inspectable.js");
const DeviceModel = require("./device.js");
const AttractionModel = require("./attraction.js");
const FamilyModel = require("./family.js");
const EntityModel = require("./entity.js");
const AuditModel = require("./audit.js");

// Inicializar modelos
const User = UserModel(connection, DataTypes);
const Role = RoleModel(connection, DataTypes);
const Premise = PremiseModel(connection, DataTypes);
const ChecklistType = ChecklistTypeModel(connection, DataTypes);
const Checklist = ChecklistModel(connection, DataTypes);
const ChecklistItem = ChecklistItemModel(connection, DataTypes);
const ChecklistResponse = ChecklistResponseModel(connection, DataTypes);
const ChecklistSignature = ChecklistSignatureModel(connection, DataTypes);
const Failure = FailureModel(connection, DataTypes);
const MaintenanceAction = MaintenanceActionModel(connection, DataTypes);
const Requisition = RequisitionModel(connection, DataTypes);
const RequisitionItem = RequisitionItemModel(connection, DataTypes);
const Part = PartModel(connection, DataTypes);
const Inventory = InventoryModel(connection, DataTypes);
const Inspectable = InspectableModel(connection, DataTypes);
const Device = DeviceModel(connection, DataTypes);
const Attraction = AttractionModel(connection, DataTypes);
const Family = FamilyModel(connection, DataTypes);
const Entity = EntityModel(connection, DataTypes);
const Audit = AuditModel(connection, DataTypes);

// Se crea un objeto 'models' para que las funciones 'associate' internas de los modelos puedan referenciarse entre sí.
const models = {
    User, Role, Premise, ChecklistType, Checklist, ChecklistItem, ChecklistResponse,
    ChecklistSignature, Failure, MaintenanceAction, Requisition, RequisitionItem,
    Part, Inventory, Inspectable, Device, Attraction, Family, Entity, Audit
};

// Se llama al método 'associate' para cada modelo que lo tenga definido.
// Esto es crucial para registrar las relaciones que se definen DENTRO de los archivos de modelo,
// como la relación jerárquica (padre/hijo) en ChecklistItem.
Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models);
    }
});

// Asociaciones

// Jerarquía: Premise → Inspectable (Superclase) → Device / Attraction
// Un Premise puede tener muchos Inspectables (Device o Attraction)
Premise.hasMany(Inspectable, { as: "inspectables", foreignKey: "premise_id" });
Inspectable.belongsTo(Premise, { as: "premise", foreignKey: "premise_id" });
Inspectable.hasMany(Checklist, { as: "checklists", foreignKey: "inspectable_id" });

// Herencia de Inspectable (Single Table Inheritance)
// Device y Attraction heredan de Inspectable a través de type_code
// Se usa `constraints: false` y `scope` para manejar la herencia

Inspectable.hasOne(Device, {
    as: "deviceData", 
    foreignKey: "ins_id",
    constraints: false,
});
Device.belongsTo(Inspectable, {
    as: "parentInspectable",
    foreignKey: "ins_id", // ins_id es la clave primaria de Inspectable
    constraints: false,
    scope: {
        type_code: 'device'
    }
});

Inspectable.hasOne(Attraction, {
    as: "attractionData", 
    foreignKey: "ins_id",
    constraints: false,
});
Attraction.belongsTo(Inspectable, {
    as: "parentInspectable", 
    foreignKey: "ins_id", // ins_id es la clave primaria de Inspectable
    constraints: false,
    scope: {
        type_code: 'attraction'
    }
});

// 1. Asociaciones de User
User.belongsTo(Role, { as: "role", foreignKey: "role_id" });
User.belongsTo(Premise, { as: "premise", foreignKey: "premise_id" });
User.belongsTo(Entity, { as: "entity", foreignKey: "entity_id" });
User.hasMany(Checklist, { as: "createdChecklists", foreignKey: "created_by" });
User.hasMany(ChecklistResponse, { as: "responses", foreignKey: "responded_by" });
User.hasMany(Failure, { as: "reportedFailures", foreignKey: "responded_by" });
User.hasMany(MaintenanceAction, { as: "completedActions", foreignKey: "completed_by" });
User.hasMany(Requisition, { as: "requisitions", foreignKey: "requested_by" });
User.hasMany(ChecklistSignature, { as: "signatures", foreignKey: "user_id" });

// 2. Asociaciones de Role
Role.hasMany(User, { as: "users", foreignKey: "role_id" });
Role.hasMany(ChecklistType, { as: "checklistTypes", foreignKey: "role_id" });
Role.hasMany(ChecklistSignature, { as: "signatures", foreignKey: "role_at_signature" });

// 3. Asociaciones de Premise
Premise.hasMany(User, { as: "users", foreignKey: "premise_id" });
Premise.hasMany(Entity, { as: 'entities', foreignKey: 'premise_id' });
Premise.hasMany(Checklist, { as: "checklists", foreignKey: "premise_id" });
Premise.hasMany(Inventory, { as: "inventories", foreignKey: "location_id" });

// 4. Asociaciones de ChecklistType
ChecklistType.belongsTo(Role, { as: "role", foreignKey: "role_id" });
ChecklistType.hasMany(Checklist, { as: "checklists", foreignKey: "checklist_type_id" });
ChecklistType.hasMany(ChecklistItem, { as: "items", foreignKey: "checklist_type_id" });

// 5. Asociaciones de Checklist
Checklist.belongsTo(ChecklistType, { as: "type", foreignKey: "checklist_type_id" });
Checklist.belongsTo(Premise, { as: "premise", foreignKey: "premise_id" });
Checklist.belongsTo(Inspectable, { as: "inspectable", foreignKey: "inspectable_id" });
Checklist.belongsTo(User, { as: "creator", foreignKey: "created_by" });
Checklist.belongsTo(User, { as: "signer", foreignKey: "signed_by" });
Checklist.hasMany(ChecklistResponse, { as: "responses", foreignKey: "checklist_id" });
Checklist.hasMany(ChecklistSignature, { as: "signatures", foreignKey: "checklist_id" });

// 6. Asociaciones de ChecklistItem
// La asociación hasMany con ChecklistResponse se define ahora dentro del modelo ChecklistItem.
ChecklistItem.belongsTo(ChecklistType, { as: "type", foreignKey: "checklist_type_id" });

// 7. Asociaciones de ChecklistResponse
// Una respuesta pertenece a un elemento específico de la lista de comprobación.
ChecklistResponse.belongsTo(ChecklistItem, {
    foreignKey: 'checklist_item_id',
    as: 'item',
});
// Una respuesta forma parte de una instancia de lista de comprobación mayor.
ChecklistResponse.belongsTo(Checklist, {
    foreignKey: 'checklist_id',
    as: 'checklist',
});
ChecklistResponse.belongsTo(User, {
    foreignKey: 'responded_by',
    as: 'respondedBy',
});
// Una respuesta puede tener un fallo asociado si el valor es “no cumple” o tiene un comentario.
ChecklistResponse.hasOne(Failure, {
    foreignKey: 'response_id',
    as: 'failure',
});
ChecklistResponse.belongsTo(Inspectable, { as: "inspectable", foreignKey: "inspectable_id" });

// 8. Asociaciones de Failure
Failure.belongsTo(ChecklistResponse, {
    foreignKey: "response_id",
    as: "response",
});
Failure.belongsTo(User, {
    foreignKey: "responded_by",
    as: "reporter",
});
Failure.belongsTo(User, { 
    foreignKey: "responded_by",
    as: "closedByUser",
});

// 9. Asociaciones de MaintenanceAction
MaintenanceAction.belongsTo(Failure, { as: "failure", foreignKey: "failure_id" });
MaintenanceAction.belongsTo(User, { as: "completedBy", foreignKey: "completed_by" });

// 10. Asociaciones de Requisition y RequisitionItem
Requisition.belongsTo(Failure, { as: "failure", foreignKey: "failure_id" });
Requisition.belongsTo(User, { as: "requestedBy", foreignKey: "requested_by" });
Requisition.hasMany(RequisitionItem, { as: "items", foreignKey: "requisition_id" });

RequisitionItem.belongsTo(Requisition, { as: "requisition", foreignKey: "requisition_id" });
RequisitionItem.belongsTo(Part, { as: "part", foreignKey: "part_id" });

// 11. Asociaciones de Part
Part.hasMany(RequisitionItem, { as: "requisitionItems", foreignKey: "part_id" });
Part.hasMany(Inventory, { as: "inventories", foreignKey: "part_id" });

// 12. Asociaciones de Inventory
Inventory.belongsTo(Part, { as: "part", foreignKey: "part_id" });
Inventory.belongsTo(Premise, { as: "location", foreignKey: "location_id" });

// 13. Asociaciones de ChecklistSignature
ChecklistSignature.belongsTo(Checklist, { as: "checklist", foreignKey: "checklist_id" });
ChecklistSignature.belongsTo(User, { as: "user", foreignKey: "user_id" });
ChecklistSignature.belongsTo(Role, { as: "role", foreignKey: "role_at_signature" });

// 14. Asociaciones de Entity
Entity.belongsTo(Premise, { as: 'premise', foreignKey: 'premise_id' });

// 15. Asociaciones de Device y Family
// Un Device pertenece a una Family
Device.belongsTo(Family, { as: "family", foreignKey: "family_id" });
// Una Family puede tener muchos Devices
Family.hasMany(Device, { as: "familyDevices", foreignKey: "family_id" });

// Asociaciones de Audit
Audit.belongsTo(User, { as: "user", foreignKey: "user_id" });
Audit.belongsTo(Premise, { as: "premise", foreignKey: "premise_id" });
User.hasMany(Audit, { as: "audits", foreignKey: "user_id" });
Premise.hasMany(Audit, { as: "audits", foreignKey: "premise_id" });

// 16. Asociaciones para ChecklistType específicos de Inspectable
ChecklistType.belongsToMany(Inspectable, {
  through: "ChecklistTypeInspectables",
  foreignKey: "checklist_type_id",
  otherKey: "ins_id",
  as: "specificInspectables",
});

Inspectable.belongsToMany(ChecklistType, {
  through: "ChecklistTypeInspectables",
  foreignKey: "ins_id",
  otherKey: "checklist_type_id",
  as: "specificChecklistTypes",
});

// Exportar modelos
module.exports = {
    User,
    Role,
    Premise,
    ChecklistType,
    Checklist,
    ChecklistItem,
    ChecklistResponse,
    ChecklistSignature,
    Failure,
    MaintenanceAction,
    Requisition,
    RequisitionItem,
    Part,
    Inventory,
    Inspectable,
    Device,
    Attraction,
    Family,
    Entity,
    Audit,
    connection,
    Sequelize,
};