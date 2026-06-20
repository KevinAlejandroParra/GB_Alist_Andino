'use strict';

const {
  FailureOrder,
  User,
  Inspectable,
  WorkOrder,
  WorkOrderPart,
  RepairExecution,
  ChecklistItem,
  ChecklistType,
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

const repairExecutionService = require('./repairExecutionService');

function getEffectiveStatus(failure) {
  return repairExecutionService.getEffectiveStatus(failure);
}

function isActiveFailure(failure) {
  const status = getEffectiveStatus(failure);
  if (!status) return true;
  return !RESOLVED_STATUSES.includes(status);
}

function isCanceledFailure(failure) {
  return getEffectiveStatus(failure) === 'CANCELADO';
}

function applyPostFilters(failures, { status, hasWorkOrder, hasRepairExecution, hasParts }) {
  let result = failures;

  if (status === 'pending') {
    result = result.filter((f) => isActiveFailure(f));
  } else if (status === 'resolved') {
    result = result.filter(
      (f) => getEffectiveStatus(f) === 'RESUELTA'
    );
  } else if (status === 'canceled') {
    result = result.filter((f) => isCanceledFailure(f));
  }

  if (hasWorkOrder === 'true') {
    result = result.filter((f) => f.workOrder);
  } else if (hasWorkOrder === 'false') {
    result = result.filter((f) => !f.workOrder);
  }

  if (hasRepairExecution === 'true') {
    result = result.filter((f) => f.repairExecution);
  } else if (hasRepairExecution === 'false') {
    result = result.filter((f) => !f.repairExecution);
  }

  if (hasParts === 'true') {
    result = result.filter(
      (f) => f.workOrder?.parts && f.workOrder.parts.length > 0
    );
  } else if (hasParts === 'false') {
    result = result.filter(
      (f) => !f.workOrder?.parts || f.workOrder.parts.length === 0
    );
  }

  return result;
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

  if (searchQuery && searchQuery.trim()) {
    const pattern = `%${searchQuery.trim()}%`;
    
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
        {
          [Op.and]: [
            { '$repairExecution.id$': { [Op.is]: null } },
            { '$workOrder.id$': { [Op.is]: null } }
          ]
        },
        { '$repairExecution.status$': { [Op.notIn]: RESOLVED_STATUSES } },
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
  } else if (status === 'resolved') {
    const statusClause = {
      [Op.or]: [
        { '$repairExecution.status$': 'RESUELTA' },
        { '$workOrder.status$': 'RESUELTA' }
      ]
    };
    if (Object.keys(whereConditions).length > 0) {
      if (whereConditions[Op.and] && Array.isArray(whereConditions[Op.and])) {
        whereConditions[Op.and].push(statusClause);
      } else {
        whereConditions = { [Op.and]: [whereConditions, statusClause] };
      }
    } else {
      whereConditions = statusClause;
    }
  } else if (status === 'canceled') {
    const statusClause = {
      [Op.or]: [
        { '$repairExecution.status$': 'CANCELADO' },
        { '$workOrder.status$': 'CANCELADO' }
      ]
    };
    if (Object.keys(whereConditions).length > 0) {
      if (whereConditions[Op.and] && Array.isArray(whereConditions[Op.and])) {
        whereConditions[Op.and].push(statusClause);
      } else {
        whereConditions = { [Op.and]: [whereConditions, statusClause] };
      }
    } else {
      whereConditions = statusClause;
    }
  }
  return whereConditions;
}

function getListIncludes(status, needsSearchJoin) {
  return [
    {
      model: User,
      as: 'reporter',
      attributes: ['user_id', 'user_name', 'role_id'],
      required: false
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
      required: false
    },
    {
      model: RepairExecution,
      as: 'repairExecution',
      attributes: [
        'id', 'repair_execution_id', 'status', 'activity_performed', 'evidence_url',
        'start_time', 'end_time', 'resolved_by_id', 'cancellation_reason',
        'cancelled_at', 'cancelled_by_id', 'linked_failure_ids', 'updatedAt'
      ],
      required: false,
      where:
        status === 'canceled'
          ? { status: 'CANCELADO' }
          : status === 'resolved'
            ? { status: 'RESUELTA' }
            : undefined,
      include: [
        {
          model: User,
          as: 'resolver',
          attributes: ['user_id', 'user_name']
        },
        {
          model: User,
          as: 'cancelledBy',
          attributes: ['user_id', 'user_name'],
          required: false
        }
      ]
    },
    {
      model: WorkOrder,
      as: 'workOrder',
      attributes: ['id', 'work_order_id', 'status', 'updatedAt', 'resolved_by_id', 'linked_failure_ids'],
      required: false,
      where:
        status === 'resolved'
          ? { status: { [Op.in]: RESOLVED_STATUSES } }
          : status === 'canceled'
            ? { status: 'CANCELADO' }
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
          attributes: ['id'],
          required: false
        }
      ]
    }
  ];
}

async function fetchFailuresForBook(userRole, query) {
  const { status = 'all', searchQuery } = query;
  const { whereConditions, cutoffDate } = await buildWhereConditions(userRole, query);
  const needsSearchJoin = !!(searchQuery && searchQuery.trim());
  let where = whereConditions;

  if (status === 'pending' || status === 'resolved' || status === 'canceled') {
    where = appendStatusWhere(where, status);
  }

  let failures = await FailureOrder.findAll({
    where,
    include: getListIncludes(status, needsSearchJoin),
    order: [['createdAt', 'DESC']]
  });

  if (cutoffDate) {
    failures = filterFailuresActiveAtCutoff(failures, cutoffDate);
  }

  return applyPostFilters(failures, {
    ...query,
    status: status === 'pending' || status === 'resolved' || status === 'canceled' ? 'all' : status
  });
}

