/**
 * diagnose-premios-blocks.js
 *
 * Diagnóstico profundo del análisis de Premios:
 *  1. Verifica el checklist_type (id, nombre, frecuencia).
 *  2. Lista los checklists de premios con su semana y cantidad de respuestas.
 *  3. Muestra la estructura del template (padres/hijos).
 *  4. Compara las respuestas guardadas contra los items del template
 *     (para ver por qué el análisis no arma bloques).
 *
 * Uso: node scripts/diagnose-premios-blocks.js
 */

const {
  connection,
  ChecklistType,
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  Inspectable,
} = require('../src/models');

const CHECKLIST_TYPE_ID = 2;

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  ok:   (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  err:  (msg) => console.log(`❌ ${msg}`),
  head: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
};

(async () => {
  try {
    log.head('DIAGNÓSTICO DE BLOQUES DE PREMIOS');

    // 1. Tipo de checklist
    const type = await ChecklistType.findByPk(CHECKLIST_TYPE_ID);
    if (!type) {
      log.err(`No existe checklist_type_id=${CHECKLIST_TYPE_ID}.`);
      process.exit(1);
    }
    log.info(`Tipo (id=${type.checklist_type_id}): ${type.name}`);
    log.info(`  frequency: ${type.frequency} | type_category: ${type.type_category} | role_id: ${type.role_id}`);
    log.info(`  ¿Es premios? ${type.name.includes('Premios') ? 'SÍ' : 'NO (nombre no contiene "Premios")'}`);

    // 2. Checklists con conteo de respuestas
    log.head('CHECKLISTS DE PREMIOS');
    const checklists = await Checklist.findAll({
      where: { checklist_type_id: CHECKLIST_TYPE_ID },
      include: [{ model: Inspectable, as: 'inspectable', attributes: ['ins_id', 'name'] }],
      order: [['week_identifier', 'ASC'], ['inspectable_id', 'ASC']],
    });
    if (checklists.length === 0) {
      log.warn('No hay checklists para este tipo.');
    }
    for (const c of checklists) {
      const count = await ChecklistResponse.count({ where: { checklist_id: c.checklist_id } });
      log.info(`  checklist=${c.checklist_id} | week=${c.week_identifier ?? 'NULL'} | ` +
        `máquina=${c.inspectable?.name ?? c.inspectable_id} | respuestas=${count} | creado=${c.createdAt?.toISOString?.()}`);
    }

    // 3. Estructura del template
    log.head('TEMPLATE (checklist_items)');
    const items = await ChecklistItem.findAll({ where: { checklist_type_id: CHECKLIST_TYPE_ID }, order: [['item_number', 'ASC']] });
    const parents = items.filter((i) => i.parent_item_id === null);
    const children = items.filter((i) => i.parent_item_id !== null);
    log.info(`Total items: ${items.length} (${parents.length} padres, ${children.length} hijos)`);
    for (const p of parents) {
      log.info(`  PADRE id=${p.checklist_item_id} | ${p.item_number} | ${p.question_text} | ${p.input_type}`);
    }
    for (const c of children) {
      log.info(`    hijo id=${c.checklist_item_id} | padre=${c.parent_item_id} | ${c.item_number} | ${c.question_text} | ${c.input_type}`);
    }

    // 4. Respuestas vs items del template
    log.head('RESPUESTAS GUARDADAS (vs template)');
    const checklistIds = checklists.map((c) => c.checklist_id);
    let respuestas = [];
    if (checklistIds.length > 0) {
      respuestas = await ChecklistResponse.findAll({
        where: { checklist_id: checklistIds },
        include: [{ model: ChecklistItem, as: 'checklistItem' }],
        limit: 40,
        order: [['response_id', 'ASC']],
      });
    }
    if (respuestas.length === 0) {
      log.warn('No hay respuestas guardadas.');
    }
    for (const r of respuestas) {
      const itemInfo = r.checklistItem
        ? `${r.checklistItem.question_text} (padre=${r.checklistItem.parent_item_id})`
        : '❌ ITEM NO ENCONTRADO / DE OTRO TIPO';
      log.info(`  resp=${r.response_id} | checklist=${r.checklist_id} | inspectable=${r.inspectable_id} | item=${r.checklist_item_id} -> ${itemInfo}`);
    }

    log.head('FIN DEL DIAGNÓSTICO');
    process.exit(0);
  } catch (error) {
    log.err(`Error: ${error.message}`);
    log.err(error.stack);
    process.exit(1);
  }
})();
