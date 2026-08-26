'use client';
import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
export type SensitiveActionDialogProps = { open: boolean; actionLabel: string; entity: string; before: string; after: string; onConfirm: (reason: string) => void; onCancel: () => void; isPending?: boolean };
export function SensitiveActionDialog({ open, actionLabel, entity, before, after, onConfirm, onCancel, isPending = false }: SensitiveActionDialogProps) {
  const [reason, setReason] = React.useState(''); const trimmed = reason.trim();
  React.useEffect(() => { if (!open) setReason(''); }, [open]);
  const valid = trimmed.length >= 3 && trimmed.length <= 300;
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onCancel(); }}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />{actionLabel}</DialogTitle><DialogDescription>Confirma el cambio para {entity}. Antes: {before}. Después: {after}.</DialogDescription></DialogHeader><div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Esta acción cambia el estado operativo y quedará registrada.</div><div className="space-y-2"><Label htmlFor="sensitive-action-reason">Motivo</Label><Textarea id="sensitive-action-reason" value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} aria-describedby="sensitive-action-help" /><p id="sensitive-action-help" className="text-xs text-muted-foreground">Escribe entre 3 y 300 caracteres.</p></div><DialogFooter><Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancelar</Button><Button type="button" onClick={() => onConfirm(trimmed)} disabled={!valid || isPending}>{isPending ? 'Procesando...' : actionLabel}</Button></DialogFooter></DialogContent></Dialog>;
}
