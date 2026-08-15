/**
* fix-premios-weekly.js
*
* Corrige la cadencia del checklist de Premios:
*  - Pone frequency='semanal' en checklist_types (el seed lo define como semanal,
*    pero la BD quedó con 'diario', por lo que los checklists se creaban sin
*    week_identifier y el análisis semanal no encontraba datos).
*  - Asigna week_identifier a los checklists existentes según su createdAt.
*  - Deduplica si por la cadencia diaria se crearon varias filas por máquina en
*    la misma semana (conserva la más reciente y reasigna sus respuestas).
*  - Recalcula el análisis de premios.
*
* Modos de uso:
*   node scripts/fix-premios-weekly.js                 # Solo diagnóstico
*   node scripts/fix-premios-weekly.js --fix           # Aplica los cambios
*/

const { connection } = require('../src/models');
const weekUtils = require('../src/utils/weekUtils');
const premiosAnalyticsService = require('../src/services/premiosAnalyticsService');

const CHECKLIST_TYPE_ID = 2;

const APPLY_FIX = process.argv.includes('--fix');

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  ok: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  err: (msg) => console.log(`❌ ${msg}`),
  head: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
};

async function diagnose() {
  log.head('DIAGNÓSTICO: Cadencia del checklist de Premios');

  const [typeRows] = await connection.query(
    `SELECT checklist_type_id, name, type_category, frequency
     FROM checklist_types WHERE checklist_type_id = ?`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  const type = typeRows[0];
  if (!type) {
    log.err(`No existe el checklist_type_id=${CHECKLIST_TYPE_ID}.`);
    return;
  }
  log.info(`Tipo: ${type.name}`);
  log.info(`type_category: ${type.type_category} | frequency actual: ${type.frequency}`);

  const weekly = (type.frequency || '').toLowerCase().trim() === 'weekly'
    || (type.frequency || '').toLowerCase().trim() === 'semanal';
  log.info(weekly ? 'Cadencia detectada: SEMANAL (correcta)' : 'Cadencia detectada: DIARIA (debe ser semanal)');

  const [weeks] = await connection.query(
    `SELECT week_identifier, COUNT(*) AS checklists
     FROM checklists WHERE checklist_type_id = ?
     GROUP BY week_identifier ORDER BY week_identifier ASC`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  log.info(`Checklists existentes por semana (${weeks.length} grupos):`);
  weeks.forEach((w) => log.info(`  - ${w.week_identifier ?? 'NULL'}: ${w.checklists} checklists`));

  const [nullCount] = await connection.query(
    `SELECT COUNT(*) AS total FROM checklists
     WHERE checklist_type_id = ? AND (week_identifier IS NULL OR week_identifier = '')`,
    { replacements: [CHECKLIST_TYPE_ID] }
  );
  log.info(`Checklists sin week_identifier: ${nullCount[0].total}`);
}

async function applyFix() {
  const t = await connection.transaction();
  try {
    log.head('APLICANDO CORRECCIÓN');

    // 1. Asegurar cadencia semanal
    log.info('\n[1/4] Asegurando frequency="semanal"...');
    const [typeRows] = await connection.query(
      `SELECT checklist_type_id, name, frequency FROM checklist_types WHERE checklist_type_id = ?`,
      { replacements: [CHECKLIST_TYPE_ID], transaction: t }
    );
    const type = typeRows[0];
    if (!type) throw new Error(`No existe el checklist_type_id=${CHECKLIST_TYPE_ID}`);

    const isWeekly = ['weekly', 'semanal'].includes((type.frequency || '').toLowerCase().trim());
    if (!isWeekly) {
      await connection.query(
        `UPDATE checklist_types SET frequency = 'semanal', updatedAt = NOW() WHERE checklist_type_id = ?`,
        { replacements: [CHECKLIST_TYPE_ID], transaction: t }
      );
      log.ok(`  frequency cambiado de "${type.frequency}" a "semanal".`);
    } else {
      log.ok('  frequency ya era "semanal".');
    }

    // Referencia del tipo para calcular semanas (frequency ya semanal)
    const checklistType = {
      frequency: 'semanal',
      type_category: type.type_category,
    };

    // 2. Asignar week_identifier a los checklists sin semana
    log.info('\n[2/4] Asignando week_identifier a checklists existentes...');
    const [noWeek] = await connection.query(
      `SELECT checklist_id, inspectable_id, createdAt
       FROM checklists
       WHERE checklist_type_id = ?
         AND (week_identifier IS NULL OR week_identifier = '')
       ORDER BY createdAt ASC`,
      { replacements: [CHECKLIST_TYPE_ID], transaction: t }
    );

    if (noWeek.length === 0) {
      log.ok('  No hay checklists sin semana.');
    } else {
      log.info(`  Se procesarán ${noWeek.length} checklists...`);
      for (const c of noWeek) {
        const { identifier } = weekUtils.getDateBoundsForChecklistType(checklistType, new Date(c.createdAt));
        if (!identifier) continue;
        await connection.query(
          `UPDATE checklists SET week_identifier = ?, updatedAt = NOW() WHERE checklist_id = ?`,
          { replacements: [identifier, c.checklist_id], transaction: t }
        );
      }
      log.ok(`  week_identifier asignado a ${noWeek.length} checklists.`);
    }

    // 3. Deduplicar por (inspectable_id, semana): conservar la fila más reciente
    log.info('\n[3/4] Deduplicando filas por máquina/semana...');
    const [groups] = await connection.query(
      `SELECT c.week_identifier, c.inspectable_id, c.checklist_id, c.createdAt,
              (SELECT COUNT(*) FROM checklist_responses cr WHERE cr.checklist_id = c.checklist_id) AS num_respuestas
       FROM checklists c
       WHERE c.checklist_type_id = ?
         AND c.week_identifier IS NOT NULL
         AND c.week_identifier != ''
         AND c.inspectable_id IS NOT NULL
       ORDER BY c.week_identifier ASC, c.inspectable_id ASC, num_respuestas DESC, c.createdAt DESC`,
      { replacements: [CHECKLIST_TYPE_ID], transaction: t }
    );

    const keptIds = new Set();
    const seen = new Set();
    let movedResponses = 0;
    let deletedRows = 0;

    for (const g of groups) {
      const key = `${g.week_identifier}|${g.inspectable_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        keptIds.add(g.checklist_id);
        continue;
      }
      // Duplicado: reasignar sus respuestas a la fila conservada
      const [firstOfKey] = groups.filter((x) => `${x.week_identifier}|${x.inspectable_id}` === key);
      const keepId = firstOfKey.checklist_id;
      await connection.query(
        `UPDATE checklist_responses SET checklist_id = ? WHERE checklist_id = ?`,
        { replacements: [keepId, g.checklist_id], transaction: t }
      );
      await connection.query(
        `UPDATE premios_analisis SET checklist_id = ? WHERE checklist_id = ?`,
        { replacements: [keepId, g.checklist_id], transaction: t }
      );
      await connection.query(
        `DELETE FROM checklists WHERE checklist_id = ?`,
        { replacements: [g.checklist_id], transaction: t }
      );
      movedResponses += g.num_respuestas || 0;
      deletedRows++;
    }

    if (deletedRows === 0) {
      log.ok('  Sin duplicados: una fila por máquina/semana.');
    } else {
      log.ok(`  ${deletedRows} duplicado(s) eliminados, ${movedResponses} respuestas reasignadas.`);
    }

    // 4. Recalcular el análisis
    log.info('\n[4/4] Recalculando análisis de premios...');
    const result = await premiosAnalyticsService.recomputePremiosHistory(CHECKLIST_TYPE_ID, { transaction: t });
    log.ok(`  Histórico recalculado: ${result.weeks} semanas, ${result.analyzed} bloques analizados.`);

    await t.commit();
    log.head('CORRECCIÓN COMPLETADA');
  } catch (error) {
    await t.rollback();
    log.err(`Error durante la corrección: ${error.message}`);
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
      log.warn('\nModo lectura. Para aplicar los cambios ejecuta con --fix');
    }
    process.exit(0);
  } catch (error) {
    log.err(`Error fatal: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
})();
