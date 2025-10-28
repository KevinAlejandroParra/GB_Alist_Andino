
const { ChecklistQrCode, ChecklistQrScan, Checklist, User, ChecklistType, ChecklistQrItemAssociation, ChecklistItem, Sequelize } = require('../models');
const crypto = require('crypto');
const qrcode = require('qrcode');

class QrCodeController {

  // Método privado para verificar si el usuario es administrador
  _ensureAdmin = (res, user) => {
    if (user.role_id !== 1) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.'
      });
      return false;
    }
    return true;
  }

  // Método privado para generar imagen QR en base64
  _generateQrImage = async (qrCodeValue) => {
    return qrcode.toDataURL(qrCodeValue, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  // Generar un nuevo código QR para un tipo de checklist específico
  generateQrCode = async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ success: false, message: 'No se recibieron datos en el cuerpo de la petición' });
      }

      const { checklist_type_id, attraction_name } = req.body;

      if (!checklist_type_id || !attraction_name) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos: checklist_type_id y attraction_name' });
      }

      if (!this._ensureAdmin(res, req.user)) return;

      const checklistType = await ChecklistType.findByPk(checklist_type_id);
      if (!checklistType) {
        return res.status(404).json({ success: false, message: 'Tipo de checklist no encontrado' });
      }

      if (checklistType.type_category !== 'attraction') {
        return res.status(400).json({ success: false, message: 'Solo los tipos de checklist de atracción pueden generar códigos QR' });
      }

      const qrCodeValue = QrCodeController.generateUniqueQrCode();
      const qrCode = await ChecklistQrCode.create({
        checklist_type_id,
        qr_code: qrCodeValue,
        attraction_name,
        created_by: req.user.user_id,
      });

      const qrImageBase64 = await this._generateQrImage(qrCodeValue);

      res.status(201).json({
        success: true,
        message: 'Código QR generado exitosamente',
        data: {
          qr_id: qrCode.qr_id,
          qr_code: qrCode.qr_code,
          attraction_name: qrCode.attraction_name,
          checklist_type_name: checklistType.name,
          qr_image_base64: qrImageBase64,
          created_at: qrCode.createdAt
        }
      });

    } catch (error) {
      console.error('Error generando código QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Validar un código QR escaneado
  async validateQrCode(req, res) {
    try {
      const { qr_code, checklist_type_id } = req.params;

      const qrCode = await ChecklistQrCode.findOne({
        where: { qr_code, is_active: true },
        include: [{
          model: ChecklistType,
          as: 'checklistType',
          attributes: ['name', 'type_category']
        }]
      });

      if (!qrCode) {
        return res.status(404).json({ success: false, message: 'Código QR no encontrado o inactivo' });
      }

      if (checklist_type_id && qrCode.checklist_type_id !== parseInt(checklist_type_id, 10)) {
        return res.status(400).json({ success: false, message: 'Este código QR no corresponde al tipo de checklist solicitado' });
      }

      res.json({
        success: true,
        message: 'Código QR válido',
        data: {
          qr_id: qrCode.qr_id,
          checklist_type_id: qrCode.checklist_type_id,
          checklist_type_name: qrCode.checklistType ? qrCode.checklistType.name : 'Tipo desconocido',
          attraction_name: qrCode.attraction_name,
          usage_count: qrCode.usage_count,
          last_used_at: qrCode.last_used_at
        }
      });

    } catch (error) {
      console.error('Error validando código QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Registrar un escaneo de código QR
  async scanQrCode(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({ success: false, message: 'No se recibieron datos en el cuerpo de la petición' });
      }

      const { checklist_id, qr_code } = req.body;

      if (!checklist_id || !qr_code) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos: checklist_id y qr_code' });
      }

      const qrCode = await ChecklistQrCode.findOne({
        where: { qr_code },
        include: [{
          model: ChecklistQrItemAssociation,
          as: 'itemAssociations',
          include: [{
            model: ChecklistItem,
            as: 'checklistItem',
            attributes: ['checklist_item_id', 'item_number', 'question_text']
          }]
        }]
      });

      if (!qrCode) {
        return res.status(404).json({ success: false, message: 'Código QR no encontrado' });
      }

      const checklist = await Checklist.findByPk(checklist_id, { include: [ { model: ChecklistType, as: 'type'} ]});
      if (!checklist) {
        return res.status(404).json({ success: false, message: 'Checklist no encontrado' });
      }

      if (qrCode.checklist_type_id !== checklist.type.checklist_type_id) {
        return res.status(400).json({ success: false, message: 'Este código QR no pertenece al tipo de checklist actual' });
      }

      const unlockedItems = [];
      if (qrCode.itemAssociations && qrCode.itemAssociations.length > 0) {
        for (const association of qrCode.itemAssociations) {
          if (!association.is_unlocked) {
            await association.update({ is_unlocked: true, unlocked_at: new Date() });
            unlockedItems.push({
              checklist_item_id: association.checklistItem.checklist_item_id,
              item_number: association.checklistItem.item_number,
              item_text: association.checklistItem.question_text
            });
          }
        }
      }

      const scan = await ChecklistQrScan.create({
        checklist_id,
        qr_id: qrCode.qr_id,
        scanned_by: req.user.user_id,
        checklist_status: req.body.checklist_status || 'in_progress'
      });

      await qrCode.increment('usage_count');
      await qrCode.update({ last_used_at: new Date() });

      res.status(201).json({
        success: true,
        message: 'Escaneo registrado exitosamente',
        data: {
          scan_id: scan.scan_id,
          unlocked_items: unlockedItems
        }
      });

    } catch (error) {
      console.error('Error registrando escaneo QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Obtener todos los códigos QR (para administración)
  getAllQrCodes = async (req, res) => {
    try {
      if (!this._ensureAdmin(res, req.user)) return;

      const qrCodes = await ChecklistQrCode.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: qrCodes });

    } catch (error) {
      console.error('Error obteniendo códigos QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Obtener códigos QR por tipo de checklist
  getQrCodesByChecklistType = async (req, res) => {
    try {
      const { checklist_type_id } = req.params;

      if (!this._ensureAdmin(res, req.user)) return;

      const qrCodes = await ChecklistQrCode.findAll({
        where: { checklist_type_id },
        order: [['createdAt', 'DESC']]
      });

      res.json({ success: true, data: qrCodes });

    } catch (error) {
      console.error('Error obteniendo códigos QR por tipo de checklist:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Obtener un único código QR por su ID
  getQrCodeById = async (req, res) => {
    try {
        const { qr_id } = req.params;
        const qrCode = await ChecklistQrCode.findByPk(qr_id);

        if (!qrCode) {
            return res.status(404).json({ success: false, message: 'Código QR no encontrado' });
        }

        const qrImageBase64 = await this._generateQrImage(qrCode.qr_code);

        res.json({
            success: true,
            data: { ...qrCode.toJSON(), qr_image_base64: qrImageBase64 }
        });

    } catch (error) {
        console.error('Error obteniendo código QR por ID:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Obtener historial de escaneos para un checklist específico
  async getChecklistQrScans(req, res) {
    try {
      const { checklist_id } = req.params;

      const scans = await ChecklistQrScan.findAll({
        where: { checklist_id },
        include: [
          { model: ChecklistQrCode, as: 'qrCode', attributes: ['qr_code', 'attraction_name'] },
          { model: User, as: 'scanner', attributes: ['user_id', 'user_name'] }
        ],
        order: [['scanned_at', 'ASC']]
      });

      res.json({ success: true, data: scans });

    } catch (error) {
      console.error('Error obteniendo escaneos del checklist:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Eliminar múltiples códigos QR (lote)
  deleteMultipleQrCodes = async (req, res) => {
    try {
      const { qr_ids } = req.body;

      if (!qr_ids || !Array.isArray(qr_ids) || qr_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Se debe proporcionar un array de IDs de códigos QR' });
      }

      if (!this._ensureAdmin(res, req.user)) return;

      const deletedCount = await ChecklistQrCode.destroy({
        where: { qr_id: qr_ids }
      });

      res.json({
        success: true,
        message: `${deletedCount} códigos QR eliminados exitosamente.`,
        data: { deleted_count: deletedCount }
      });

    } catch (error) {
      console.error('Error eliminando múltiples códigos QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Generar códigos QR para particiones específicas de items padre
  generatePartitionedQrCodes = async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ success: false, message: 'No se recibieron datos en el cuerpo de la petición' });
      }

      const { checklist_type_id, parent_item_ids, partition_config = {} } = req.body;

      if (!checklist_type_id || !parent_item_ids || !Array.isArray(parent_item_ids) || parent_item_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos: checklist_type_id y parent_item_ids' });
      }

      if (!this._ensureAdmin(res, req.user)) return;

      const checklistType = await ChecklistType.findByPk(checklist_type_id);
      if (!checklistType) {
        return res.status(404).json({ success: false, message: 'Tipo de checklist no encontrado' });
      }

      if (checklistType.type_category !== 'attraction') {
        return res.status(400).json({ success: false, message: 'Solo los tipos de checklist de atracción pueden generar códigos QR por particiones' });
      }

      const parentItems = await ChecklistItem.findAll({
        where: { checklist_item_id: parent_item_ids, checklist_type_id, parent_item_id: null },
        order: [['item_number', 'ASC']]
      });

      if (parentItems.length === 0) {
        return res.status(404).json({ success: false, message: 'No se encontraron items padre válidos para los IDs proporcionados' });
      }

      const partitionSize = partition_config.partition_size || 1;
      const generatedQRCodes = [];

      for (let i = 0; i < parentItems.length; i += partitionSize) {
        const groupItems = parentItems.slice(i, i + partitionSize);
        const groupNumber = Math.floor(i / partitionSize) + 1;
        const qrName = `QR-Grupo-${groupNumber}`;
        const qrCodeValue = QrCodeController.generateUniqueQrCode();

        const qrCode = await ChecklistQrCode.create({
          checklist_type_id,
          qr_code: qrCodeValue,
          attraction_name: qrName,
          created_by: req.user.user_id,
          group_number: groupNumber
        });

        const associations = groupItems.map(item => ({ qr_id: qrCode.qr_id, checklist_item_id: item.checklist_item_id }));
        await ChecklistQrItemAssociation.bulkCreate(associations);

        const qrImageBase64 = await this._generateQrImage(qrCodeValue);

        generatedQRCodes.push({
          qr_id: qrCode.qr_id,
          qr_code: qrCode.qr_code,
          group_number: groupNumber,
          group_items: groupItems.map(item => item.toJSON()),
          qr_image_base64: qrImageBase64
        });
      }

      res.status(201).json({
        success: true,
        message: `Se generaron ${generatedQRCodes.length} códigos QR exitosamente.`,
        data: { qr_codes: generatedQRCodes }
      });

    } catch (error) {
      console.error('Error generando códigos QR por particiones:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Obtener información de autorización QR para un checklist específico
  getQrAuthorizationInfo = async (req, res) => {
    try {
      const { checklist_id } = req.params;
      const checklist = await Checklist.findByPk(checklist_id, { include: [{ model: ChecklistType, as: 'type' }] });

      if (!checklist) {
        return res.status(404).json({ success: false, message: 'Checklist no encontrado' });
      }

      if (checklist.type.type_category !== 'attraction') {
        return res.json({ success: true, data: { requires_qr: false, message: 'Este tipo de checklist no requiere autorización QR' } });
      }

      const qrCodes = await ChecklistQrCode.findAll({
        where: { checklist_type_id: checklist.type.checklist_type_id },
        include: [{ model: ChecklistQrItemAssociation, as: 'itemAssociations', include: [{ model: ChecklistItem, as: 'checklistItem' }] }],
        order: [['group_number', 'ASC']]
      });

      if (qrCodes.length === 0) {
        return res.json({ success: true, data: { requires_qr: false, message: 'No hay códigos QR configurados para este tipo de checklist' } });
      }

      const qrScans = await ChecklistQrScan.findAll({ where: { checklist_id }, order: [['scanned_at', 'ASC']] });

      // Filtrar items desbloqueados por checklist específico - obtener QR codes asociados al checklist
      const checklistQrCodes = await ChecklistQrCode.findAll({
        where: { checklist_type_id: checklist.type.checklist_type_id },
        attributes: ['qr_id']
      });
      const qrIds = checklistQrCodes.map(qr => qr.qr_id);

      // Obtener items desbloqueados filtrados por checklist
      const unlockedItems = await ChecklistQrItemAssociation.findAll({
        where: {
          qr_id: qrIds,
          is_unlocked: true
        },
        include: [{
          model: ChecklistItem,
          as: 'checklistItem',
          where: { checklist_type_id: checklist.type.checklist_type_id } // Asegurar que los items pertenezcan al tipo correcto
        }]
      });

      const lastScan = qrScans.length > 0 ? qrScans[qrScans.length - 1] : null;
      const lastValidatedPartition = lastScan ? (await lastScan.getQrCode()).group_number : 0;
      const nextQrRequired = QrCodeController.calculateNextRequiredQr(qrCodes, unlockedItems.length, lastValidatedPartition);

      // Verificar si TODOS los QR han sido completados
      const totalQrCodes = qrCodes.length;
      const totalScans = qrScans.length;
      const allQrCompleted = totalScans >= totalQrCodes;
      
      // Determinar si realmente se requiere QR (solo si hay un siguiente QR disponible)
      const actuallyRequiresQr = nextQrRequired && nextQrRequired.qr_code;

      // Agregar información de debug
      console.log(`🔍 Debug QR - Total QR codes: ${totalQrCodes}, Total scans: ${totalScans}, All completed: ${allQrCompleted}`);
      console.log(`🔍 Debug QR - Next QR required:`, nextQrRequired);
      console.log(`🔍 Debug QR - Actually requires QR: ${actuallyRequiresQr}`);

      res.json({
        success: true,
        data: {
          requires_qr: actuallyRequiresQr,
          next_qr_required: nextQrRequired,
          scan_history: qrScans,
          unlocked_items: unlockedItems.map(item => ({
            checklist_item_id: item.checklistItem.checklist_item_id,
            is_unlocked: item.is_unlocked,
            unlocked_at: item.unlocked_at
          })),
          available_qr_codes: qrCodes.map(qr => ({
            qr_id: qr.qr_id,
            qr_code: qr.qr_code,
            group_number: qr.group_number,
            associated_items: qr.itemAssociations ? qr.itemAssociations.map(assoc => ({
              item_id: assoc.checklist_item_id,
              item_number: assoc.checklistItem.item_number
            })) : []
          })),
          // Información adicional para el frontend (calculada localmente)
          qr_progress_summary: {
            total_qr_codes: qrCodes.length,
            total_scans_completed: qrScans.length,
            all_qr_completed: qrScans.length >= qrCodes.length,
            last_validated_partition: lastValidatedPartition,
            next_partition_required: nextQrRequired ? nextQrRequired.group_number : null
          },
          checklist_completion_status: {
            qr_authorization_complete: qrScans.length >= qrCodes.length,
            requires_further_qr_scans: !!(nextQrRequired && nextQrRequired.qr_code),
            unlocked_items_count: unlockedItems.length,
            can_proceed_without_qr: !(nextQrRequired && nextQrRequired.qr_code)
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo info de autorización QR:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Calcular cuál es el siguiente QR requerido basado en el progreso
  static calculateNextRequiredQr(qrCodes, unlockedItemsCount, lastValidatedPartition) {
    if (!qrCodes || qrCodes.length === 0) return null;

    const nextPartition = lastValidatedPartition + 1;
    const nextQr = qrCodes.find(qr => qr.group_number === nextPartition);

    // Solo retornar información de QR si realmente existe un siguiente QR
    if (nextQr && nextQr.group_number <= qrCodes.length) {
      return { qr_id: nextQr.qr_id, qr_code: nextQr.qr_code, group_number: nextQr.group_number, reason: `Se requiere QR para la partición ${nextPartition}` };
    }

    return null; // No hay más QRs o el checklist está completo
  }

  // Validar código QR específico para un checklist
  async validateQrCodeForChecklist(req, res) {
    try {
      const { checklist_id, qr_code } = req.params;

      console.log(`Validando QR ${qr_code} para checklist ${checklist_id}`);

      // Buscar el checklist para obtener su tipo
      const checklist = await Checklist.findByPk(checklist_id, {
        include: [{ model: ChecklistType, as: 'type' }]
      });

      if (!checklist) {
        return res.status(404).json({
          success: false,
          message: 'Checklist no encontrado',
          data: { is_valid: false }
        });
      }

      // Obtener QR codes disponibles para este tipo de checklist
      const qrCodes = await ChecklistQrCode.findAll({
        where: { checklist_type_id: checklist.type.checklist_type_id, is_active: true },
        include: [{ model: ChecklistQrItemAssociation, as: 'itemAssociations', include: [{ model: ChecklistItem, as: 'checklistItem' }] }],
        order: [['group_number', 'ASC']]
      });

      if (qrCodes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No hay códigos QR configurados para este tipo de checklist',
          data: { is_valid: false }
        });
      }

      // Buscar el QR específico
      const qrCode = qrCodes.find(qr => qr.qr_code === qr_code);

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: 'Código QR no encontrado o inactivo',
          data: { is_valid: false }
        });
      }

      // Obtener escaneos previos y items desbloqueados
      const qrScans = await ChecklistQrScan.findAll({
        where: { checklist_id },
        order: [['scanned_at', 'ASC']]
      });
      const unlockedItems = await ChecklistQrItemAssociation.findAll({
        where: { is_unlocked: true },
        include: ['checklistItem']
      });

      // Calcular progreso actual
      const lastScan = qrScans.length > 0 ? qrScans[qrScans.length - 1] : null;
      const lastValidatedPartition = lastScan ? (await lastScan.getQrCode()).group_number : 0;

      // Calcular siguiente QR requerido
      const nextQrRequired = QrCodeController.calculateNextRequiredQr(qrCodes, unlockedItems.length, lastValidatedPartition);

      // Determinar si este QR es válido para la partición actual
      // IMPORTANTE: Lógica corregida para permitir completar secciones ya desbloqueadas
      // El sistema debe permitir trabajar en las secciones desbloqueadas antes de requerir el siguiente QR

      // Si el QR ya fue escaneado anteriormente, permitir su uso (re-escaneo)
      const wasAlreadyScanned = qrScans.some(scan => scan.qr_id === qrCode.qr_id);

      // Si este QR tiene asociaciones de items, verificar si están desbloqueadas
      const hasAssociations = qrCode.itemAssociations && qrCode.itemAssociations.length > 0;
      const hasUnlockedAssociations = hasAssociations && qrCode.itemAssociations.some(assoc => assoc.is_unlocked);

      // Permitir el QR si:
      // 1. Ya fue escaneado anteriormente (re-escaneo permitido), O
      // 2. Es el siguiente requerido según la lógica de particiones, O
      // 3. Tiene asociaciones de items que están desbloqueadas (sección ya autorizada)
      const isValidForCurrentProgress = wasAlreadyScanned ||
                                       (nextQrRequired && nextQrRequired.qr_id === qrCode.qr_id) ||
                                       hasUnlockedAssociations;

      // Información del QR correcto si no es válido
      const correctQrInfo = !isValidForCurrentProgress && nextQrRequired ?
        { qr_code: nextQrRequired.qr_code, group_number: nextQrRequired.group_number } :
        (!isValidForCurrentProgress && wasAlreadyScanned ? null : null); // Si ya fue escaneado, no mostrar error

      // Calcular progreso actual
      const currentProgress = {
        next_partition: nextQrRequired ? nextQrRequired.group_number : qrCodes.length + 1,
        unlocked_items_count: unlockedItems.length,
        total_items: qrCodes.reduce((total, qr) => total + (qr.itemAssociations ? qr.itemAssociations.length : 0), 0)
      };

      res.json({
        success: true,
        message: isValidForCurrentProgress ? 'Código QR válido para la sección actual' : 'Código QR no válido para la sección actual',
        data: {
          is_valid: isValidForCurrentProgress,
          qr_info: {
            qr_id: qrCode.qr_id,
            qr_code: qrCode.qr_code,
            group_number: qrCode.group_number,
            checklist_type_name: checklist.type.name
          },
          current_progress: currentProgress,
          correct_qr: correctQrInfo,
          next_qr_required: nextQrRequired,
          available_qr_codes: qrCodes.map(qr => ({
            qr_id: qr.qr_id,
            qr_code: qr.qr_code,
            group_number: qr.group_number,
            associated_items: qr.itemAssociations ? qr.itemAssociations.map(assoc => ({
              item_id: assoc.checklist_item_id,
              item_number: assoc.checklistItem.item_number
            })) : []
          })),
          // Información adicional para el frontend (calculada localmente)
          qr_progress_summary: {
            total_qr_codes: qrCodes.length,
            total_scans_completed: qrScans.length,
            all_qr_completed: qrScans.length >= qrCodes.length,
            last_validated_partition: lastValidatedPartition,
            next_partition_required: nextQrRequired ? nextQrRequired.group_number : null
          },
          checklist_completion_status: {
            qr_authorization_complete: qrScans.length >= qrCodes.length,
            requires_further_qr_scans: !!(nextQrRequired && nextQrRequired.qr_code),
            unlocked_items_count: unlockedItems.length,
            can_proceed_without_qr: !(nextQrRequired && nextQrRequired.qr_code)
          }
        }
      });

    } catch (error) {
      console.error('Error validando código QR para checklist:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        data: { is_valid: false }
      });
    }
  }

  // Método auxiliar estático para generar código QR único
  static generateUniqueQrCode() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `QR_${timestamp}_${random}`.toUpperCase();
  }
}

const qrCodeController = new QrCodeController();
module.exports = qrCodeController;
