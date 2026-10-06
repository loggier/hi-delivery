function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  const host = firstHeaderValue(request.headers.get('x-forwarded-host'))
    ?? firstHeaderValue(request.headers.get('host'))
    ?? requestUrl.host;
  const forwardedProtocol = firstHeaderValue(request.headers.get('x-forwarded-proto'));

  if (!origin || !host) return false;

  try {
    const requestProtocol = forwardedProtocol ?? requestUrl.protocol.replace(/:$/, '');
    if (requestProtocol !== 'http' && requestProtocol !== 'https') return false;

    const expectedOrigin = new URL(`${requestProtocol}://${host}`).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
