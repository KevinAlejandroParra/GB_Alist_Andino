'use strict';

const ExcelJS = require('exceljs');
const { Inspectable, Premise, Device, Family, Attraction, User } = require('../models');
const { fetchAllFailures, RESOLVED_STATUSES, isActiveFailure } = require('./failureBookQuery');
const { describePeriod, MONTH_NAMES } = require('../utils/failureDateFilter');
const {
  STYLES, BRAND,
  visualBar,
  styleHeaderRow, applyColumnWidths, applyZebra,
  addSheetBanner, addDataBarFormatting
} = require('./excelReportStyles');

const TZ = 'America/Bogota';
const APP_CREDIT = 'Alist GBX  ·  Plataforma de automatización de seguimiento y reportes de mantenimiento  ·  Desarrollado por: Alejandro Parra  ·  2025-2026';

// ── UTILIDADES DE FORMATO ────────────────────────────────────────────────────
function formatDateTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { timeZone: TZ });
}
function toPlain(row) { return row?.get ? row.get({ plain: true }) : row; }

function getFailureStatusLabel(f) {
  const wo = f.workOrder;
  if (!wo) return 'Pendiente (sin OT)';
  if (RESOLVED_STATUSES.includes(wo.status)) return wo.status === 'CANCELADO' ? 'Cancelada' : 'Resuelta';
  return `En curso (${wo.status})`;
}
function getParkStatusLabel(stats) {
  if (stats.critical > 0) return 'CRÍTICO';
  if (stats.active > 0) return 'REQUIERE ATENCIÓN';
  if (stats.total === 0) return 'SIN FALLAS REGISTRADAS';
  return 'OPERATIVO';
}
function getInspectableTypeLabel(typeCode) {
  return { device: 'Dispositivo', attraction: 'Atracción', other: 'Otro' }[typeCode] || typeCode || 'N/D';
}
function partsSummary(f) {
  const parts = f.workOrder?.parts;
  if (!parts?.length) return '';
  return parts.map((p) => `${p.inventory?.part_name || 'Repuesto'} (x${p.quantity_used ?? 1})`).join('; ');
}
function describeFilters(query) {
  const parts = [describePeriod(query)];
  if (query.searchQuery) parts.push(`Búsqueda: "${query.searchQuery}"`);
  if (query.severity && query.severity !== 'all') parts.push(`Severidad: ${query.severity}`);
  if (query.assigned_to && query.assigned_to !== 'all') parts.push(`Área: ${query.assigned_to}`);
  if (query.checklistTypeId && query.checklistTypeId !== 'all') parts.push(`Checklist #${query.checklistTypeId}`);
  if (query.status && query.status !== 'all') parts.push(`Estado: ${query.status}`);
  if (query.respectFilters !== 'true' && (!query.year || query.year === 'all')) parts.push('Alcance: parque completo');
  return parts.filter(Boolean).join(' · ');
}

// ── AGREGACIONES ─────────────────────────────────────────────────────────────
function buildFailureMaps(failures) {
  const byInspectable = new Map();
  const all = failures.map(toPlain);
  all.forEach((f) => {
    const id = f.affected_id || f.affectedInspectable?.ins_id;
    if (!id) return;
    if (!byInspectable.has(id)) byInspectable.set(id, []);
    byInspectable.get(id).push(f);
  });
  return { all, byInspectable };
}

function computeInspectableStats(failureList) {
  const s = { total: failureList.length, active: 0, resolved: 0, critical: 0, moderate: 0, light: 0, lastFailureAt: null, lastActiveDescription: '', activeOtId: '' };
  failureList.forEach((f) => {
    const active = isActiveFailure(f);
    if (active) {
      s.active += 1;
      if (f.severity === 'CRITICA') s.critical += 1;
      else if (f.severity === 'MODERADA') s.moderate += 1;
      else s.light += 1;
      if (!s.activeOtId && f.workOrder?.work_order_id) s.activeOtId = f.workOrder.work_order_id;
      if (!s.lastActiveDescription) s.lastActiveDescription = (f.description || '').slice(0, 120) + ((f.description || '').length > 120 ? '…' : '');
    } else if (f.workOrder && RESOLVED_STATUSES.includes(f.workOrder.status)) {
      s.resolved += 1;
    }
    const c = f.createdAt ? new Date(f.createdAt) : null;
    if (c && (!s.lastFailureAt || c > s.lastFailureAt)) s.lastFailureAt = c;
  });
  return s;
}

async function fetchAllInspectables() {
  return Inspectable.findAll({
    include: [
      { model: Premise, as: 'premise', attributes: ['premise_id', 'premise_name'] },
      { model: Device, as: 'deviceData', required: false, include: [{ model: Family, as: 'family', attributes: ['family_name'] }] },
      { model: Attraction, as: 'attractionData', required: false }
    ],
    order: [['type_code', 'ASC'], ['name', 'ASC']]
  });
}