class FailureBookService {
  /**
   * Autocomplete agrupado para el libro de fallas
   */
  async getSuggestions(userRole, { q, limit = 5, allRoles = 'true', year, month }) {
    const query = (q || '').trim();
    const cap = Math.min(parseInt(limit, 10) || 5, 10);

    if (query.length < 2) {
      return { devices: [], failures: [], technicians: [] };
    }

    const pattern = `%${query}%`;
    const roleWhere = buildRoleWhere(userRole, allRoles);

    // Aplicar filtro de fecha si está activo, para que las sugerencias
    // coincidan con lo que el usuario verá en la lista
    const { appendDateFilters } = require('../utils/failureDateFilter');
    const dateWhere = {};
    appendDateFilters(dateWhere, { year, month, tableName: 'FailureOrder' });
    const baseWhere = { ...roleWhere, ...dateWhere };

    const [deviceRows, failureRows, reporterRows, resolverRows] = await Promise.all([
      FailureOrder.findAll({
        where: baseWhere,
        include: [
          {
            model: Inspectable,
            as: 'affectedInspectable',
            attributes: ['name'],
            required: true,
            where: { name: { [Op.like]: pattern } }
          },
          {
            model: WorkOrder,
            as: 'workOrder',
            attributes: ['status'],
            required: false
          }
        ],
        attributes: ['id'],
        limit: 150
      }),
      FailureOrder.findAll({
        where: {
          ...baseWhere,
          [Op.or]: [
            { description: { [Op.like]: pattern } },
            { failure_order_id: { [Op.like]: pattern } }
          ]
        },
        attributes: ['failure_order_id', 'description'],
        order: [['createdAt', 'DESC']],
        limit: cap
      }),
      FailureOrder.findAll({
        where: baseWhere,
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['user_name'],
            required: true,
            where: { user_name: { [Op.like]: pattern } }
          }
        ],
        attributes: ['id'],
        limit: 100
      }),
      FailureOrder.findAll({
        where: baseWhere,
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            required: true,
            attributes: ['status'],
            include: [
              {
                model: User,
                as: 'resolver',
                attributes: ['user_name'],
                required: true,
                where: { user_name: { [Op.like]: pattern } }
              }
            ]
          }
        ],
        attributes: ['id'],
        limit: 100
      })
    ]);

    const deviceMap = new Map();
    deviceRows.forEach((row) => {
      const plain = row.get({ plain: true });
      const name = plain.affectedInspectable?.name;
      if (!name) return;
      const entry = deviceMap.get(name) || { name, active: 0, total: 0 };
      entry.total += 1;
      if (isActiveFailure(plain)) entry.active += 1;
      deviceMap.set(name, entry);
    });

    const techMap = new Map();
    reporterRows.forEach((row) => {
      const name = row.reporter?.user_name;
      if (!name) return;
      const entry = techMap.get(name) || { name, reported: 0, resolved: 0 };
      entry.reported += 1;
      techMap.set(name, entry);
    });
    resolverRows.forEach((row) => {
      const plain = row.get({ plain: true });
      const name = plain.workOrder?.resolver?.user_name;
      if (!name) return;
      const entry = techMap.get(name) || { name, reported: 0, resolved: 0 };
      entry.resolved = (entry.resolved || 0) + 1;
      techMap.set(name, entry);
    });

    return {
      devices: Array.from(deviceMap.values())
        .sort((a, b) => b.active - a.active)
        .slice(0, cap),
      failures: failureRows.map((row) => {
        const desc = row.description || '';
        const id = row.failure_order_id || `OF-${row.id}`;
        return {
          id,
          label: desc.length > 42 ? `${desc.slice(0, 42)}...` : desc,
          searchValue: desc.length > 60 ? desc.slice(0, 60) : desc || id
        };
      }),
      technicians: Array.from(techMap.values()).slice(0, cap)
    };
  }

  /**
   * Estadísticas para gráficas del libro (respeta filtros activos)
   */
  async getDashboardStats(userRole, query) {
    const failures = await fetchFailuresForBook(userRole, {
      ...query,
      allRoles: query.allRoles ?? 'true'
    });

    const checklists = {};
    const devices = {};
    const technicians = {};

    failures.forEach((f) => {
      const plain = f.get ? f.get({ plain: true }) : f;
      const chName =
        plain.checklistItem?.checklistType?.name || 'Independientes / Directos';
      checklists[chName] = (checklists[chName] || 0) + 1;

      const devName = plain.affectedInspectable?.name || 'Sin dispositivo';
      devices[devName] = (devices[devName] || 0) + 1;

      if (
        plain.workOrder &&
        RESOLVED_STATUSES.includes(plain.workOrder.status) &&
        plain.workOrder.resolver?.user_name
      ) {
        const techName = plain.workOrder.resolver.user_name;
        technicians[techName] = (technicians[techName] || 0) + 1;
      }
    });

    const toTop = (obj) =>
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    let pending = 0;
    let resolved = 0;
    let canceled = 0;
    let critical = 0;

    failures.forEach((f) => {
      const plain = f.get ? f.get({ plain: true }) : f;
      if (plain.severity === 'CRITICA') critical += 1;
      const effective = getEffectiveStatus(plain);
      if (!effective || (effective !== 'RESUELTA' && effective !== 'CANCELADO')) {
        pending += 1;
      } else if (effective === 'RESUELTA') {
        resolved += 1;
      } else if (effective === 'CANCELADO') {
        canceled += 1;
      }
    });

    return {
      total: failures.length,
      pending,
      resolved,
      canceled,
      critical,
      topChecklists: toTop(checklists),
      topDevices: toTop(devices),
      topTechnicians: toTop(technicians)
    };
  }
}

module.exports = new FailureBookService();
