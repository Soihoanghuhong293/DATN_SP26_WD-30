/** Ảnh mặc định dạng SVG data URL — không gọi domain ngoài (tránh net::ERR_CONNECTION_CLOSED). */
export function tourImagePlaceholder(width: number, height: number, label = 'Tour'): string {
  const safe = String(label)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 48);
  const fs = Math.max(10, Math.min(width, height) / 7);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect fill="#f1f5f9" width="${width}" height="${height}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="${fs}" font-family="system-ui,sans-serif">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