function aggregateTopDevices(failures, limit = 8) {
  const map = new Map();
  failures.forEach((f) => { const n = f.affectedInspectable?.name || 'Sin equipo'; map.set(n, (map.get(n) || 0) + 1); });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

function aggregateTopChecklists(failures, limit = 8) {
  const map = new Map();
  failures.forEach((f) => { const n = f.checklistItem?.checklistType?.name || 'Independientes / Directos'; map.set(n, (map.get(n) || 0) + 1); });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Productividad de técnicos — reemplaza tiempo promedio por fallas reportadas */
function aggregateTechnicianStats(failures) {
  const resolverMap = new Map();
  const reporterMap = new Map();

  failures.forEach((f) => {
    // Contador de fallas reportadas por usuario
    const reporter = f.reporter?.user_name;
    if (reporter) reporterMap.set(reporter, (reporterMap.get(reporter) || 0) + 1);

    // Solo OTs cerradas para métricas de resolución
    const wo = f.workOrder;
    if (!wo || !RESOLVED_STATUSES.includes(wo.status)) return;
    const name = wo.resolver?.user_name || 'Sin asignar';
    if (!resolverMap.has(name)) {
      resolverMap.set(name, { name, resolved: 0, cancelled: 0, partsUsed: 0, criticalResolved: 0 });
    }
    const e = resolverMap.get(name);
    if (wo.status === 'CANCELADO') { e.cancelled += 1; }
    else { e.resolved += 1; if (f.severity === 'CRITICA') e.criticalResolved += 1; }
    const parts = wo.parts || [];
    e.partsUsed += parts.reduce((sum, p) => sum + (p.quantity_used ?? 1), 0);
  });

  return Array.from(resolverMap.values())
    .map((e) => ({ ...e, reported: reporterMap.get(e.name) || 0 }))
    .sort((a, b) => b.resolved - a.resolved);
}

// ── HELPERS DE LAYOUT ────────────────────────────────────────────────────────

/** Encabezado de sección con borde izquierdo de color y fondo suave */
function writeSectionHeader(sheet, row, colSpan, label, { bgArgb = BRAND.sectionBg, accentArgb = BRAND.sectionAccent } = {}) {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = `  ${label}`;
  cell.font = { bold: true, size: 11, color: { argb: accentArgb } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
  cell.border = { left: { style: 'thick', color: { argb: accentArgb } }, bottom: { style: 'thin', color: { argb: BRAND.border } } };
  sheet.getRow(row).height = 26;
}

/** Fila separadora blanca delgada */
function writeSpacer(sheet, row, colSpan) {
  sheet.getRow(row).height = 6;
  for (let c = 1; c <= colSpan; c++) {
    sheet.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  }
}

/** Pie de página con créditos — siempre al final del contenido */
function writeFooter(sheet, row, colSpan) {
  writeSpacer(sheet, row, colSpan);
  row += 1;
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = APP_CREDIT;
  cell.font = { size: 8, italic: true, color: { argb: BRAND.textLight } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg2 } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(row).height = 18;
  return row;
}

/** Celda con valor, fill, borde y alineación en una sola llamada */
function setCell(sheet, row, col, value, { fill, font, align = 'center', wrap = false, border = true } = {}) {
  const cell = sheet.getCell(row, col);
  cell.value = value;
  if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  if (font) cell.font = font;
  if (border) cell.border = STYLES.thinBorder;
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: wrap };
  return cell;
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function buildSummarySheet(workbook, meta, failures, inspectables) {
  const COL = 10;
  const sheet = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });

  applyColumnWidths(sheet, [
    { width: 28 }, { width: 15 }, { width: 13 }, { width: 13 }, { width: 13 },
    { width: 28 }, { width: 15 }, { width: 13 }, { width: 13 }, { width: 13 }
  ]);

  // Banner — cubre las 10 columnas
  sheet.mergeCells(1, 1, 1, COL);
  const t = sheet.getCell(1, 1);
  t.value = 'LIBRO DE FALLAS — DASHBOARD EJECUTIVO';
  t.font = { bold: true, size: 18, color: { argb: BRAND.headerFont } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } };
  t.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 42;

  sheet.mergeCells(2, 1, 2, COL);
  const s = sheet.getCell(2, 1);
  s.value = 'GB Alist Andino  ·  Estado operativo del parque';
  s.font = { size: 10, italic: true, color: { argb: 'FFBFDBFE' } };
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg2 } };
  s.alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 20;

  let row = 4;

  // ── SECCIÓN 1: METADATOS ──────────────────────────────────────────────────
  writeSectionHeader(sheet, row, COL, '  INFORMACIÓN DEL REPORTE'); row += 1;
  const metaRows = [
    ['Generado', meta.generatedAt],
    ['Usuario', meta.generatedBy],
    ['Periodo / filtros', meta.scope],
    ['Equipos en parque', inspectables.length],
    ['Fallas en reporte', failures.length]
  ];
  metaRows.forEach(([label, value]) => {
    setCell(sheet, row, 1, label, { fill: BRAND.surface, font: { bold: true, size: 10, color: { argb: BRAND.textMuted } }, align: 'left', border: false });
    sheet.mergeCells(row, 2, row, COL);
    setCell(sheet, row, 2, value, { fill: BRAND.surface, font: { size: 10, color: { argb: BRAND.textDark } }, align: 'left', wrap: true, border: false });
    sheet.getRow(row).height = 18;
    row += 1;
  });

  // ── SECCIÓN 2: KPIs ───────────────────────────────────────────────────────
  writeSpacer(sheet, row, COL); row += 1;
  writeSectionHeader(sheet, row, COL, '  INDICADORES CLAVE'); row += 1;

  const pending  = failures.filter((f) => isActiveFailure(f));
  const resolved = failures.filter((f) => f.workOrder && RESOLVED_STATUSES.includes(f.workOrder.status));
  const critical = pending.filter((f) => f.severity === 'CRITICA');
  const moderate = pending.filter((f) => f.severity === 'MODERADA');
  const withIssues = new Set(pending.map((f) => f.affected_id || f.affectedInspectable?.ins_id).filter(Boolean));
  const resRate = failures.length > 0 ? Math.round((resolved.length / failures.length) * 100) : 0;

  const kpis = [
    { label: 'Pendientes',       value: pending.length,   fill: BRAND.warning,  valColor: BRAND.warningText },
    { label: 'Resueltas',        value: resolved.length,  fill: BRAND.ok,       valColor: BRAND.okText },
    { label: 'Críticas activas', value: critical.length,  fill: BRAND.critical, valColor: BRAND.criticalText },
    { label: 'Moderadas activas',value: moderate.length,  fill: BRAND.warning,  valColor: BRAND.warningText },
    { label: 'Equipos con falla',value: withIssues.size,  fill: BRAND.surfaceAlt, valColor: BRAND.headerBg },
    { label: 'Tasa resolución',  value: `${resRate}%`,    fill: BRAND.ok,       valColor: BRAND.okText }
  ];

  const kpiLabelRow = row;
  const kpiValueRow = row + 1;
  kpis.forEach((kpi, i) => {
    const col = i * 2 + 1;
    if (col + 1 > COL) return;
    sheet.mergeCells(kpiLabelRow, col, kpiLabelRow, col + 1);
    sheet.mergeCells(kpiValueRow, col, kpiValueRow, col + 1);
    setCell(sheet, kpiLabelRow, col, kpi.label, { fill: kpi.fill, font: { bold: true, size: 9, color: { argb: BRAND.textMuted } } });
    setCell(sheet, kpiValueRow, col, kpi.value, { fill: kpi.fill, font: { bold: true, size: 20, color: { argb: kpi.valColor } } });
  });
  sheet.getRow(kpiLabelRow).height = 22;
  sheet.getRow(kpiValueRow).height = 36;
  row = kpiValueRow + 2;

  // ── SECCIÓN 3: SEVERIDAD ─────────────────────────────────────────────────
  writeSpacer(sheet, row, COL); row += 1;
  writeSectionHeader(sheet, row, 5, '  DISTRIBUCIÓN POR SEVERIDAD  (mayor riesgo primero)', { accentArgb: BRAND.criticalBar }); row += 1;

  const sevData = [
    { label: 'CRÍTICA',  count: critical.length,                                    fill: BRAND.critical, barColor: BRAND.criticalBar },
    { label: 'MODERADA', count: moderate.length,                                    fill: BRAND.warning,  barColor: BRAND.warningBar  },
    { label: 'LEVE',     count: pending.filter((f) => f.severity === 'LEVE').length, fill: BRAND.surface,  barColor: BRAND.barBlue     }
  ];
  const sevMax = Math.max(...sevData.map((s) => s.count), 1);

  // Header severidad
  const sevHdrRow = row;
  ['Severidad', 'Activas', '% activas', 'Barra', 'Acción requerida'].forEach((h, i) => {
    setCell(sheet, row, i + 1, h, { fill: BRAND.headerBg, font: { bold: true, size: 10, color: { argb: BRAND.headerFont } } });
  });
  sheet.getRow(row).height = 30; row += 1;

  sevData.forEach(({ label, count, fill, barColor }) => {
    const pct = pending.length > 0 ? `${Math.round((count / pending.length) * 100)}%` : '0%';
    const bar = visualBar(count, sevMax, 28);
    const action = label === 'CRÍTICA' ? 'ATENCIÓN INMEDIATA' : label === 'MODERADA' ? 'Seguimiento activo' : 'Monitoreo rutinario';
    setCell(sheet, row, 1, label,  { fill, font: { bold: true, size: 11, color: { argb: BRAND.textDark } }, align: 'left' });
    setCell(sheet, row, 2, count,  { fill, font: { bold: true, size: 14 } });
    setCell(sheet, row, 3, pct,    { fill, font: { size: 10 } });
    setCell(sheet, row, 4, bar,    { fill, font: { name: 'Consolas', size: 10, color: { argb: barColor } }, align: 'left' });
    setCell(sheet, row, 5, action, { fill, font: { size: 10, color: { argb: barColor } }, align: 'left' });
    sheet.getRow(row).height = 24; row += 1;
  });
  addDataBarFormatting(sheet, `B${sevHdrRow + 1}:B${row - 1}`, BRAND.criticalBar);

  // ── SECCIÓN 4: TOP EQUIPOS Y CHECKLISTS ──────────────────────────────────
  writeSpacer(sheet, row, COL); row += 1;

  // Títulos lado a lado
  sheet.mergeCells(row, 1, row, 5);
  const tDev = sheet.getCell(row, 1);
  tDev.value = '  TOP EQUIPOS CON MÁS FALLAS  (mayor a menor)';
  tDev.font = { bold: true, size: 11, color: { argb: BRAND.headerBg } };
  tDev.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.sectionBg } };
  tDev.alignment = { vertical: 'middle', horizontal: 'left' };
  tDev.border = { left: { style: 'thick', color: { argb: BRAND.headerBg } }, bottom: { style: 'thin', color: { argb: BRAND.border } } };

  sheet.mergeCells(row, 6, row, COL);
  const tChk = sheet.getCell(row, 6);
  tChk.value = '  TOP TIPOS DE CHECKLIST  (mayor a menor)';
  tChk.font = { bold: true, size: 11, color: { argb: BRAND.techHeader } };
  tChk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.techBg } };
  tChk.alignment = { vertical: 'middle', horizontal: 'left' };
  tChk.border = { left: { style: 'thick', color: { argb: BRAND.techHeader } }, bottom: { style: 'thin', color: { argb: BRAND.border } } };
  sheet.getRow(row).height = 26; row += 1;

  // Headers
  ['Equipo', 'Fallas', '% total', 'Barra', 'Nivel'].forEach((h, i) => {
    setCell(sheet, row, i + 1, h, { fill: BRAND.headerBg, font: { bold: true, size: 9, color: { argb: BRAND.headerFont } } });
  });
  ['Checklist', 'Fallas', '% total', 'Barra', 'Pendientes'].forEach((h, i) => {
    setCell(sheet, row, i + 6, h, { fill: BRAND.techHeader, font: { bold: true, size: 9, color: { argb: BRAND.headerFont } } });
  });
  sheet.getRow(row).height = 28;
  const topHdrRow = row; row += 1;

  const topDev = aggregateTopDevices(failures, 8);
  const devMax = Math.max(...topDev.map((d) => d.count), 1);
  const topCh  = aggregateTopChecklists(failures, 8);
  const chMax  = Math.max(...topCh.map((c) => c.count), 1);
  const pendingByChecklist = new Map();
  pending.forEach((f) => { const n = f.checklistItem?.checklistType?.name || 'Independientes / Directos'; pendingByChecklist.set(n, (pendingByChecklist.get(n) || 0) + 1); });

  const maxRows = Math.max(topDev.length, topCh.length);
  for (let i = 0; i < maxRows; i++) {
    const altFill = i % 2 === 1 ? BRAND.surfaceAlt : 'FFFFFFFF';
    const d = topDev[i];
    const c = topCh[i];
    if (d) {
      const pct = failures.length > 0 ? `${Math.round((d.count / failures.length) * 100)}%` : '0%';
      const nivel = d.count >= 10 ? 'Alto' : d.count >= 5 ? 'Medio' : 'Bajo';
      const nivelColor = d.count >= 10 ? BRAND.criticalText : d.count >= 5 ? BRAND.warningText : BRAND.okText;
      setCell(sheet, row, 1, d.name,  { fill: altFill, font: { size: 10, color: { argb: BRAND.textDark } }, align: 'left', wrap: true });
      setCell(sheet, row, 2, d.count, { fill: altFill, font: { bold: true, size: 11 } });
      setCell(sheet, row, 3, pct,     { fill: altFill, font: { size: 10 } });
      setCell(sheet, row, 4, visualBar(d.count, devMax, 22), { fill: altFill, font: { name: 'Consolas', size: 9, color: { argb: BRAND.barBlue } }, align: 'left' });
      setCell(sheet, row, 5, nivel,   { fill: altFill, font: { bold: true, size: 9, color: { argb: nivelColor } } });
    }
    if (c) {
      const pct = failures.length > 0 ? `${Math.round((c.count / failures.length) * 100)}%` : '0%';
      const chPend = pendingByChecklist.get(c.name) || 0;
      setCell(sheet, row, 6,  c.name,  { fill: altFill, font: { size: 10, color: { argb: BRAND.textDark } }, align: 'left', wrap: true });
      setCell(sheet, row, 7,  c.count, { fill: altFill, font: { bold: true, size: 11 } });
      setCell(sheet, row, 8,  pct,     { fill: altFill, font: { size: 10 } });
      setCell(sheet, row, 9,  visualBar(c.count, chMax, 22), { fill: altFill, font: { name: 'Consolas', size: 9, color: { argb: BRAND.barTeal } }, align: 'left' });
      setCell(sheet, row, 10, chPend,  { fill: altFill, font: { bold: true, size: 11, color: { argb: chPend > 0 ? BRAND.warningText : BRAND.okText } } });
    }
    sheet.getRow(row).height = 22; row += 1;
  }
  if (topDev.length) addDataBarFormatting(sheet, `B${topHdrRow + 1}:B${row - 1}`, BRAND.barBlue);
  if (topCh.length)  addDataBarFormatting(sheet, `G${topHdrRow + 1}:G${row - 1}`, BRAND.barTeal);

  // ── SECCIÓN 5: PRODUCTIVIDAD DE TÉCNICOS ─────────────────────────────────
  writeSpacer(sheet, row, COL); row += 1;
  writeSectionHeader(sheet, row, COL, '  PRODUCTIVIDAD DE TÉCNICOS  (más fallas resueltas primero)', {
    bgArgb: BRAND.techBg, accentArgb: BRAND.techHeader
  }); row += 1;

  // Nota
  sheet.mergeCells(row, 1, row, COL);
  const techNote = sheet.getCell(row, 1);
  techNote.value = 'Solo técnicos con OTs cerradas en el periodo. "Reportadas" = fallas que el técnico registró como reportante.';
  techNote.font = { size: 9, italic: true, color: { argb: BRAND.textMuted } };
  techNote.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.techBg } };
  techNote.alignment = { wrapText: true, vertical: 'middle' };
  sheet.getRow(row).height = 18; row += 1;

  // Headers técnicos — 8 columnas, dentro de COL=10
  const techCols = ['Técnico', 'Resueltas', 'Canceladas', 'Críticas resueltas', 'Reportadas', 'Repuestos usados', 'Rendimiento', 'Barra resolución'];
  techCols.forEach((h, i) => {
    setCell(sheet, row, i + 1, h, { fill: BRAND.techHeader, font: { bold: true, size: 9, color: { argb: BRAND.headerFont } }, wrap: true });
  });
  sheet.getRow(row).height = 34;
  const techHdrRow = row; row += 1;

  const techStats = aggregateTechnicianStats(failures);
  const techMax = Math.max(...techStats.map((t) => t.resolved), 1);

  if (techStats.length === 0) {
    sheet.mergeCells(row, 1, row, COL);
    setCell(sheet, row, 1, 'No hay órdenes de trabajo cerradas en el periodo seleccionado.', { fill: BRAND.techBg, font: { italic: true, color: { argb: BRAND.textMuted } }, border: false });
    sheet.getRow(row).height = 22; row += 1;
  } else {
    techStats.forEach((t, i) => {
      const altFill = i % 2 === 1 ? BRAND.techBg : 'FFFFFFFF';
      const rendimiento = t.resolved >= 10 ? 'Excelente' : t.resolved >= 5 ? 'Bueno' : t.resolved >= 1 ? 'Regular' : '—';
      const rendColor = t.resolved >= 10 ? BRAND.okText : t.resolved >= 5 ? BRAND.headerBg : BRAND.textMuted;
      // Barra de resolución acotada a 16 chars para que quepa en la columna
      const bar = visualBar(t.resolved, techMax, 22);
      setCell(sheet, row, 1, t.name,            { fill: altFill, font: { size: 10, color: { argb: BRAND.textDark } }, align: 'left' });
      setCell(sheet, row, 2, t.resolved,         { fill: altFill, font: { bold: true, size: 13, color: { argb: BRAND.okText } } });
      setCell(sheet, row, 3, t.cancelled,        { fill: altFill, font: { size: 11 } });
      setCell(sheet, row, 4, t.criticalResolved, { fill: altFill, font: { bold: true, size: 11, color: { argb: t.criticalResolved > 0 ? BRAND.okText : BRAND.textMuted } } });
      setCell(sheet, row, 5, t.reported,         { fill: altFill, font: { size: 11, color: { argb: BRAND.headerBg } } });
      setCell(sheet, row, 6, t.partsUsed,        { fill: altFill, font: { size: 11 } });
      setCell(sheet, row, 7, rendimiento,        { fill: altFill, font: { bold: true, size: 10, color: { argb: rendColor } } });
      setCell(sheet, row, 8, bar,                { fill: altFill, font: { name: 'Consolas', size: 9, color: { argb: BRAND.barGreen } }, align: 'left' });
      sheet.getRow(row).height = 22; row += 1;
    });
    addDataBarFormatting(sheet, `B${techHdrRow + 1}:B${row - 1}`, BRAND.barGreen);
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
  row = writeFooter(sheet, row + 1, COL);
}

