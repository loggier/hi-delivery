import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BusinessApiReference } from '@/app/(admin)/profile/business-api-reference';

describe('business API reference', () => {
  it('provides navigation and snippets for the three documented operations', () => {
    render(<BusinessApiReference />);
    expect(screen.getByRole('navigation', { name: /endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GET \/orders$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GET \/orders\/\{id\}/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /POST \/orders/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /POST \/orders/ }));
    expect(screen.getByText('Idempotency-Key')).toBeInTheDocument();
  });
});
