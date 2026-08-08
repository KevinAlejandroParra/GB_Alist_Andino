'use strict';

/**
 * Servicio de análisis del checklist de Premios.
 *
 * Separa la CAPTURA (respuestas crudas del checklist: JUGADAS, PREMIOS,
 * CONFIGURACION DE LA MAQUINA) del ANÁLISIS (premios_analisis), de forma que:
 *
 *  - Cada bloque/sección se analiza de forma independiente (las 4 secciones de
 *    TOY BOX 4P MINI no se cruzan entre sí).
 *  - El ratio de configuración (1 premio cada N jugadas) se toma de premios_config
 *    (dato maestro por bloque), no hardcodeado.
 *  - Los resultados son idempotentes y recalculables: clave (checklist_id, section_key).
 *  - Detecta resets de contador (lectura < lectura anterior).
 */

const { Op } = require('sequelize');
const {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  Inspectable,
  User,
  PremiosConfig,
  PremiosAnalisis,
} = require('../models');

const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

// ============================================================
// Configuración maestra
// ============================================================

const getConfigsForType = async (checklistTypeId, transaction) => {
  const configs = await PremiosConfig.findAll({
    where: { checklist_type_id: checklistTypeId },
    transaction,
  });
  const map = new Map();
  configs.forEach((c) => map.set(c.section_key, c));
  return map;
};

// ============================================================
// Cálculo por bloque
// ============================================================

/**
 * Clasifica el estado de un bloque según los valores calculados.
 * Rangos: ok (80-120%), baja_entrega (<80%), sobre_entrega (>120%).
 */
const classifyEstado = ({ contadorReseteado, hasPrevious, ratioUsado, jugadasDesdeUltima, premiosDesdeUltima, premiosEsperados }) => {
  if (contadorReseteado) return 'contador_reseteado';
  if (!hasPrevious) return 'primer_registro';
  if (!ratioUsado) return 'sin_config';
  if (jugadasDesdeUltima === 0) return 'sin_movimiento';
  if (premiosEsperados == null || premiosEsperados <= 0 || premiosDesdeUltima == null) return 'sin_datos';
  const pct = premiosDesdeUltima / premiosEsperados;
  if (pct < 0.8) return 'baja_entrega';
  if (pct > 1.2) return 'sobre_entrega';
  return 'ok';
};

const computeBlock = ({ config, jugadasLectura, premiosLectura, previous }) => {
  const hasPrevious = Boolean(previous);
  const jugadasAnterior = hasPrevious && previous.jugadas_lectura != null ? Number(previous.jugadas_lectura) : null;
  const premiosAnterior = hasPrevious && previous.premios_lectura != null ? Number(previous.premios_lectura) : null;

  let contadorReseteado = false;
  if (hasPrevious && jugadasAnterior != null && premiosAnterior != null) {
    contadorReseteado =
      (jugadasLectura != null && jugadasLectura < jugadasAnterior) ||
      (premiosLectura != null && premiosLectura < premiosAnterior);
  }

  let jugadasDesdeUltima = null;
  let premiosDesdeUltima = null;

  if (contadorReseteado) {
    jugadasDesdeUltima = 0;
    premiosDesdeUltima = 0;
  } else if (
    hasPrevious &&
    jugadasAnterior != null &&
    premiosAnterior != null &&
    jugadasLectura != null &&
    premiosLectura != null
  ) {
    jugadasDesdeUltima = Math.max(0, jugadasLectura - jugadasAnterior);
    premiosDesdeUltima = Math.max(0, premiosLectura - premiosAnterior);
  }

  const ratioUsado = config && config.activo && config.ratio_premios != null
    ? Number(config.ratio_premios)
    : null;

  let premiosEsperados = null;
  let eficienciaPct = null;
  if (ratioUsado && jugadasDesdeUltima != null) {
    premiosEsperados = jugadasDesdeUltima / ratioUsado;
    if (premiosEsperados > 0 && premiosDesdeUltima != null) {
      eficienciaPct = (premiosDesdeUltima / premiosEsperados) * 100;
    }
  }

  const estado = classifyEstado({
    contadorReseteado,
    hasPrevious,
    ratioUsado,
    jugadasDesdeUltima,
    premiosDesdeUltima,
    premiosEsperados,
  });

  return {
    jugadas_anterior: jugadasAnterior,
    premios_anterior: premiosAnterior,
    jugadas_desde_ultima: round2(jugadasDesdeUltima),
    premios_desde_ultima: round2(premiosDesdeUltima),
    ratio_usado: ratioUsado,
    premios_esperados: round2(premiosEsperados),
    eficiencia_pct: round2(eficienciaPct),
    contador_reseteado: contadorReseteado,
    estado,
  };
};

