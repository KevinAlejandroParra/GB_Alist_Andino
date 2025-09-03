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

  // Para cadenas datetime, utilice el análisis normal de Date
  return new Date(dateString)
}

export const formatLocalDate = (dateString) => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleDateString() : "N/A"
}

export const formatLocalDateTime = (dateString) => {
  const date = parseLocalDate(dateString)
  return date ? date.toLocaleString() : "N/A"
}
