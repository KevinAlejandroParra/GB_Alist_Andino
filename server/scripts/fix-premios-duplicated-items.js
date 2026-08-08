/**
 * fix-premios-duplicated-items.js
 *
 * Limpia el template del checklist semanal de Premios (checklist_type_id=2):
 *
 *   1. Elimina los items padre legacy duplicados "TOY BOX 1".."TOY BOX 4" (y sus hijos)
 *      que quedaron de la estructura original (seeder apoyo-tecnico-premios.js) junto a los
 *      nuevos "TOY BOX - SECCION 1..4" creados por fix-premios-weekly-checklist.js.
 *      Esto elimina la duplicación de bloques TOY BOX en el PDF.
 *
 *   2. Corrige el item_number de WORK ZONE a "7" (y sus hijos a "7.x").
 *      El item existía con item_number "6" (del seeder original) y fix-premios-weekly-checklist.js
 *      solo asigna item_number al crear items nuevos, así que quedó en "6" y chocaba con TOY FAMILY.
 *
 *   3. Backfill de inspectable_id en respuestas de premios guardadas con NULL
 *      (regresión previa: submitResponses guardaba inspectable_id=null para type_category 'specific',
 *      lo que rompía el armado de respuestas en form y PDF).
 *
 * El script es idempotente: re-ejecutarlo no rompe nada.
 *
 * Modos de uso:
 *   node scripts/fix-premios-duplicated-items.js          # Solo diagnóstico (read-only)
 *   node scripts/fix-premios-duplicated-items.js --fix    # Aplica cambios
 */

const { Sequelize, connection } = require('../src/models');
const {
  ChecklistType,
  ChecklistItem,
  ChecklistResponse,
} = require('../src/models');

const CHECKLIST_TYPE_ID = 2;

const APPLY_FIX = process.argv.includes('--fix');

// Regex de items legacy duplicados: "TOY BOX 1", "TOY BOX 2", ... (sin "SECCION" y con número al final)
const LEGACY_TOY_BOX_RE = /^TOY BOX \d+$/;

const log = {
  info: (msg)    => console.log(`ℹ️  ${msg}`),
  ok:   (msg)    => console.log(`✅ ${msg}`),
  warn: (msg)    => console.log(`⚠️  ${msg}`),
  err:  (msg)    => console.log(`❌ ${msg}`),
  head: (msg)    => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
};

const readOnly = () => {
  log.warn('Modo lectura. Para aplicar cambios ejecuta con --fix');
  log.info('Uso: node scripts/fix-premios-duplicated-items.js --fix');
};

const loadTemplate = async () => {
  const items = await ChecklistItem.findAll({
    where: { checklist_type_id: CHECKLIST_TYPE_ID },
    order: [['checklist_item_id', 'ASC']],
  });
  const parents = items.filter(i => i.parent_item_id === null);
  const children = items.filter(i => i.parent_item_id !== null);
  return { items, parents, children };
};

const getLegacyToyBox = (parents) =>
  parents.filter(p => LEGACY_TOY_BOX_RE.test(String(p.question_text).trim().toUpperCase()));

const getLegacyIds = (legacyParents, children) => {
  const ids = new Set(legacyParents.map(p => p.checklist_item_id));
  children
    .filter(c => legacyParents.some(p => p.checklist_item_id === c.parent_item_id))
    .forEach(c => ids.add(c.checklist_item_id));
  return [...ids];
};

// ============================================================
// Diagnóstico
// ============================================================
async function diagnose() {
  log.head('DIAGNÓSTICO: Items duplicados del checklist de Premios');

  const checklistType = await ChecklistType.findByPk(CHECKLIST_TYPE_ID);
  if (!checklistType) {
    log.err(`ChecklistType ${CHECKLIST_TYPE_ID} no encontrado. Abortando.`);
    process.exit(1);
  }
  log.info(`ChecklistType: "${checklistType.name}"`);

  const { parents, children } = await loadTemplate();

  log.info(`\nItems padre del template (${parents.length}):`);
  parents.forEach(p => log.info(`  * [${p.item_number}] ${p.question_text} (id=${p.checklist_item_id})`));

  const legacy = getLegacyToyBox(parents);
  log.info(`\nItems legacy duplicados detectados ("TOY BOX N"): ${legacy.length}`);
  legacy.forEach(p => {
    const kids = children.filter(c => c.parent_item_id === p.checklist_item_id);
    log.warn(`  - [${p.item_number}] "${p.question_text}" (id=${p.checklist_item_id}) con ${kids.length} hijos`);
  });

  if (legacy.length === 0) {
    log.ok('No hay items legacy duplicados — punto 1 no requiere acción.');
  }

  const legacyIds = getLegacyIds(legacy, children);
  const orphanResponses = legacyIds.length > 0
    ? await ChecklistResponse.findAll({ where: { checklist_item_id: { [Sequelize.Op.in]: legacyIds } } })
    : [];
  log.info(`\nRespuestas que referencian items legacy (se eliminarán con --fix): ${orphanResponses.length}`);

  const workZone = parents.find(p => String(p.question_text).trim().toUpperCase() === 'WORK ZONE');
  if (workZone) {
    const wzChildren = children.filter(c => c.parent_item_id === workZone.checklist_item_id);
    log.info(`\nWORK ZONE: item_number="${workZone.item_number}" (esperado "7")`);
    wzChildren.forEach(c => log.info(`  - hijo [${c.item_number}] ${c.question_text}`));
    if (workZone.item_number !== '7') {
      log.warn('  ⚠️  WORK ZONE NO tiene item_number "7" — se corregirá con --fix.');
    }
  } else {
    log.warn('\nWORK ZONE no encontrado como item padre.');
  }

  const nullResponses = await ChecklistResponse.findAll({
    include: [{ association: 'checklist', where: { checklist_type_id: CHECKLIST_TYPE_ID }, required: true }],
    where: { inspectable_id: null },
  });
  log.info(`\nRespuestas de premios con inspectable_id NULL (backfill con --fix): ${nullResponses.length}`);

  const needsFix =
    legacy.length > 0 ||
    (workZone && workZone.item_number !== '7') ||
    nullResponses.length > 0;

  log.head('RECOMENDACIÓN');
  if (needsFix) {
    log.warn('Se detectaron inconsistencias. Ejecuta con --fix para reparar.');
  } else {
    log.ok('Estructura correcta. No requiere cambios.');
  }
}

