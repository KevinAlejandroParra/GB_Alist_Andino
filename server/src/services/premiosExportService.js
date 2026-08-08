'use strict';

/**
 * Servicio de exportación Excel del análisis de Premios.
 *
 * Genera un workbook con dos hojas:
 *   1. "Resumen por máquina"  — rollup por (semana, máquina) sumando secciones.
 *   2. "Detalle por sección"  — fila por bloque/sección con lecturas y configuración.
 *
 * Reutiliza los estilos de excelReportStyles (mismo lenguaje visual del libro de fallas).
 */

const ExcelJS = require('exceljs');
const {
  BRAND,
  STYLES,
  styleHeaderRow,
  applyColumnWidths,
  applyZebra,
  addSheetBanner,
  addDataBarFormatting,
} = require('./excelReportStyles');

const ESTADO_LABEL = {
  ok: 'OK',
  baja_entrega: 'Baja entrega',
  sobre_entrega: 'Sobre entrega',
  sin_movimiento: 'Sin movimiento',
  contador_reseteado: 'Contador reseteado',
  sin_config: 'Sin config',
  primer_registro: 'Primer registro',
  sin_datos: 'Sin datos',
};

const estadoStyle = (estado) => {
  switch (estado) {
    case 'ok': return { fill: STYLES.okFill, font: { color: { argb: BRAND.okText }, size: 10 } };
    case 'baja_entrega':
    case 'sobre_entrega': return { fill: STYLES.warningFill, font: { color: { argb: BRAND.warningText }, size: 10 } };
    case 'contador_reseteado':
    case 'sin_movimiento':
    case 'sin_config': return { fill: STYLES.criticalFill, font: { color: { argb: BRAND.criticalText }, size: 10 } };
    default: return { font: { size: 10 } };
  }
};

const toNumber = (x) => (x == null || Number.isNaN(Number(x)) ? null : Number(x));

const fmt = (x) => {
  const n = toNumber(x);
  return n == null ? null : Number(n.toFixed(2));
};

const round2 = (x) => (x == null ? null : Math.round(Number(x) * 100) / 100);

// ── HOJA 1: Resumen por máquina ─────────────────────────────────────────────
function buildResumenSheet(workbook, rollup, checklistTypeName) {
  const sheet = workbook.addWorksheet('Resumen por máquina', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 },
  });

  const columns = [
    { key: 'week_identifier', header: 'Semana', width: 14 },
    { key: 'fecha', header: 'Fecha', width: 14 },
    { key: 'machine_name', header: 'Máquina', width: 22 },
    { key: 'sections', header: 'Bloques', width: 9 },
    { key: 'jugadas_desde_ultima', header: 'Jugadas', width: 12 },
    { key: 'premios_desde_ultima', header: 'Premios entregados', width: 18 },
    { key: 'premios_esperados', header: 'Premios esperados', width: 18 },
    { key: 'eficiencia_pct', header: 'Eficiencia %', width: 13 },
    { key: 'estado', header: 'Estado', width: 18 },
    { key: 'contador_reseteado', header: 'Reset', width: 8 },
    { key: 'revisado', header: 'Revisado', width: 10 },
  ];

  applyColumnWidths(sheet, columns);
  sheet.columns = sheet.columns.map((col, idx) => ({ ...col, key: columns[idx].key }));

  addSheetBanner(sheet, {
    title: `Análisis de Premios — ${checklistTypeName || 'Checklist'}`,
    subtitle: 'Resumen semanal por máquina. Eficiencia = premios entregados / premios esperados (ratio configurado).',
    colSpan: columns.length,
  });

  const headerRow = 3;
  sheet.getRow(headerRow).values = columns.map((c) => c.header);
  styleHeaderRow(sheet, headerRow, columns.length, { rowHeight: 24 });

  const data = rollup.map((r) => ({
    week_identifier: r.week_identifier,
    fecha: r.fecha,
    machine_name: r.machine_name,
    sections: r.sections,
    jugadas_desde_ultima: round2(r.jugadas_desde_ultima),
    premios_desde_ultima: round2(r.premios_desde_ultima),
    premios_esperados: round2(r.premios_esperados),
    eficiencia_pct: round2(r.eficiencia_pct),
    estado: ESTADO_LABEL[r.estado] || r.estado || '',
    contador_reseteado: r.contador_reseteado ? 'Sí' : 'No',
    revisado: r.revisado ? 'Sí' : 'No',
  }));

  data.forEach((row, i) => {
    const rowNumber = headerRow + 1 + i;
    const excelRow = sheet.getRow(rowNumber);
    excelRow.values = columns.map((c) => row[c.key]);

    const estado = row.estado;
    const st = estadoStyle(estado);
    const estadoCell = excelRow.getCell(9);
    if (st.fill) estadoCell.fill = st.fill;
    estadoCell.font = st.font;
    estadoCell.alignment = { vertical: 'middle', horizontal: 'center' };

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.border) cell.border = STYLES.thinBorder;
      if (cell.font && !cell.font.size) cell.font = { size: 10 };
      if (cell.value !== null && typeof cell.value !== 'undefined') {
        cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left' };
      }
    });
  });

  applyZebra(sheet, headerRow + 1, headerRow + data.length, columns.length);

  const effCol = sheet.getColumn(8);
  effCol.numFmt = '0.0"%"';

  if (data.length > 0) {
    const last = headerRow + data.length;
    addDataBarFormatting(sheet, `H${headerRow + 1}:H${last}`, BRAND.barBlue);
    sheet.addConditionalFormatting({
      ref: `I${headerRow + 1}:I${last}`,
      rules: [
        { type: 'expression', formulae: ['$I4="OK"'], style: { fill: STYLES.okFill, font: { color: { argb: BRAND.okText } } } },
      ],
    });
  }

  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + Math.max(1, data.length), column: columns.length } };

  return sheet;
}

