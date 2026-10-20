'use strict';
/**
 * Informe PDF consolidado del día (preventivos + correctivos cerrados).
 *
 * Incluye, para una fecha dada:
 *  - Preventivos completados ese día: máquina, tipo, técnico, hora inicio/fin,
 *    duración, descripción, repuestos utilizados y requisiciones.
 *  - Fallas cerradas ese día (MaintenanceDayFailureClosure): máquina, falla,
 *    estado de la AR, técnico, tiempos y repuestos utilizados.
 *
 * Reutiliza el renderizado HTML→PDF de MaintenanceSessionPdfService para
 * compartir la instancia de Puppeteer.
 */
const { Op } = require('sequelize');
const MaintenanceSessionPdfService = require('./MaintenanceSessionPdfService');
const {
    MaintenanceSession,
    MaintenanceScheduleSlot,
    MaintenanceDayFailureClosure,
    FailureOrder,
    RepairExecution,
    WorkOrder,
    WorkOrderPart,
    Inventory,
    Requisition,
    Inspectable,
    User,
    MaintenanceSessionEvidence
} = require('../models');

const TYPE_LABELS = {
    WEEKLY: 'Preventivo Semanal',
    BIWEEKLY: 'Preventivo Quincenal',
    QUARTERLY: 'Preventivo Cuatrimestral',
    SCHEDULED: 'Preventivo Programado'
};