// ── HOJAS DE TABLA ───────────────────────────────────────────────────────────
const PARK_COLUMNS = [
  { header: 'Estado operativo', width: 22 },
  { header: 'Tipo', width: 13 },
  { header: 'Sede', width: 20 },
  { header: 'Nombre equipo', width: 32 },
  { header: 'Familia', width: 18 },
  { header: 'Marca', width: 15 },
  { header: 'Activas', width: 10 },
  { header: 'Críticas', width: 10 },
  { header: 'Moderadas', width: 12 },
  { header: 'Leves', width: 10 },
  { header: 'Total hist.', width: 12 },
  { header: 'Resueltas', width: 12 },
  { header: 'Última falla', width: 15 },
  { header: 'OT activa', width: 17 },
  { header: 'Resumen falla activa', width: 50, wrap: true }
];

const DETAIL_COLUMNS = [
  { header: 'ID Falla', width: 14 },
  { header: 'Estado', width: 18 },
  { header: 'Severidad', width: 12 },
  { header: 'Tipo mant.', width: 14 },
  { header: 'Área', width: 13 },
  { header: 'Equipo', width: 28 },
  { header: 'Tipo equipo', width: 13 },
  { header: 'Sede', width: 18 },
  { header: 'Checklist', width: 26 },
  { header: 'Ítem checklist', width: 34, wrap: true },
  { header: 'Descripción', width: 46, wrap: true },
  { header: 'Reportó', width: 20 },
  { header: 'Fecha reporte', width: 20 },
  { header: 'Recurrente', width: 11 },
  { header: 'Veces', width: 8 },
  { header: 'ID OT', width: 15 },
  { header: 'Estado OT', width: 13 },
  { header: 'Técnico', width: 20 },
  { header: 'Inicio OT', width: 20 },
  { header: 'Fin OT', width: 20 },
  { header: 'Actividad', width: 42, wrap: true },
  { header: 'Repuestos', width: 34, wrap: true },
  { header: 'Firma rep.', width: 11 },
  { header: 'Firma adm.', width: 11 }
];

