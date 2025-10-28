/**
 * Configuración unificada para los 3 tipos de checklist
 * Este archivo centraliza todas las configuraciones para evitar duplicación y inconsistencias
 */

export const CHECKLIST_TYPES = {
  attraction: {
    type: 'attraction',
    displayName: 'Checklist de Atracción',
    description: 'Checklist diario para inspección de atracciones',
    entityType: 'inspectable',
    frequency: 'daily',
    
    // Configuración de endpoints
    endpoints: {
      latest: '/api/checklists/type/{checklistTypeId}/latest',
      create: '/api/checklists/type/{checklistTypeId}/create',
      history: '/api/checklists/type/{checklistTypeId}/history',
      responses: '/api/checklists/{checklistId}/responses',
      download: '/api/checklists/{checklistId}/download-pdf'
    },
    
    // Configuración de UI
    ui: {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      primaryColor: 'purple',
      breadcrumbLabel: 'Checklists de Atracción'
    },
    
    // Configuración de datos
    data: {
      requiresEntitySelection: false,
      generateDynamicTemplate: false,
      createInstance: true,
      hasQrValidation: true,
      hideHistory: false,
      allowDownload: true
    }
  },

  family: {
    type: 'family',
    displayName: 'Checklist de Familia',
    description: 'Checklist semanal para familias de dispositivos',
    entityType: 'family',
    frequency: 'weekly',
    
    // Configuración de endpoints
    endpoints: {
      generate: '/api/checklists/family/{checklistTypeId}/generate',
      latest: '/api/checklists/type/{checklistTypeId}/latest',
      history: '/api/checklists/type/{checklistTypeId}/history',
      responses: '/api/checklists/{checklistId}/responses',
      download: '/api/checklists/{checklistId}/download-pdf'
    },
    
    // Configuración de UI
    ui: {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      primaryColor: 'blue',
      breadcrumbLabel: 'Checklists de Familia'
    },
    
    // Configuración de datos
    data: {
      requiresEntitySelection: false,
      generateDynamicTemplate: true,
      createInstance: false,
      hasQrValidation: false,
      hideHistory: false,
      allowDownload: true
    }
  },

  premios: {
    type: 'premios',
    displayName: 'Checklist de Premios',
    description: 'Checklist especial para registro de datos de premios',
    entityType: 'specific',
    frequency: 'as_needed',
    
    // Configuración de endpoints
    endpoints: {
      latest: '/api/checklists/type/{checklistTypeId}/latest',
      history: '/api/checklists/type/{checklistTypeId}/history',
      responses: '/api/checklists/{checklistId}/responses',
      download: '/api/checklists/{checklistId}/download-pdf'
    },
    
    // Configuración de UI
    ui: {
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      primaryColor: 'green',
      breadcrumbLabel: 'Checklists de Premios'
    },
    
    // Configuración de datos
    data: {
      requiresEntitySelection: false,
      generateDynamicTemplate: false,
      createInstance: false,
      hasQrValidation: false,
      hideHistory: true,
      allowDownload: true,
      customActions: [
        {
          key: 'premios-data',
          label: 'Registrar Datos de Premios',
          variant: 'secondary'
        }
      ]
    }
  }
};

/**
 * Función auxiliar para obtener la configuración de un tipo de checklist
 */
export const getChecklistTypeConfig = (type) => {
  return CHECKLIST_TYPES[type] || null;
};

/**
 * Función auxiliar para obtener el endpoint formateado
 */
export const getFormattedEndpoint = (type, endpointType, params = {}) => {
  const config = getChecklistTypeConfig(type);
  if (!config || !config.endpoints[endpointType]) return null;
  
  let endpoint = config.endpoints[endpointType];
  
  // Reemplazar placeholders en el endpoint
  Object.keys(params).forEach(key => {
    endpoint = endpoint.replace(`{${key}}`, params[key]);
  });
  
  return endpoint;
};

/**
 * Función auxiliar para obtener la configuración de datos para un tipo
 */
export const getDataConfig = (type) => {
  const config = getChecklistTypeConfig(type);
  return config ? config.data : {};
};

/**
 * Función auxiliar para obtener la configuración de UI para un tipo
 */
export const getUiConfig = (type) => {
  const config = getChecklistTypeConfig(type);
  return config ? config.ui : {};
};