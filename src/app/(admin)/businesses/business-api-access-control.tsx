'use client';

import { useEffect, useState } from 'react';

import { Switch } from '@/components/ui/switch';

type BusinessApiAccessControlProps = {
  businessId: string | null;
  initialEnabled: boolean;
  isAdmin: boolean;
};

export function BusinessApiAccessControl({ businessId, initialEnabled, isAdmin }: BusinessApiAccessControlProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'status' | 'alert'; text: string } | null>(null);

  useEffect(() => setEnabled(initialEnabled), [initialEnabled]);

  if (!isAdmin || !businessId) return null;

  const updateAccess = async (nextEnabled: boolean) => {
    const previousValue = enabled;
    setEnabled(nextEnabled);
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/api-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!response.ok) throw new Error('Update failed');
      setFeedback({ type: 'status', text: nextEnabled ? 'Acceso a la API habilitado.' : 'Acceso a la API deshabilitado.' });
    } catch {
      setEnabled(previousValue);
      setFeedback({ type: 'alert', text: 'No se pudo actualizar el acceso a la API.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="business-api-access-title">
      <div className="space-y-1">
        <h3 id="business-api-access-title" className="text-sm font-medium">Acceso a la API</h3>
        <p className="text-sm text-muted-foreground">
          Autoriza al negocio a gestionar su clave y consumir la API de integraciones.
        </p>
        {feedback && <p role={feedback.type} className="text-sm">{feedback.text}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">{enabled ? 'Habilitado' : 'Deshabilitado'}</span>
        <Switch
          aria-label="Habilitar uso de API"
          checked={enabled}
          disabled={pending}
          onCheckedChange={(checked) => void updateAccess(checked)}
        />
      </div>
    </section>
  );
}