/**
 * writeTableSheet — banner cubre TODAS las columnas (columns.length),
 * nota de ordenamiento en fila 3, crédito al final como pie de página.
 */
function writeTableSheet(workbook, sheetName, { subtitle, columns, getRows, sortNote }) {
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), { views: [{ showGridLines: true }] });
  applyColumnWidths(sheet, columns);

  const N = columns.length; // banner cubre todas las columnas reales

  // Fila 1: título
  sheet.mergeCells(1, 1, 1, N);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = sheetName;
  titleCell.font = { bold: true, size: 16, color: { argb: BRAND.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 36;

  // Fila 2: subtítulo
  sheet.mergeCells(2, 1, 2, N);
  const sub = sheet.getCell(2, 1);
  sub.value = subtitle || '';
  sub.font = { size: 10, italic: true, color: { argb: 'FFBFDBFE' } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg2 } };
  sub.alignment = { horizontal: 'center', wrapText: true };
  sheet.getRow(2).height = 20;

  // Fila 3: nota de ordenamiento
  sheet.mergeCells(3, 1, 3, N);
  const noteCell = sheet.getCell(3, 1);
  noteCell.value = sortNote ? `  ${sortNote}` : '';
  noteCell.font = { size: 9, italic: true, color: { argb: BRAND.textMuted } };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.sectionBg } };
  noteCell.alignment = { horizontal: 'left', wrapText: true, vertical: 'middle' };
  sheet.getRow(3).height = 20;

  // Fila 4: encabezados de columna
  const headerRow = 4;
  columns.forEach((col, i) => { sheet.getCell(headerRow, i + 1).value = col.header; });
  styleHeaderRow(sheet, headerRow, N, { rowHeight: 40 });

  // Datos
  const rows = getRows();
  let row = headerRow + 1;
  rows.forEach((values) => {
    values.forEach((v, i) => {
      const cell = sheet.getCell(row, i + 1);
      cell.value = v;
      cell.border = STYLES.thinBorder;
      cell.alignment = { vertical: 'top', wrapText: Boolean(columns[i]?.wrap), horizontal: typeof v === 'number' ? 'center' : 'left' };
      if (columns[i]?.header === 'Severidad') {
        if (v === 'CRITICA')  cell.fill = STYLES.criticalFill;
        if (v === 'MODERADA') cell.fill = STYLES.warningFill;
      }
    });
    const needsTall = columns.some((c, i) => c.wrap && values[i] && String(values[i]).length > 40);
    sheet.getRow(row).height = needsTall ? 38 : 22;
    row += 1;
  });

  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: row - 1, column: N } };
    applyZebra(sheet, headerRow + 1, row - 1, N);
    sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: true }];
  }

  // Pie de página al final de los datos
  writeFooter(sheet, row + 1, N);

  return sheet;
}

