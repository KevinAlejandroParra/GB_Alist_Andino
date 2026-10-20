'use strict';

const fs = require('fs');
const path = require('path');
const MaintenanceSessionPdfService = require('./MaintenanceSessionPdfService');
const { resolveLocalEvidencePath } = require('../config/multerConfig');
const {
    MaintenanceSession,
    MaintenanceSessionEvidence,
    MaintenanceScheduleSlot,
    MaintenanceDayFailureClosure,
    FailureOrder,
    RepairExecution,
    WorkOrder,
    WorkOrderPart,
    Requisition,
    Inventory,
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

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv']);
const MIME_TYPES = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp'
};

class MaintenanceDayReportPdfService {
    getEvidence(fileUrl, label, publicBaseUrl) {
        if (!fileUrl) return null;
        const extension = path.extname(fileUrl.split('?')[0]).toLowerCase();
        const publicUrl = /^https?:\/\//i.test(fileUrl)
            ? fileUrl
            : `${String(publicBaseUrl || '').replace(/\/$/, '')}/${String(fileUrl).replace(/^\//, '')}`;
        const evidence = { label, publicUrl, isImage: IMAGE_EXTENSIONS.has(extension), isVideo: VIDEO_EXTENSIONS.has(extension), dataUri: null };

        if (evidence.isImage) {
            const localPath = resolveLocalEvidencePath(fileUrl);
            if (localPath && fs.existsSync(localPath)) {
                const image = fs.readFileSync(localPath).toString('base64');
                evidence.dataUri = `data:${MIME_TYPES[extension] || 'image/jpeg'};base64,${image}`;
            }
        }
        return evidence;
    }

    async getParts(workOrderId) {
        if (!workOrderId) return [];
        return WorkOrderPart.findAll({
            where: { work_order_id: workOrderId },
            include: [{ model: Inventory, as: 'inventory' }]
        });
    }

    async collectDayData(dateStr, publicBaseUrl) {
        const slots = await MaintenanceScheduleSlot.findAll({
            where: { scheduled_date: dateStr },
            include: [
                { model: Inspectable, as: 'inspectable', required: false, attributes: ['ins_id', 'name'] },
                { model: User, as: 'assignedUser', required: false, attributes: ['user_id', 'user_name'] },
                {
                    model: MaintenanceSession,
                    as: 'sessions',
                    required: false,
                    include: [
                        { model: MaintenanceSessionEvidence, as: 'evidences', required: false },
                        { model: User, as: 'technician', required: false, attributes: ['user_id', 'user_name'] }
                    ]
                }
            ],
            order: [['sort_priority', 'ASC'], ['id', 'ASC']]
        });

        const preventives = [];
        for (const slot of slots) {
            const sessions = slot.sessions || [];
            const completed = sessions.find(session => session.status === 'COMPLETED');
            const latest = completed || sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
            const status = completed ? 'COMPLETED' : latest ? 'IN_PROGRESS' : 'NOT_STARTED';
            const workOrder = latest ? await WorkOrder.findOne({ where: { maintenance_session_id: latest.id } }) : null;
            const parts = await this.getParts(workOrder?.id);
            const requisitions = latest
                ? await Requisition.findAll({ where: { maintenance_session_id: latest.id }, order: [['createdAt', 'ASC']] })
                : [];
            const evidences = (latest?.evidences || [])
                .map(e => this.getEvidence(e.file_url, `Evidencia ${e.phase}`, publicBaseUrl))
                .filter(Boolean);

            preventives.push({
                slotId: slot.id,
                machineName: slot.inspectable?.name || `Máquina #${slot.ins_id}`,
                typeLabel: TYPE_LABELS[slot.slot_type] || 'Preventivo',
                status,
                assignedName: slot.assignedUser?.user_name || null,
                technicianName: latest?.technician?.user_name || 'No iniciado',
                startedAt: latest?.started_at || null,
                completedAt: latest?.completed_at || null,
                durationMinutes: latest?.duration_minutes || null,
                description: latest?.description || null,
                sessionId: latest?.id || null,
                workOrder,
                parts,
                requisitions,
                evidences
            });
        }

        const closureRecords = await MaintenanceDayFailureClosure.findAll({
            where: { closure_date: dateStr },
            include: [
                {
                    model: FailureOrder,
                    as: 'failureOrder',
                    include: [{
                        model: RepairExecution,
                        as: 'repairExecution',
                        required: false,
                        include: [{ model: User, as: 'resolver', required: false, attributes: ['user_id', 'user_name'] }]
                    }]
                },
                { model: Inspectable, as: 'inspectable', required: false, attributes: ['ins_id', 'name'] },
                { model: User, as: 'technician', required: false, attributes: ['user_id', 'user_name'] }
            ],
            order: [['createdAt', 'ASC']]
        });

        const failures = [];
        for (const closure of closureRecords) {
            const failure = closure.failureOrder;
            const repair = failure?.repairExecution;
            const workOrder = failure ? await WorkOrder.findOne({ where: { failure_order_id: failure.id } }) : null;
            const parts = await this.getParts(workOrder?.id);
            const requisitions = workOrder
                ? await Requisition.findAll({ where: { work_order_id: workOrder.id }, order: [['createdAt', 'ASC']] })
                : [];
            const durationMinutes = repair?.start_time && repair?.end_time
                ? Math.max(1, Math.round((new Date(repair.end_time) - new Date(repair.start_time)) / 60000))
                : null;
            const evidences = [
                this.getEvidence(failure?.evidence_url, 'Evidencia reportada de la falla', publicBaseUrl),
                this.getEvidence(repair?.evidence_url, 'Evidencia del Acta de Reparación', publicBaseUrl),
                this.getEvidence(workOrder?.evidence_url, 'Evidencia de la Orden de Trabajo', publicBaseUrl)
            ].filter(Boolean);

            failures.push({
                failureCode: failure?.failure_order_id || `Falla #${closure.failure_order_id}`,
                machineName: closure.inspectable?.name || `Máquina #${closure.affected_ins_id}`,
                description: failure?.description || 'Sin descripción registrada.',
                severity: failure?.severity || null,
                typeMaintenance: failure?.type_maintenance || null,
                closureTechnician: closure.technician?.user_name || 'No registrado',
                repairId: repair?.repair_execution_id || null,
                repairStatus: repair?.status || 'Sin AR',
                repairActivity: repair?.activity_performed || null,
                repairTechnician: repair?.resolver?.user_name || null,
                startTime: repair?.start_time || null,
                endTime: repair?.end_time || null,
                durationMinutes,
                workOrder,
                parts,
                requisitions,
                evidences
            });
        }
        return { dateStr, preventives, failures };
    }