// ============================================================
// Análisis de una semana
// ============================================================

/**
 * Calcula (upsert) el análisis de TODOS los bloques de una semana operativa.
 * Se llama después de guardar respuestas y desde el batch de recálculo.
 */
const updatePremiosAnalysis = async ({ checklistTypeId, weekIdentifier, createdBy, transaction }) => {
  if (!weekIdentifier) return { analyzed: 0 };

  const checklists = await Checklist.findAll({
    where: { checklist_type_id: checklistTypeId, week_identifier: weekIdentifier },
    transaction,
  });
  if (checklists.length === 0) return { analyzed: 0 };

  const templateParents = await ChecklistItem.findAll({
    where: { checklist_type_id: checklistTypeId, parent_item_id: null },
    order: [['item_number', 'ASC']],
    transaction,
  });
  if (templateParents.length === 0) return { analyzed: 0 };

  const configs = await getConfigsForType(checklistTypeId, transaction);

  // Baseline: última semana analizada previa por sección
  const prevRows = await PremiosAnalisis.findAll({
    where: { checklist_type_id: checklistTypeId, week_identifier: { [Op.lt]: weekIdentifier } },
    transaction,
  });
  const prevBySection = new Map();
  for (const r of prevRows) {
    const existing = prevBySection.get(r.section_key);
    if (!existing || r.week_identifier > existing.week_identifier) prevBySection.set(r.section_key, r);
  }

  let analyzed = 0;

  for (const checklist of checklists) {
    const responses = await ChecklistResponse.findAll({
      where: { checklist_id: checklist.checklist_id },
      include: [{ model: ChecklistItem, as: 'checklistItem' }],
      transaction,
    });

    for (const parent of templateParents) {
      const sectionKey = parent.question_text;
      const blockResponses = responses.filter(
        (r) => r.checklistItem && r.checklistItem.parent_item_id === parent.checklist_item_id
      );
      if (blockResponses.length === 0) continue;

      const jugadasResp = blockResponses.find((r) => r.checklistItem.question_text === 'JUGADAS');
      const premiosResp = blockResponses.find((r) => r.checklistItem.question_text === 'PREMIOS');
      const configResp = blockResponses.find((r) => r.checklistItem.question_text === 'CONFIGURACION DE LA MAQUINA');

      const jugadasLectura = jugadasResp?.response_numeric != null ? Number(jugadasResp.response_numeric) : null;
      const premiosLectura = premiosResp?.response_numeric != null ? Number(premiosResp.response_numeric) : null;
      if (jugadasLectura == null && premiosLectura == null) continue;

      const configText = configResp?.response_text || configResp?.configuracion_maquina || null;
      const config = configs.get(sectionKey);
      const previous = prevBySection.get(sectionKey);

      const result = computeBlock({ config, jugadasLectura, premiosLectura, previous });

      const values = {
        checklist_type_id: checklistTypeId,
        checklist_id: checklist.checklist_id,
        week_identifier: weekIdentifier,
        fecha: checklist.createdAt,
        inspectable_id: checklist.inspectable_id,
        section_key: sectionKey,
        item_number: parent.item_number || null,
        jugadas_lectura: jugadasLectura,
        premios_lectura: premiosLectura,
        ...result,
        config_section: configText,
        created_by: createdBy ?? null,
      };

      // Preservar created_by original en actualizaciones (recálculos)
      const { created_by, ...updatableValues } = values;
      const existingRow = await PremiosAnalisis.findOne({
        where: { checklist_id: checklist.checklist_id, section_key: sectionKey },
        transaction,
      });

      if (existingRow) {
        await existingRow.update(updatableValues, { transaction });
      } else {
        await PremiosAnalisis.create(values, { transaction });
      }
      analyzed++;
    }
  }

  return { analyzed };
};

// ============================================================
// Recálculo completo del histórico
// ============================================================

const recomputePremiosHistory = async (checklistTypeId, { transaction } = {}) => {
  const checklists = await Checklist.findAll({
    where: { checklist_type_id: checklistTypeId },
    attributes: ['week_identifier'],
    group: ['week_identifier'],
    order: [['week_identifier', 'ASC']],
    transaction,
  });

  const weeks = checklists.map((c) => c.week_identifier).filter(Boolean);
  let analyzed = 0;
  for (const week of weeks) {
    const result = await updatePremiosAnalysis({
      checklistTypeId,
      weekIdentifier: week,
      createdBy: null,
      transaction,
    });
    analyzed += result.analyzed;
  }
  return { weeks: weeks.length, analyzed };
};