class MaintenanceDayReportPdfService {
    /**
     * Reúne los datos de preventivos completados y fallas cerradas de una fecha.
     */
    async collectDayData(dateStr) {
        const dayStart = new Date(`${dateStr}T00:00:00`);
        const dayEnd = new Date(`${dateStr}T23:59:59.999`);

        // 1) Preventivos del día (completados, en proceso o no iniciados)
        const sessions = await MaintenanceSession.findAll({
            where: {
                [Op.or]: [
                    { completed_at: { [Op.between]: [dayStart, dayEnd] } },
                    { 
                        status: { [Op.ne]: 'COMPLETED' },
                        createdAt: { [Op.between]: [dayStart, dayEnd] }
                    }
                ]
            },
            include: [
                { model: MaintenanceScheduleSlot, as: 'slot', required: false, include: [{ model: Inspectable, as: 'inspectable', required: false, attributes: ['ins_id', 'name'] }] },
                { model: Inspectable, as: 'inspectable', required: false, attributes: ['ins_id', 'name'] },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] },
                { model: MaintenanceSessionEvidence, as: 'evidences' }
            ],
            order: [['createdAt', 'ASC']]
        });

        const preventives = [];
        for (const session of sessions) {
            const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: session.id } });
            const parts = workOrder
                ? await WorkOrderPart.findAll({
                    where: { work_order_id: workOrder.id },
                    include: [{ model: Inventory, as: 'inventory' }]
                })
                : [];
            const requisitions = await Requisition.findAll({
                where: { maintenance_session_id: session.id },
                order: [['createdAt', 'ASC']]
            });

            const machine = session.inspectable || session.slot?.inspectable || null;
            preventives.push({
                id: session.id,
                machineName: machine ? machine.name : `Máquina #${session.ins_id}`,
                typeLabel: TYPE_LABELS[session.type] || 'Preventivo',
                status: session.status,
                technicianName: session.technician?.user_name || 'No registrado',
                startedAt: session.started_at,
                completedAt: session.completed_at,
                durationMinutes: session.duration_minutes,
                description: session.description,
                workOrder,
                parts,
                requisitions,
                evidences: session.evidences || []
            });
        }

        // 2) Fallas cerradas ese día
        const closureRecords = await MaintenanceDayFailureClosure.findAll({
            where: { closure_date: dateStr },
            include: [
                {
                    model: FailureOrder,
                    as: 'failureOrder',
                    include: [{ model: RepairExecution, as: 'repairExecution', required: false }]
                },
                { model: Inspectable, as: 'inspectable', required: false, attributes: ['ins_id', 'name'] },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name'] }
            ],
            order: [['createdAt', 'ASC']]
        });

        const failures = [];
        for (const closure of closureRecords) {
            const failure = closure.failureOrder;
            const workOrder = failure
                ? await WorkOrder.findOne({ where: { failure_order_id: failure.id } })
                : null;
            const parts = workOrder
                ? await WorkOrderPart.findAll({
                    where: { work_order_id: workOrder.id },
                    include: [{ model: Inventory, as: 'inventory' }]
                })
                : [];

            failures.push({
                closureId: closure.id,
                failureCode: failure?.failure_order_id || `Falla #${closure.failure_order_id}`,
                machineName: closure.inspectable?.name || `Máquina #${closure.affected_ins_id}`,
                description: failure?.description || '—',
                severity: failure?.severity || null,
                repairStatus: failure?.repairExecution?.status || '—',
                technicianName: closure.technician?.user_name || 'No registrado',
                startTime: failure?.repairExecution?.start_time || null,
                endTime: failure?.repairExecution?.end_time || null,
                workOrder,
                parts
            });
        }

        return { dateStr, preventives, failures };
    }

    /**
     * Construye el HTML del informe diario.
     */
    buildHtml({ dateStr, preventives, failures }) {
        const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—';
        const fmtDate = (d) => d ? new Date(d).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' }) : '—';

        const totalMinutes = preventives.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
        const totalPartsUnits = preventives.reduce(
            (sum, p) => sum + p.parts.reduce((s, part) => s + (part.quantity_used || 0), 0), 0
        ) + failures.reduce(
            (sum, f) => sum + f.parts.reduce((s, part) => s + (part.quantity_used || 0), 0), 0
        );

        const evidenceGallery = (evidences) => {
            if (!evidences.length) return '';
            const items = evidences.map(e => {
                const isVideo = e.file_url.match(/\.(mp4|mov|avi|mkv|webm)$/i) || e.file_url.includes('video');
                if (isVideo) {
                    return `
                        <div style="display:inline-block; width:30%; margin:5px; text-align:center; vertical-align:top;">
                            <div style="width:100%; height:100px; background:#eee; border:1px solid #ccc; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:20px;">🎥</div>
                            <div style="font-size:10px; color:#666; margin-top:2px;">${e.phase} (Video)</div>
                            <a href="${e.file_url}" style="font-size:10px; color:#3498db; text-decoration:none;">Ver video →</a>
                        </div>`;
                }
                return `
                    <div style="display:inline-block; width:30%; margin:5px; text-align:center; vertical-align:top;">
                        <img src="${e.file_url}" style="width:100%; height:100px; object-fit:cover; border:1px solid #ccc; border-radius:4px;">
                        <div style="font-size:10px; color:#666; margin-top:2px;">${e.phase}</div>
                    </div>`;
            }).join('');
            return `<h3 style="font-size:13px;margin:12px 0 4px;">Evidencias Fotográficas y Videos</h3>
                    <div style="display:block; text-align:left;">${items}</div>`;
        };

        const partsTable = (parts) => {
            if (!parts.length) {
                return `<table><tr><td style="text-align:center;color:#888">Sin repuestos utilizados</td></tr></table>`;
            }
            const rows = parts.map(p => `<tr>
                <td>${esc(p.inventory?.part_name || `Repuesto #${p.inventory_id}`)}</td>
                <td style="text-align:center;width:15%">${p.quantity_used}</td>
            </tr>`).join('');
            return `<table>
                <tr><th>Repuesto</th><th style="text-align:center">Cantidad</th></tr>
                ${rows}
            </table>`;
        };

        const requisitionsTable = (requisitions) => {
            if (!requisitions.length) return '';
            const rows = requisitions.map(r => `<tr>
                <td>${esc(r.part_reference)}</td>
                <td style="text-align:center;width:15%">${r.quantity_requested}</td>
                <td style="width:20%">${esc(r.status)}</td>
            </tr>`).join('');
            return `<h3 style="font-size:13px;margin:12px 0 4px;">Requisiciones</h3>
            <table>
                <tr><th>Repuesto solicitado</th><th style="text-align:center">Cantidad</th><th>Estado</th></tr>
                ${rows}
            </table>`;
        };

        const preventivesHtml = preventives.length
            ? preventives.map((p, idx) => {
                const statusBadge = p.status === 'COMPLETED' 
                    ? `<span class="badge">${esc(p.typeLabel)}</span>` 
                    : `<span class="badge badge-warn">${p.status === 'IN_PROGRESS' ? 'En Proceso' : 'No Iniciado'}</span>`;
                
                return `
                <div class="block">
                  <h2>${idx + 1}. ${esc(p.machineName)} ${statusBadge}</h2>
                  <table>
                    <tr><th style="width:30%">Técnico</th><td>${esc(p.technicianName)}</td></tr>
                    <tr><th>Inicio / Fin</th><td>${fmtTime(p.startedAt)} → ${fmtTime(p.completedAt)} (${p.durationMinutes || 0} min)</td></tr>
                    ${p.workOrder ? `<tr><th>OT asociada</th><td>${esc(p.workOrder.work_order_id)} (${esc(p.workOrder.status)})</td></tr>` : ''}
                    <tr><th>Descripción</th><td>${esc(p.description || 'Sin descripción registrada.')}</td></tr>
                  </table>
                  ${evidenceGallery(p.evidences)}
                  <h3 style="font-size:13px;margin:12px 0 4px;">Repuestos utilizados</h3>
                  ${partsTable(p.parts)}
                  ${requisitionsTable(p.requisitions)}
                </div>`;
            }).join('')
            : `<p style="color:#888">No se registraron mantenimientos preventivos en esta fecha.</p>`;

        const failuresHtml = failures.length
            ? failures.map((f, idx) => `
            <div class="block">
              <h2>${idx + 1}. ${esc(f.machineName)} <span class="badge badge-fail">Falla corregida</span></h2>
              <table>
                <tr><th style="width:30%">Falla</th><td>${esc(f.failureCode)}${f.severity ? ` — Severidad ${esc(f.severity)}` : ''}</td></tr>
                <tr><th>Estado AR</th><td>${esc(f.repairStatus)}</td></tr>
                <tr><th>Técnico</th><td>${esc(f.technicianName)}</td></tr>
                <tr><th>Inicio / Fin</th><td>${fmtTime(f.startTime)} → ${fmtTime(f.endTime)}</td></tr>
                ${f.workOrder ? `<tr><th>OT asociada</th><td>${esc(f.workOrder.work_order_id)} (${esc(f.workOrder.status)})</td></tr>` : ''}
                <tr><th>Descripción</th><td>${esc(f.description)}</td></tr>
              </table>
              <h3 style="font-size:13px;margin:12px 0 4px;">Repuestos utilizados</h3>
              ${partsTable(f.parts)}
            </div>`).join('')
            : `<p style="color:#888">No se registraron cierres de falla en esta fecha.</p>`;

        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; border-bottom: 2px solid #3498db; padding-bottom: 4px; margin-top: 22px; }
  .meta { color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f0f4f8; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; background: #e8f4fd; color: #2c7fbe; font-size: 11px; font-weight: bold; }
  .badge-fail { background: #fdecea; color: #c0392b; }
  .badge-warn { background: #fff4e5; color: #d35400; }
  .summary { display: flex; gap: 12px; margin-top: 12px; }
  .card { flex: 1; border: 1px solid #d5e3ef; border-radius: 8px; padding: 10px; text-align: center; background: #f8fbfe; }
  .card .n { font-size: 22px; font-weight: bold; color: #2c7fbe; }
  .card .l { font-size: 11px; color: #555; }
  .block { page-break-inside: avoid; }
  img { max-width: 100%; }
</style>
</head>
<body>
  <h1>Informe Diario de Mantenimiento</h1>
  <div class="meta">Fecha: ${esc(dateStr)} — Generado el ${fmtDate(new Date())}</div>

  <div class="summary">
    <div class="card"><div class="n">${preventives.length}</div><div class="l">Preventivos completados</div></div>
    <div class="card"><div class="n">${totalMinutes}</div><div class="l">Minutos trabajados</div></div>
    <div class="card"><div class="n">${failures.length}</div><div class="l">Fallas cerradas</div></div>
    <div class="card"><div class="n">${totalPartsUnits}</div><div class="l">Repuestos utilizados</div></div>
  </div>

  <h1 style="font-size:16px;margin-top:24px;">Mantenimientos Preventivos</h1>
  ${preventivesHtml}

  <h1 style="font-size:16px;margin-top:24px;">Correctivos — Fallas Cerradas</h1>
  ${failuresHtml}
</body>
</html>`;
    }

    /**
     * Genera el PDF consolidado del día y devuelve un Buffer.
     */
    async generateDayPdf(dateStr) {
        const data = await this.collectDayData(dateStr);
        const htmlContent = this.buildHtml(data);
        return MaintenanceSessionPdfService.renderHtmlToPdf(
            htmlContent,
            'Alist GBX | Informe Diario de Mantenimiento'
        );
    }
}

module.exports = new MaintenanceDayReportPdfService();