function failureToRow(f) {
  return [
    f.failure_order_id || `OF-${f.id}`,
    getFailureStatusLabel(f),
    f.severity,
    f.type_maintenance,
    f.assigned_to || '',
    f.affectedInspectable?.name || 'Sin equipo',
    getInspectableTypeLabel(f.affectedInspectable?.type_code),
    f.affectedInspectable?.premise?.premise_name || '',
    f.checklistItem?.checklistType?.name || 'Independiente / Directo',
    f.checklistItem?.question_text || '',
    f.description || '',
    f.reporter?.user_name || '',
    formatDateTime(f.createdAt),
    f.is_recurring ? 'Sí' : 'No',
    f.recurrence_count ?? 1,
    f.workOrder?.work_order_id || '',
    f.workOrder?.status || '',
    f.workOrder?.resolver?.user_name || '',
    formatDateTime(f.workOrder?.start_time),
    formatDateTime(f.workOrder?.end_time),
    (f.workOrder?.activity_performed || '').slice(0, 800),
    partsSummary(f),
    f.report_signature ? 'Sí' : 'No',
    f.admin_signature ? 'Sí' : 'No'
  ];
}

function buildParkSheet(workbook, inspectables, byInspectable) {
  const rows = inspectables.map((ins) => {
    const plain = toPlain(ins);
    const failures = byInspectable.get(plain.ins_id) || [];
    const stats = computeInspectableStats(failures);
    return [
      getParkStatusLabel(stats),
      getInspectableTypeLabel(plain.type_code),
      plain.premise?.premise_name || '',
      plain.name,
      plain.deviceData?.family?.family_name || '',
      plain.deviceData?.brand || '',
      stats.active, stats.critical, stats.moderate, stats.light,
      stats.total, stats.resolved,
      stats.lastFailureAt ? formatDate(stats.lastFailureAt) : '',
      stats.activeOtId,
      stats.lastActiveDescription
    ];
  });

  const sheet = writeTableSheet(workbook, 'Estado del Parque', {
    subtitle: 'Consolidado por equipo al cierre del periodo filtrado',
    sortNote: 'Ordenado por tipo y nombre. Estado: CRÍTICO = falla crítica activa  ·  REQUIERE ATENCIÓN = falla activa  ·  OPERATIVO = sin fallas activas.',
    columns: PARK_COLUMNS,
    getRows: () => rows
  });

  // Colorear columna "Estado operativo" — fila 5 en adelante (headerRow=4)
  rows.forEach((values, idx) => {
    const cell = sheet.getCell(5 + idx, 1);
    const s = values[0];
    if (s === 'CRÍTICO') cell.fill = STYLES.criticalFill;
    else if (s === 'REQUIERE ATENCIÓN') cell.fill = STYLES.warningFill;
    else if (s === 'OPERATIVO' || s === 'SIN FALLAS REGISTRADAS') cell.fill = STYLES.okFill;
  });
}

