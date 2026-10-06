import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'hid_live_';
const DISPLAY_LENGTH = 8;

export interface GeneratedBusinessApiKey {
  secret: string;
  digest: string;
  displayPrefix: string;
}

export function hashBusinessApiKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function createBusinessApiKey(random: (size: number) => Buffer = randomBytes): GeneratedBusinessApiKey {
  const secret = `${KEY_PREFIX}${random(32).toString('base64url')}`;
  return {
    secret,
    digest: hashBusinessApiKey(secret),
    displayPrefix: `${KEY_PREFIX}${secret.slice(KEY_PREFIX.length, KEY_PREFIX.length + DISPLAY_LENGTH)}…`,
  };
}
