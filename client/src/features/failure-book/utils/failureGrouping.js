export const groupByStatus = (failures) => {
  const withoutOT = failures.filter((f) => !f.workOrder);
  const withOT = failures.filter((f) => f.workOrder);

  const split = (list) => ({
    checklist: list.filter((f) => f.checklist_item_id),
    devices: list.filter((f) => f.affected_id && !f.checklist_item_id),
    independent: list.filter((f) => !f.checklist_item_id && !f.affected_id)
  });

  return {
    withoutOT: split(withoutOT),
    withOT: split(withOT)
  };
};

export const groupByChecklist = (failures) => {
  const groups = {};
  failures.forEach((f) => {
    const key = f.checklistItem?.checklistType?.name || 'Reportes Independientes / Directos';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  return groups;
};

export const groupByDevice = (failures) => {
  const groups = {};
  failures.forEach((f) => {
    const key = f.affectedInspectable?.name || 'Sin Dispositivo Asignado';
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  return groups;
};
