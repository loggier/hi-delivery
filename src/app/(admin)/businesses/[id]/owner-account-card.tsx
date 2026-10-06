'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OwnerAccount = { name: string | null; email: string | null; phone: string | null; status: string | null };

export function OwnerAccountCard({ businessId }: { businessId: string }) {
  const [owner, setOwner] = useState<OwnerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'status' | 'alert'; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch(`/api/businesses/${encodeURIComponent(businessId)}/owner-account`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'No se pudo cargar la cuenta del propietario.');
        if (active) setOwner(payload.owner as OwnerAccount);
      })
      .catch((error: unknown) => {
        if (active) setFeedback({ type: 'alert', message: error instanceof Error ? error.message : 'No se pudo cargar la cuenta del propietario.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [businessId]);

  const resetDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setPassword('');
      setPasswordConfirmation('');
    }
  };

  const updatePassword = async () => {
    if (password !== passwordConfirmation) {
      setFeedback({ type: 'alert', message: 'Las contraseñas no coinciden.' });
      return;
    }
    if (!/^(?=.*[A-Z\d@$!%*?&]).{8,}$/.test(password)) {
      setFeedback({ type: 'alert', message: 'Usa al menos 8 caracteres y agrega una mayúscula, un número o un símbolo.' });
      return;
    }

    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/owner-account`, {
        method: 'PATCH',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, passwordConfirmation }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'No se pudo cambiar la contraseña.');

      setFeedback({ type: 'status', message: payload.message || 'La contraseña se actualizó correctamente.' });
      resetDialog(false);
    } catch (error) {
      setFeedback({ type: 'alert', message: error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuenta del propietario</CardTitle>
        <CardDescription>Datos de acceso del usuario vinculado a este negocio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Cargando datos de la cuenta…</p> : owner ? (
          <div className="grid gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Propietario</p>
              <p className="font-medium">{owner.name || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Correo de acceso</p>
              <p className="font-medium break-all">{owner.email || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teléfono del negocio (WhatsApp)</p>
              <p className="font-medium">{owner.phone || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado de la cuenta</p>
              <p className="font-medium">{owner.status === 'ACTIVE' ? 'Activa' : owner.status === 'INACTIVE' ? 'Inactiva' : 'No disponible'}</p>
            </div>
          </div>
        ) : null}

        {feedback && <p role={feedback.type} className="text-sm">{feedback.message}</p>}

        <Dialog open={dialogOpen} onOpenChange={resetDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={loading || !owner}>Cambiar contraseña</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar contraseña del propietario</DialogTitle>
              <DialogDescription>
                Define una nueva contraseña para {owner?.email || 'el usuario asociado'}. La contraseña actual no se muestra ni se envía automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner-new-password">Nueva contraseña</Label>
                <Input
                  id="owner-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-new-password-confirmation">Confirmar contraseña</Label>
                <Input
                  id="owner-new-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  disabled={pending}
                />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres y una mayúscula, un número o un símbolo.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => resetDialog(false)} disabled={pending}>Cancelar</Button>
              <Button onClick={() => void updatePassword()} disabled={pending || !password || !passwordConfirmation}>
                {pending ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
