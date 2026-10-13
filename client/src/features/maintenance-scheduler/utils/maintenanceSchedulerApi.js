import axiosInstance from '../../../utils/axiosConfig';

const API_BASE = '/api/maintenance-scheduler';

export const maintenanceApi = {
  // Plan & Scheduling
  getPlanForMonth: async (premiseId, month) => {
    const res = await axiosInstance.get(`${API_BASE}/plans/month`, {
      params: { premiseId, month }
    });
    return res.data;
  },

  generatePlan: async (premiseId, month) => {
    const res = await axiosInstance.post(`${API_BASE}/plans/generate`, null, {
      params: { premiseId, month }
    });
    return res.data;
  },

  publishPlan: async (planId) => {
    const res = await axiosInstance.post(`${API_BASE}/plans/${planId}/publish`);
    return res.data;
  },

  updateSlot: async (slotId, data) => {
    const res = await axiosInstance.patch(`${API_BASE}/slots/${slotId}`, data);
    return res.data;
  },

  // Machine Configurations
  getMachineConfigs: async (premiseId) => {
    const res = await axiosInstance.get(`${API_BASE}/config/machines`, {
      params: { premiseId }
    });
    return res.data;
  },

  updateMachineConfig: async (insId, data) => {
    const res = await axiosInstance.post(`${API_BASE}/config/machine`, {
      ins_id: insId,
      ...data
    });
    return res.data;
  },

  // Settings
  getSettings: async (premiseId) => {
    const res = await axiosInstance.get(`${API_BASE}/config/settings`, {
      params: { premiseId }
    });
    return res.data;
  },

  updateSettings: async (premiseId, data) => {
    const res = await axiosInstance.post(`${API_BASE}/config/settings`, {
      premiseId,
      ...data
    });
    return res.data;
  },

  // Sessions
  getSessionBySlot: async (slotId) => {
    const res = await axiosInstance.get(`${API_BASE}/sessions/slot/${slotId}`);
    return res.data;
  },

  getSessionById: async (sessionId) => {
    const res = await axiosInstance.get(`${API_BASE}/sessions/${sessionId}`);
    return res.data;
  },

  startSession: async (slotId, qrCode) => {
    const res = await axiosInstance.post(`${API_BASE}/sessions/start`, {
      slotId,
      qrCode
    });
    return res.data;
  },

  uploadEvidence: async (sessionId, phase, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phase', phase);

    const res = await axiosInstance.post(
      `${API_BASE}/sessions/${sessionId}/evidence-upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return res.data;
  },

  completeSession: async (sessionId, description) => {
    const res = await axiosInstance.post(`${API_BASE}/sessions/${sessionId}/complete`, {
      description
    });
    return res.data;
  },

  // QR Codes
  getMachineQrs: async (premiseId) => {
    const res = await axiosInstance.get(`${API_BASE}/qr/machines`, {
      params: { premiseId }
    });
    return res.data;
  },

  generateMachineQr: async (insId) => {
    const res = await axiosInstance.post(`${API_BASE}/qr/generate`, { insId });
    return res.data;
  },

  generateAllQrs: async (premiseId) => {
    const res = await axiosInstance.post(`${API_BASE}/qr/generate-all`, { premiseId });
    return res.data;
  },

  validateQr: async (qrCode) => {
    const res = await axiosInstance.get(`${API_BASE}/qr/validate`, {
      params: { qrCode }
    });
    return res.data;
  }
};
