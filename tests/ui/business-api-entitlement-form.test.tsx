import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessApiAccessControl } from '@/app/(admin)/businesses/business-api-access-control';

describe('business API entitlement editor', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows an admin-only switch initialized from the business and persists changes', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(<BusinessApiAccessControl businessId="biz-1" initialEnabled={false} isAdmin />);

    const toggle = screen.getByRole('switch', { name: 'Habilitar uso de API' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/businesses/biz-1/api-access', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    })));
    expect(await screen.findByText('Acceso a la API habilitado.')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('restores the persisted state and shows a safe error when saving fails', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<BusinessApiAccessControl businessId="biz-1" initialEnabled isAdmin />);

    const toggle = screen.getByRole('switch', { name: 'Habilitar uso de API' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar el acceso a la API.');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it.each([
    ['a non-admin', false, 'biz-1'],
    ['the create form', true, null],
  ])('does not render the switch for %s', (_case, isAdmin, businessId) => {
    render(<BusinessApiAccessControl businessId={businessId} initialEnabled={false} isAdmin={isAdmin} />);
    expect(screen.queryByRole('switch', { name: 'Habilitar uso de API' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