function buildChecklistSummarySheet(workbook, failures) {
  const groups = new Map();
  failures.forEach((f) => {
    const name = f.checklistItem?.checklistType?.name || 'Independientes / Directos';
    if (!groups.has(name)) groups.set(name, { name, freq: f.checklistItem?.checklistType?.frequency || '', total: 0, pending: 0, resolved: 0, critical: 0 });
    const g = groups.get(name);
    g.total += 1;
    if (isActiveFailure(f)) { g.pending += 1; if (f.severity === 'CRITICA') g.critical += 1; }
    else if (f.workOrder && RESOLVED_STATUSES.includes(f.workOrder.status)) g.resolved += 1;
  });

  const sorted = Array.from(groups.values()).sort((a, b) => b.pending - a.pending || b.total - a.total);
  const maxTotal = Math.max(...sorted.map((g) => g.total), 1);

  const columns = [
    { header: 'Tipo de checklist', width: 38 },
    { header: 'Frecuencia', width: 14 },
    { header: 'Total', width: 10 },
    { header: 'Pendientes', width: 13 },
    { header: 'Resueltas', width: 13 },
    { header: 'Críticas', width: 13 },
    { header: 'Barra (total)', width: 26 }
  ];

  writeTableSheet(workbook, 'Por Checklist', {
    subtitle: 'Agregado por tipo de checklist',
    sortNote: 'Ordenado por: mayor cantidad de fallas pendientes primero, luego por total. Identifica qué checklists generan más incidencias activas.',
    columns,
    getRows: () => sorted.map((g) => [g.name, g.freq, g.total, g.pending, g.resolved, g.critical, visualBar(g.total, maxTotal, 24)])
  });
}

