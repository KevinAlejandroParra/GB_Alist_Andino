/**
 * fix-premios-weekly-checklist.js
 *
 * Repara la estructura necesaria para que el checklist semanal de Premios
 * (checklist_type_id=2) funcione correctamente: 4 inspectables (una por máquina
 * física) y 7 items padre en el template (uno por bloque/sección), con sus
 * sub-items JUGADAS / PREMIOS / CONFIGURACION DE LA MAQUINA.
 *
 * Modos de uso:
 *   node scripts/fix-premios-weekly-checklist.js          # Solo diagnóstico (read-only)
 *   node scripts/fix-premios-weekly-checklist.js --fix    # Aplica cambios
 *
 * El script es idempotente: re-ejecutarlo no duplica datos. No borra filas existentes.
 *
 * Contexto de negocio (confirmado por administradores del parque):
 *   - TOY BOX 4P MINI  (ins_id 84, existe) — máquina con 4 secciones/garras, cada
 *                                          una con su propio contador
 *   - TOY BOX XL       (ins_id 85, renombrar desde "TOY BOX SINGLE XL") — 1 contador
 *   - TOY FAMILY       (NUEVA, no existe) — entrega peluches y dulces, 1 contador
 *   - WORK ZONE        (ins_id 86, existe) — entrega pelotas de emojis, 1 contador
 *
 * 7 bloques (items padre) en el form semanal:
 *   1. TOY BOX - SECCION 1
 *   2. TOY BOX - SECCION 2
 *   3. TOY BOX - SECCION 3
 *   4. TOY BOX - SECCION 4
 *   5. TOY BOX XL
 *   6. TOY FAMILY
 *   7. WORK ZONE
 *
 * Cada bloque tiene 3 hijos: JUGADAS, PREMIOS, CONFIGURACION DE LA MAQUINA.
 */

const { Sequelize, connection } = require('../src/models');
const {
  Checklist,
  ChecklistType,
  ChecklistItem,
  Inspectable,
  Device,
  Family,
  Premise,
} = require('../src/models');

const CHECKLIST_TYPE_ID = 2;

// Inspectables objetivo (4 máquinas físicas reales)
const TARGET_INSPECTABLES = [
  { ins_id: 84, expected_name: 'TOY BOX 4P MINI',  role: 'parent', parent_block: 'TOY BOX 4P MINI', section_count: 4 },
  { ins_id: 85, expected_name: 'TOY BOX XL',       role: 'rename_from', rename_from: 'TOY BOX SINGLE XL', rename_to: 'TOY BOX XL', section_count: 1 },
  { ins_id: null, expected_name: 'TOY FAMILY',     role: 'create', section_count: 1 },
  { ins_id: 86, expected_name: 'WORK ZONE',        role: 'parent', parent_block: 'WORK ZONE', section_count: 1 },
];

// Bloques padre que se crearán/verificarán en el template
const PARENT_BLOCKS = [
  { name: 'TOY BOX - SECCION 1', item_number: '1', inspectable_ins_id: 84 },
  { name: 'TOY BOX - SECCION 2', item_number: '2', inspectable_ins_id: 84 },
  { name: 'TOY BOX - SECCION 3', item_number: '3', inspectable_ins_id: 84 },
  { name: 'TOY BOX - SECCION 4', item_number: '4', inspectable_ins_id: 84 },
  { name: 'TOY BOX XL',          item_number: '5', inspectable_ins_id: 85 },
  { name: 'TOY FAMILY',          item_number: '6', inspectable_ins_id: null }, // se resuelve después
  { name: 'WORK ZONE',           item_number: '7', inspectable_ins_id: 86 },
];

const CHILD_ITEMS = [
  { name: 'JUGADAS',                      input_type: 'number',  allow_comment: false },
  { name: 'PREMIOS',                      input_type: 'number',  allow_comment: false },
  { name: 'CONFIGURACION DE LA MAQUINA',  input_type: 'text',    allow_comment: true  },
];

const APoyo_FAMILY_ID = 4; // family_id para APOYO según 8-seedTestDevices.js
const DEFAULT_PREMISE_ID = 2;

const APPLY_FIX = process.argv.includes('--fix');

