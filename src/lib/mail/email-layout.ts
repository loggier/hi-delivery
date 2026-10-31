export type BrandedEmailInput = {
  subject: string;
  bodyText: string;
  appName: string;
  siteUrl?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
};

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

const COLORS = {
  pageBackground: '#f3f4f6',
  cardBackground: '#ffffff',
  header: '#111827',
  headerText: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  footerBackground: '#f9fafb',
  link: '#2563eb',
} as const;

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

/**
 * Escapa los caracteres especiales de HTML. Todo contenido dinámico debe pasar por aquí.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve la URL normalizada si es http(s); en cualquier otro caso devuelve null.
 */
function toSafeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function renderLine(line: string): string {
  let html = '';
  let lastIndex = 0;

  for (const match of line.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? '';
    const url = raw.slice(0, raw.length - trailing.length);
    const safeHref = toSafeHttpUrl(url);

    html += escapeHtml(line.slice(lastIndex, index));
    html += safeHref
      ? `<a href="${escapeHtml(safeHref)}" style="color:${COLORS.link};text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a>`
      : escapeHtml(url);
    html += escapeHtml(trailing);
    lastIndex = index + raw.length;
  }

  html += escapeHtml(line.slice(lastIndex));
  return html;
}

/**
 * Convierte texto plano en HTML seguro: escapa todo, convierte saltos de línea
 * en <br> y hace clicables los enlaces http(s).
 */
function renderBodyHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(renderLine)
    .join('<br>\n');
}

function renderHeader(appName: string, logoUrl: string | null): string {
  const logoCell = logoUrl
    ? `<td style="padding-right:12px;vertical-align:middle;">
                <img src="${escapeHtml(logoUrl)}" height="40" alt="${escapeHtml(appName)}" style="display:block;border:0;outline:none;text-decoration:none;height:40px;width:auto;">
              </td>`
    : '';
  const nameCell = appName
    ? `<td style="vertical-align:middle;font-family:${FONT_FAMILY};font-size:20px;line-height:24px;font-weight:bold;color:${COLORS.headerText};">${escapeHtml(appName)}</td>`
    : '';

  return `
        <tr>
          <td class="px" align="center" style="padding:24px 32px;background-color:${COLORS.header};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                ${logoCell}
                ${nameCell}
              </tr>
            </table>
          </td>
        </tr>`;
}

function renderContent(bodyText: string): string {
  return `
        <tr>
          <td class="px" style="padding:32px;font-family:${FONT_FAMILY};font-size:16px;line-height:24px;color:${COLORS.text};">
            ${renderBodyHtml(bodyText)}
          </td>
        </tr>`;
}

function renderFooter(footerText: string, siteUrl: string | null): string {
  const siteLabel = siteUrl ? siteUrl.replace(/\/+$/, '') : null;
  const siteLine = siteUrl && siteLabel
    ? `<p style="margin:0;font-family:${FONT_FAMILY};font-size:12px;line-height:18px;color:${COLORS.muted};">
              <a href="${escapeHtml(siteUrl)}" style="color:${COLORS.link};text-decoration:underline;">${escapeHtml(siteLabel)}</a>
            </p>`
    : '';

  return `
        <tr>
          <td class="px" align="center" style="padding:20px 32px;background-color:${COLORS.footerBackground};border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px 0;font-family:${FONT_FAMILY};font-size:12px;line-height:18px;color:${COLORS.muted};">${escapeHtml(footerText)}</p>
            ${siteLine}
          </td>
        </tr>`;
}

/**
 * Genera un correo HTML con diseño de marca: encabezado (logo + nombre),
 * contenido y pie con enlace al sitio. Usa tablas y estilos inline, ancho máximo 600px.
 * Todo el contenido dinámico se escapa.
 */
export function renderBrandedEmail(input: BrandedEmailInput): string {
  const appName = input.appName.trim();
  const logoUrl = toSafeHttpUrl(input.logoUrl);
  const siteUrl = toSafeHttpUrl(input.siteUrl);
  const footerText = input.footerText?.trim()
    || (appName
      ? `Este correo fue enviado automáticamente por ${appName}. No respondas a este mensaje.`
      : 'Este correo fue enviado automáticamente. No respondas a este mensaje.');

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${escapeHtml(input.subject)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.pageBackground};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.pageBackground};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${COLORS.cardBackground};border-radius:8px;">
            ${renderHeader(appName, logoUrl)}
            ${renderContent(input.bodyText)}
            ${renderFooter(footerText, siteUrl)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
