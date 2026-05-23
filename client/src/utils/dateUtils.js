//Función de utilidad para analizar fechas correctamente evitando problemas de zona horaria
export const parseLocalDate = (dateString) => {
  if (!dateString) return null

  // Si ya es un objeto Date, devuélvelo
  if (dateString instanceof Date) return dateString

  // Para cadenas con fecha (AAAA-MM-DD), parsear como fecha local
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split("-").map(Number)
    return new Date(year, month - 1, day) 
  }

  // Para cadenas datetime (AAAA-MM-DD HH:MM:SS o AAAA-MM-DDTHH:MM:SS), 
  // parsear como UTC y convertir a hora local del navegador
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/)) {
    // Si no tiene 'Z' al final ni información de zona horaria, asumimos que es UTC
    // (como viene de la base de datos MySQL)
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
      // Agregar 'Z' para indicar que es UTC
      const normalizedString = dateString.replace(' ', 'T') + 'Z'
      return new Date(normalizedString)
    }
  }

  // Para cadenas datetime, utilice el análisis normal de Date
  return new Date(dateString)
}

export const formatLocalDate = (dateString, locale = 'es-ES') => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleDateString(locale) : "N/A"
}

export const formatLocalDateTime = (dateString, locale = 'es-ES') => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleString(locale) : "N/A"
}

// Función para formatear fecha con opciones personalizadas
export const formatLocalDateWithOptions = (dateString, options = {}, locale = 'es-ES') => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleDateString(locale, options) : "N/A"
}

// Función para formatear fecha y hora con opciones personalizadas
export const formatLocalDateTimeWithOptions = (dateString, options = {}, locale = 'es-ES') => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleString(locale, options) : "N/A"
}
