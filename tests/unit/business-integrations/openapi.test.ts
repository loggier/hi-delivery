import { describe, expect, it } from 'vitest';
import { businessIntegrationsOpenApi } from '@/lib/business-integrations/openapi';

describe('business integrations OpenAPI contract', () => {
  it('documents exactly the supported order operations and required security', () => {
    expect(businessIntegrationsOpenApi.openapi).toBe('3.1.0');
    expect(Object.keys(businessIntegrationsOpenApi.paths)).toEqual(['/orders', '/orders/{id}']);
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders'])).toEqual(['get', 'post']);
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders/{id}'])).toEqual(['get']);
    expect(businessIntegrationsOpenApi.components.securitySchemes.BearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(JSON.stringify(businessIntegrationsOpenApi)).toContain('Idempotency-Key');
    expect(JSON.stringify(businessIntegrationsOpenApi)).toContain('${API_KEY}');
    expect(JSON.stringify(businessIntegrationsOpenApi)).not.toMatch(/(PUT|PATCH|DELETE) \/orders/i);
    expect(JSON.stringify(businessIntegrationsOpenApi)).not.toContain('hid_live_');
  });
});