function buildPartsSheet(workbook, failures) {
  const columns = [
    { header: 'ID Falla', width: 14 },
    { header: 'ID OT', width: 14 },
    { header: 'Dispositivo', width: 28 },
    { header: 'Repuesto', width: 32 },
    { header: 'Categoría', width: 18 },
    { header: 'Ubicación', width: 18 },
    { header: 'Cantidad', width: 10 },
    { header: 'Estado OT', width: 13 },
    { header: 'Técnico', width: 20 },
    { header: 'Fecha cierre', width: 20 }
  ];

  const rows = [];
  failures.forEach((f) => {
    (f.workOrder?.parts || []).forEach((p) => {
      rows.push([
        f.failure_order_id || `OF-${f.id}`,
        f.workOrder?.work_order_id || '',
        f.affectedInspectable?.name || '',
        p.inventory?.part_name || '',
        p.inventory?.category || '',
        p.inventory?.location || '',
        p.quantity_used ?? 1,
        f.workOrder?.status || '',
        f.workOrder?.resolver?.user_name || '',
        formatDateTime(f.workOrder?.end_time)
      ]);
    });
  });

  writeTableSheet(workbook, 'Repuestos', {
    subtitle: 'Repuestos utilizados en órdenes de trabajo',
    sortNote: 'Ordenado por falla. Muestra todos los repuestos consumidos en el periodo filtrado agrupados por OT.',
    columns,
    getRows: () => rows
  });
}