    buildHtml({ dateStr, preventives, failures }) {
        const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const fmtDate = d => d ? new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
        const fmtTime = d => d ? new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—';
        const completed = preventives.filter(p => p.status === 'COMPLETED');
        const inProgress = preventives.filter(p => p.status === 'IN_PROGRESS');
        const notStarted = preventives.filter(p => p.status === 'NOT_STARTED');
        const totalMinutes = completed.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);

        const partsTable = parts => !parts.length
            ? '<p class="muted">Sin repuestos utilizados.</p>'
            : `<table><tr><th>Repuesto</th><th>Cantidad</th></tr>${parts.map(p => `<tr><td>${esc(p.inventory?.part_name || `Repuesto #${p.inventory_id}`)}</td><td>${p.quantity_used || 0}</td></tr>`).join('')}</table>`;
        const requisitionsTable = requisitions => !requisitions.length ? ''
            : `<h4>Requisiciones</h4><table><tr><th>Repuesto solicitado</th><th>Cantidad</th><th>Estado</th></tr>${requisitions.map(r => `<tr><td>${esc(r.part_reference)}</td><td>${r.quantity_requested || 0}</td><td>${esc(r.status)}</td></tr>`).join('')}</table>`;
        const evidenceHtml = evidences => !evidences.length ? '<p class="muted">Sin evidencias adjuntas.</p>' : `<div class="evidences">${evidences.map(e => {
            if (e.isImage) return `<figure><img src="${e.dataUri || esc(e.publicUrl)}" /><figcaption>${esc(e.label)}</figcaption></figure>`;
            const label = e.isVideo ? `Ver video: ${e.label}` : `Abrir archivo: ${e.label}`;
            return `<p class="evidence-link"><a href="${esc(e.publicUrl)}">${esc(label)}</a><br/><span>${esc(e.publicUrl)}</span></p>`;
        }).join('')}</div>`;
        const statusLabel = status => ({ COMPLETED: 'COMPLETADO', IN_PROGRESS: 'EN CURSO (QR iniciado)', NOT_STARTED: 'SIN INICIAR (sin QR)' }[status] || status);