// ============================================================
// Utilidades de logging
// ============================================================
const log = {
  info: (msg)    => console.log(`ℹ️  ${msg}`),
  ok:   (msg)    => console.log(`✅ ${msg}`),
  warn: (msg)    => console.log(`⚠️  ${msg}`),
  err:  (msg)    => console.log(`❌ ${msg}`),
  head: (msg)    => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
};

const readOnly = () => {
  log.warn('Modo lectura. Para aplicar cambios ejecuta con --fix');
  log.info('Uso: node scripts/fix-premios-weekly-checklist.js --fix');
};

// ============================================================
// Diagnóstico
// ============================================================
async function diagnose() {
  log.head('DIAGNÓSTICO: Checklist semanal de Premios');

  // 1. Estado del ChecklistType
  const checklistType = await ChecklistType.findByPk(CHECKLIST_TYPE_ID);
  if (!checklistType) {
    log.err(`ChecklistType ${CHECKLIST_TYPE_ID} no encontrado. Abortando.`);
    process.exit(1);
  }
  log.info(`ChecklistType: "${checklistType.name}"`);
  log.info(`  - type_category: ${checklistType.type_category}`);
  log.info(`  - frequency:     ${checklistType.frequency}`);
  log.info(`  - role_id:       ${checklistType.role_id}`);

  // 2. Inspectables actualmente vinculados
  const ctWithInspectables = await ChecklistType.findByPk(CHECKLIST_TYPE_ID, {
    include: [{ model: Inspectable, as: 'specificInspectables' }],
  });
  log.info(`\nInspectables vinculados vía ChecklistTypeInspectables: ${ctWithInspectables.specificInspectables.length}`);
  if (ctWithInspectables.specificInspectables.length > 0) {
    ctWithInspectables.specificInspectables.forEach(i => {
      log.info(`  - ins_id ${i.ins_id}: ${i.name}`);
    });
  } else {
    log.warn('  ⚠️  Pivote VACÍA. El semanal no puede crear instancias.');
  }

  // 3. Inspectables candidatos en BD
  log.info('\nInspectables existentes con nombres relevantes:');
  const candidates = await Inspectable.findAll({
    where: {
      [Sequelize.Op.or]: [
        { name: { [Sequelize.Op.like]: 'TOY BOX%' } },
        { name: { [Sequelize.Op.like]: 'WORK ZONE%' } },
        { name: { [Sequelize.Op.like]: 'TOY FAMILY%' } },
      ],
    },
    order: [['ins_id', 'ASC']],
  });
  candidates.forEach(i => log.info(`  - ins_id ${i.ins_id}: ${i.name} (premise_id=${i.premise_id})`));

  // 4. Items del template
  const items = await ChecklistItem.findAll({
    where: { checklist_type_id: CHECKLIST_TYPE_ID },
    order: [['checklist_item_id', 'ASC']],
  });
  const parents = items.filter(i => i.parent_item_id === null);
  const children = items.filter(i => i.parent_item_id !== null);
  log.info(`\nItems del template (checklist_type_id=${CHECKLIST_TYPE_ID}):`);
  log.info(`  - Padres: ${parents.length}`);
  log.info(`  - Hijos:  ${children.length}`);
  if (parents.length > 0) {
    parents.forEach(p => log.info(`    * [${p.item_number}] ${p.question_text}`));
  }

  // 5. Checklists existentes
  const checklists = await Checklist.findAll({
    where: { checklist_type_id: CHECKLIST_TYPE_ID },
  });
  const withWeek    = checklists.filter(c => c.week_identifier !== null);
  const withoutWeek = checklists.filter(c => c.week_identifier === null);
  log.info(`\nChecklists existentes:`);
  log.info(`  - Total:                 ${checklists.length}`);
  log.info(`  - Con week_identifier:   ${withWeek.length}`);
  log.info(`  - Sin week_identifier:   ${withoutWeek.length}`);

  if (withoutWeek.length > 0) {
    log.warn(`  ⚠️  Hay ${withoutWeek.length} checklists SIN week_identifier (probablemente de intentos fallidos).`);
    log.info('     No se borrarán — solo se reportan.');
  }

  // 6. Recomendación
  log.head('RECOMENDACIÓN');
  const needsFix =
    ctWithInspectables.specificInspectables.length < TARGET_INSPECTABLES.length ||
    parents.length < PARENT_BLOCKS.length;

  if (needsFix) {
    log.warn('Se detectaron inconsistencias. Ejecuta con --fix para reparar.');
  } else {
    log.ok('Estructura parece correcta. Si el semanal sigue fallando, revisa los logs del backend.');
  }
}