// ── CLASE PRINCIPAL ──────────────────────────────────────────────────────────
class FailureBookExportService {
  async generateWorkbook(user, query = {}) {
    const exportQuery = {
      allRoles: query.allRoles ?? 'true',
      severity: query.severity,
      assigned_to: query.assigned_to,
      checklistTypeId: query.checklistTypeId,
      searchQuery: query.searchQuery,
      type_maintenance: query.type_maintenance,
      year: query.year,
      month: query.month,
      respectFilters: query.respectFilters,
      status: query.respectFilters === 'true' && query.status && query.status !== 'all' ? query.status : 'all'
    };

    const userRole = user?.role_id;
    const [failuresRaw, inspectablesRaw] = await Promise.all([
      fetchAllFailures(userRole, exportQuery),
      fetchAllInspectables()
    ]);

    const failures = failuresRaw.map(toPlain);
    const { byInspectable } = buildFailureMaps(failuresRaw);
    const pending  = failures.filter((f) => isActiveFailure(f));
    const resolved = failures.filter((f) => f.workOrder && RESOLVED_STATUSES.includes(f.workOrder.status));

    let generatedBy = user?.user_name || `Usuario #${user?.user_id || ''}`;
    if (user?.user_id) {
      const dbUser = await User.findByPk(user.user_id, { attributes: ['user_name'] });
      if (dbUser?.user_name) generatedBy = dbUser.user_name;
    }

    const meta = { generatedAt: formatDateTime(new Date()), generatedBy, scope: describeFilters(exportQuery) };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alist GBX · Alejandro Parra';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties.date1904 = false;

    buildSummarySheet(workbook, meta, failures, inspectablesRaw.map(toPlain));
    buildParkSheet(workbook, inspectablesRaw, byInspectable);

    writeTableSheet(workbook, 'Detalle Fallas', {
      subtitle: `Registro completo · ${failures.length} fallas`,
      sortNote: 'Fecha de reporte más reciente primero. Incluye todas las fallas del periodo sin importar su estado.',
      columns: DETAIL_COLUMNS, getRows: () => failures.map(failureToRow)
    });
    writeTableSheet(workbook, 'Fallas Pendientes', {
      subtitle: `Activas / en proceso · ${pending.length}`,
      sortNote: 'Fecha de reporte más reciente primero. Solo fallas sin resolver o en proceso — requieren seguimiento activo.',
      columns: DETAIL_COLUMNS, getRows: () => pending.map(failureToRow)
    });
    writeTableSheet(workbook, 'Fallas Resueltas', {
      subtitle: `Resueltas o canceladas · ${resolved.length}`,
      sortNote: 'Fecha de reporte más reciente primero. Fallas con OT en estado RESUELTA o CANCELADO.',
      columns: DETAIL_COLUMNS, getRows: () => resolved.map(failureToRow)
    });

    buildChecklistSummarySheet(workbook, failures);
    buildPartsSheet(workbook, failures);

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new FailureBookExportService();
module.exports.MONTH_NAMES = MONTH_NAMES;
