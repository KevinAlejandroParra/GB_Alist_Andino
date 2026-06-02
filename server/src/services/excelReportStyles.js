'use strict';

/** Estilos y utilidades compartidas para reportes Excel del libro de fallas */

// ── PALETA ──────────────────────────────────────────────────────────────────
// Azul marino oscuro como color principal, gris carbón para texto,
// acentos naranja (alertas) y teal (positivo). Sin morado.
const BRAND = {
  // Encabezados / banners
  headerBg:     'FF1E3A5F',   // azul marino oscuro
  headerBg2:    'FF162D4A',   // azul marino más oscuro (subtítulo)
  headerFont:   'FFFFFFFF',   // blanco

  // Texto
  textDark:     'FF1F2937',   // gris carbón
  textMuted:    'FF6B7280',   // gris medio
  textLight:    'FF9CA3AF',   // gris claro (pie de página)

  // Bordes
  border:       'FFD1D5DB',   // gris claro
  borderMed:    'FF9CA3AF',   // gris medio

  // Superficies
  surface:      'FFF8FAFC',   // blanco humo
  surfaceAlt:   'FFEFF4FA',   // azul muy pálido (zebra)

  // Semáforo
  critical:     'FFFEE2E2',   // rojo pálido
  criticalText: 'FFB91C1C',   // rojo oscuro
  criticalBar:  'FFEF4444',   // rojo vivo (barras)
  warning:      'FFFEF3C7',   // amarillo pálido
  warningText:  'FFB45309',   // ámbar oscuro
  warningBar:   'FFF59E0B',   // ámbar vivo
  ok:           'FFD1FAE5',   // verde pálido
  okText:       'FF065F46',   // verde oscuro
  okBar:        'FF10B981',   // teal vivo

  // Secciones
  sectionBg:    'FFEFF4FA',   // azul muy pálido
  sectionAccent:'FF1E3A5F',   // azul marino (borde izquierdo)

  // Técnicos
  techBg:       'FFECFDF5',   // verde muy pálido
  techHeader:   'FF0F766E',   // teal oscuro

  // Barras de gráfica (distintas por sección)
  barRed:       'FFEF4444',
  barAmber:     'FFF59E0B',
  barBlue:      'FF3B82F6',
  barTeal:      'FF14B8A6',
  barOrange:    'FFF97316',
  barGreen:     'FF22C55E'
};

const STYLES = {
  headerFill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } },
  headerFont:   { bold: true, color: { argb: BRAND.headerFont }, size: 10 },
  titleFont:    { bold: true, size: 17, color: { argb: BRAND.headerFont } },
  bannerFill:   { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg } },
  altFill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.surfaceAlt } },
  criticalFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.critical } },
  warningFill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.warning } },
  okFill:       { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.ok } },
  thinBorder: {
    top:    { style: 'thin', color: { argb: BRAND.border } },
    left:   { style: 'thin', color: { argb: BRAND.border } },
    bottom: { style: 'thin', color: { argb: BRAND.border } },
    right:  { style: 'thin', color: { argb: BRAND.border } }
  }
};

// ── HELPERS DE GRÁFICAS ──────────────────────────────────────────────────────

/** Barra de bloques sólidos (█) — ancho fijo, proporcional al valor */
function visualBar(value, max, width = 20) {
  const safeMax = max > 0 ? max : 1;
  const filled = Math.min(width, Math.max(0, Math.round((value / safeMax) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Barra de bloques con gradiente de caracteres (▏▎▍▌▋▊▉█) */
function visualBarGradient(value, max, width = 18) {
  const blocks = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(1, value / safeMax);
  const totalEighths = Math.round(ratio * width * 8);
  const full = Math.floor(totalEighths / 8);
  const partial = totalEighths % 8;
  const empty = width - full - (partial > 0 ? 1 : 0);
  return '█'.repeat(full) + (partial > 0 ? blocks[partial] : '') + '░'.repeat(Math.max(0, empty));
}

/** Sparkline de puntos para tendencia (usa caracteres ▁▂▃▄▅▆▇█) */
function sparkline(values) {
  if (!values || values.length === 0) return '';
  const bars = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const max = Math.max(...values, 1);
  return values.map((v) => bars[Math.min(8, Math.round((v / max) * 8))]).join('');
}

// ── HELPERS DE HOJA ──────────────────────────────────────────────────────────

function styleHeaderRow(sheet, rowNumber, colCount, { rowHeight = 40 } = {}) {
  const row = sheet.getRow(rowNumber);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = STYLES.headerFill;
    cell.font = STYLES.headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = STYLES.thinBorder;
  }
  row.height = rowHeight;
}

function applyColumnWidths(sheet, columnDefs) {
  columnDefs.forEach((def, index) => {
    const col = sheet.getColumn(index + 1);
    col.width = def.width || 14;
    if (def.key) col.key = def.key;
  });
}

function applyZebra(sheet, startRow, endRow, colCount) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      for (let c = 1; c <= colCount; c++) {
        const cell = sheet.getRow(r).getCell(c);
        // Solo aplicar zebra si la celda no tiene fill propio (semáforo)
        if (!cell.fill || cell.fill.fgColor?.argb === BRAND.surface || !cell.fill.fgColor) {
          cell.fill = STYLES.altFill;
        }
      }
    }
  }
}

/**
 * Banner de hoja — cubre TODAS las columnas reales de la tabla.
 * colSpan debe ser columns.length, no un valor fijo.
 */
function addSheetBanner(sheet, { title, subtitle, colSpan }) {
  // Fila 1: título
  sheet.mergeCells(1, 1, 1, colSpan);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = STYLES.titleFont;
  titleCell.fill = STYLES.bannerFill;
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 38;

  // Fila 2: subtítulo
  if (subtitle) {
    sheet.mergeCells(2, 1, 2, colSpan);
    const sub = sheet.getCell(2, 1);
    sub.value = subtitle;
    sub.font = { size: 10, italic: true, color: { argb: 'FFBFDBFE' } };
    sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.headerBg2 } };
    sub.alignment = { horizontal: 'center', wrapText: true };
    sheet.getRow(2).height = 20;
  }
}

function addDataBarFormatting(sheet, ref, colorArgb = BRAND.barBlue) {
  try {
    sheet.addConditionalFormatting({
      ref,
      rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: colorArgb } }]
    });
  } catch (err) {
    console.warn('No se pudo aplicar dataBar:', err.message);
  }
}

// styleKpiBlock se mantiene por compatibilidad pero ya no se usa en el dashboard nuevo
function styleKpiBlock(sheet, startRow, startCol, label, value, { fillArgb } = {}) {
  const labelCell = sheet.getCell(startRow, startCol);
  const valueCell = sheet.getCell(startRow + 1, startCol);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 9, color: { argb: BRAND.textMuted } };
  valueCell.value = value;
  valueCell.font = { bold: true, size: 16, color: { argb: BRAND.headerBg } };
  [labelCell, valueCell].forEach((cell) => {
    cell.border = STYLES.thinBorder;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    if (fillArgb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
  });
  sheet.mergeCells(startRow, startCol, startRow, startCol + 1);
  sheet.mergeCells(startRow + 1, startCol, startRow + 1, startCol + 1);
}

module.exports = {
  BRAND,
  STYLES,
  visualBar,
  visualBarGradient,
  sparkline,
  styleHeaderRow,
  applyColumnWidths,
  applyZebra,
  addSheetBanner,
  addDataBarFormatting,
  styleKpiBlock
};
