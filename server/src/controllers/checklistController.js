const checklistService = require("../services/checklistService")
const puppeteer = require("puppeteer")

const ensureChecklistInstance = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { premise_id, date } = req.body
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    const checklist = await checklistService.ensureChecklistInstance({
      inspectableId: Number.parseInt(inspectableId),
      premise_id,
      date,
      created_by: user_id,
      role_id,
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getLatestChecklist = async (req, res) => {
  try {
    const { inspectableId } = req.params
    const { date } = req.query
    const checklist = await checklistService.getLatestChecklist({
      inspectableId: Number.parseInt(inspectableId),
      date,
    })
    res.status(200).json(checklist)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

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
    const { id: checklist_id } = req.params
    const user_id = req.user.user_id
    const role_id = req.user.role_id

    await checklistService.signChecklist({
      checklist_id: Number.parseInt(checklist_id),
      user_id,
      role_id,
    })

    res.status(200).json({ message: "Checklist firmado exitosamente" })
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
    const checklistData = await checklistService.getChecklistDataForPDF(id)

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
          <div style="display: flex; justify-content: space-between; align-items: center;">
             <img src="${process.env.NEXT_PUBLIC_API}/images/resources/felix.png" alt="Logo Image" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;"/>
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

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="checklist-${checklistData.inspectable.name.replace(/ /g, '_')}-${id}.pdf`,
    })

    res.send(pdfBuffer)
  } catch (error) {
    console.error("Error generating PDF:", error)
    res.status(500).json({ error: "Error al generar el PDF" })
  }
}

const generateChecklistHTML = (data) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A"
    const date = new Date(dateStr)
    return date.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
  }

  const renderResponses = (items) => {
    let html = ""
    items.forEach((item) => {
      html += `
                <tr class="item-row">
                    <td style="font-weight: bold;">${item.item_number}</td>
                    <td colspan="4">${item.question_text}</td>
                </tr>
            `
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem) => {
          const response = subItem.responses && subItem.responses[0] ? subItem.responses[0] : {}
          const value = response.value || ""
          const comment = response.comment || ""
          const evidence = response.evidence_url ? 
          `<a href="${process.env.NEXT_PUBLIC_API}${response.evidence_url}" target="_blank"><img src="http://127.0.0.1:5000${response.evidence_url}" width="100" /></a>` : ""

          html += `
                        <tr class="sub-item-row">
                            <td>${subItem.item_number}</td>
                            <td>${subItem.question_text}</td>
                            <td class="${value.replace(" ", "-")}">${value}</td>
                            <td>${comment}</td>
                            <td>${evidence}</td>
                        </tr>
                    `
        })
      } else {
        const response = item.responses && item.responses[0] ? item.responses[0] : {}
        const value = response.value || ""
        const comment = response.comment || ""
        const evidence = response.evidence_url ? 
        `<a href="${process.env.NEXT_PUBLIC_API}${response.evidence_url}" target="_blank"><img src="http://127.0.0.1:5000${response.evidence_url}" width="100" /></a>` : ""
        html += `
                    <tr class="sub-item-row">
                        <td></td>
                        <td></td>
                        <td class="${value.replace(" ", "-")}">${value}</td>
                        <td>${comment}</td>
                        <td>${evidence}</td>
                    </tr>
                 `
      }
    })
    return html
  }

  const renderFamilyResponses = (items) => {
    let html = ""
    items.forEach((deviceSection) => {
      html += `
                <tr class="device-section-row">
                    <td colspan="5" style="background-color: #e0e0e0; font-weight: bold;">${deviceSection.item_number} - ${deviceSection.question_text}</td>
                </tr>
            `
      deviceSection.subItems.forEach((subItem) => {
        const response = subItem.responses && subItem.responses[0] ? subItem.responses[0] : {}
        const value = response.value || ""
        const comment = response.comment || ""
        const evidence = response.evidence_url ? 
        `<a href="http://127.0.0.1:5000${response.evidence_url}" target="_blank"><img src="http://127.0.0.1:5000${response.evidence_url}" width="100" /></a>` : ""

        html += `
                    <tr class="sub-item-row">
                        <td>${subItem.item_number}</td>
                        <td>${subItem.question_text}</td>
                        <td class="${value.replace(" ", "-")}">${value}</td>
                        <td>${comment}</td>
                        <td>${evidence}</td>
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
            <img src="${sig.digital_token}" alt="Firma" style="width: 150px; height: auto; border-bottom: 1px solid #000;"/>
            <p>${sig.user.user_name}</p>
            <p><strong>${sig.role_at_signature}</strong></p>
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
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #333; }
                .report-container { width: 100%; margin: auto; }
                .header, .info-section, .signatures-section { padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #ccc; }
                .info-section table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .info-section th, .info-section td { text-align: left; padding: 8px; border: 1px solid #ddd; }
                .info-section th { background-color: #f2f2f2; }
                .items-table { width: 100%; border-collapse: collapse; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .items-table th { background-color: #f2f2f2; }
                .item-row > td { background-color: #f9f9f9; font-weight: bold; }
                .device-section-row > td { background-color: #e0e0e0; font-weight: bold; }
                .sub-item-row td { vertical-align: middle; }
                .cumple { background-color: #d4edda; }
                .no-cumple { background-color: #f8d7da; }
                .no-aplica { background-color: #e2e3e5; }
                .observación { background-color: #fff3cd; }
                .signatures-section { display: flex; justify-content: space-around; padding-top: 40px; text-align: center; }
                .signature { display: inline-block; margin: 0 20px; }
                .signature p { margin: 5px 0; }
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
                                    <img src="http://127.0.0.1:5000/${data.creator.user_image}" alt="User Image" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;"/>
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
                            <th>Elemento Inspeccionado</th><td colspan="3">${data.inspectable.name}</td>
                        </tr>
                        <tr>
                            <th>Ubicación</th>
                            <td colspan="3">
                                ${data.inspectable.premise?.premise_name || ''} > 
                                ${data.inspectable.name || ''}
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

module.exports = {
  ensureChecklistInstance,
  getLatestChecklist,
  submitResponses,
  updateFailure,
  listObservations,
  signChecklist,
  getChecklistHistory,
  downloadChecklistPDF,
}