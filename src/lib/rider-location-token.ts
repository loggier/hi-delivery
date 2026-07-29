import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type RiderLocationTokenPayload = {
  riderId: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
  tokenId: string;
  scope: 'rider_location:write';
  tokenType?: 'access' | 'refresh';
};

function getTokenSecret() {
  const secret = process.env.RIDER_LOCATION_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('RIDER_LOCATION_TOKEN_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signContent(content: string) {
  return createHmac('sha256', getTokenSecret()).update(content).digest('base64url');
}

export function createRiderLocationToken({ riderId, deviceId, tokenId }: {
  riderId: string;
  deviceId: string;
  tokenId: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: RiderLocationTokenPayload = {
    riderId,
    deviceId,
    issuedAt,
    expiresAt: issuedAt + TOKEN_TTL_SECONDS,
    tokenId,
    scope: 'rider_location:write',
    tokenType: 'access',
  };
  const content = `${TOKEN_VERSION}.${encode(payload)}`;
  return `${content}.${signContent(content)}`;
}

export function createRiderLocationRefreshToken({
  riderId,
  deviceId,
  tokenId,
}: {
  riderId: string;
  deviceId: string;
  tokenId: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: RiderLocationTokenPayload = {
    riderId,
    deviceId,
    issuedAt,
    expiresAt: issuedAt + REFRESH_TOKEN_TTL_SECONDS,
    tokenId,
    scope: 'rider_location:write',
    tokenType: 'refresh',
  };
  const content = `${TOKEN_VERSION}.${encode(payload)}`;
  return `${content}.${signContent(content)}`;
}

export function verifyRiderLocationToken(token: string): RiderLocationTokenPayload | null {
  try {
    const [version, encodedPayload, signature] = token.split('.');
    if (!version || !encodedPayload || !signature || version !== TOKEN_VERSION) return null;

    const content = `${version}.${encodedPayload}`;
    const expectedSignature = signContent(content);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as RiderLocationTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.riderId !== 'string' ||
      typeof payload.deviceId !== 'string' ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      typeof payload.tokenId !== 'string' ||
      payload.scope !== 'rider_location:write' ||
      payload.expiresAt <= now ||
      payload.issuedAt > now + 60
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyRiderLocationRefreshToken(
  token: string,
): RiderLocationTokenPayload | null {
  const payload = verifyRiderLocationToken(token);
  return payload?.tokenType === 'refresh' ? payload : null;
}

export { REFRESH_TOKEN_TTL_SECONDS, TOKEN_TTL_SECONDS };
