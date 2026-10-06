import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, businessQuery, integrationsCard, toast } = vi.hoisted(() => ({
  authState: { user: null as any },
  businessQuery: vi.fn(),
  integrationsCard: vi.fn(() => <div>Integraciones API test</div>),
  toast: vi.fn(),
}));

vi.mock('@/store/auth-store', () => ({ useAuthStore: () => authState }));
vi.mock('@/lib/api', () => ({ api: {
  businesses: { useGetOne: (...args: unknown[]) => businessQuery(...args) },
  plans: { useGetAll: () => [] },
} }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/app/(admin)/profile/business-integrations-card', () => ({ BusinessIntegrationsCard: integrationsCard }));
vi.mock('@/app/(admin)/profile/business-api-reference', () => ({ BusinessApiReference: () => <div>Documentación API test</div> }));

import ProfilePage from '@/app/(admin)/profile/page';

const activeBusiness = { id: 'biz-1', user_id: 'user-1', name: 'Negocio demo', status: 'ACTIVE', api_enabled: true, plan_id: undefined };
function setUser(role_id: string, status = 'ACTIVE', business_id: string | null = 'biz-1', roleName = 'Otro nombre') {
  authState.user = { id: 'user-1', name: 'Dueño', email: 'owner@example.test', role_id, status, business_id: business_id ?? undefined, role: { name: roleName } };
  businessQuery.mockReturnValue({ data: activeBusiness, isLoading: false });
}

describe('business integration profile eligibility', () => {
  afterEach(cleanup);
  beforeEach(() => { businessQuery.mockClear(); integrationsCard.mockClear(); });

  const ineligibleUsers: Array<[string, string, string, string | null, string?]> = [
    ['admin', 'role-admin', 'ACTIVE', 'biz-1'],
    ['rider', 'role-rider', 'ACTIVE', 'biz-1'],
    ['legacy alias', 'role-owner', 'ACTIVE', 'biz-1'],
    ['role name alias', 'role-owner', 'ACTIVE', 'biz-1', 'Dueño de Negocio'],
    ['inactive user', 'owen-business', 'INACTIVE', 'biz-1'],
    ['unlinked user', 'owen-business', 'ACTIVE', null],
  ];

  it('loads the linked business and shows integrations only for active linked owen-business', async () => {
    setUser('owen-business');
    render(<ProfilePage />);
    expect(businessQuery).toHaveBeenCalledWith('biz-1', { enabled: true });
    expect(await screen.findByText('Integraciones API test')).toBeInTheDocument();
    expect(screen.getByText('Documentación API test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByText('Mi suscripción')).toBeInTheDocument();
  });

  it('explains that an administrator must enable API access without showing key controls or docs', () => {
    setUser('owen-business');
    businessQuery.mockReturnValue({ data: { ...activeBusiness, api_enabled: false }, isLoading: false });
    render(<ProfilePage />);
    expect(screen.getByText('El administrador debe habilitar el acceso a la API para este negocio.')).toBeInTheDocument();
    expect(screen.queryByText('Integraciones API test')).not.toBeInTheDocument();
    expect(screen.queryByText('Documentación API test')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByText('Mi suscripción')).toBeInTheDocument();
  });

  it.each(ineligibleUsers)('hides integrations for %s', (_case, role, status, businessId, roleName) => {
    setUser(role, status, businessId, roleName ?? 'Otro nombre');
    const { queryByText } = render(<ProfilePage />);
    expect(queryByText('Integraciones API test')).not.toBeInTheDocument();
    expect(queryByText('Documentación API test')).not.toBeInTheDocument();
  });

  it.each([
    ['linked to another user', { ...activeBusiness, user_id: 'different-user' }],
    ['inactive business', { ...activeBusiness, status: 'INACTIVE' }],
  ])('hides integrations for a %s', async (_scenario, business) => {
    setUser('owen-business');
    businessQuery.mockReturnValue({ data: business, isLoading: false });
    const { queryByText } = render(<ProfilePage />);
    await waitFor(() => expect(businessQuery).toHaveBeenCalled());
    expect(queryByText('Integraciones API test')).not.toBeInTheDocument();
  });
});
