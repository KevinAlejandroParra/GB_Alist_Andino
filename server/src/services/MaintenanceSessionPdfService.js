'use strict';
/**
 * PDF por sesión de mantenimiento (Fase 3).
 * Reutiliza el patrón singleton de Puppeteer del checklistController para
 * reutilizar el navegador entre generaciones.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');
const { MaintenanceSession, MaintenanceScheduleSlot, Inspectable, WorkOrder, WorkOrderPart, Inventory, Requisition, User } = require('../models');

let browserInstance = null;
let browserLaunchPromise = null;

const getBrowserInstance = async () => {
    if (browserInstance && browserInstance.isConnected()) return browserInstance;
    if (browserLaunchPromise) return browserLaunchPromise;

    browserLaunchPromise = puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled'
        ],
        headless: true,
        timeout: 30000
    }).then(browser => {
        browserInstance = browser;
        browserLaunchPromise = null;
        browser.on('disconnected', () => {
            console.log('⚠️ Navegador desconectado, se creará uno nuevo en la próxima solicitud');
            browserInstance = null;
        });
        return browser;
    }).catch(err => {
        browserLaunchPromise = null;
        throw err;
    });
    return browserLaunchPromise;
};

const TYPE_LABELS = {
    WEEKLY: 'Preventivo Semanal',
    BIWEEKLY: 'Preventivo Quincenal',
    QUARTERLY: 'Preventivo Cuatrimestral',
    SCHEDULED: 'Preventivo Programado'
};

class MaintenanceSessionPdfService {
    /**
     * Reúne todos los datos de la sesión para el PDF.
     */
    async collectSessionData(sessionId) {
        const session = await MaintenanceSession.findByPk(sessionId, {
            include: [
                { model: MaintenanceScheduleSlot, as: 'slot', include: [{ model: Inspectable, as: 'inspectable' }] },
                { model: Inspectable, as: 'inspectable' },
                { model: User, as: 'technician', attributes: ['user_id', 'user_name', 'user_email'] }
            ]
        });
        if (!session) throw new Error(`Sesión de mantenimiento ${sessionId} no encontrada`);

        const machine = session.inspectable || session.slot?.inspectable || null;
        const machineName = machine ? machine.name : `Máquina #${session.ins_id}`;

        // Repuestos usados (vía OT autogenerada)
        const workOrder = await WorkOrder.findOne({ where: { maintenance_session_id: sessionId } });
        let parts = [];
        if (workOrder) {
            parts = await WorkOrderPart.findAll({
                where: { work_order_id: workOrder.id },
                include: [{ model: Inventory, as: 'inventory' }]
            });
        }

        // Requisiciones ligadas a la sesión
        const requisitions = await Requisition.findAll({
            where: { maintenance_session_id: sessionId },
            order: [['createdAt', 'ASC']]
        });

        return { session, machine, machineName, workOrder, parts, requisitions };
    }

    /**
     * Construye el HTML del reporte.
     */
    buildHtml({ session, machine, machineName, workOrder, parts, requisitions }) {
        const typeLabel = TYPE_LABELS[session.type] || 'Preventivo';
        const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const fmtDate = (d) => d ? new Date(d).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' }) : '—';

        const partsRows = parts.length
            ? parts.map(p => `<tr>
                <td>${esc(p.inventory?.part_name || `Repuesto #${p.inventory_id}`)}</td>
                <td style="text-align:center">${p.quantity_used}</td>
            </tr>`).join('')
            : `<tr><td colspan="2" style="text-align:center;color:#888">Sin repuestos utilizados</td></tr>`;

        const reqRows = requisitions.length
            ? requisitions.map(r => `<tr>
                <td>${esc(r.part_reference)}</td>
                <td style="text-align:center">${r.quantity_requested}</td>
                <td>${esc(r.status)}</td>
            </tr>`).join('')
            : `<tr><td colspan="3" style="text-align:center;color:#888">Sin requisiciones</td></tr>`;

        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; border-bottom: 2px solid #3498db; padding-bottom: 4px; margin-top: 24px; }
  .meta { color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f0f4f8; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; background: #e8f4fd; color: #2c7fbe; font-size: 11px; font-weight: bold; }
</style>
</head>
<body>
  <h1>Reporte de Mantenimiento Preventivo</h1>
  <div class="meta">Generado el ${fmtDate(new Date())}</div>
  <p><span class="badge">${esc(typeLabel)}</span></p>

  <h2>Datos de la máquina</h2>
  <table>
    <tr><th style="width:35%">Máquina</th><td>${esc(machineName)}</td></tr>
    <tr><th>Sesión</th><td>#${session.id} — ${fmtDate(session.completed_at || session.createdAt)}</td></tr>
    <tr><th>Estado</th><td>${esc(session.status)}</td></tr>
    <tr><th>Técnico</th><td>${esc(session.technician?.user_name || 'No registrado')}</td></tr>
    ${workOrder ? `<tr><th>OT asociada</th><td>${esc(workOrder.work_order_id)} (${esc(workOrder.status)})</td></tr>` : ''}
  </table>

  <h2>Repuestos utilizados</h2>
  <table>
    <tr><th>Repuesto</th><th style="width:15%;text-align:center">Cantidad</th></tr>
    ${partsRows}
  </table>

  <h2>Requisiciones de la sesión</h2>
  <table>
    <tr><th>Repuesto solicitado</th><th style="width:15%;text-align:center">Cantidad</th><th style="width:20%">Estado</th></tr>
    ${reqRows}
  </table>
</body>
</html>`;
    }

    /**
     * Genera el PDF de una sesión y devuelve un Buffer.
     */
    async generatePdf(sessionId) {
        const data = await this.collectSessionData(sessionId);
        const htmlContent = this.buildHtml(data);
        return this.renderHtmlToPdf(htmlContent, 'Alist GBX | Reporte de Mantenimiento');
    }

    /**
     * Renderiza un HTML a Buffer PDF. Reutilizable por otros reportes del módulo.
     */
    async renderHtmlToPdf(htmlContent, footerLabel = 'Alist GBX | Reporte de Mantenimiento') {
        const tempFileName = `maintenance_report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.html`;
        const tempFilePath = path.join(os.tmpdir(), tempFileName);
        const fileUrl = tempFilePath.replace(/\\/g, '/');
        fs.writeFileSync(tempFilePath, htmlContent);

        try {
            const browser = await getBrowserInstance();
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 1600 });
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const resourceType = request.resourceType();
                if (['font', 'media', 'websocket'].includes(resourceType)) request.abort();
                else request.continue();
            });

            await page.goto(`file:///${fileUrl}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.addStyleTag({
                content: `@media print { body { -webkit-print-color-adjust: exact; } }`
            });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                timeout: 30000,
                preferCSSPageSize: false,
                margin: { top: '80px', right: '50px', bottom: '80px', left: '50px' },
                displayHeaderFooter: true,
                headerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 50px;">
            <hr style="border: 1px solid #ccc; margin-top: 10px;"/>
          </div>
        `,
                footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 50px;">
            <hr style="border: 1px solid #ccc; margin-bottom: 10px;"/>
            ${footerLabel}
            <span style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        `
            });

            await page.close();
            return pdfBuffer;
        } finally {
            try {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.warn('Could not remove temp file:', tempFilePath);
            }
        }
    }
}

module.exports = new MaintenanceSessionPdfService();
