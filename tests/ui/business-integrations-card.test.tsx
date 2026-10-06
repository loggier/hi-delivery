import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessIntegrationsCard } from '@/app/(admin)/profile/business-integrations-card';

const keyMetadata = { id: 'key-uuid', prefix: 'hid_live_abcd', enabled: false, created_at: '2026-10-01T00:00:00Z', last_used_at: null };
const jsonResponse = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe('business integrations key lifecycle', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal('fetch', vi.fn()); vi.stubGlobal('confirm', vi.fn(() => true)); });
  afterEach(cleanup);

  it('starts empty without showing any previously returned secret', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ key: null, secret: 'hid_live_get_must_not_reveal' }) as Response);
    render(<BusinessIntegrationsCard />);
    expect(await screen.findByText(/Aún no hay una clave/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/business-integrations/key', expect.objectContaining({ cache: 'no-store' }));
    expect(screen.queryByText(/hid_live/)).not.toBeInTheDocument();
  });

  it('reveals a created secret once and does not restore it from later GET metadata', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ key: null }) as Response)
      .mockResolvedValueOnce(jsonResponse({ id: 'key-uuid', key: 'hid_live_one_time_secret', prefix: 'hid_live_one', enabled: false }, 201) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: keyMetadata }) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: keyMetadata }) as Response);
    render(<BusinessIntegrationsCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Generar clave/ }));
    expect(await screen.findByText('hid_live_one_time_secret')).toBeInTheDocument();
    expect(await screen.findByText(/hid_live_abcd/)).toBeInTheDocument();
    expect(screen.getByText('hid_live_one_time_secret')).toBeInTheDocument();
  });

  it('PATCHes enabled state with the listed key id', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ key: keyMetadata }) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: { ...keyMetadata, enabled: true } }) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: { ...keyMetadata, enabled: true } }) as Response);
    render(<BusinessIntegrationsCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Activar/ }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/business-integrations/key', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ key_id: 'key-uuid', enabled: true }) })));
  });

  it('confirms rotation and revocation before mutating', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ key: keyMetadata }) as Response)
      .mockResolvedValueOnce(jsonResponse({ id: 'new-id', key: 'hid_live_new', prefix: 'hid_live_new' }, 201) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: { ...keyMetadata, id: 'new-id', prefix: 'hid_live_new' } }) as Response)
      .mockResolvedValueOnce(jsonResponse({ key: { ...keyMetadata, id: 'new-id', prefix: 'hid_live_new' } }) as Response)
      .mockResolvedValueOnce(jsonResponse({ revoked: true }) as Response);
    render(<BusinessIntegrationsCard />);
    fireEvent.click(await screen.findByRole('button', { name: /Regenerar clave/ }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/business-integrations/key', expect.objectContaining({ method: 'POST' })));
    fireEvent.click(await screen.findByRole('button', { name: /Revocar/ }));
    expect(window.confirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/business-integrations/key', expect.objectContaining({ method: 'DELETE' })));
  });
});