// ============================================================
// Aplicar fixes
// ============================================================
async function applyFixes() {
  log.head('APLICANDO FIXES');

  const t = await connection.transaction();
  let familyIdForNew = APoyo_FAMILY_ID;

  try {
    // ------------------------------------------------------------
    // 1. Renombrar ins_id 85 si es necesario
    // ------------------------------------------------------------
    log.info('\n[1/6] Verificando renombre de ins_id 85...');
    const ins85 = await Inspectable.findByPk(85, { transaction: t });
    if (!ins85) {
      log.err('  ins_id 85 no existe. Algo está mal con la BD.');
      throw new Error('ins_id 85 missing');
    }
    if (ins85.name === 'TOY BOX SINGLE XL') {
      await ins85.update({ name: 'TOY BOX XL' }, { transaction: t });
      log.ok(`  ins_id 85 renombrado: "TOY BOX SINGLE XL" -> "TOY BOX XL"`);
    } else if (ins85.name === 'TOY BOX XL') {
      log.ok('  ins_id 85 ya se llama "TOY BOX XL" — no-op');
    } else {
      log.warn(`  ins_id 85 tiene nombre inesperado: "${ins85.name}". No se modifica.`);
    }

    // ------------------------------------------------------------
    // 2. Crear inspectable TOY FAMILY si no existe
    // ------------------------------------------------------------
    log.info('\n[2/6] Verificando creación de TOY FAMILY...');
    let toyFamily = await Inspectable.findOne({
      where: { name: 'TOY FAMILY' },
      transaction: t,
    });
    if (toyFamily) {
      log.ok(`  TOY FAMILY ya existe (ins_id=${toyFamily.ins_id}) — no-op`);
    } else {
      // Usar premise_id y family_id del TOY BOX 4P MINI (ins_id 84)
      const toyBoxRef = await Inspectable.findByPk(84, { transaction: t });
      const premiseId = toyBoxRef ? toyBoxRef.premise_id : DEFAULT_PREMISE_ID;

      toyFamily = await Inspectable.create({
        name: 'TOY FAMILY',
        description: 'Dispositivo de la familia Apoyo del parque Game Box Andino. Máquina tipo Toy Box XL que entrega peluches y dulces.',
        photo_url: '/images/resources/nf.jpg',
        type_code: 'device',
        premise_id: premiseId,
      }, { transaction: t });
      log.ok(`  TOY FAMILY creado: ins_id=${toyFamily.ins_id}, premise_id=${premiseId}`);

      // Crear también su fila en devices (sigue el patrón del seeder)
      try {
        await Device.create({
          ins_id: toyFamily.ins_id,
          family_id: familyIdForNew,
          public_flag: 'Sí',
          arrival_date: new Date(),
          brand: 'recreatec',
        }, { transaction: t });
        log.ok(`  Device row creado para TOY FAMILY (family_id=${familyIdForNew})`);
      } catch (devErr) {
        log.warn(`  No se pudo crear Device row para TOY FAMILY: ${devErr.message}`);
        log.warn('     (puede continuar — Device es opcional para el semanal)');
      }
    }

    // ------------------------------------------------------------
    // 3. Poblar ChecklistTypeInspectables (pivote)
    // ------------------------------------------------------------
    log.info('\n[3/6] Poblando ChecklistTypeInspectables...');
    const targetInsIds = [
      { ins_id: 84,                       label: 'TOY BOX 4P MINI' },
      { ins_id: 85,                       label: 'TOY BOX XL' },
      { ins_id: toyFamily.ins_id,         label: 'TOY FAMILY' },
      { ins_id: 86,                       label: 'WORK ZONE' },
    ];

    for (const { ins_id, label } of targetInsIds) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO ChecklistTypeInspectables (checklist_type_id, ins_id, createdAt, updatedAt)
         VALUES (?, ?, NOW(), NOW())`,
        { replacements: [CHECKLIST_TYPE_ID, ins_id], transaction: t }
      );
      const affected = result.affectedRows || 0;
      if (affected > 0) {
        log.ok(`  Vinculado: ins_id ${ins_id} (${label}) → checklist_type_id ${CHECKLIST_TYPE_ID}`);
      } else {
        log.ok(`  Ya vinculado: ins_id ${ins_id} (${label}) — no-op`);
      }
    }

    // ------------------------------------------------------------
    // 4. Crear/verificar 7 items padre
    // ------------------------------------------------------------
    log.info('\n[4/6] Creando items padre (7 bloques)...');

    const parentBlocks = PARENT_BLOCKS.map(block => ({
      ...block,
      inspectable_ins_id: block.name === 'TOY FAMILY' ? toyFamily.ins_id : block.inspectable_ins_id,
    }));

    const parentIdMap = {};

    for (const block of parentBlocks) {
      let parent = await ChecklistItem.findOne({
        where: {
          checklist_type_id: CHECKLIST_TYPE_ID,
          question_text: block.name,
          parent_item_id: null,
        },
        transaction: t,
      });

      if (parent) {
        log.ok(`  Padre existe: "${block.name}" (id=${parent.checklist_item_id})`);
      } else {
        parent = await ChecklistItem.create({
          checklist_type_id: CHECKLIST_TYPE_ID,
          parent_item_id: null,
          item_number: block.item_number,
          question_text: block.name,
          guidance_text: null,
          input_type: 'section',
          allow_comment: false,
        }, { transaction: t });
        log.ok(`  Padre creado: "${block.name}" (id=${parent.checklist_item_id})`);
      }

      parentIdMap[block.name] = parent.checklist_item_id;
    }

    // ------------------------------------------------------------
    // 5. Crear 21 items hijos (3 por cada padre)
    // ------------------------------------------------------------
    log.info('\n[5/6] Creando items hijos (3 por padre)...');
    let childCount = 0;
    for (const block of parentBlocks) {
      const parentId = parentIdMap[block.name];
      let childNum = 1;
      for (const child of CHILD_ITEMS) {
        const childNumbering = `${block.item_number}.${childNum}`;

        let existing = await ChecklistItem.findOne({
          where: {
            checklist_type_id: CHECKLIST_TYPE_ID,
            question_text: child.name,
            parent_item_id: parentId,
          },
          transaction: t,
        });

        if (existing) {
          log.ok(`  Hijo existe: [${childNumbering}] ${child.name} bajo "${block.name}"`);
        } else {
          await ChecklistItem.create({
            checklist_type_id: CHECKLIST_TYPE_ID,
            parent_item_id: parentId,
            item_number: childNumbering,
            question_text: child.name,
            guidance_text: null,
            input_type: child.input_type,
            allow_comment: child.allow_comment,
          }, { transaction: t });
          log.ok(`  Hijo creado: [${childNumbering}] ${child.name} bajo "${block.name}"`);
          childCount++;
        }
        childNum++;
      }
    }

    // ------------------------------------------------------------
    // 6. Reporte final sin borrar nada
    // ------------------------------------------------------------
    log.info('\n[6/6] Reporte final (no se borran datos)...');
    const allChecklists = await Checklist.findAll({
      where: { checklist_type_id: CHECKLIST_TYPE_ID },
      transaction: t,
    });
    const withWeek = allChecklists.filter(c => c.week_identifier !== null);
    const withoutWeek = allChecklists.filter(c => c.week_identifier === null);
    log.info(`  Checklists existentes para type_id=${CHECKLIST_TYPE_ID}: ${allChecklists.length}`);
    log.info(`    - Con week_identifier:   ${withWeek.length}`);
    log.info(`    - Sin week_identifier:   ${withoutWeek.length} (sin tocar)`);

    await t.commit();
    log.head('FIX COMPLETADO');
    log.ok('La estructura del semanal de premios está lista.');
    log.info('Próximo paso: reiniciar el backend y probar desde el frontend.');
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
