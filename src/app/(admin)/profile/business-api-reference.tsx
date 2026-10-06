"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessIntegrationsOpenApi as spec } from '@/lib/business-integrations/openapi';

const endpoints = [
  { id: 'list-orders', method: 'GET', path: '/orders', title: 'Listar pedidos', curl: spec.paths['/orders'].get['x-codeSamples'][0].source },
  { id: 'get-order', method: 'GET', path: '/orders/{id}', title: 'Consultar pedido', curl: spec.paths['/orders/{id}'].get['x-codeSamples'][0].source },
  { id: 'create-order', method: 'POST', path: '/orders', title: 'Crear pedido', curl: spec.paths['/orders'].post['x-codeSamples'][0].source },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <Button type="button" size="sm" variant="outline" aria-label="Copiar ejemplo" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="sr-only">{copied ? 'Copiado' : 'Copiar'}</span></Button>;
}

export function BusinessApiReference() {
  const [active, setActive] = useState(endpoints[0].id);
  return <section aria-labelledby="api-reference-title" className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <header className="border-b bg-muted/30 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">API v1 · OpenAPI 3.1</p><h2 id="api-reference-title" className="mt-2 text-2xl font-semibold">Documentación API</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Consulta y crea pedidos del negocio. Guarda la credencial en un backend o secret manager; nunca la expongas en una aplicación pública.</p></header>
    <div className="grid min-w-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Endpoints" className="border-b p-3 md:border-b-0 md:border-r"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedidos</p>{endpoints.map((endpoint) => <button key={endpoint.id} type="button" onClick={() => setActive(endpoint.id)} aria-current={active === endpoint.id ? 'page' : undefined} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${active === endpoint.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><span className="mr-2 font-mono text-[11px] font-bold">{endpoint.method}</span><span className="font-mono">{endpoint.path}</span></button>)}</nav>
      <div className="min-w-0 space-y-6 p-5 sm:p-7">
        <div><p className="text-sm text-muted-foreground">{spec.info.title} · {spec.info.version}</p><p className="mt-2 text-sm"><strong>Autenticación:</strong> Bearer token en <code>Authorization</code>. La clave está ligada al negocio y no debe compartirse.</p></div>
        {endpoints.filter((endpoint) => endpoint.id === active).map((endpoint) => <article key={endpoint.id} aria-live="polite" className="space-y-5">
          <div className="flex flex-wrap items-center gap-3"><span className="rounded bg-emerald-100 px-2 py-1 font-mono text-xs font-bold text-emerald-800">{endpoint.method}</span><code className="text-lg font-semibold">{endpoint.path}</code><h3 className="basis-full text-xl font-semibold">{endpoint.title}</h3></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><h4 className="font-medium">Ejemplo cURL</h4><CopyButton value={endpoint.curl} /></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{endpoint.curl}</code></pre></div>
          {endpoint.id === 'list-orders' && <p className="text-sm text-muted-foreground">Filtros: <code>status</code>, <code>created_from</code>, <code>created_to</code>, <code>updated_from</code>, <code>limit</code> (máximo 100) y <code>cursor</code>. El cursor es opaco y está vinculado a los filtros de la página.</p>}
          {endpoint.id === 'create-order' && <><p className="text-sm text-muted-foreground">Envía cliente, dirección, tarifa, artículos y notas. El servidor calcula importes. Los reintentos con igual clave y contenido reproducen la respuesta original; si cambia el contenido, responde <code>409</code>.</p><p className="text-sm"><strong>Requerida:</strong> <code>Idempotency-Key</code></p><div className="flex items-center justify-between"><h4 className="font-medium">Cuerpo JSON</h4><CopyButton value={JSON.stringify(spec.paths['/orders'].post.requestBody.content['application/json'].example, null, 2)} /></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{JSON.stringify(spec.paths['/orders'].post.requestBody.content['application/json'].example, null, 2)}</code></pre></>}
          <div className="rounded-lg border p-4"><h4 className="font-medium">Respuestas y errores</h4><p className="mt-2 text-sm text-muted-foreground">400 solicitud inválida · 401 credencial inválida · 403 negocio inactivo · 404 no encontrado · 409 conflicto de idempotencia · 422 validación · 429 límite de solicitudes · 500/503 error temporal.</p></div>
        </article>)}
      </div>
    </div>
  </section>;
}
