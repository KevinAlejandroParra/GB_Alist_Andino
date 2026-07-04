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
