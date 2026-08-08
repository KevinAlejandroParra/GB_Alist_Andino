/**
 * recompute-premios-analisis.js
 *
 * Recalcula el análisis de premios (premios_analisis) para todo el histórico del
 * checklist de premios (checklist_type_id=2), o para una semana específica.
 *
 * El cálculo es por BLOQUE/SECCIÓN y usa la configuración maestra (premios_config).
 * Es idempotente: re-ejecutarlo no duplica filas (clave checklist_id + section_key).
 *
 * Modos de uso:
 *   node scripts/recompute-premios-analisis.js                       # Solo diagnóstico
 *   node scripts/recompute-premios-analisis.js --fix                 # Recalcula todo el histórico
 *   node scripts/recompute-premios-analisis.js --fix --week=2026-W32 # Recalcula una semana
 */

const { connection, Sequelize } = require('../src/models');
const premiosAnalyticsService = require('../src/services/premiosAnalyticsService');

const CHECKLIST_TYPE_ID = 2;

const APPLY_FIX = process.argv.includes('--fix');
const weekArg = process.argv.find((a) => a.startsWith('--week='));
const TARGET_WEEK = weekArg ? weekArg.split('=')[1] : null;

const log = {
  info: (msg)    => console.log(`ℹ️  ${msg}`),
  ok:   (msg)    => console.log(`✅ ${msg}`),
  warn: (msg)    => console.log(`⚠️  ${msg}`),
  err:  (msg)    => console.log(`❌ ${msg}`),
  head: (msg)    => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
};

async function diagnose() {
  log.head('DIAGNÓSTICO: Análisis de Premios');

  const configCount = await connection.query(
    `SELECT COUNT(*) AS total FROM premios_config WHERE checklist_type_id = ?`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  const configRows = configCount[0][0];
  log.info(`Configuraciones maestras (premios_config): ${configRows.total}`);
  if (Number(configRows.total) === 0) {
    log.warn('  No hay configuraciones registradas. Sin ratio, el análisis no podrá calcular eficiencia.');
  }

  const weeksResult = await connection.query(
    `SELECT week_identifier, COUNT(*) AS checklists
     FROM checklists
     WHERE checklist_type_id = ? AND week_identifier IS NOT NULL
     GROUP BY week_identifier
     ORDER BY week_identifier ASC`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  const weeks = weeksResult[0];
  log.info(`Semanas con checklists (${weeks.length}):`);
  weeks.forEach((w) => log.info(`  - ${w.week_identifier}: ${w.checklists} checklists`));

  const analysisResult = await connection.query(
    `SELECT week_identifier, COUNT(*) AS rows
     FROM premios_analisis
     WHERE checklist_type_id = ?
     GROUP BY week_identifier
     ORDER BY week_identifier ASC`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  const analysis = analysisResult[0];
  log.info(`\nFilas de análisis existentes (${analysis.length} semanas):`);
  analysis.forEach((a) => log.info(`  - ${a.week_identifier}: ${a.rows} bloques`));

  if (TARGET_WEEK) log.info(`\nSemana objetivo: ${TARGET_WEEK}`);
}

async function applyFix() {
  log.head('APLICANDO RECÁLCULO');

  const t = await connection.transaction();

  try {
    // 1. Limpiar filas huérfanas (checklists eliminados o de otro tipo)
    log.info('\n[1/3] Limpiando filas de análisis huérfanas...');
    const [cleanupResult] = await connection.query(
      `DELETE pa FROM premios_analisis pa
       LEFT JOIN checklists c ON c.checklist_id = pa.checklist_id
       WHERE pa.checklist_type_id = ?
         AND (c.checklist_id IS NULL OR c.checklist_type_id != ?)`,
      { replacements: [CHECKLIST_TYPE_ID, CHECKLIST_TYPE_ID], transaction: t }
    );
    log.ok(`  Filas huérfanas eliminadas: ${cleanupResult.affectedRows || 0}`);

    // 2. Recalcular (todo el histórico o una semana)
    log.info('\n[2/3] Recalculando análisis...');
    let result;
    if (TARGET_WEEK) {
      result = await premiosAnalyticsService.updatePremiosAnalysis({
        checklistTypeId: CHECKLIST_TYPE_ID,
        weekIdentifier: TARGET_WEEK,
        createdBy: null,
        transaction: t,
      });
      log.ok(`  Semana ${TARGET_WEEK}: ${result.analyzed} bloques actualizados.`);
    } else {
      result = await premiosAnalyticsService.recomputePremiosHistory(CHECKLIST_TYPE_ID, { transaction: t });
      log.ok(`  Histórico recalculado: ${result.weeks} semanas, ${result.analyzed} bloques actualizados.`);
    }

    // 3. Reporte final
    log.info('\n[3/3] Reporte final...');
    const summary = await connection.query(
      `SELECT estado, COUNT(*) AS total
       FROM premios_analisis
       WHERE checklist_type_id = ?
       GROUP BY estado
       ORDER BY total DESC`,
      { replacements: [CHECKLIST_TYPE_ID], transaction: t }
    );
    summary[0].forEach((s) => log.info(`  - ${s.estado}: ${s.total}`));

    await t.commit();
    log.head('RECÁLCULO COMPLETADO');
  } catch (error) {
    await t.rollback();
    log.err(`Error durante el recálculo: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
}

(async () => {
  try {
    if (APPLY_FIX) {
      await applyFix();
    } else {
      await diagnose();
      log.warn('\nModo lectura. Para aplicar cambios ejecuta con --fix');
      log.info('Uso: node scripts/recompute-premios-analisis.js --fix [--week=YYYY-Wxx]');
    }
    process.exit(0);
  } catch (error) {
    log.err(`Error fatal: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
})();
