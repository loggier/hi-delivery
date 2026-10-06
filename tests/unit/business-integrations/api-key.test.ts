import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createBusinessApiKey, hashBusinessApiKey } from '@/lib/business-integrations/api-key';

describe('business API key utilities', () => {
  it('generates a prefixed key from 32 random bytes and a non-secret display prefix', () => {
    const random = vi.fn(() => Buffer.from(Array.from({ length: 32 }, (_, i) => i)));
    const key = createBusinessApiKey(random);
    expect(random).toHaveBeenCalledWith(32);
    expect(key.secret).toMatch(/^hid_live_[A-Za-z0-9_-]+$/);
    expect(key.digest).toBe(createHash('sha256').update(key.secret).digest('hex'));
    expect(key.displayPrefix).toBe(`hid_live_${key.secret.slice('hid_live_'.length, 'hid_live_'.length + 8)}…`);
    expect(key.displayPrefix).not.toBe(key.secret);
  });

  it('hashes deterministically and gives distinct digests to distinct keys', () => {
    expect(hashBusinessApiKey('hid_live_sample')).toBe(hashBusinessApiKey('hid_live_sample'));
    expect(hashBusinessApiKey('hid_live_sample')).not.toBe(hashBusinessApiKey('hid_live_other'));
  });
});
