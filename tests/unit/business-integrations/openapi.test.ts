import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders/{id}'].get.responses)).toEqual(['200', '400', '401', '403', '404', '429', '503']);
    expect(Object.keys(businessIntegrationsOpenApi.paths['/orders'].post.responses)).toEqual(['200', '201', '400', '401', '403', '409', '413', '429', '503']);
    expect(businessIntegrationsOpenApi.components.schemas.Error.properties.error.type).toBe('object');
    expect(businessIntegrationsOpenApi.components.schemas.Order.properties.items).toBeDefined();
    expect(businessIntegrationsOpenApi.paths['/orders'].get.responses['200'].content['application/json'].example).toHaveProperty('has_more');
    expect(businessIntegrationsOpenApi.paths['/orders/{id}'].get.responses['200'].content['application/json'].example).toHaveProperty('data');
    expect(businessIntegrationsOpenApi.paths['/orders'].post.responses['200'].headers['Idempotency-Replayed'].schema.const).toBe('true');
  });

  it('documents every 400 code/status emitted by the list, detail, and create handlers', () => {
    const endpoints = [
      { path: '/orders', method: 'get', source: 'src/app/api/v1/orders/route.ts', codes: ['invalid_parameters'] },
      { path: '/orders/{id}', method: 'get', source: 'src/app/api/v1/orders/[id]/route.ts', codes: ['invalid_parameters'] },
      { path: '/orders', method: 'post', source: 'src/app/api/v1/orders/route.ts', codes: ['invalid_body', 'invalid_idempotency_key'] },
    ] as const;

    for (const endpoint of endpoints) {
      const handler = readFileSync(endpoint.source, 'utf8');
      const responseSpec = businessIntegrationsOpenApi.paths[endpoint.path][endpoint.method].responses['400'];
      const handlerErrors = [...handler.matchAll(/apiError\('([^']+)'[^\n]+\),\s*400\)/g)].map((match) => match[1]);

      expect(handlerErrors).toEqual(expect.arrayContaining(endpoint.codes));
      expect(responseSpec).toBeDefined();
      expect(responseSpec.content['application/json'].schema.$ref).toBe('#/components/schemas/Error');
      const documentedExamples = responseSpec.content['application/json'].examples;
      for (const code of endpoint.codes) {
        expect(documentedExamples[code].value.error.code).toBe(code);
        expect(documentedExamples[code].value.error.message).toEqual(expect.any(String));
      }
      expect(businessIntegrationsOpenApi.components.schemas.Error.required).toContain('error');
      expect(businessIntegrationsOpenApi.components.schemas.Error.properties.error.required).toEqual(['code', 'message']);
    }
  });

  it('documents create idempotency and oversized-body errors with their runtime statuses and nested schemas', () => {
    const create = businessIntegrationsOpenApi.paths['/orders'].post;
    const badRequest = create.responses['400'];
    const tooLarge = create.responses['413'];
    const handler = readFileSync('src/app/api/v1/orders/route.ts', 'utf8');

    expect(handler).toMatch(/apiError\('invalid_idempotency_key',[^\n]+\),\s*400\)/);
    expect(handler).toMatch(/apiError\('body_too_large',[^\n]+\),\s*413\)/);
    expect(create.responses).toHaveProperty('400');
    expect(create.responses).toHaveProperty('413');
    expect(badRequest.content['application/json'].schema.$ref).toBe('#/components/schemas/Error');
    expect(badRequest.content['application/json'].examples.invalid_idempotency_key.value).toEqual({
      error: { code: 'invalid_idempotency_key', message: 'Invalid Idempotency-Key' },
    });
    expect(tooLarge.content['application/json'].schema.$ref).toBe('#/components/schemas/Error');
    expect(tooLarge.content['application/json'].example).toEqual({
      error: { code: 'body_too_large', message: 'Request body too large' },
    });
  });
});
