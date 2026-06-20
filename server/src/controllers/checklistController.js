const { ChecklistType, ChecklistItem, Checklist, ChecklistResponse, ChecklistSignature, User, ChecklistQrCode, ChecklistQrItemAssociation } = require("../models")
const checklistService = require("../services/checklistService")
const puppeteer = require("puppeteer")

const ensureChecklistInstance = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { premise_id, checklist_type_id } = req.body
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    const result = await checklistService.ensureChecklistInstance({
      inspectableId: Number.parseInt(inspectableId),
      premise_id,
      created_by: user_id,
      role_id,
      checklist_type_id: Number.parseInt(checklist_type_id),
    })

    if (result.isNew) {
    }
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getLatestChecklist = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { checklist_type_id } = req.query
    const checklist = await checklistService.getLatestChecklist({
      inspectableId: Number.parseInt(inspectableId),
      checklist_type_id: Number.parseInt(checklist_type_id), // Pasar checklist_type_id al servicio
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const createChecklist = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;
    const { inspectableId } = req.query;
    const user_id = req.user.user_id;
    const role_id = req.user.role_id;

    console.log(`🔍 Solicitando checklist tipo ${checklistTypeId} para inspectable ${inspectableId || 'null'}`);

    // PRIMERO: Verificar si ya existe un checklist válido usando database query directa
    const Checklist = require('../models').Checklist;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingChecklist = await Checklist.findOne({
      where: {
        checklist_type_id: Number.parseInt(checklistTypeId),
        ...(inspectableId && { inspectable_id: Number.parseInt(inspectableId) }),
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      },
      include: [
        { model: require('../models').ChecklistType, as: 'type' },
        { model: require('../models').ChecklistSignature, as: 'signatures' },
        { model: require('../models').ChecklistResponse, as: 'responses' }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (existingChecklist) {
      console.log(`📋 Checklist existente encontrado (ID: ${existingChecklist.checklist_id}), retornando`);
      return res.status(200).json(existingChecklist);
    }

    // Si no existe, crear uno nuevo usando ensureChecklistInstance
    console.log(`🆕 Creando nueva instancia de checklist para tipo ${checklistTypeId}`);
    const checklistResult = await checklistService.ensureChecklistInstance({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      created_by: user_id,
      role_id,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    if (!checklistResult || !checklistResult.checklist) {
      return res.status(400).json({ error: "No se pudo crear el checklist" });
    }

    console.log(`✅ Nueva instancia creada: ${checklistResult.message}`);

    // Para checklists de tipo (sin inspectable específico), necesitamos el formato especial
    // Usar la lógica original de getChecklistByType para procesar correctamente
    const processedChecklist = await getChecklistByTypeHelper(checklistTypeId, checklistResult.checklist);

    res.status(201).json({
      ...processedChecklist,
      notification: checklistResult.message
    });
  } catch (error) {
    console.error('❌ Error en createChecklist:', error);
    res.status(500).json({ error: error.message })
  }
}

// Obtener un checklist específico por ID
const getChecklistById = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el checklist con sus relaciones
    const checklist = await Checklist.findOne({
      where: { checklist_id: id },
      include: [
        {
          model: ChecklistType,
          as: 'type'
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: ChecklistResponse,
          as: 'responses',
          include: [
            {
              model: ChecklistItem,
              as: 'checklistItem'
            }
          ]
        },
        {
          model: ChecklistSignature,
          as: 'signatures',
          include: [
            {
              model: User,
              as: 'user'
            }
          ]
        }
      ]
    });

    if (!checklist) {
      return res.status(404).json({ error: "Checklist no encontrado" });
    }

    res.status(200).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitResponses = async (req, res) => {
  try {
    const { id: checklist_id } = req.params
    const { responses } = req.body
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    await checklistService.submitResponses({
      checklist_id: Number.parseInt(checklist_id),
      responses,
      responded_by: user_id,
      role_id,
    })

    // Reset is_unlocked status for associated QR codes
    const checklist = await Checklist.findByPk(Number.parseInt(checklist_id));

    if (checklist && checklist.checklist_type_id) {
      console.log(`[submitResponses] Responses submitted for checklist ${checklist_id}. Resetting is_unlocked...`);

      const qrCodes = await ChecklistQrCode.findAll({
        where: { checklist_type_id: checklist.checklist_type_id },
        attributes: ['qr_id']
      });

      if (qrCodes.length > 0) {
        const qrIds = qrCodes.map(qr => qr.qr_id);

        const [updateCount] = await ChecklistQrItemAssociation.update(
          { is_unlocked: false, unlocked_at: null },
          {
            where: {
              qr_id: qrIds,
              is_unlocked: true
            }
          }
        );
        console.log(`[submitResponses] Reset is_unlocked for ${updateCount} item associations for checklist ${checklist_id}.`);
      }
    }

    res.status(200).json({ message: "Respuestas registradas exitosamente" })
  } catch (error) {
    console.error('Error en submitResponses:', error.message);

    // Manejar errores de validación específicos
    if (error.message.includes('requiere un comentario') ||
      error.message.includes('requiere evidencia')) {
      res.status(400).json({
        error: error.message,
        type: 'validation_error',
        code: 'REQUIRED_FIELDS'
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
}

const getPendingFailures = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const workOrders = await checklistService.getWorkOrdersByStatus({
      checklist_id: Number.parseInt(checklist_id),
      status: 'pendiente'
    });
    res.status(200).json(workOrders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getClosedFailures = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const workOrders = await checklistService.getWorkOrdersByStatus({
      checklist_id: Number.parseInt(checklist_id),
      status: 'resuelto'
    });
    res.status(200).json(workOrders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateWorkOrder = async (req, res) => {
  try {
    const { id: work_order_id } = req.params
    const {
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    } = req.body


    const updateData = {
      work_order_id: Number.parseInt(work_order_id),
      description,
      solution_text,
      responsible_area,
      status,
      severity,
      reported_at,
      closed_at,
      responded_by,
      closed_by,
    }

    const updatedWorkOrder = await checklistService.updateWorkOrder(updateData)
    res.status(200).json({
      success: true,
      message: "Falla actualizada exitosamente",
      workOrder: updatedWorkOrder,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
}

const listObservations = async (req, res) => {
  try {
    const { checklist_id, start_date, end_date } = req.query
    const observations = await checklistService.listObservations({
      checklist_id: checklist_id ? Number.parseInt(checklist_id) : undefined,
      start_date,
      end_date,
    })
    res.status(200).json(observations)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const signChecklist = async (req, res) => {
  try {
    const { id: checklist_id } = req.params;
    const { digital_token } = req.body;
    const { user_id, role_id } = req.user; // Usar role_id del token

    await checklistService.signChecklist({
      checklist_id: Number.parseInt(checklist_id),
      user_id,
      role_id, // Pasar el role_id
      digital_token,
    });

    // Verificar si el checklist ya tiene ambas firmas después de firmar
    const checklist = await Checklist.findByPk(checklist_id, {
      include: [
        {
          model: ChecklistSignature,
          as: 'signatures',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    if (checklist) {
      // Verificar si tiene ambas firmas requeridas
      const hasTechnicalSignature = checklist.signatures.some(
        sig => sig.role_id === 7 || sig.role?.role_name === 'Tecnico de mantenimiento'
      );
      const hasOperationsSignature = checklist.signatures.some(
        sig => sig.role_id === 4 || sig.role?.role_name === 'Jefe de Operaciones'
      );

      // Si tiene ambas firmas, resetear is_unlocked a false para todos los items asociados
      if (hasTechnicalSignature && hasOperationsSignature) {
        console.log(`🔒 Checklist ${checklist_id} completado con ambas firmas. Reseteando is_unlocked...`);

        // Obtener todos los QR codes asociados al tipo de checklist
        const qrCodes = await ChecklistQrCode.findAll({
          where: { checklist_type_id: checklist.type_id },
          attributes: ['qr_id']
        });

        if (qrCodes.length > 0) {
          const qrIds = qrCodes.map(qr => qr.qr_id);

          // Resetear is_unlocked para todos los items asociados a estos QR codes
          await ChecklistQrItemAssociation.update(
            { is_unlocked: false, unlocked_at: null },
            {
              where: {
                qr_id: qrIds,
                is_unlocked: true // Solo actualizar los que están desbloqueados
              }
            }
          );

          console.log(`✅ Reseteado is_unlocked para ${qrIds.length} códigos QR asociados al checklist ${checklist_id}`);
        }
      }
    }

    res.status(200).json({ message: "Checklist firmado exitosamente" });
  } catch (error) {
    // Si el error contiene información de ítems incompletos, enviarla al cliente
    if (error.incompleteItems) {
      res.status(400).json({
        error: error.message,
        incompleteItems: error.incompleteItems,
        incompleteCount: error.incompleteCount,
      })
    } else {
      res.status(400).json({ error: error.message })
    }
  }
}
const getChecklistHistory = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const checklists = await checklistService.getChecklistHistory(Number.parseInt(inspectableId))
    res.status(200).json(checklists)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const downloadChecklistPDF = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  try {
    const { id } = req.params;

    const checklistData = await checklistService.getChecklistDataForPDF(id)

    if (!checklistData) {
      return res.status(404).json({ error: "Checklist not found" })
    }

    // ✅ OPTIMIZACIÓN: Pre-procesar todas las imágenes antes de generar HTML
    const htmlContent = await generateChecklistHTML(checklistData)

    // ✅ Escribir a un archivo temporal para evitar colapsar la conexión WebSocket con Puppeteer
    const tempFileName = `checklist_${id}_${Date.now()}.html`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    // Convertir a path absoluto de Windows
    const fileUrl = tempFilePath.replace(/\\/g, '/');
    fs.writeFileSync(tempFilePath, htmlContent);

    // ✅ OPTIMIZACIÓN: Usar navegador singleton para evitar lanzar uno nuevo cada vez
    const browser = await getBrowserInstance();
    const page = await browser.newPage()

    // ✅ OPTIMIZACIÓN: Configurar página para renderizado más rápido
    await page.setViewport({ width: 1200, height: 1600 });

    // ✅ OPTIMIZACIÓN: Deshabilitar recursos innecesarios
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Bloquear recursos externos que no necesitamos
      const resourceType = request.resourceType();
      if (['font', 'media', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // ✅ Usar page.goto con el archivo local
    await page.goto(`file:///${fileUrl}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000 // Reducir timeout a 30 segundos
    })

    // Inject a style tag to handle page breaks
    await page.addStyleTag({
      content: `
      .page-break { page-break-after: always; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    `,
    })

    // ✅ OPTIMIZACIÓN: Configuración de PDF optimizada
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      timeout: 30000, // Reducir timeout
      preferCSSPageSize: false, // Más rápido
      margin: {
        top: "80px",
        right: "50px",
        bottom: "80px",
        left: "50px",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 50px;">
          <hr style="border: 1px solid #ccc; margin-top: 10px;"/>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 50px;">
          <hr style="border: 1px solid #ccc; margin-bottom: 10px;"/>
          Alist GBX | Plataforma de Control y Mantenimiento de Game Box
          <span style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    })

    await page.close() // ✅ Explicitly close page
    // ✅ NO cerrar el navegador, mantenerlo abierto para reutilizar

    // Limpieza
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      console.warn("Could not remove temp file:", tempFilePath);
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="checklist-${checklistData.inspectable?.name?.replace(/ /g, '_') || 'desconocido'}-${id}.pdf"`,
    })

    res.send(pdfBuffer)
  } catch (error) {
    console.error('💥 Error crítico en downloadChecklistPDF:', error);
    res.status(500).json({
      error: "Error al generar el PDF",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// ✅ OPTIMIZACIÓN: Singleton del navegador para reutilizar instancia
let browserInstance = null;
let browserLaunchPromise = null;

const getBrowserInstance = async () => {
  // Si ya hay un navegador, devolverlo
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // Si ya se está lanzando, esperar a que termine
  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  // Lanzar nuevo navegador
  browserLaunchPromise = puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process", // ✅ Más rápido
      "--disable-blink-features=AutomationControlled" // ✅ Evitar detección
    ],
    headless: true,
    timeout: 30000 // ✅ Timeout de lanzamiento
  }).then(browser => {
    browserInstance = browser;
    browserLaunchPromise = null;

    // Manejar cierre inesperado
    browser.on('disconnected', () => {
      console.log('⚠️ Navegador desconectado, se creará uno nuevo en la próxima solicitud');
      browserInstance = null;
    });

    return browser;
  }).catch(error => {
    browserLaunchPromise = null;
    throw error;
  });

  return browserLaunchPromise;
};

// ✅ Cerrar navegador al apagar el servidor
process.on('SIGINT', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit(0);
});

const getChecklistTypes = async (req, res) => {
  try {
    const checklistTypes = await ChecklistType.findAll();
    res.status(200).json(checklistTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const IMAGE_UNAVAILABLE_PLACEHOLDER = `
  <div style="width:120px;height:80px;background:#e5e7eb;border:1px dashed #9ca3af;border-radius:4px;
    display:flex;align-items:center;justify-content:center;font-size:7px;color:#6b7280;text-align:center;padding:4px;">
    Imagen no disponible
  </div>`;

const formatPdfHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const ms = new Date(endTime) - new Date(startTime);
  if (Number.isNaN(ms) || ms < 0) return 'N/A';
  return `${(ms / 3600000).toFixed(1)} h`;
};

const buildPdfEvidenceSection = (title, imagePath, imageCache) => {
  if (!imagePath) return '';
  let imagesHtml = '';
  const paths = Array.isArray(imagePath) ? imagePath : [imagePath];
  paths.forEach(path => {
    const base64 = imageCache[path] || null;
    if (base64) {
      imagesHtml += `<img src="${base64}" class="evidence-image" style="max-width:320px;max-height:280px;display:block;margin:8px auto;"/>`;
    } else {
      imagesHtml += `<div style="width:180px;height:100px;background:#e5e7eb;border:1px dashed #9ca3af;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#6b7280;text-align:center;padding:4px;margin:4px auto;">Imagen no disponible</div>`;
    }
  });
  if (!imagesHtml) return '';
  return `
    <div style="margin-top:8px;padding:8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
      <div style="font-size:8px;font-weight:bold;color:#374151;margin-bottom:6px;">${title}</div>
      ${imagesHtml}
    </div>`;
};

const buildFailurePdfBlock = (failure, idx, imageCache, formatDate) => {
  const t = failure.traceability || {
    code: 'NONE', label: 'Sin seguimiento', color: '#9ca3af', bgColor: '#f3f4f6', shortLabel: 'Sin seguimiento'
  };
  const ar = failure.repairExecution;
  const wo = failure.workOrder;

  const partsHtml = (wo?.parts || []).map(p =>
    `<span style="display:block;font-size:8px;margin:2px 0;">• ${p.name} x${p.quantity}</span>`
  ).join('');
  const reqHtml = (wo?.requisitions || []).map(r =>
    `<span style="display:block;font-size:8px;margin:2px 0;">• ${r.part_reference} (${r.status}) x${r.quantity_requested}</span>`
  ).join('');

  let arHtml = '';
  if (ar) {
    const signatureHtml = ar.closure_signature
      ? `<img src="${ar.closure_signature}" alt="Firma" style="max-height:60px;max-width:180px;border:1px solid #e5e7eb;border-radius:4px;margin:4px 0;"/>`
      : '<span style="font-size:8px;color:#6b7280;">Sin firma registrada</span>';
    const evidenceUrls = [];
    if (ar.evidence_url) evidenceUrls.push(ar.evidence_url);
    arHtml = `
      <div style="margin-top:8px;padding:10px;background:#fff;border-radius:6px;border:1px solid #dbeafe;">
        <div style="font-size:9px;font-weight:bold;color:#1d4ed8;margin-bottom:6px;">📋 Acta de Reparación (${ar.repair_execution_id})</div>
        <div style="font-size:8px;color:#374151;margin-bottom:4px;"><strong>Actividad realizada:</strong> ${ar.activity_performed || 'N/A'}</div>
        <table style="width:100%;font-size:8px;border-collapse:collapse;margin:4px 0;">
          <tr><td style="padding:2px 4px;border:1px solid #e2e8f0;width:50%;"><strong>Técnico:</strong> ${ar.resolver_name || 'N/A'}</td>
              <td style="padding:2px 4px;border:1px solid #e2e8f0;width:50%;"><strong>Estado:</strong> ${ar.status || 'N/A'}</td></tr>
          <tr><td style="padding:2px 4px;border:1px solid #e2e8f0;"><strong>Inicio:</strong> ${ar.start_time ? formatDate(ar.start_time) : 'N/A'}</td>
              <td style="padding:2px 4px;border:1px solid #e2e8f0;"><strong>Fin:</strong> ${ar.end_time ? formatDate(ar.end_time) : 'N/A'}</td></tr>
          <tr><td style="padding:2px 4px;border:1px solid #e2e8f0;" colspan="2"><strong>Horas trabajadas:</strong> ${formatPdfHours(ar.start_time, ar.end_time)}</td></tr>
        </table>
        <div style="font-size:8px;color:#374151;margin-top:4px;"><strong>Firma de cierre:</strong></div>
        ${signatureHtml}
        ${evidenceUrls.length > 0
        ? buildPdfEvidenceSection('Evidencia de la reparación', evidenceUrls, imageCache)
        : '<div style="font-size:8px;color:#6b7280;margin-top:4px;font-style:italic;">Sin evidencia fotográfica de reparación</div>'}
      </div>`;
  }

  let otHtml = '';
  if (wo && t.code === 'OT') {
    const otEvidenceUrls = [];
    if (wo.evidence_url) otEvidenceUrls.push(wo.evidence_url);
    const woSignatureHtml = wo.closure_signature
      ? `<img src="${wo.closure_signature}" alt="Firma" style="max-height:60px;max-width:180px;border:1px solid #e5e7eb;border-radius:4px;margin:4px 0;"/>`
      : '';
    otHtml = `
      <div style="margin-top:8px;padding:10px;background:#fff;border-radius:6px;border:1px solid #fde68a;">
        <div style="font-size:9px;font-weight:bold;color:#b45309;margin-bottom:6px;">🔧 Orden de Trabajo (${wo.work_order_id})</div>
        <div style="font-size:8px;color:#374151;margin-bottom:4px;"><strong>Actividad:</strong> ${wo.activity_performed || 'N/A'}</div>
        <table style="width:100%;font-size:8px;border-collapse:collapse;margin:4px 0;">
          <tr><td style="padding:2px 4px;border:1px solid #e2e8f0;width:50%;"><strong>Estado:</strong> ${wo.status || 'N/A'}</td>
              <td style="padding:2px 4px;border:1px solid #e2e8f0;width:50%;"><strong>Técnico:</strong> ${wo.resolver_name || 'N/A'}</td></tr>
        </table>
        ${partsHtml ? `<div style="margin-top:4px;font-size:8px;"><strong>Repuestos utilizados:</strong><div style="margin:2px 0 0 8px;">${partsHtml}</div></div>` : ''}
        ${reqHtml ? `<div style="margin-top:4px;font-size:8px;"><strong>Requisiciones:</strong><div style="margin:2px 0 0 8px;">${reqHtml}</div></div>` : ''}
        ${woSignatureHtml ? `<div style="margin-top:4px;"><strong style="font-size:8px;">Firma de cierre:</strong>${woSignatureHtml}</div>` : ''}
        ${otEvidenceUrls.length > 0
        ? buildPdfEvidenceSection('Evidencia de la orden de trabajo', otEvidenceUrls, imageCache)
        : ''}
      </div>`;
  }

  let cancelHtml = '';
  if (t.code === 'CANCELLED') {
    const cancelledBy = ar?.cancelled_by_name || wo?.cancelled_by_name || 'No registrado';
    const cancelledAt = t.cancelled_at ? formatDate(t.cancelled_at) : 'N/A';
    cancelHtml = `
      <div style="margin-top:8px;padding:10px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca;">
        <div style="font-size:9px;font-weight:bold;color:#dc2626;">🚫 Falla cancelada</div>
        <div style="font-size:8px;color:#374151;margin-top:4px;"><strong>Motivo:</strong> ${t.cancellation_reason || 'N/A'}</div>
        <div style="font-size:8px;color:#374151;margin-top:2px;"><strong>Cancelada por:</strong> ${cancelledBy} | <strong>Fecha:</strong> ${cancelledAt}</div>
      </div>`;
  }

  return `
    <div style="background:${t.bgColor};margin-top:8px;padding:10px;border-radius:6px;border-left:4px solid ${t.color};box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="font-size:9px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <strong style="color:#1f2937;">${idx + 1}. OF-${failure.failure_order_id}</strong>
        <span style="font-size:8px;font-weight:bold;color:${t.color};background:#fff;padding:2px 8px;border-radius:4px;border:1px solid ${t.color};white-space:nowrap;">${t.label}</span>
      </div>
      <table style="width:100%;font-size:8px;border-collapse:collapse;margin-bottom:4px;">
        <tr><td style="padding:2px 4px;color:#6b7280;width:33%;"><strong>Fecha reporte:</strong> ${formatDate(failure.created_at)}</td>
            <td style="padding:2px 4px;color:#6b7280;width:33%;"><strong>Severidad:</strong> ${failure.severity || 'N/A'}</td>
            <td style="padding:2px 4px;color:#6b7280;width:34%;"><strong>Máquina:</strong> ${failure.affected_machine || 'N/A'}</td></tr>
        <tr><td style="padding:2px 4px;color:#6b7280;"><strong>Reportó:</strong> ${failure.reporter_name || 'N/A'}</td>
            <td style="padding:2px 4px;color:#6b7280;"><strong>Asignado:</strong> ${failure.assigned_to_name || 'N/A'}</td>
            <td style="padding:2px 4px;color:#6b7280;"><strong>Recurrencia:</strong> ${failure.recurrence_count > 0 ? `${failure.recurrence_count} vez/veces` : 'Primera vez'}</td></tr>
      </table>
      <div style="font-size:9px;color:#374151;margin:6px 0;padding:6px;background:#fff;border-radius:4px;border:1px solid #e5e7eb;"><strong>Descripción de la falla:</strong><br/>${failure.description}</div>
      ${buildPdfEvidenceSection('Evidencia de la falla', failure.evidence_url, imageCache)}
      ${arHtml}
      ${otHtml}
      ${cancelHtml}
    </div>`;
};

const generateChecklistHTML = async (data) => {
  const fs = require('fs');
  const path = require('path');

  // ✅ Intentar cargar Sharp, pero tener fallback si falla
  let sharp = null;
  let useSharp = false;
  try {
    sharp = require('sharp');
    useSharp = true;
    console.log('✅ Sharp cargado correctamente para optimización de imágenes');
  } catch (error) {
    console.warn('⚠️ Sharp no disponible, usando conversión directa (sin optimización):', error.message);
    useSharp = false;
  }

  // ✅ Función para convertir imágenes a base64 (con o sin Sharp)
  const { resolveLocalEvidencePath } = require('../config/multerConfig');

  const getImageAsBase64 = async (imagePath) => {
    if (!imagePath) return null;

    try {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return null;
      }

      let absolutePath = resolveLocalEvidencePath(imagePath);
      if (!absolutePath || !fs.existsSync(absolutePath)) {
        const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        absolutePath = path.join(__dirname, '../../public', cleanPath);
        if (!fs.existsSync(absolutePath)) {
          return null;
        }
      }

      const fileData = fs.readFileSync(absolutePath);
      const sizeKb = fileData.length / 1024;

      if (useSharp && sharp && sizeKb >= 200) {
        try {
          const buffer = await sharp(fileData)
            .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();
          return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch (sharpError) {
          console.warn('⚠️ Error con Sharp, usando fallback:', sharpError.message);
        }
      }

      const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
      let mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';

      return `data:${mimeType};base64,${fileData.toString('base64')}`;
    } catch (error) {
      console.error('❌ Error al procesar imagen para PDF:', imagePath, error.message);
      return null;
    }
  };

  // ✅ PRE-PROCESAR TODAS LAS IMÁGENES ANTES DE GENERAR HTML
  const imageCache = {};

  // Procesar imagen del usuario
  if (data.creator?.user_image) {
    imageCache[data.creator.user_image] = await getImageAsBase64(data.creator.user_image);
  }

  // Procesar imágenes de respuestas y fallas
  if (data.items) {
    for (const item of data.items) {
      // Para checklists de familia, procesar subItems
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (subItem.responses && subItem.responses[0]?.evidence_url) {
            const url = subItem.responses[0].evidence_url;
            if (!imageCache[url]) {
              imageCache[url] = await getImageAsBase64(url);
            }
          }
        }
      }

      // Para checklists normales, procesar respuestas directas
      if (item.responses && item.responses[0]?.evidence_url) {
        const url = item.responses[0].evidence_url;
        if (!imageCache[url]) {
          imageCache[url] = await getImageAsBase64(url);
        }
      }
    }
  }

  // Procesar imágenes de fallas (evidencia de falla y de reparación)
  if (data.failures?.failures_by_item) {
    for (const itemFailures of Object.values(data.failures.failures_by_item)) {
      for (const failure of itemFailures) {
        const urls = [
          failure.evidence_url,
          failure.repairExecution?.evidence_url,
          failure.workOrder?.evidence_url
        ].filter(Boolean);

        for (const url of urls) {
          if (!imageCache[url]) {
            imageCache[url] = await getImageAsBase64(url);
          }
        }
      }
    }
  }

  // Procesar imágenes de fallas cerradas en la fecha del reporte
  if (data.failures?.closed_on_cutoff) {
    for (const failure of data.failures.closed_on_cutoff) {
      const urls = [
        failure.evidence_url,
        failure.repairExecution?.evidence_url,
        failure.workOrder?.evidence_url
      ].filter(Boolean);

      for (const url of urls) {
        if (!imageCache[url]) {
          imageCache[url] = await getImageAsBase64(url);
        }
      }
    }
  }

  console.log(`✅ Pre-procesadas ${Object.keys(imageCache).length} imágenes para PDF ${useSharp ? '(optimizadas con Sharp)' : '(sin optimización)'}`);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
  }

  // Función para ordenamiento natural de números de ítems
  const naturalSortItemNumbers = (items) => {
    return items.sort((a, b) => {
      const itemA = a.item_number || '';
      const itemB = b.item_number || '';

      // Dividir por puntos y convertir cada parte a número para comparación
      const partsA = itemA.split('.').map(part => parseInt(part, 10) || 0);
      const partsB = itemB.split('.').map(part => parseInt(part, 10) || 0);

      // Comparar parte por parte
      const maxLength = Math.max(partsA.length, partsB.length);

      for (let i = 0; i < maxLength; i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;

        if (partA !== partB) {
          return partA - partB;
        }
      }

      // Si todas las partes son iguales, comparar como string como fallback
      return itemA.localeCompare(itemB);
    });
  };

  const renderResponses = (items) => {
    let html = ""
    // Ordenar los ítems antes de renderizar
    const sortedItems = naturalSortItemNumbers([...items]);
    sortedItems.forEach((item) => {
      // Verificar si es un ítem padre (parent_item_id es null)
      const isParentItem = !item.parent_item_id;

      if (isParentItem) {
        // Renderizar el ítem padre en negrilla
        html += `
                    <tr class="parent-item-row" style="background-color: #f8fafc;">
                        <td colspan="4" style="font-size: 10px; font-weight: bold; padding: 6px; color: #374151;">
                            <strong>${item.item_number}. ${item.question_text}</strong>
                        </td>
                    </tr>
                 `
      } else {
        // Es un ítem hijo, renderizar sin negrilla en el texto
        const response = item.responses && item.responses[0] ? item.responses[0] : {}

        // Determinar el valor correcto basado en el tipo de respuesta
        let displayValue = ""
        if (response.response_compliance) {
          displayValue = response.response_compliance
        } else if (response.response_numeric !== null && response.response_numeric !== undefined) {
          displayValue = response.response_numeric.toString()
        } else if (response.response_text) {
          displayValue = response.response_text
        } else {
          displayValue = response.value || ""
        }

        // Obtener las fallas asociadas a este item
        const itemFailures = data.failures?.failures_by_item?.[item.checklist_item_id] || [];

        let failuresHtml = '';
        if (itemFailures.length > 0) {
          failuresHtml = `
            <div style="margin-top: 6px; padding: 6px; background: #fefbeb; border-radius: 4px;">
              <strong style="font-size: 9px; color: #92400e;">📋 Órdenes de Falla (${itemFailures.length})</strong>
              ${itemFailures.map((failure, idx) => buildFailurePdfBlock(failure, idx, imageCache, formatDate)).join('')}
            </div>
          `;
        }

        // Construir contenido de observaciones (comentario + descripciones de fallas)
        let comment = response.comment || "";
        if (itemFailures.length > 0) {
          const failureDescriptions = itemFailures.map(f => `[Falla: ${f.description}]`).join(' ');
          comment = comment ? `${comment} <br/> ${failureDescriptions}` : failureDescriptions;
        }

        html += `
                    <tr class="sub-item-row">
                        <td style="font-size: 9px; font-weight: bold;">${item.item_number}</td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                            <div style="word-wrap: break-word;">${item.question_text}</div>
                        </td>
                        <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                            ${displayValue}
                        </td>
                        <td style="font-size: 9px; line-height: 1.3; padding: 4px 6px;">
                            <div style="word-wrap: break-word;">${comment}</div>
                        </td>
                    </tr>
                    ${failuresHtml ? `
                    <tr class="failures-row" style="background-color: #fefbeb;">
                        <td colspan="4" style="padding: 6px 10px; border-top: 1px solid #e5e7eb;">
                            ${failuresHtml}
                        </td>
                    </tr>
                    ` : ''}
                 `
      }
    })
    return html
  }

  const renderFamilyResponses = (deviceSections) => {
    let html = ""

    deviceSections.forEach((deviceSection) => {
      // Encabezado del dispositivo (sección de color morado)
      html += `
              <tr class="device-section-row" style="background-color: #7c3aed; color: white;">
                  <td colspan="4" style="font-size: 10px; font-weight: bold; padding: 8px; color: white;">
                      <strong>📱 ${deviceSection.item_number}. ${deviceSection.question_text}</strong>
                  </td>
              </tr>
           `

      // Iterar sobre los subItems (padres e hijos del dispositivo)
      if (deviceSection.subItems && deviceSection.subItems.length > 0) {
        deviceSection.subItems.forEach((item) => {
          // Determinar si debe renderizarse como un header de sección o como una pregunta normal
          // Es un header si es item raíz Y (tiene hijos debajo O es de tipo section) Y no tiene respuestas propias
          const hasChildren = deviceSection.subItems.some(sub => sub.parent_item_id === item.checklist_item_id);
          const isSectionHeader = !item.parent_item_id && (hasChildren || item.input_type === 'section') && (!item.responses || item.responses.length === 0);

          if (isSectionHeader) {
            // Renderizar item padre en negrilla (como separador de categoría)
            html += `
                <tr class="parent-item-row" style="background-color: #f8fafc;">
                    <td colspan="4" style="font-size: 10px; font-weight: bold; padding: 6px; color: #374151;">
                        <strong>${item.item_number}. ${item.question_text}</strong>
                    </td>
                </tr>
             `
          } else {
            // Item con respuesta o item hijo: mostrar respuesta + fallas
            const response = item.responses && item.responses[0] ? item.responses[0] : {}

            // Determinar el valor correcto basado en el tipo de respuesta
            let displayValue = ""
            if (response.response_compliance) {
              displayValue = response.response_compliance
            } else if (response.response_numeric !== null && response.response_numeric !== undefined) {
              displayValue = response.response_numeric.toString()
            } else if (response.response_text) {
              displayValue = response.response_text
            } else {
              displayValue = response.value || ""
            }

            // Obtener las fallas asociadas a este item de este dispositivo
            // La clave usa unique_frontend_id que es "{device_ins_id}-{checklist_item_id}"
            const failureKey = item.unique_frontend_id || item.checklist_item_id;
            const itemFailures = data.failures?.failures_by_item?.[failureKey] ||
                                 data.failures?.failures_by_item?.[item.checklist_item_id] || [];

            let failuresHtml = '';
            if (itemFailures.length > 0) {
              failuresHtml = `
                <div style="margin-top: 4px; padding: 4px; background: #fefbeb; border-radius: 4px;">
                  <strong style="font-size: 8px; color: #92400e;">📋 Fallas (${itemFailures.length})</strong>
                  ${itemFailures.map((failure, idx) => {
                const t = failure.traceability || { code: 'NONE', label: 'Sin seguimiento', color: '#9ca3af', bgColor: '#f3f4f6', shortLabel: '—' };
                return `
                    <div style="background: ${t.bgColor}; margin-top: 4px; padding: 4px; border-radius: 3px; border-left: 3px solid ${t.color};">
                      <div style="font-size: 7px; margin-bottom: 2px; display:flex; justify-content:space-between; align-items:center;">
                        <strong>${idx + 1}. ${failure.severity || 'N/A'}</strong>
                        <span style="font-size:7px;font-weight:bold;color:${t.color};background:#fff;padding:1px 4px;border-radius:3px;border:1px solid ${t.color};">${t.shortLabel}</span>
                      </div>
                      <div style="font-size: 7px; color: #374151;">${failure.description}</div>
                      ${t.code === 'CANCELLED' && t.cancellation_reason ? `<div style="font-size:7px;color:#dc2626;"><strong>Motivo:</strong> ${t.cancellation_reason}</div>` : ''}
                      <div style="font-size: 7px; color: #6b7280;">
                        <strong>Área:</strong> ${failure.assigned_to || 'No asignado'} |
                        <strong>Recurrencia:</strong> ${failure.recurrence_count > 0 ? `${failure.recurrence_count} vez` : 'Primera vez'}
                      </div>
                    </div>`;
              }).join('')}
                </div>
              `;
            }

            let comment = response.comment || "";
            if (itemFailures.length > 0) {
              const failureDescriptions = itemFailures.map(f => `[Falla: ${f.description}]`).join(' ');
              comment = comment ? `${comment} <br/> ${failureDescriptions}` : failureDescriptions;
            }

            html += `
                        <tr class="sub-item-row">
                            <td style="font-size: 9px; font-weight: bold;">${item.item_number}</td>
                            <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                                <div style="word-wrap: break-word;">${item.question_text}</div>
                            </td>
                            <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                                ${displayValue}
                            </td>
                            <td style="font-size: 9px; line-height: 1.3; padding: 4px 6px;">
                                <div style="word-wrap: break-word;">${comment}</div>
                            </td>
                        </tr>
                        ${failuresHtml ? `
                        <tr class="failures-row" style="background-color: #fefbeb;">
                            <td colspan="4" style="padding: 6px 10px; border-top: 1px solid #e5e7eb;">
                                ${failuresHtml}
                            </td>
                        </tr>
                        ` : ''}
                     `
          }
        })
      }
    })
    return html
  }


  const signaturesHTML = data.signatures
    .map(
      (sig) => `
        <div class="signature">
            <img src="${sig.digital_token || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}" alt="Firma de ${sig.user.user_name}" onerror="this.onerror=null;this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';"/>
            <p><strong>${sig.user.user_name}</strong></p>
            <p class="role">${sig.role?.role_name || 'Rol Desconocido'}</p>
            <p class="date">Firmado: ${formatDate(sig.signed_at)}</p>
        </div>
    `,
    )
    .join("")

  const closedFailuresHtml = (data.failures?.closed_on_cutoff || []).length > 0 ? `
                <div class="items-section" style="margin-top: 24px;">
                    <h2>Fallas cerradas en la fecha del reporte</h2>
                    <div style="margin-top:12px;">
                        ${data.failures.closed_on_cutoff.map((f, idx) =>
        buildFailurePdfBlock({
          failure_order_id: f.failure_order_id,
          description: f.description,
          traceability: f.traceability,
          created_at: f.created_at,
          severity: f.severity,
          affected_machine: f.affected_machine,
          reporter_name: f.reporter_name,
          assigned_to_name: f.assigned_to_name,
          assigned_to: f.assigned_to,
          recurrence_count: f.recurrence_count,
          evidence_url: f.evidence_url,
          repairExecution: f.repairExecution,
          workOrder: f.workOrder
        }, idx, imageCache, formatDate)
      ).join('<hr style="border:none;border-top:2px dashed #d1d5db;margin:12px 0;">')}
                    </div>
                </div>
                ` : '';

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Checklist - Alist GBX</title>
            <style>
                :root {
                    --primary-purple: #8b5cf6;
                    --primary-purple-dark: #7c3aed;
                    --primary-purple-light: #a78bfa;
                    --slate-50: #f8fafc;
                    --slate-100: #f1f5f9;
                    --slate-200: #e2e8f0;
                    --slate-300: #cbd5e1;
                    --slate-400: #94a3b8;
                    --slate-500: #64748b;
                    --slate-600: #475569;
                    --slate-700: #334155;
                    --slate-800: #1e293b;
                    --slate-900: #0f172a;
                    --dark-blue: #1e3a8a;
                    --dark-blue-light: #3b82f6;
                    --success-green: #10b981;
                    --success-light: #d1fae5;
                    --warning-amber: #f59e0b;
                    --warning-light: #fef3c7;
                    --error-red: #ef4444;
                    --error-light: #fee2e2;
                }
                
                * { box-sizing: border-box; }
                body { 
                    font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    font-size: 11px; 
                    color: var(--slate-800); 
                    line-height: 1.5; 
                    margin: 0;
                    padding: 0;
                    background: var(--slate-50);
                }
                
                .report-container { 
                    width: 100%; 
                    max-width: 1200px;
                    margin: 0 auto; 
                    background: white;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .header { 
                    background: white;
                    padding: 0;
                    position: relative;
                    border-bottom: 3px solid #00bcd4;
                }
                
                .header-banner {
                    display: flex;
                    height: 60px;
                    overflow: hidden;
                }
                
                .header-cyan {
                    background: #00bcd4;
                    flex: 0 0 40%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 20px;
                }
                
                .header-lime {
                    background: #c0d725;
                    flex: 0 0 60%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 0 20px;
                }
                
                .header-cyan h1 {
                    color: white;
                    font-size: 32px;
                    font-weight: 300;
                    letter-spacing: 0.05em;
                    margin: 0;
                    font-family: 'Arial', sans-serif;
                }
                
                .header-lime h2 {
                    color: white;
                    font-size: 20px;
                    font-weight: 300;
                    letter-spacing: 0.05em;
                    margin: 0;
                    text-transform: uppercase;
                    font-family: 'Arial', sans-serif;
                }
                
                .header-nit {
                    background: white;
                    padding: 8px 20px;
                    text-align: left;
                }
                
                .header-nit p {
                    color: #00bcd4;
                    font-size: 14px;
                    font-weight: 400;
                    margin: 0;
                    font-family: 'Arial', sans-serif;
                }
                
                .info-section { 
                    padding: 24px 20px;
                    background: var(--slate-50);
                    border-bottom: 1px solid var(--slate-200);
                }
                
                .info-section h2 {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--slate-800);
                    margin: 0 0 16px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid var(--primary-purple);
                    display: inline-block;
                }
                
                .info-section table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 16px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .info-section th, .info-section td { 
                    text-align: left; 
                    padding: 12px 16px; 
                    border: none;
                    font-size: 11px;
                }
                
                .info-section th { 
                    background: linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-dark) 100%);
                    color: white; 
                    font-weight: 600;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .info-section td { 
                    background: white;
                    border-top: 1px solid var(--slate-200);
                }
                
                .info-section tr:nth-child(even) td {
                    background: var(--slate-50);
                }
                
                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid var(--slate-200);
                    object-fit: cover;
                }
                
                .items-section {
                    padding: 24px 20px;
                    background: white;
                }
                
                .items-section h2 {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--slate-800);
                    margin: 0 0 20px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid var(--primary-purple);
                    display: inline-block;
                }
                
                .items-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .items-table th, .items-table td { 
                    border: 1px solid var(--slate-200); 
                    text-align: left; 
                    vertical-align: top;
                }
                
                .items-table th { 
                    background: linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-dark) 100%);
                    color: white; 
                    font-weight: 600; 
                    text-align: center; 
                    font-size: 10px; 
                    padding: 12px 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .items-table td { 
                    background: white; 
                    font-size: 10px; 
                    padding: 8px;
                    border-top: 1px solid var(--slate-200);
                }
                
                .parent-item-row td { 
                    background: linear-gradient(135deg, var(--slate-100) 0%, var(--slate-200) 100%) !important; 
                    font-weight: 600;
                }
                
                .device-section-row td { 
                    background: linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-dark) 100%) !important; 
                    color: white !important;
                    font-weight: 600;
                }
                
                /* Distribución mejorada de columnas (4 columnas, sin evidencia) */
                .sub-item-row td:first-child { 
                    width: 8%; 
                    text-align: center; 
                    font-weight: 600;
                    color: var(--primary-purple-dark);
                }
                
                .sub-item-row td:nth-child(2) { 
                    width: 42%; 
                    line-height: 1.4;
                }
                
                .sub-item-row td:nth-child(3) { 
                    width: 18%; 
                    text-align: center; 
                    font-weight: 600;
                }
                
                .sub-item-row td:nth-child(4) { 
                    width: 32%; 
                    line-height: 1.3; 
                    padding: 4px 6px;
                }
                
                /* Estados de respuesta con colores mejorados */
                .cumple { 
                    background: var(--success-light) !important; 
                    color: var(--success-green);
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-weight: 600;
                }
                
                .no-cumple { 
                    background: var(--error-light) !important; 
                    color: var(--error-red);
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-weight: 600;
                }
                
                .observación { 
                    background: var(--warning-light) !important; 
                    color: var(--warning-amber);
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-weight: 600;
                }
                
                .evidence-image {
                    max-width: 320px;
                    max-height: 280px;
                    border-radius: 8px;
                    border: 1px solid var(--slate-300);
                    object-fit: contain;
                    margin: 6px;
                    background: #f1f5f9;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
                }
                
                .evidence-image:hover {
                    transform: scale(1.02);
                }
                
                .signatures-section { 
                    background: var(--slate-50);
                    padding: 32px 20px;
                    text-align: center;
                    border-top: 1px solid var(--slate-200);
                }
                
                .signatures-section h2 {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--slate-800);
                    margin: 0 0 24px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid var(--primary-purple);
                    display: inline-block;
                }
                
                .signatures-container {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 24px;
                }
                
                .signature { 
                    display: inline-block; 
                    margin: 0 12px; 
                    min-width: 160px;
                    background: white;
                    padding: 16px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    border: 1px solid var(--slate-200);
                }
                
                .signature img { 
                    max-width: 140px; 
                    height: auto; 
                    border-bottom: 2px solid var(--primary-purple); 
                    margin-bottom: 8px;
                    border-radius: 4px;
                }
                
                .signature p { 
                    margin: 4px 0; 
                    font-size: 11px;
                    color: var(--slate-700);
                }
                
                .signature .role { 
                    font-weight: 600; 
                    color: var(--primary-purple-dark);
                    font-size: 12px;
                }
                
                .signature .date {
                    color: var(--slate-500);
                    font-size: 10px;
                }
                
                @media print {
                    body { 
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .report-container {
                        box-shadow: none;
                        border-radius: 0;
                    }
                    
                    .items-table th, .items-table td { 
                        padding: 6px 4px; 
                    }
                    
                    .sub-item-row td:first-child { 
                        font-size: 10px; 
                    }
                    
                    .page-break { 
                        page-break-after: always; 
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <div class="header-banner">
                        <div class="header-cyan">
                            <h2>RECREATEC SAS</h2>
                        </div>
                        <div class="header-lime">
                            <h2>TECNOLOGÍA EN RECREACIÓN</h2>
                        </div>
                    </div>
                    <div class="header-nit">
                        <p>Nit. 800.195.487-1</p>
                    </div>
                </div>
                
                <div class="info-section">
                    <h2>Información General</h2>
                    <table>
                        <tr>
                            <th>Checklist ID</th>
                            <td>${data.checklist_id}</td>
                            <th>Fecha de Creación</th>
                            <td>${formatDate(data.createdAt)}</td>
                        </tr>
                        <tr>
                            <th>Realizado por</th>
                            <td colspan="3">
                                <div class="user-info">
                                    ${(() => {
      if (!data.creator.user_image) return '';
      const imgB64 = imageCache[data.creator.user_image] || null;
      return imgB64 ? `<img src="${imgB64}" alt="User Image" class="user-avatar" onerror="this.style.display='none';"/>` : '';
    })()}
                                    <div>
                                        <strong>${data.creator.user_name}</strong><br/>
                                        <small style="color: var(--slate-600);">${data.creator.role.role_name}</small>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>Tipo de Checklist</th>
                            <td colspan="3">
                                <strong>${data.type.name}</strong><br/>
                                <small style="color: var(--slate-600);">${data.type.description}</small>
                            </td>
                        </tr>
                        ${data.type.type_category === 'family' ? `
                        <tr>
                            <th>Período</th>
                            <td colspan="3">
                                <strong>Checklist de la Semana</strong><br/>
                                <small style="color: var(--slate-600);">
                                    ${data.week_info ? `${formatDate(data.week_info.start_date)} - ${formatDate(data.week_info.end_date)}` : 'Rango no disponible'}
                                </small>
                            </td>
                        </tr>
                        ` : ''}
                        ${data.type.type_category === 'attraction' ? `
                        <tr>
                            <th>Información de QR</th>
                            <td colspan="3">
                                <div style="font-size: 10px;">
                                    <strong>Informe de Códigos QR Desbloqueados</strong><br/>
                                    ${data.qr_scans && data.qr_scans.length > 0 ?
        data.qr_scans.map(scan =>
          `<div style="margin-top: 4px; padding: 4px; background: var(--slate-50); border-radius: 4px;">
                                                <strong>${scan.qr_code}</strong> - Desbloqueado: ${new Date(scan.scanned_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                                            </div>`
        ).join('')
        : '<small style="color: var(--slate-500);">No hay registros de QR desbloqueados</small>'
      }
                                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--slate-200);">
                                        <strong>Hora de Creación del Checklist:</strong> ${new Date(data.createdAt).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        ` : ''}
                        <tr>
                            <th>Ubicación</th>
                            <td colspan="3">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="color: var(--primary-purple-dark); font-weight: 600;">📍</span>
                                    <span><strong>GAME BOX ANDINO local 404</strong></span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="items-section">
                    <h2>Detalles del Checklist</h2>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 8%;">Item</th>
                                <th style="width: 42%;">Descripción</th>
                                <th style="width: 18%;">Respuesta</th>
                                <th style="width: 32%;">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.type.type_category === 'family' ? renderFamilyResponses(data.items) : renderResponses(data.items)}
                        </tbody>
                    </table>
                </div>
                
                ${closedFailuresHtml}

                ${(() => {
                  const reqs = data.pending_requisitions || [];
                  if (reqs.length === 0) return '';
                  return `
                  <div class="items-section" style="margin-top: 24px;">
                    <h2>Requisiciones Pendientes</h2>
                    <table class="items-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Repuesto</th>
                          <th>Cant.</th>
                          <th>Estado</th>
                          <th>Solicitada</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${reqs.map(r => `
                        <tr>
                          <td style="font-size:9px;">${r.id}</td>
                          <td style="font-size:9px;">${r.part_reference}</td>
                          <td style="font-size:9px;text-align:center;">${r.quantity_requested}</td>
                          <td style="font-size:9px;">${r.status}</td>
                          <td style="font-size:9px;">${formatDate(r.created_at)}</td>
                        </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>`;
                })()}

                <div class="page-break"></div>

                <div class="signatures-section">
                    <h2>Firmas Digitales</h2>
                    <div class="signatures-container">
                    ${signaturesHTML}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `
}

const getChecklistTypesByRole = async (req, res) => {
  try {
    const { role_id } = req.params;
    const checklistTypes = await ChecklistType.findAll({
      where: { role_id: role_id },
    });
    res.status(200).json(checklistTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Función helper para procesar checklists por tipo
const getChecklistByTypeHelper = async (checklistTypeId, checklistInstanceData) => {
  // 2. Fetch the ChecklistType with its associated ChecklistItems (template)
  const checklistTypeTemplate = await ChecklistType.findByPk(checklistTypeId, {
    include: [
      {
        model: ChecklistItem,
        as: 'items',
        where: { parent_item_id: null }, // Only fetch top-level items
        required: false,
        include: [
          {
            model: ChecklistItem,
            as: 'subItems',
            required: false,
          },
        ],
      },
    ],
  });

  if (!checklistTypeTemplate) {
    throw new Error("Tipo de Checklist no encontrado.");
  }

  // 3. Get responses if the checklist exists
  let instanceItems = [];
  if (checklistInstanceData && checklistInstanceData.checklist) {
    // Load existing responses for this checklist
    const ChecklistResponse = require('../models').ChecklistResponse;
    const responses = await ChecklistResponse.findAll({
      where: { checklist_id: checklistInstanceData.checklist.checklist_id }
    });
    instanceItems = responses;
  }

  const combinedItems = (checklistTypeTemplate.items || []).map(templateItem => {
    const instanceItem = instanceItems.find(
      instItem => instItem.checklist_item_id === templateItem.checklist_item_id
    );

    const subItems = (templateItem.subItems || []).map(templateSubItem => {
      const instanceSubItem = instanceItems.find(
        instItem => instItem.checklist_item_id === templateSubItem.checklist_item_id
      );
      return {
        ...templateSubItem.toJSON(),
        responses: instanceSubItem ? [instanceSubItem] : [],
        unique_frontend_id: templateSubItem.checklist_item_id.toString(), // Add for client compatibility
        inspectable_id_for_response: null, // Static checklists don't have specific inspectable
      };
    });

    return {
      ...templateItem.toJSON(),
      responses: instanceItem ? [instanceItem] : [],
      subItems: subItems,
      unique_frontend_id: templateItem.checklist_item_id.toString(), // Add for client compatibility
      inspectable_id_for_response: null, // Static checklists don't have specific inspectable
    };
  });

  return {
    ...checklistInstanceData, // Contains checklist_id, type, signatures, pending_work_orders
    type: checklistTypeTemplate.toJSON(), // Ensure the type data is from the template
    items: combinedItems,
  };
};

const getChecklistByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;
    const user_id = req.user.user_id;
    const role_id = req.user.role_id;

    // Use the existing service function that handles all checklist types correctly
    const checklist = await checklistService.getLatestChecklistByType({
      checklistTypeId: Number.parseInt(checklistTypeId),
      user_id,
      role_id,
    });

    if (!checklist) {
      return res.status(404).json({ error: "Checklist no encontrado para el tipo especificado." });
    }

    res.status(200).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLatestChecklistByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params
    const { user_id, role_id } = req.user

    console.log(`📥 [getLatestChecklistByType] Request received:`, {
      checklistTypeId,
      user_id,
      role_id,
      query: req.query
    });

    const checklist = await checklistService.getLatestChecklistByType({
      checklistTypeId: Number.parseInt(checklistTypeId),
      user_id,
      role_id,
    })

    console.log(`📤 [getLatestChecklistByType] Response:`, {
      checklistId: checklist?.checklist_id,
      weekIdentifier: checklist?.week_identifier,
      hasWeekInfo: !!checklist?.week_info,
      typeCategory: checklist?.type?.type_category,
      frequency: checklist?.type?.frequency
    });

    res.status(200).json(checklist)
  } catch (error) {
    console.error(`❌ [getLatestChecklistByType] Error:`, error.message);
    res.status(500).json({ error: error.message })
  }
}

const getChecklistHistoryByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params
    const checklists = await checklistService.getChecklistHistoryByType(Number.parseInt(checklistTypeId))
    res.status(200).json(checklists)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const { getChecklistDataForPDF } = require('../services/checklistService')

const getResolvedFailuresByChecklistType = async (req, res) => {
  try {
    const { checklist_type_id } = req.params;
    const workOrders = await checklistService.getWorkOrdersByChecklistType({
      checklist_type_id: Number.parseInt(checklist_type_id),
    });

    // Filter for resolved/closed work orders
    const resolvedWorkOrders = workOrders.filter(wo => wo.status === 'RESUELTA' || wo.status === 'CERRADA');

    res.status(200).json(resolvedWorkOrders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getWorkOrdersByChecklistType = async (req, res) => {
  try {
    const { checklist_type_id } = req.params;
    const workOrders = await checklistService.getWorkOrdersByChecklistType({
      checklist_type_id: Number.parseInt(checklist_type_id),
    });
    res.status(200).json(workOrders);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Obtener items padre ordenados para un tipo de checklist específico
const getParentItemsByChecklistType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;

    // Validar que el tipo de checklist existe
    const checklistType = await ChecklistType.findByPk(checklistTypeId);
    if (!checklistType) {
      return res.status(404).json({
        success: false,
        message: "Tipo de Checklist no encontrado."
      });
    }

    // Obtener items padre ordenados por número de item
    const parentItems = await ChecklistItem.findAll({
      where: {
        checklist_type_id: checklistTypeId,
        parent_item_id: null // Solo items padre
      },
      attributes: [
        'checklist_item_id',
        'item_number',
        'question_text',
        'guidance_text',
        'input_type',
        'allow_comment'
      ],
      order: [
        ['item_number', 'ASC'] // Ordenar por número de item
      ]
    });

    // Función para ordenamiento natural de números de ítems
    const naturalSortParentItems = (items) => {
      return items.sort((a, b) => {
        const itemA = a.item_number || '';
        const itemB = b.item_number || '';

        // Dividir por puntos y convertir cada parte a número para comparación
        const partsA = itemA.split('.').map(part => parseInt(part, 10) || 0);
        const partsB = itemB.split('.').map(part => parseInt(part, 10) || 0);

        // Comparar parte por parte
        const maxLength = Math.max(partsA.length, partsB.length);

        for (let i = 0; i < maxLength; i++) {
          const partA = partsA[i] || 0;
          const partB = partsB[i] || 0;

          if (partA !== partB) {
            return partA - partB;
          }
        }

        // Si todas las partes son iguales, comparar como string como fallback
        return itemA.localeCompare(itemB);
      });
    };

    // Aplicar ordenamiento natural
    const sortedParentItems = naturalSortParentItems(parentItems);

    res.status(200).json({
      success: true,
      data: {
        checklist_type_id: checklistType.checklist_type_id,
        checklist_type_name: checklistType.name,
        total_parent_items: sortedParentItems.length,
        parent_items: sortedParentItems.map(item => ({
          checklist_item_id: item.checklist_item_id,
          item_number: item.item_number,
          question_text: item.question_text,
          guidance_text: item.guidance_text,
          input_type: item.input_type,
          allow_comment: item.allow_comment
        }))
      }
    });
  } catch (error) {
    console.error('Error obteniendo items padre:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



const getChecklistTypeDetails = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;
    const checklistType = await ChecklistType.findByPk(checklistTypeId);

    if (!checklistType) {
      return res.status(404).json({ error: "Tipo de Checklist no encontrado." });
    }

    res.status(200).json(checklistType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPendingRequisitionsByChecklist = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const requisitions = await checklistService.getPendingRequisitionsForChecklist(
      parseInt(checklist_id)
    );
    res.status(200).json({
      success: true,
      data: { requisitions }
    });
  } catch (error) {
    console.error('Error obteniendo requisiciones pendientes:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PENDING_REQUISITIONS_ERROR', message: error.message }
    });
  }
};

module.exports = {
  ensureChecklistInstance,
  getLatestChecklist,
  createChecklist,
  getChecklistById,
  submitResponses,
  updateWorkOrder,
  listObservations,
  signChecklist,
  getChecklistHistory,
  downloadChecklistPDF,
  getChecklistTypes,
  getChecklistTypesByRole,
  getChecklistByType,
  getLatestChecklistByType,
  getChecklistHistoryByType,
  getPendingFailures,
  getClosedFailures,
  getWorkOrdersByChecklistType,
  getResolvedFailuresByChecklistType,
  getChecklistTypeDetails,
  getParentItemsByChecklistType,
  getPendingRequisitionsByChecklist
}