// ============================================================
// Consulta para dashboard
// ============================================================

const getPremiosAnalytics = async (checklistTypeId, { week_identifier } = {}) => {
  const where = { checklist_type_id: checklistTypeId };
  if (week_identifier) where.week_identifier = week_identifier;

  const rows = await PremiosAnalisis.findAll({
    where,
    include: [
      { model: Inspectable, as: 'inspectable', attributes: ['ins_id', 'name'] },
      { model: User, as: 'creator', attributes: ['user_id', 'user_name'] },
      { model: User, as: 'reviewer', attributes: ['user_id', 'user_name'] },
    ],
    order: [
      ['week_identifier', 'DESC'],
      ['fecha', 'DESC'],
      ['section_key', 'ASC'],
    ],
  });

  const serializedRows = rows.map((r) => {
    const json = r.toJSON();
    // La firma (dataURL) es pesada: se excluye del listado y se consulta por endpoint
    delete json.revisado_firma;
    return json;
  });

  // Rollup por (semana, máquina): suma las secciones de TOY BOX 4P MINI
  const rollupMap = new Map();
  for (const r of serializedRows) {
    if (!r.inspectable_id) continue;
    const key = `${r.week_identifier}|${r.inspectable_id}`;
    if (!rollupMap.has(key)) {
      rollupMap.set(key, {
        week_identifier: r.week_identifier,
        fecha: r.fecha,
        inspectable_id: r.inspectable_id,
        machine_name: r.inspectable?.name ?? null,
        sections: 0,
        jugadas_desde_ultima: 0,
        premios_desde_ultima: 0,
        premios_esperados: 0,
        premios_lectura: r.premios_lectura,
        contador_reseteado: false,
        revisado: false,
      });
    }
    const acc = rollupMap.get(key);
    acc.sections += 1;
    acc.jugadas_desde_ultima += Number(r.jugadas_desde_ultima || 0);
    acc.premios_desde_ultima += Number(r.premios_desde_ultima || 0);
    acc.premios_esperados += Number(r.premios_esperados || 0);
    if (r.premios_lectura != null) acc.premios_lectura = r.premios_lectura;
    if (r.contador_reseteado) acc.contador_reseteado = true;
    if (r.revisado_por != null) acc.revisado = true;
  }

  const rollup = Array.from(rollupMap.values())
    .map((r) => ({
      ...r,
      jugadas_desde_ultima: round2(r.jugadas_desde_ultima),
      premios_desde_ultima: round2(r.premios_desde_ultima),
      premios_esperados: round2(r.premios_esperados),
      eficiencia_pct:
        r.premios_esperados > 0 ? round2((r.premios_desde_ultima / r.premios_esperados) * 100) : null,
    }))
    .sort((a, b) => {
      const wk = b.week_identifier.localeCompare(a.week_identifier);
      if (wk !== 0) return wk;
      return String(a.machine_name || '').localeCompare(String(b.machine_name || ''));
    });

  // Semanas disponibles
  const weekMap = new Map();
  for (const r of serializedRows) {
    if (!weekMap.has(r.week_identifier)) {
      weekMap.set(r.week_identifier, { week_identifier: r.week_identifier, rows: 0, revisado: false });
    }
    const w = weekMap.get(r.week_identifier);
    w.rows += 1;
    if (r.revisado_por != null) w.revisado = true;
  }

  return {
    weeks: Array.from(weekMap.values()).sort((a, b) => b.week_identifier.localeCompare(a.week_identifier)),
    rows: serializedRows,
    rollup,
  };
};

// ============================================================
// Consulta de revisión de una semana (incluye firma del admin)
// ============================================================

const getPremiosWeekReview = async (checklistTypeId, weekIdentifier) => {
  if (!weekIdentifier) return null;

  const row = await PremiosAnalisis.findOne({
    where: { checklist_type_id: checklistTypeId, week_identifier: weekIdentifier, revisado_por: { [Op.ne]: null } },
    include: [{ model: User, as: 'reviewer', attributes: ['user_id', 'user_name'] }],
    order: [['revisado_en', 'DESC']],
  });

  if (!row) return null;
  const json = row.toJSON();
  return {
    week_identifier: json.week_identifier,
    revisado_por: json.revisado_por,
    revisado_en: json.revisado_en,
    revisado_firma: json.revisado_firma || null,
    reviewer_name: json.reviewer?.user_name ?? null,
  };
};

module.exports = {
  getConfigsForType,
  updatePremiosAnalysis,
  recomputePremiosHistory,
  getPremiosAnalytics,
  getPremiosWeekReview,
};
