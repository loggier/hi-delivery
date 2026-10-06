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
    expect(businessIntegrationsOpenApi.paths['/orders'].get.parameters.map((parameter) => parameter.name)).toContain('updated_since');
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders'].get.responses)).toEqual(['200', '400', '401', '403', '429', '503']);
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders/{id}'].get.responses)).toEqual(['200', '401', '403', '404', '429', '503']);
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders'].post.responses)).toEqual(['200', '201', '400', '401', '403', '409', '413', '429', '503']);
    expect(businessIntegrationsOpenApi.components.schemas.Error.properties.error.type).toBe('string');
    expect(businessIntegrationsOpenApi.paths['/orders'].get.responses['200'].content['application/json'].example).toHaveProperty('has_more');
    expect(businessIntegrationsOpenApi.paths['/orders/{id}'].get.responses['200'].content['application/json'].example).toHaveProperty('data');
    expect(businessIntegrationsOpenApi.paths['/orders'].post.responses['200'].headers['Idempotency-Replayed'].schema.const).toBe('true');
  });
});
