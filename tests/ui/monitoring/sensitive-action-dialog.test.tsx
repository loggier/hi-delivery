import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SensitiveActionDialog } from '@/app/(admin)/monitoring/_components/sensitive-action-dialog';

afterEach(cleanup);

const baseProps = {
  open: true,
  actionLabel: 'Cerrar incidente',
  entity: 'Incidente #42',
  before: 'Atendiendo',
  after: 'Resuelto',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  isPending: false,
};

describe('SensitiveActionDialog', () => {
  it('shows the exact entity and before/after transition', () => {
    render(<SensitiveActionDialog {...baseProps} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Incidente #42');
    expect(screen.getByRole('dialog')).toHaveTextContent('Atendiendo');
    expect(screen.getByRole('dialog')).toHaveTextContent('Resuelto');
  });

  it('keeps confirmation disabled for blank and too-long trimmed reasons', () => {
    render(<SensitiveActionDialog {...baseProps} />);
    const reason = screen.getByLabelText('Motivo');
    const confirm = screen.getByRole('button', { name: 'Cerrar incidente' });
    expect(confirm).toBeDisabled();
    fireEvent.change(reason, { target: { value: ' '.repeat(3) + 'a'.repeat(300) + '   ' } });
    expect(confirm).not.toBeDisabled();
    fireEvent.change(reason, { target: { value: 'a'.repeat(301) } });
    expect(confirm).toBeDisabled();
  });

  it('submits a trimmed reason and supports cancellation', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<SensitiveActionDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: '  operador confirma  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar incidente' }));
    expect(onConfirm).toHaveBeenCalledWith('operador confirma');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
