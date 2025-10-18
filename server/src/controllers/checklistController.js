const { ChecklistType, ChecklistItem, Checklist, ChecklistResponse, ChecklistSignature, User } = require("../models")
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

    // Primero verificamos si ya existe una instancia para hoy
    const existingChecklist = await checklistService.getLatestChecklist({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    if (existingChecklist) {
      // Si ya existe una instancia, la retornamos
      return res.status(200).json(existingChecklist);
    }

    // Si no existe, creamos una nueva instancia
    const newChecklistResult = await checklistService.ensureChecklistInstance({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      created_by: user_id,
      role_id,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    if (!newChecklistResult || !newChecklistResult.checklist) {
      return res.status(400).json({ error: "No se pudo crear el checklist" });
    }

    // Enviar notificación si se creó una nueva instancia
    if (newChecklistResult.isNew) {
      console.log(`✅ Nueva instancia creada: ${newChecklistResult.message}`);
    }

    // Obtenemos el checklist completo con todos sus datos
    const fullChecklist = await checklistService.getLatestChecklist({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    res.status(201).json({
      ...fullChecklist,
      notification: newChecklistResult.isNew ? newChecklistResult.message : null
    });
  } catch (error) {
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
              as: 'item'
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
    res.status(200).json({ message: "Respuestas registradas exitosamente" })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const getPendingFailures = async (req, res) => {
  try {
    const { checklist_id } = req.params;
    const failures = await checklistService.getFailuresByStatus({
      checklist_id: Number.parseInt(checklist_id),
      status: 'pendiente'
    });
    res.status(200).json(failures);
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
    const failures = await checklistService.getFailuresByStatus({
      checklist_id: Number.parseInt(checklist_id),
      status: 'resuelto'
    });
    res.status(200).json(failures);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateFailure = async (req, res) => {
  try {
    const { id: failure_id } = req.params
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
      failure_id: Number.parseInt(failure_id),
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

    const updatedFailure = await checklistService.updateFailure(updateData)
    res.status(200).json({
      success: true,
      message: "Falla actualizada exitosamente",
      failure: updatedFailure,
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
  try {
    const { id } = req.params;

    const checklistData = await getChecklistDataForPDF(id)

    if (!checklistData) {
      return res.status(404).json({ error: "Checklist not found" })
    }

    const htmlContent = generateChecklistHTML(checklistData)

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    // Inject a style tag to handle page breaks
    await page.addStyleTag({
      content: `
      .page-break { page-break-after: always; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    `,
    })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
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

    await browser.close()

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="checklist-${checklistData.inspectable?.name?.replace(/ /g, '_') || 'desconocido'}-${id}.pdf"`,
    })

    res.send(pdfBuffer)
  } catch (error) {
    res.status(500).json({ error: "Error al generar el PDF" })
  }
}

const getChecklistTypes = async (req, res) => {
  try {
    const checklistTypes = await ChecklistType.findAll();
    res.status(200).json(checklistTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateChecklistHTML = (data) => {
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
                        <td colspan="5" style="font-size: 10px; font-weight: bold; padding: 6px; color: #374151;">
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

        const comment = response.comment || ""
        const evidence = response.evidence_url ?
        `<a href="http://localhost:5000${response.evidence_url}" target="_blank"><img src="http://localhost:5000${response.evidence_url}" class="evidence-image"/></a>` : ""

        html += `
                    <tr class="sub-item-row">
                        <td style="font-size: 9px; font-weight: bold;">${item.item_number}</td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                            <div style="max-width: 200px; word-wrap: break-word;">${item.question_text}</div>
                        </td>
                        <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                            ${displayValue}
                        </td>
                        <td style="font-size: 9px; line-height: 1.0; padding: 2px 4px;">
                            <div style="max-width: 120px; word-wrap: break-word;">${comment}</div>
                        </td>
                        <td style="text-align: center; padding: 2px;">${evidence}</td>
                    </tr>
                 `
      }
    })
    return html
  }

  const renderFamilyResponses = (items) => {
    let html = ""
    // Ordenar los ítems antes de renderizar
    const sortedItems = naturalSortItemNumbers([...items]);
    sortedItems.forEach((deviceSection) => {
      // Verificar si es un ítem padre (parent_item_id es null)
      const isParentItem = !deviceSection.parent_item_id;
      
      if (isParentItem) {
      // Renderizar el header de la sección de dispositivo en negrilla
      html += `
                <tr class="device-section-row" style="background-color: #7c3aed; color: white;">
                    <td colspan="5" style="font-size: 10px; font-weight: bold; padding: 6px; color: white;">
                        <strong>${deviceSection.question_text}</strong>
                    </td>
                </tr>
             `
      } else {
        // Es un ítem hijo, renderizar sin negrilla
        const response = deviceSection.responses && deviceSection.responses[0] ? deviceSection.responses[0] : {}

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

        const comment = response.comment || ""
        const evidence = response.evidence_url ?
        `<a href="http://localhost:5000${response.evidence_url}" target="_blank"><img src="http://localhost:5000${response.evidence_url}" class="evidence-image"/></a>` : ""

        html += `
                    <tr class="sub-item-row">
                        <td style="font-size: 9px; font-weight: bold;">${deviceSection.item_number}</td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                            <div style="max-width: 200px; word-wrap: break-word;">${deviceSection.question_text}</div>
                        </td>
                        <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                            ${displayValue}
                        </td>
                        <td style="font-size: 9px; line-height: 1.0; padding: 2px 4px;">
                            <div style="max-width: 120px; word-wrap: break-word;">${comment}</div>
                        </td>
                        <td style="text-align: center; padding: 2px;">${evidence}</td>
                    </tr>
                `
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
                    background: linear-gradient(135deg, var(--primary-purple) 0%, var(--dark-blue) 100%);
                    color: white;
                    text-align: center; 
                    padding: 24px 20px;
                    position: relative;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                    opacity: 0.1;
                }
                
                .header-content {
                    position: relative;
                    z-index: 1;
                }
                
                .app-title {
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                    margin: 0;
                }
                
                .report-title {
                    font-size: 16px;
                    font-weight: 500;
                    opacity: 0.9;
                    margin: 8px 0 0 0;
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
                
                /* Distribución mejorada de columnas */
                .sub-item-row td:first-child { 
                    width: 10%; 
                    text-align: center; 
                    font-weight: 600;
                    color: var(--primary-purple-dark);
                }
                
                .sub-item-row td:nth-child(2) { 
                    width: 35%; 
                    line-height: 1.4;
                }
                
                .sub-item-row td:nth-child(3) { 
                    width: 15%; 
                    text-align: center; 
                    font-weight: 600;
                }
                
                .sub-item-row td:nth-child(4) { 
                    width: 15%; 
                    line-height: 1.0; 
                    padding: 2px 4px;
                }
                
                .sub-item-row td:nth-child(5) { 
                    width: 25%; 
                    text-align: center;
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
                    max-width: 80px;
                    max-height: 60px;
                    border-radius: 6px;
                    border: 2px solid var(--slate-200);
                    object-fit: cover;
                    transition: transform 0.2s ease;
                }
                
                .evidence-image:hover {
                    transform: scale(1.05);
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
                    <div class="header-content">
                        <h1 class="app-title">Alist GBX</h1>
                        <p class="report-title">Reporte de Checklist</p>
                    </div>
                </div>
                
                <div class="info-section">
                    <h2>Información General</h2>
                    <table>
                        <tr>
                            <th>Checklist ID</th>
                            <td>${data.checklist_id}</td>
                            <th>Fecha</th>
                            <td>${formatDate(data.createdAt)}</td>
                        </tr>
                        <tr>
                            <th>Realizado por</th>
                            <td colspan="3">
                                <div class="user-info">
                                    ${data.creator.user_image ? `<img src="http://localhost:5000/${data.creator.user_image}" alt="User Image" class="user-avatar" onerror="this.style.display='none';"/>` : ''}
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
                        <tr>
                            <th>Elemento Inspeccionado</th>
                            <td colspan="3">
                                <strong>${data.inspectable?.name || 'N/A'}</strong>
                            </td>
                        </tr>
                        <tr>
                            <th>Ubicación</th>
                            <td colspan="3">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="color: var(--primary-purple-dark); font-weight: 600;">📍</span>
                                    <span>
                                        ${data.inspectable?.premise?.premise_name || 'Sede no especificada'}
                                        ${data.inspectable?.name ? ` > ${data.inspectable.name}` : ''}
                                    </span>
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
                                <th style="width: 10%;">Item</th>
                                <th style="width: 35%;">Descripción</th>
                                <th style="width: 15%;">Respuesta</th>
                                <th style="width: 15%;">Observaciones</th>
                                <th style="width: 25%;">Evidencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.type.family_id ? renderFamilyResponses(data.items) : renderResponses(data.items)}
                        </tbody>
                    </table>
                </div>
                
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

const getChecklistByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params;
    const user_id = req.user.user_id;
    const role_id = req.user.role_id;

    // 1. Ensure a checklist instance exists or is retrieved
    const checklistInstanceData = await checklistService.ensureChecklistInstance({
      checklist_type_id: Number.parseInt(checklistTypeId),
      inspectableId: null, // For type-based checklists, inspectableId is null
      created_by: user_id,
      role_id: role_id,
    });

    if (!checklistInstanceData) {
      return res.status(404).json({ error: "Checklist no encontrado para el tipo especificado." });
    }

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
      return res.status(404).json({ error: "Tipo de Checklist no encontrado." });
    }

    // 3. Combine the checklist instance data with the checklist type template
    // The checklistInstanceData already contains the 'type' and 'signatures' and 'pending_failures'
    // We need to merge the items from the template with the responses from the instance.

    const combinedItems = checklistTypeTemplate.items.map(templateItem => {
      const instanceItem = checklistInstanceData.items.find(
        instItem => instItem.checklist_item_id === templateItem.checklist_item_id
      );

      const subItems = templateItem.subItems.map(templateSubItem => {
        const instanceSubItem = checklistInstanceData.items.find(
          instItem => instItem.checklist_item_id === templateSubItem.checklist_item_id
        );
        return {
          ...templateSubItem.toJSON(),
          responses: instanceSubItem ? instanceSubItem.responses : [],
        };
      });

      return {
        ...templateItem.toJSON(),
        responses: instanceItem ? instanceItem.responses : [],
        subItems: subItems,
      };
    });


    const finalChecklistData = {
       ...checklistInstanceData, // Contains checklist_id, type, signatures, pending_failures
       type: checklistTypeTemplate.toJSON(), // Ensure the type data is from the template
      items: combinedItems,
    };

    res.status(200).json(finalChecklistData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLatestChecklistByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params
    const { user_id, role_id } = req.user
    const checklist = await checklistService.getLatestChecklistByType({
      checklistTypeId: Number.parseInt(checklistTypeId),
      user_id,
      role_id,
    })
    res.status(200).json(checklist)
  } catch (error) {
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

const getFailuresByChecklistType = async (req, res) => {
  try {
    const { checklist_type_id } = req.params;
    const failures = await checklistService.getFailuresByChecklistType({
      checklist_type_id: Number.parseInt(checklist_type_id),
    });
    res.status(200).json(failures);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
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

module.exports = {
  ensureChecklistInstance,
  getLatestChecklist,
  createChecklist,
  getChecklistById,
  submitResponses,
  updateFailure,
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
  getFailuresByChecklistType,
  getChecklistTypeDetails
}