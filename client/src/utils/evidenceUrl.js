/**
 * Convierte una ruta de evidencia almacenada en DB a URL absoluta del API.
 * Soporta rutas relativas (uploads/..., /media/...), URLs http(s) y Cloudinary.
 */
export function resolveEvidenceUrl(
  evidenceUrl,
  apiUrl = process.env.NEXT_PUBLIC_API || 'http://localhost:5000'
) {
  if (!evidenceUrl) return null;

  const clean = evidenceUrl.trim();
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  const path = clean.startsWith('/') ? clean : `/${clean}`;
  return `${apiUrl}${path}`;
}
