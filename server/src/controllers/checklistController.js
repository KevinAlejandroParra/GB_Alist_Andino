const { ChecklistType, ChecklistItem, Checklist, ChecklistResponse, ChecklistSignature, User } = require("../models")
const checklistService = require("../services/checklistService")
const puppeteer = require("puppeteer")

const ensureChecklistInstance = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { premise_id, date, checklist_type_id } = req.body // Extraer checklist_type_id
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    const checklist = await checklistService.ensureChecklistInstance({
      inspectableId: Number.parseInt(inspectableId),
      premise_id,
      date,
      created_by: user_id,
      role_id,
      checklist_type_id: Number.parseInt(checklist_type_id), // Pasar checklist_type_id al servicio
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getLatestChecklist = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { date, checklist_type_id } = req.query // Extraer checklist_type_id
    const checklist = await checklistService.getLatestChecklist({
      inspectableId: Number.parseInt(inspectableId),
      date,
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
    const { date, inspectableId } = req.query;
    const user_id = req.user.user_id;
    const role_id = req.user.role_id;

    // Primero verificamos si ya existe una instancia para hoy
    const existingChecklist = await checklistService.getLatestChecklist({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      date,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    if (existingChecklist) {
      // Si ya existe una instancia, la retornamos
      return res.status(200).json(existingChecklist);
    }

    // Si no existe, creamos una nueva instancia
    const newChecklist = await checklistService.ensureChecklistInstance({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      date,
      created_by: user_id,
      role_id,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    if (!newChecklist) {
      return res.status(400).json({ error: "No se pudo crear el checklist" });
    }

    // Obtenemos el checklist completo con todos sus datos
    const fullChecklist = await checklistService.getLatestChecklist({
      inspectableId: inspectableId ? Number.parseInt(inspectableId) : null,
      date,
      checklist_type_id: Number.parseInt(checklistTypeId),
    });

    res.status(201).json(fullChecklist);
  } catch (error) {
    console.error("Error en createChecklist:", error);
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
    console.error("Error al obtener el checklist:", error);
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
    console.error("getPendingFailures Controller: Error:", error.message);
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
    console.error("getClosedFailures Controller: Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateFailure = async (req, res) => {
  try {
    const { id: failure_id } = req.params
    console.log("updateFailure Controller: Received failure_id:", failure_id)
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
    console.error("updateFailure Controller: Error:", error.message)
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
    console.log('=== DEBUG downloadChecklistPDF ===');
    console.log('checklist_id:', id);

    const checklistData = await getChecklistDataForPDF(id)
    console.log('checklistData obtenida:', checklistData ? 'SÍ' : 'NO');

    if (!checklistData) {
      console.log('Checklist no encontrado con ID:', id);
      return res.status(404).json({ error: "Checklist not found" })
    }

    console.log('Generando HTML para checklist:', checklistData.checklist_id);
    console.log('Tipo de checklist:', checklistData.type?.name);
    console.log('Número de items:', checklistData.items?.length);

    const htmlContent = generateChecklistHTML(checklistData)
    console.log('HTML generado exitosamente, longitud:', htmlContent.length);

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const page = await browser.newPage()
    page.on('console', msg => console.log('PAGE LOG:', msg.text())); // Add this line
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
          <div style="display: flex; justify-content: space-between; align-items: center;">
             <img src="http://localhost:5000/images/resources/felix.png" alt="Logo Image" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;"/>
            <div style="text-align: right;">
              <strong>${checklistData.type.name}</strong><br/>
              Versión: ${checklistData.version_label}
            </div>
          </div>
          <hr style="border: 1px solid #ccc; margin-top: 10px;"/>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 0 50px;">
          <hr style="border: 1px solid #ccc; margin-bottom: 10px;"/>
          Alist | Asistencia y Mantenimiento S.A.S.
          <span style="float: right;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    })

    await browser.close()

    console.log('PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="checklist-${checklistData.inspectable?.name?.replace(/ /g, '_') || 'desconocido'}-${id}.pdf"`,
    })

    res.send(pdfBuffer)
    console.log('PDF enviado exitosamente');
  } catch (error) {
    console.error("=== ERROR generando PDF ===");
    console.error("Error completo:", error);
    console.error("Stack trace:", error.stack);
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

  const renderResponses = (items) => {
    let html = ""
    items.forEach((item) => {
      if (item.subItems && item.subItems.length > 0) {
        // Renderizar el ítem padre en negrilla
        html += `
                    <tr class="parent-item-row" style="background-color: #f8fafc;">
                        <td colspan="5" style="font-size: 10px; font-weight: bold; padding: 6px; color: #374151; border-bottom: 2px solid #7c3aed;">
                            <strong>${item.item_number}. ${item.question_text}</strong>
                        </td>
                    </tr>
                 `

        // Si tiene sub-ítems, renderizar cada sub-ítem en su propia fila
        item.subItems.forEach((subItem) => {
          const response = subItem.responses && subItem.responses[0] ? subItem.responses[0] : {}

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
          `<a href="http://localhost:5000${response.evidence_url}" target="_blank"><img src="http://localhost:5000${response.evidence_url}" width="60" style="max-height: 40px; object-fit: cover;"/></a>` : ""

          html += `
                        <tr class="sub-item-row">
                            <td style="font-size: 9px; font-weight: bold; padding-left: 15px;">${subItem.item_number}</td>
                            <td style="font-size: 9px; line-height: 1.2; padding: 4px; padding-left: 15px;">
                                <div style="max-width: 200px; word-wrap: break-word;">${subItem.question_text}</div>
                            </td>
                            <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                                ${displayValue}
                            </td>
                            <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                                <div style="max-width: 120px; word-wrap: break-word;">${comment}</div>
                            </td>
                            <td style="text-align: center; padding: 2px;">${evidence}</td>
                        </tr>
                    `
        })
      } else {
        // Si no tiene sub-ítems, renderizar el ítem principal
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
        `<a href="http://localhost:5000${response.evidence_url}" target="_blank"><img src="http://localhost:5000${response.evidence_url}" width="60" style="max-height: 40px; object-fit: cover;"/></a>` : ""

        html += `
                    <tr class="sub-item-row">
                        <td style="font-size: 9px; font-weight: bold;">${item.item_number}</td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                            <div style="max-width: 200px; word-wrap: break-word;"><strong>${item.question_text}</strong></div>
                        </td>
                        <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                            ${displayValue}
                        </td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
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
    items.forEach((deviceSection) => {
      // Renderizar el header de la sección de dispositivo en negrilla
      html += `
                <tr class="device-section-row" style="background-color: #7c3aed; color: white;">
                    <td colspan="5" style="font-size: 10px; font-weight: bold; padding: 6px; color: white;">
                        <strong>${deviceSection.question_text}</strong>
                    </td>
                </tr>
             `

      deviceSection.subItems.forEach((subItem) => {
        const response = subItem.responses && subItem.responses[0] ? subItem.responses[0] : {}

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
        `<a href="http://localhost:5000${response.evidence_url}" target="_blank"><img src="http://localhost:5000${response.evidence_url}" width="60" style="max-height: 40px; object-fit: cover;"/></a>` : ""

        html += `
                    <tr class="sub-item-row">
                        <td style="font-size: 9px; font-weight: bold; padding-left: 15px;">${subItem.item_number}</td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px; padding-left: 15px;">
                            <div style="max-width: 200px; word-wrap: break-word;">${subItem.question_text}</div>
                        </td>
                        <td style="text-align: center; font-size: 9px; font-weight: bold; padding: 4px;" class="${displayValue.replace(" ", "-")}">
                            ${displayValue}
                        </td>
                        <td style="font-size: 9px; line-height: 1.2; padding: 4px;">
                            <div style="max-width: 120px; word-wrap: break-word;">${comment}</div>
                        </td>
                        <td style="text-align: center; padding: 2px;">${evidence}</td>
                    </tr>
                `
      })
    })
    return html
  }

  const signaturesHTML = data.signatures
    .map(
      (sig) => `
        <div class="signature">
            <img src="${sig.digital_token || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}" alt="Firma de ${sig.user.user_name}" style="max-width: 150px; height: auto; border-bottom: 1px solid #000;" onerror="this.onerror=null;this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';"/>
            <p>${sig.user.user_name}</p>
            <p><strong>${sig.role?.role_name || 'Rol Desconocido'}</strong></p>
            <p>Firmado: ${formatDate(sig.signed_at)}</p>
        </div>
    `,
    )
    .join("")

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Checklist</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; line-height: 1.4; }
                .report-container { width: 100%; margin: auto; }
                .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; margin-bottom: 20px; }
                .info-section { margin-bottom: 20px; }
                .info-section table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .info-section th, .info-section td { text-align: left; padding: 6px; border: 1px solid #e5e7eb; font-size: 10px; }
                .info-section th { background-color: #313bcf88; color: white; font-weight: bold; }
                .info-section td { background-color: #f9fafb; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th, .items-table td { border: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
                .items-table th { background-color: #7c3aed; color: white; font-weight: bold; text-align: center; font-size: 10px; padding: 6px; }
                .items-table td { background-color: white; font-size: 9px; padding: 4px; }
                .parent-item-row td { background-color: #f8fafc !important; border: 2px solid #7c3aed !important; }
                .device-section-row td { background-color: #7c3aed !important; color: white !important; }
                .sub-item-row td:first-child { width: 8%; text-align: center; font-weight: bold; }
                .sub-item-row td:nth-child(2) { width: 42%; }
                .sub-item-row td:nth-child(3) { width: 12%; text-align: center; font-weight: bold; }
                .sub-item-row td:nth-child(4) { width: 28%; }
                .sub-item-row td:nth-child(5) { width: 10%; text-align: center; }
                .cumple { background-color: #dcfce7 !important; color: #166534; }
                .no-cumple { background-color: #fecaca !important; color: #991b1b; }
                .observación { background-color: #fef3c7 !important; color: #92400e; }
                .signatures-section { display: flex; justify-content: space-around; padding: 20px; text-align: center; margin-top: 30px; }
                .signature { display: inline-block; margin: 0 15px; min-width: 150px; }
                .signature img { max-width: 120px; height: auto; border-bottom: 1px solid #000; margin-bottom: 5px; }
                .signature p { margin: 3px 0; font-size: 10px; }
                .signature .role { font-weight: bold; color: #f2f2f2; }
                @media print {
                    .items-table th, .items-table td { padding: 4px; }
                    .sub-item-row td:first-child { font-size: 9px; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="info-section">
                    <h2>Información General</h2>
                    <table>
                        <tr>
                            <th>Checklist ID</th><td>${data.checklist_id}</td>
                            <th>Fecha</th><td>${formatDate(data.date)}</td>
                        </tr>
                        <tr>
                            <th>Realizado por</th>
                            <td colspan="3">
                                <div style="display: flex; align-items: center;">
                                    ${data.creator.user_image ? `<img src="http://localhost:5000/${data.creator.user_image}" alt="User Image" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;" onerror="this.style.display='none';"/>` : ''}
                                    <div>
                                        <strong>${data.creator.user_name}</strong><br/>
                                        <small>${data.creator.role.role_name}</small>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>Tipo de Checklist</th>
                            <td colspan="3">
                                <strong>${data.type.name}</strong><br/>
                                <small>${data.type.description}</small>
                            </td>
                        </tr>
                        <tr>
                            <th>Elemento Inspeccionado</th><td colspan="3">${data.inspectable?.name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <th>Ubicación</th>
                            <td colspan="3">
                                ${data.inspectable?.premise?.premise_name || ''} >
                                ${data.inspectable?.name || ''}
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
                                <th>Descripción</th>
                                <th style="width: 12%;">Respuesta</th>
                                <th style="width: 25%;">Observaciones</th>
                                <th style="width: 15%;">Evidencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.type.family_id ? renderFamilyResponses(data.items) : renderResponses(data.items)}
                        </tbody>
                    </table>
                </div>
                
                <div class="page-break"></div>

                <div class="signatures-section">
                    <h2>Firmas</h2>
                    ${signaturesHTML}
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
      date: new Date().toISOString(),
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
      ...checklistInstanceData, // Contains checklist_id, date, type, signatures, pending_failures
      type: checklistTypeTemplate.toJSON(), // Ensure the type data is from the template
      items: combinedItems,
    };

    res.status(200).json(finalChecklistData);
  } catch (error) {
    console.error("Error fetching checklist by type ID:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const getLatestChecklistByType = async (req, res) => {
  try {
    const { checklistTypeId } = req.params
    const { date } = req.query
    const { user_id, role_id } = req.user
    const checklist = await checklistService.getLatestChecklistByType({
      checklistTypeId: Number.parseInt(checklistTypeId),
      date,
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
    console.error("getFailuresByChecklistType Controller: Error:", error.message);
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
    console.error("Error al obtener detalles del tipo de checklist:", error.message);
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