// ============================================================
// Aplicar fixes
// ============================================================
async function applyFixes() {
  log.head('APLICANDO FIXES');

  const t = await connection.transaction();

  try {
    const { parents, children } = await loadTemplate();

    // ------------------------------------------------------------
    // 1. Eliminar items legacy duplicados "TOY BOX 1..4" + sus hijos + respuestas huérfanas
    // ------------------------------------------------------------
    log.info('\n[1/3] Eliminando items legacy duplicados "TOY BOX N"...');
    const legacy = getLegacyToyBox(parents);

    if (legacy.length === 0) {
      log.ok('  No hay items legacy — no-op');
    } else {
      const legacyIds = getLegacyIds(legacy, children);
      const orphanResponses = await ChecklistResponse.findAll({
        where: { checklist_item_id: { [Sequelize.Op.in]: legacyIds } },
        transaction: t,
      });
      for (const r of orphanResponses) {
        await r.destroy({ transaction: t });
      }
      log.warn(`  Eliminadas ${orphanResponses.length} respuestas que apuntaban a items legacy.`);

      // Borrar hijos primero y luego padres (evita huérfanos si el CASCADE de FK no aplicara)
      for (const p of legacy) {
        for (const c of children.filter(ch => ch.parent_item_id === p.checklist_item_id)) {
          await c.destroy({ transaction: t });
        }
        await p.destroy({ transaction: t });
        log.ok(`  Eliminado: "${p.question_text}" (id=${p.checklist_item_id}) con sus hijos`);
      }
    }

    // ------------------------------------------------------------
    // 2. Corregir item_number de WORK ZONE -> "7" y sus hijos -> "7.x"
    // ------------------------------------------------------------
    log.info('\n[2/3] Corrigiendo item_number de WORK ZONE...');
    const workZone = parents.find(p => String(p.question_text).trim().toUpperCase() === 'WORK ZONE');
    if (!workZone) {
      log.warn('  WORK ZONE no encontrado — no-op');
    } else if (workZone.item_number === '7') {
      log.ok('  WORK ZONE ya tiene item_number "7" — no-op');
    } else {
      const oldNumber = workZone.item_number;
      await workZone.update({ item_number: '7' }, { transaction: t });
      log.ok(`  WORK ZONE re-numerado: "${oldNumber}" -> "7"`);

      const wzChildren = children.filter(c => c.parent_item_id === workZone.checklist_item_id);
      for (const c of wzChildren) {
        if (String(c.item_number).startsWith('6.')) {
          const oldChildNumber = c.item_number;
          const newNumber = `7${String(oldChildNumber).slice(1)}`;
          await c.update({ item_number: newNumber }, { transaction: t });
          log.ok(`    Hijo re-numerado: "${oldChildNumber}" -> "${newNumber}" (${c.question_text})`);
        }
      }
    }

    // ------------------------------------------------------------
    // 3. Backfill de inspectable_id en respuestas de premios con NULL
    // ------------------------------------------------------------
    log.info('\n[3/3] Backfill de inspectable_id en respuestas de premios...');
    const [backfillResult] = await connection.query(
      `UPDATE checklist_responses r
       INNER JOIN checklists c ON c.checklist_id = r.checklist_id
       SET r.inspectable_id = c.inspectable_id
       WHERE r.inspectable_id IS NULL
         AND c.checklist_type_id = ?
         AND c.inspectable_id IS NOT NULL`,
      { replacements: [CHECKLIST_TYPE_ID], transaction: t }
    );
    const backfilled = backfillResult.affectedRows || 0;
    log.ok(`  Respuestas actualizadas: ${backfilled}`);

    await t.commit();
    log.head('FIX COMPLETADO');
    log.ok('Estructura del template de Premios limpia: 7 bloques (TOY BOX - SECCION 1..4, TOY BOX XL, TOY FAMILY, WORK ZONE).');
    log.info('Próximo paso: reiniciar el backend y probar form + descarga de PDF.');
  } catch (error) {
    await t.rollback();
    log.err(`Error durante el fix: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
}

// ============================================================
// Entry point
// ============================================================
(async () => {
  try {
    if (APPLY_FIX) {
      await applyFixes();
    } else {
      await diagnose();
      readOnly();
    }
    process.exit(0);
  } catch (error) {
    log.err(`Error fatal: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
})();
