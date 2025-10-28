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
const WorkOrderModel = require("./workOrder.js");
const ChecklistQrCodeModel = require("./checklistQrCode.js");
const ChecklistQrScanModel = require("./checklistQrScan.js");
const ChecklistQrItemAssociationModel = require("./checklistQrItemAssociation.js");

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
const WorkOrder = WorkOrderModel(connection, DataTypes);
const ChecklistQrCode = ChecklistQrCodeModel(connection, DataTypes);
const ChecklistQrScan = ChecklistQrScanModel(connection, DataTypes);
const ChecklistQrItemAssociation = ChecklistQrItemAssociationModel(connection, DataTypes);

// Se crea un objeto 'models' para que las funciones 'associate' internas de los modelos puedan referenciarse entre sí.
const models = {
      User, Role, Premise, ChecklistType, Checklist, ChecklistItem, ChecklistResponse,
      ChecklistSignature, Failure, MaintenanceAction, Requisition, RequisitionItem,
      Part, Inventory, Inspectable, Device, Attraction, Family, Entity, Audit, WorkOrder,
      ChecklistQrCode, ChecklistQrScan, ChecklistQrItemAssociation
  };

// Se llama al método 'associate' para cada modelo que lo tenga definido.
// Esto es crucial para registrar las relaciones que se definen DENTRO de los archivos de modelo,
// como la relación jerárquica (padre/hijo) en ChecklistItem.
Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models);
    }
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
      WorkOrder,
      ChecklistQrCode,
      ChecklistQrScan,
      ChecklistQrItemAssociation,
      connection,
      Sequelize,
  };