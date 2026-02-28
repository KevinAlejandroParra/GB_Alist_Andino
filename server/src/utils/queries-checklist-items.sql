-- ============================================
-- QUERIES PARA OBTENER ITEMS REALES DE CHECKLISTS POR ATRACCIÓN
-- ============================================

-- 1. Obtener todos los tipos de checklist con sus atracciones asociadas
SELECT 
    ct.checklist_type_id,
    ct.name as checklist_name,
    ct.type_category,
    a.ins_id as attraction_id,
    i.name as attraction_name,
    ct.createdAt
FROM checklist_types ct
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
ORDER BY ct.checklist_type_id, attraction_name;

-- 2. Obtener items de checklist para checklist_type_id = 4
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 4
ORDER BY ci.item_number, ci.checklist_item_id;

-- 3. Obtener items de checklist para checklist_type_id = 5
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 5
ORDER BY ci.item_number, ci.checklist_item_id;

-- 4. Obtener items de checklist para checklist_type_id = 6
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 6
ORDER BY ci.item_number, ci.checklist_item_id;

-- 5. Obtener items de checklist para checklist_type_id = 7
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 7
ORDER BY ci.item_number, ci.checklist_item_id;

-- 6. Obtener items de checklist para checklist_type_id = 13
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 13
ORDER BY ci.item_number, ci.checklist_item_id;

-- 7. Obtener items de checklist para checklist_type_id = 14
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ci.input_type,
    ci.parent_item_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id = 14
ORDER BY ci.item_number, ci.checklist_item_id;

-- 8. Query consolidado - Todos los items agrupados por checklist_type_id
SELECT 
    ct.checklist_type_id,
    ct.name as checklist_name,
    COUNT(ci.checklist_item_id) as total_items,
    STRING_AGG(ci.checklist_item_id::text, ', ' ORDER BY ci.item_number, ci.checklist_item_id) as item_ids,
    i.name as attraction_name
FROM checklist_types ct
LEFT JOIN checklist_items ci ON ct.checklist_type_id = ci.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ct.checklist_type_id IN (4, 5, 6, 7, 13, 14)
GROUP BY ct.checklist_type_id, ct.name, i.name
ORDER BY ct.checklist_type_id;

-- 9. Query para ver solo items de tipo 'radio' (los que se pueden desbloquear)
SELECT 
    ci.checklist_item_id,
    ci.item_number,
    ci.question_text,
    ct.checklist_type_id,
    ct.name as checklist_name,
    i.name as attraction_name
FROM checklist_items ci
INNER JOIN checklist_types ct ON ci.checklist_type_id = ct.checklist_type_id
LEFT JOIN attractions a ON ct.associated_id = a.ins_id AND ct.type_category = 'attraction'
LEFT JOIN inspectables i ON a.ins_id = i.ins_id
WHERE ci.checklist_type_id IN (4, 5, 6, 7, 13, 14)