        const preventiveHtml = preventives.length ? preventives.map((p, index) => `<section class="block">
            <h3>${index + 1}. ${esc(p.machineName)} <span class="badge ${p.status.toLowerCase()}">${statusLabel(p.status)}</span></h3>
            <table>
              <tr><th>Tipo / slot</th><td>${esc(p.typeLabel)} · #${p.slotId}</td></tr>
              <tr><th>Técnico programado</th><td>${esc(p.assignedName || 'No asignado')}</td></tr>
              <tr><th>Técnico ejecutor</th><td>${esc(p.technicianName)}</td></tr>
              <tr><th>Sesión</th><td>${p.sessionId ? `#${p.sessionId}` : 'No se escaneó el QR ni se inició sesión.'}</td></tr>
              <tr><th>Inicio / fin</th><td>${fmtTime(p.startedAt)} → ${fmtTime(p.completedAt)}${p.durationMinutes ? ` (${p.durationMinutes} min)` : ''}</td></tr>
              ${p.workOrder ? `<tr><th>OT asociada</th><td>${esc(p.workOrder.work_order_id)} (${esc(p.workOrder.status)})</td></tr>` : ''}
              <tr><th>Descripción</th><td>${esc(p.description || 'Sin descripción registrada.')}</td></tr>
            </table>
            ${p.status === 'COMPLETED' ? `<h4>Repuestos utilizados</h4>${partsTable(p.parts)}${requisitionsTable(p.requisitions)}<h4>Evidencias</h4>${evidenceHtml(p.evidences)}` : ''}
        </section>`).join('') : '<p class="muted">No había mantenimientos preventivos programados para esta fecha.</p>';

        const failuresHtml = failures.length ? failures.map((f, index) => `<section class="block">
            <h3>${index + 1}. ${esc(f.machineName)} <span class="badge fail">CORRECTIVO CERRADO</span></h3>
            <table>
              <tr><th>Orden de falla</th><td>${esc(f.failureCode)}${f.severity ? ` · Severidad: ${esc(f.severity)}` : ''}${f.typeMaintenance ? ` · Tipo: ${esc(f.typeMaintenance)}` : ''}</td></tr>
              <tr><th>Detalle de la falla</th><td>${esc(f.description)}</td></tr>
              <tr><th>Técnico que registró el cierre</th><td>${esc(f.closureTechnician)}</td></tr>
              <tr><th>Acta de Reparación</th><td>${esc(f.repairId || 'No registrada')} · ${esc(f.repairStatus)}</td></tr>
              <tr><th>Trabajo realizado (AR)</th><td>${esc(f.repairActivity || 'Sin detalle registrado.')}</td></tr>
              <tr><th>Técnico ejecutor (AR)</th><td>${esc(f.repairTechnician || 'No registrado')}</td></tr>
              <tr><th>Inicio / fin AR</th><td>${fmtDate(f.startTime)} → ${fmtDate(f.endTime)}${f.durationMinutes ? ` (${f.durationMinutes} min)` : ''}</td></tr>
              ${f.workOrder ? `<tr><th>OT asociada</th><td>${esc(f.workOrder.work_order_id)} (${esc(f.workOrder.status)})</td></tr>` : ''}
            </table>
            <h4>Repuestos utilizados</h4>${partsTable(f.parts)}${requisitionsTable(f.requisitions)}
            <h4>Evidencias</h4>${evidenceHtml(f.evidences)}
        </section>`).join('') : '<p class="muted">No se registraron correctivos cerrados para esta fecha.</p>';

        return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><style>
          body{font-family:Arial,sans-serif;color:#1f2937;font-size:11px} h1{font-size:20px;margin:0} h2{font-size:16px;border-bottom:2px solid #2563eb;margin-top:26px;padding-bottom:5px} h3{font-size:13px;margin:0 0 7px;color:#111827} h4{font-size:11px;margin:12px 0 4px;color:#374151}.meta,.muted{color:#6b7280}.summary{display:flex;gap:8px;margin:14px 0}.card{flex:1;padding:9px;border:1px solid #bfdbfe;background:#eff6ff;text-align:center;border-radius:6px}.n{font-size:18px;font-weight:bold;color:#1d4ed8}table{width:100%;border-collapse:collapse;margin:5px 0}th,td{border:1px solid #d1d5db;padding:5px;vertical-align:top;text-align:left}th{width:30%;background:#f3f4f6}.block{page-break-inside:avoid;border:1px solid #e5e7eb;padding:10px;margin:12px 0}.badge{font-size:9px;padding:3px 6px;border-radius:9px;background:#dbeafe;color:#1d4ed8}.in_progress{background:#fef3c7;color:#92400e}.not_started{background:#fee2e2;color:#991b1b}.fail{background:#fce7f3;color:#9d174d}.evidences{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:48%;page-break-inside:avoid}figure img{max-width:100%;max-height:210px;display:block;border:1px solid #d1d5db}figcaption{font-size:9px;color:#6b7280;margin-top:2px}.evidence-link{border:1px solid #bfdbfe;background:#eff6ff;padding:6px;width:100%;word-break:break-all}.evidence-link a{color:#1d4ed8;font-weight:bold}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
          <h1>Informe Diario de Mantenimiento</h1><p class="meta">Fecha programada: ${esc(dateStr)} · Generado: ${fmtDate(new Date())}</p>
          <div class="summary"><div class="card"><div class="n">${preventives.length}</div>Programados</div><div class="card"><div class="n">${completed.length}</div>Completados</div><div class="card"><div class="n">${inProgress.length + notStarted.length}</div>Pendientes</div><div class="card"><div class="n">${totalMinutes}</div>Minutos preventivos</div><div class="card"><div class="n">${failures.length}</div>Correctivos cerrados</div></div>
          <h2>Preventivos programados para el día</h2>${preventiveHtml}
          <h2>Correctivos cerrados y vinculados al día</h2>${failuresHtml}
        </body></html>`;
    }

    async generateDayPdf(dateStr, options = {}) {
        const data = await this.collectDayData(dateStr, options.publicBaseUrl);
        return MaintenanceSessionPdfService.renderHtmlToPdf(this.buildHtml(data), 'Alist GBX | Informe Diario de Mantenimiento');
    }
}

module.exports = new MaintenanceDayReportPdfService();
