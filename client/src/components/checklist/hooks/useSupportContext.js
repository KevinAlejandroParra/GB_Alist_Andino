import { useState, useEffect } from 'react';

/**
 * Hook para manejar el contexto de soporte en checklists
 * Permite que el usuario de soporte actúe como otro usuario
 */
export const useSupportContext = () => {
  const [supportContext, setSupportContext] = useState(null);
  const [isSupportMode, setIsSupportMode] = useState(false);
  const [authorizationData, setAuthorizationData] = useState(null);

  useEffect(() => {
    // Cargar contexto de soporte desde sessionStorage
    const storedContext = sessionStorage.getItem('support_context');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        setSupportContext(context);
        setIsSupportMode(true);
      } catch (error) {
        console.error('Error parsing support context:', error);
      }
    }

    // Cargar datos de autorización
    const storedAuth = sessionStorage.getItem('support_authorization');
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth);
        setAuthorizationData(auth);
      } catch (error) {
        console.error('Error parsing authorization data:', error);
      }
    }
  }, []);

  const clearSupportContext = () => {
    sessionStorage.removeItem('support_context');
    sessionStorage.removeItem('support_authorization');
    setSupportContext(null);
    setIsSupportMode(false);
    setAuthorizationData(null);
  };

  /**
   * Obtiene el user_id efectivo (del usuario impersonado o del usuario actual)
   */
  const getEffectiveUserId = (currentUserId) => {
    return isSupportMode && supportContext?.impersonated_user_id
      ? supportContext.impersonated_user_id
      : currentUserId;
  };

  /**
   * Obtiene el role_id efectivo (del usuario impersonado o del usuario actual)
   */
  const getEffectiveRoleId = (currentRoleId) => {
    return isSupportMode && supportContext?.impersonated_user_role_id
      ? supportContext.impersonated_user_role_id
      : currentRoleId;
  };

  /**
   * Modifica una petición para incluir el contexto de soporte
   */
  const addSupportContextToRequest = (requestData) => {
    if (!isSupportMode || !supportContext) {
      return requestData;
    }

    return {
      ...requestData,
      impersonate_user_id: supportContext.impersonated_user_id
    };
  };

  /**
   * Modifica una petición de firma para incluir fecha personalizable
   */
  const addSupportContextToSignature = (signatureData, customDate = null) => {
    if (!isSupportMode || !supportContext) {
      return signatureData;
    }

    return {
      ...signatureData,
      impersonate_user_id: supportContext.impersonated_user_id,
      signed_at: customDate || new Date().toISOString()
    };
  };

  /**
   * Modifica una petición de escaneo QR para incluir fecha/hora personalizable
   */
  const addSupportContextToQrScan = (scanData, customDateTime = null) => {
    if (!isSupportMode || !supportContext) {
      return scanData;
    }

    return {
      ...scanData,
      impersonate_user_id: supportContext.impersonated_user_id,
      scanned_at: customDateTime || new Date().toISOString()
    };
  };

  /**
   * Obtiene la URL base para las peticiones según el modo
   */
  const getApiUrl = (baseUrl) => {
    if (isSupportMode) {
      // Usar endpoints de soporte
      return baseUrl.replace('/api/checklists', '/api/support/checklists');
    }
    return baseUrl;
  };

  /**
   * Obtiene la URL para escaneo de QR según el modo
   */
  const getQrScanUrl = () => {
    if (isSupportMode) {
      return '/api/support/checklists/qr/scan';
    }
    return '/api/qr-codes/scan';
  };

  return {
    supportContext,
    isSupportMode,
    authorizationData,
    clearSupportContext,
    getEffectiveUserId,
    getEffectiveRoleId,
    addSupportContextToRequest,
    addSupportContextToSignature,
    addSupportContextToQrScan,
    getApiUrl,
    getQrScanUrl
  };
};

export default useSupportContext;
