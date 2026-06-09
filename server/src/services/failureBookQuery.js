'use strict';

const {
  FailureOrder,
  ChecklistItem,
  Sequelize
} = require('../models');
const { Op } = Sequelize;
const {
  appendDateFilters,
  resolveCutoffDate,
  appendCutoffWhere,
  filterFailuresActiveAtCutoff
} = require('../utils/failureDateFilter');

const RESOLVED_STATUSES = ['RESUELTA', 'CANCELADO'];

function buildRoleWhere(userRole, allRoles) {
  if (allRoles === 'true' || allRoles === true) return {};
  if (userRole === 4) return { assigned_to: 'OPERATIVA' };
  if (userRole === 3) {
    return {
      [Op.or]: [{ assigned_to: 'TECNICA' }, { type_maintenance: 'LOCATIVA' }]
    };
  }
  return {};
}

async function buildWhereConditions(userRole, query) {
  const {
    severity,
    type_maintenance,
    searchQuery,
    checklistTypeId,
    allRoles = 'true'
  } = query;

  let whereConditions = { ...buildRoleWhere(userRole, allRoles) };

  if (severity && severity !== 'all') {
    whereConditions.severity = severity;
  }

  if (type_maintenance && type_maintenance !== 'all') {
    whereConditions.type_maintenance = type_maintenance;
  }

  if (query.assigned_to && query.assigned_to !== 'all') {
    whereConditions.assigned_to = query.assigned_to;
  }

  if (searchQuery && String(searchQuery).trim()) {
    const pattern = `%${String(searchQuery).trim()}%`;
    
    // Crear un nuevo objeto whereConditions que combine las condiciones
    // sin sobreescribir Op.or existente
    const searchClause = {
      [Op.or]: [
        { description: { [Op.like]: pattern } },
        { failure_order_id: { [Op.like]: pattern } },
        // Para campos de relaciones que pueden ser null, necesitamos
        // una condición más compleja que maneje el caso de relación ausente
        { 
          [Op.and]: [
            { '$checklistItem.checklist_item_id$': { [Op.not]: null } },
            { '$checklistItem.question_text$': { [Op.like]: pattern } }
          ]
        },
        { 
          [Op.and]: [
            { '$affectedInspectable.ins_id$': { [Op.not]: null } },
            { '$affectedInspectable.name$': { [Op.like]: pattern } }
          ]
        },
        { 
          [Op.and]: [
            { '$reporter.user_id$': { [Op.not]: null } },
            { '$reporter.user_name$': { [Op.like]: pattern } }
          ]
        }
      ]
    };
    
    // Si ya hay condiciones en whereConditions, combinar con AND
    // para no sobreescribir Op.or existente
    if (Object.keys(whereConditions).length > 0) {
      const newWhere = {
        [Op.and]: [whereConditions, searchClause]
      };
      whereConditions = newWhere;
    } else {
      whereConditions = searchClause;
    }
  }

  if (checklistTypeId && checklistTypeId !== 'all') {
    const typeId = parseInt(checklistTypeId, 10);
    const items = await ChecklistItem.findAll({
      where: { checklist_type_id: typeId },
      attributes: ['checklist_item_id']
    });
    const itemIds = items.map((item) => item.checklist_item_id);
    whereConditions.checklist_item_id =
      itemIds.length > 0 ? { [Op.in]: itemIds } : -1;
  }

  const cutoffDate = resolveCutoffDate({
    year: query.year,
    month: query.month,
    day: query.day,
    week: query.week
  });

  if (cutoffDate) {
    appendCutoffWhere(whereConditions, cutoffDate, 'FailureOrder');
  } else {
    appendDateFilters(whereConditions, {
      year: query.year,
      month: query.month,
      tableName: 'FailureOrder'
    });
  }

  return { whereConditions, cutoffDate };
}

function appendStatusWhere(whereConditions, status) {
  if (status === 'pending') {
    const statusClause = {
      [Op.or]: [
        { '$workOrder.id$': { [Op.is]: null } },
        { '$workOrder.status$': { [Op.notIn]: RESOLVED_STATUSES } }
      ]
    };
    
    // Si ya hay condiciones en whereConditions, combinar con AND
    // para no sobreescribir estructura existente
    if (Object.keys(whereConditions).length > 0) {
      if (whereConditions[Op.and] && Array.isArray(whereConditions[Op.and])) {
        // Si ya existe Op.and, agregar a él
        whereConditions[Op.and].push(statusClause);
      } else {
        // Crear nuevo Op.and con condiciones existentes y nueva cláusula
        const newWhere = {
          [Op.and]: [whereConditions, statusClause]
        };
        whereConditions = newWhere;
      }
    } else {
      whereConditions = statusClause;
    }
  }
  return whereConditions;
}

function getFailureListIncludes({ searchQuery, status } = {}) {
  const {
    User,
    ChecklistItem,
    ChecklistType,
    Inspectable,
    WorkOrder,
    WorkOrderPart,
    Inventory
  } = require('../models');

  const needsSearchJoin = !!(searchQuery && String(searchQuery).trim());

  return [
    {
      model: User,
      as: 'reporter',
      attributes: ['user_id', 'user_name', 'role_id']
    },
    {
      model: ChecklistItem,
      as: 'checklistItem',
      attributes: ['checklist_item_id', 'item_number', 'question_text', 'checklist_type_id'],
      required: false,
      include: [
        {
          model: ChecklistType,
          as: 'checklistType',
          attributes: ['checklist_type_id', 'name', 'frequency']
        }
      ]
    },
    {
      model: Inspectable,
      as: 'affectedInspectable',
      attributes: ['ins_id', 'name', 'description', 'type_code'],
      required: false,
      include: [
        {
          model: require('../models').Premise,
          as: 'premise',
          attributes: ['premise_id', 'premise_name']
        }
      ]
    },
    {
      model: User,
      as: 'adminSigner',
      attributes: ['user_id', 'user_name'],
      required: false
    },
    {
      model: WorkOrder,
      as: 'workOrder',
      attributes: ['id', 'status', 'updatedAt', 'resolved_by_id'],
      required: status === 'resolved',
      where:
        status === 'resolved'
          ? { status: { [Op.in]: RESOLVED_STATUSES } }
          : undefined,
      include: [
        {
          model: User,
          as: 'resolver',
          attributes: ['user_id', 'user_name']
        },
        {
          model: WorkOrderPart,
          as: 'parts',
          required: false,
          include: [
            {
              model: Inventory,
              as: 'inventory',
              attributes: ['id', 'part_name', 'category', 'location']
            }
          ]
        }
      ]
    }
  ];
}

async function fetchAllFailures(userRole, query = {}) {
  const { status = 'all', searchQuery } = query;
  const { whereConditions, cutoffDate } = await buildWhereConditions(userRole, query);
  let where = whereConditions;

  if (status === 'pending' || status === 'resolved') {
    where = appendStatusWhere(where, status);
  }

  let failures = await FailureOrder.findAll({
    where,
    include: getFailureListIncludes({ searchQuery, status }),
    order: [['createdAt', 'DESC']],
    subQuery: false
  });

  if (cutoffDate) {
    failures = filterFailuresActiveAtCutoff(failures, cutoffDate);
  }

  return failures;
}

module.exports = {
  RESOLVED_STATUSES,
  buildRoleWhere,
  buildWhereConditions,
  appendStatusWhere,
  getFailureListIncludes,
  fetchAllFailures,
  isActiveFailure(failure) {
    const wo = failure.workOrder;
    if (!wo) return true;
    return !RESOLVED_STATUSES.includes(wo.status);
  }
};
