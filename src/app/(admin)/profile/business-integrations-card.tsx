"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Copy, KeyRound, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type KeyMetadata = { id: string; prefix: string; enabled: boolean; created_at: string; last_used_at: string | null };
type KeyResponse = { key: KeyMetadata | null };

export function BusinessIntegrationsCard() {
  const { toast } = useToast();
  const [metadata, setMetadata] = useState<KeyMetadata | null>(null);
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/business-integrations/key', { cache: 'no-store', signal });
      const result = await response.json() as KeyResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo consultar la credencial.');
      setMetadata(result.key);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({ title: 'No se pudo cargar la integración', description: 'Intenta actualizar la página.', variant: 'destructive' });
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [toast]);

  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => { controller.abort(); setOneTimeSecret(null); }; }, [refresh]);

  const mutate = async (method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => {
    setPending(true);
    try {
      const response = await fetch('/api/business-integrations/key', { method, cache: 'no-store', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json() as { key?: KeyMetadata | string; id?: string; key_secret?: string; keyValue?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
      if (method === 'POST') {
        const rawSecret = typeof result.key === 'string' ? result.key : result.key_secret ?? result.keyValue;
        if (!rawSecret) throw new Error('La clave se creó, pero no se pudo mostrar. Contacta soporte antes de cerrar esta pantalla.');
        setOneTimeSecret(rawSecret);
        await refresh();
        toast({ title: 'Clave generada', description: 'Cópiala ahora: no volverá a mostrarse.' });
      } else {
        setOneTimeSecret(null);
        await refresh();
        toast({ title: method === 'DELETE' ? 'Clave revocada' : 'Estado actualizado', variant: 'success' });
      }
    } catch (error) { toast({ title: 'No se completó la operación', description: error instanceof Error ? error.message : 'Intenta de nuevo.', variant: 'destructive' }); }
    finally { setPending(false); }
  };

  const rotate = () => { if (!window.confirm(metadata ? 'Regenerar la clave revocará la anterior. ¿Continuar?' : '¿Generar una clave API para tu negocio?')) return; void mutate('POST'); };
  const revoke = () => { if (!window.confirm('La clave dejará de funcionar inmediatamente. ¿Revocarla?')) return; void mutate('DELETE'); };
  const toggle = () => { if (!metadata) return; void mutate('PATCH', { key_id: metadata.id, enabled: !metadata.enabled }); };

  return <Card>
    <CardHeader><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-muted-foreground" /><CardTitle>Integraciones API</CardTitle></div><CardDescription>Administra la credencial privada de tu negocio para conectar tus sistemas con Hi Delivery.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {loading ? <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando credencial…</div> : metadata ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-mono font-medium">{metadata.prefix}••••••••</p><p className="text-xs text-muted-foreground">Creada {new Date(metadata.created_at).toLocaleDateString('es-MX')}</p></div><Badge variant={metadata.enabled ? 'success' : 'outline'}>{metadata.enabled ? 'Activa' : 'Desactivada'}</Badge></div> : <p className="text-sm text-muted-foreground">Aún no hay una clave API para este negocio.</p>}
      {oneTimeSecret && <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4"><p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" />Guarda tu clave ahora; sólo se muestra una vez.</p><div className="flex gap-2"><code className="min-w-0 flex-1 break-all rounded bg-background p-2 text-sm">{oneTimeSecret}</code><Button type="button" size="icon" variant="outline" aria-label="Copiar clave" onClick={() => void navigator.clipboard.writeText(oneTimeSecret)}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Al cerrar o salir de esta pantalla, no podrás volver a consultar el secreto.</p></div>}
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={rotate} disabled={pending || loading}><RotateCcw className="mr-2 h-4 w-4" />{metadata ? 'Regenerar clave' : 'Generar clave'}</Button>{metadata && <><Button type="button" variant="outline" onClick={toggle} disabled={pending || loading}><ShieldCheck className="mr-2 h-4 w-4" />{metadata.enabled ? 'Desactivar' : 'Activar'}</Button><Button type="button" variant="destructive" onClick={revoke} disabled={pending || loading}>Revocar</Button></>}</div>
      <p className="text-xs text-muted-foreground">La clave sólo aparece al generarla. Guárdala en un secret manager del servidor; nunca la incluyas en código frontend, URLs ni repositorios.</p>
    </CardContent>
  </Card>;
}
