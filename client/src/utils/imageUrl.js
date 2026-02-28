export function getImageSrc(url){
  if (!url) return null;
  const trimmed = (url || '').toString().trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
  // Avoid double slashes
  if (trimmed.startsWith('/')){
    return `${API_URL}${trimmed}`;
  }
  return `${API_URL}/${trimmed}`;
}