// ── HOJA 2: Detalle por sección ─────────────────────────────────────────────
function buildDetalleSheet(workbook, rows, checklistTypeName) {
  const sheet = workbook.addWorksheet('Detalle por sección', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 },
  });

  const columns = [
    { key: 'week_identifier', header: 'Semana', width: 14 },
    { key: 'fecha', header: 'Fecha', width: 14 },
    { key: 'section_key', header: 'Bloque / Sección', width: 26 },
    { key: 'item_number', header: 'N°', width: 7 },
    { key: 'machine_name', header: 'Máquina', width: 20 },
    { key: 'jugadas_lectura', header: 'Jugadas (contador)', width: 18 },
    { key: 'premios_lectura', header: 'Premios (contador)', width: 18 },
    { key: 'jugadas_desde_ultima', header: 'Jugadas desde última', width: 19 },
    { key: 'premios_desde_ultima', header: 'Premios entregados', width: 18 },
    { key: 'ratio_usado', header: 'Ratio (1 cada N)', width: 16 },
    { key: 'premios_esperados', header: 'Premios esperados', width: 18 },
    { key: 'eficiencia_pct', header: 'Eficiencia %', width: 13 },
    { key: 'estado', header: 'Estado', width: 18 },
    { key: 'config_section', header: 'Configuración de la máquina', width: 40 },
    { key: 'creator', header: 'Diligenciado por', width: 22 },
    { key: 'revisado_por', header: 'Revisado por', width: 22 },
    { key: 'revisado_en', header: 'Revisado el', width: 14 },
  ];

  applyColumnWidths(sheet, columns);
  sheet.columns = sheet.columns.map((col, idx) => ({ ...col, key: columns[idx].key }));

  addSheetBanner(sheet, {
    title: `Análisis de Premios — ${checklistTypeName || 'Checklist'}`,
    subtitle: 'Detalle por bloque/sección. El campo "Configuración de la máquina" es el texto libre diligenciado por el técnico.',
    colSpan: columns.length,
  });

  const headerRow = 3;
  sheet.getRow(headerRow).values = columns.map((c) => c.header);
  styleHeaderRow(sheet, headerRow, columns.length, { rowHeight: 24 });

  const data = rows.map((r) => ({
    week_identifier: r.week_identifier,
    fecha: r.fecha,
    section_key: r.section_key,
    item_number: r.item_number,
    machine_name: r.inspectable?.name ?? r.section_key,
    jugadas_lectura: round2(r.jugadas_lectura),
    premios_lectura: round2(r.premios_lectura),
    jugadas_desde_ultima: round2(r.jugadas_desde_ultima),
    premios_desde_ultima: round2(r.premios_desde_ultima),
    ratio_usado: round2(r.ratio_usado),
    premios_esperados: round2(r.premios_esperados),
    eficiencia_pct: round2(r.eficiencia_pct),
    estado: ESTADO_LABEL[r.estado] || r.estado || '',
    config_section: r.config_section || '',
    creator: r.creator?.user_name ?? null,
    revisado_por: r.reviewer?.user_name ?? null,
    revisado_en: r.revisado_en ?? null,
  }));

  data.forEach((row, i) => {
    const rowNumber = headerRow + 1 + i;
    const excelRow = sheet.getRow(rowNumber);
    excelRow.values = columns.map((c) => row[c.key]);

    const st = estadoStyle(row.estado);
    const estadoCell = excelRow.getCell(13);
    if (st.fill) estadoCell.fill = st.fill;
    estadoCell.font = st.font;
    estadoCell.alignment = { vertical: 'middle', horizontal: 'center' };

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.border) cell.border = STYLES.thinBorder;
      if (cell.value !== null && typeof cell.value !== 'undefined') {
        cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left', wrapText: true };
      }
    });

    const configCell = excelRow.getCell(14);
    configCell.font = { size: 10 };
  });

  applyZebra(sheet, headerRow + 1, headerRow + data.length, columns.length);

  const effCol = sheet.getColumn(12);
  effCol.numFmt = '0.0"%"';

  if (data.length > 0) {
    const last = headerRow + data.length;
    addDataBarFormatting(sheet, `L${headerRow + 1}:L${last}`, BRAND.barBlue);
  }

  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + Math.max(1, data.length), column: columns.length } };

  return sheet;
}

// ── BUILDER PRINCIPAL ───────────────────────────────────────────────────────
async function buildPremiosWorkbook({ checklistTypeName, rows, rollup }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Alist Andino';
  workbook.created = new Date();

  buildResumenSheet(workbook, rollup || [], checklistTypeName);
  buildDetalleSheet(workbook, rows || [], checklistTypeName);

  return workbook;
}

module.exports = {
  buildPremiosWorkbook,
  ESTADO_LABEL,
};
