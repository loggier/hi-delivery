import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BusinessApiReference } from '@/app/(admin)/profile/business-api-reference';
import { businessIntegrationsOpenApi as spec } from '@/lib/business-integrations/openapi';

describe('business API reference', () => {
  it('provides navigation and snippets for the three documented operations', () => {
    render(<BusinessApiReference />);
    expect(screen.getByRole('navigation', { name: /endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GET \/orders$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GET \/orders\/\{id\}/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /POST \/orders/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /POST \/orders/ }));
    expect(screen.getByText('Idempotency-Key')).toBeInTheDocument();
    expect(screen.getByText(/Idempotency-Key: pedido-externo-001/)).toBeInTheDocument();
    expect(screen.getAllByText('201').length).toBeGreaterThan(0);
  });

  it('renders the implemented query and response contract from OpenAPI', () => {
    expect(spec.paths['/orders'].get.parameters.map((parameter) => parameter.name)).toContain('updated_since');
    expect(spec.paths['/orders'].get.responses['200'].content['application/json'].example).toMatchObject({ data: [{ id: 'ord_example' }], has_more: false, next_cursor: null });
    expect(spec.paths['/orders/{id}'].get.responses['200'].content['application/json'].example).toHaveProperty('data.id');
    expect(spec.paths['/orders'].post.responses['200']).toBeDefined();
    expect(spec.paths['/orders'].post.responses['201']).toBeDefined();
  });
});
