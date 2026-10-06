"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessIntegrationsOpenApi as spec } from '@/lib/business-integrations/openapi';

type Operation = {
  summary: string;
  description: string;
  parameters?: ReadonlyArray<{ name: string; in: string; required?: boolean; description?: string; schema: Record<string, unknown> }>;
  requestBody?: { content: { 'application/json': { example: unknown } } };
  responses: Record<string, { description: string; headers?: Record<string, { description?: string }>; content?: { 'application/json'?: { example?: unknown; examples?: Record<string, { value: unknown }> } } }>;
  'x-codeSamples'?: Array<{ lang: string; source: string }>;
};

const endpoints = (Object.entries(spec.paths) as unknown as [string, Record<string, Operation>][]) .flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ id: `${method}-${path}`, method: method.toUpperCase(), path, operation })),
);

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <Button type="button" size="sm" variant="outline" aria-label="Copiar ejemplo" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="sr-only">{copied ? 'Copiado' : 'Copiar'}</span></Button>;
}

function OperationDetails({ endpoint }: { endpoint: (typeof endpoints)[number] }) {
  const { operation } = endpoint;
  const curl = operation['x-codeSamples']?.find((sample) => sample.lang.toLowerCase() === 'curl')?.source;
  const requestExample = operation.requestBody?.content['application/json'].example;
  const responses = Object.entries(operation.responses);
  return <article aria-live="polite" className="space-y-5">
    <div><div className="mb-2 flex items-center gap-2"><span className="rounded bg-emerald-100 px-2 py-1 font-mono text-xs font-bold text-emerald-800">{endpoint.method}</span><code className="font-semibold">{endpoint.path}</code></div><h3 className="text-xl font-semibold">{operation.summary}</h3><p className="mt-2 text-sm text-muted-foreground">{operation.description}</p></div>
    {curl && <div className="space-y-2"><div className="flex items-center justify-between"><h4 className="font-medium">Ejemplo cURL</h4><CopyButton value={curl} /></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{curl}</code></pre></div>}
    {operation.parameters && <section><h4 className="font-medium">Parámetros</h4><ul className="mt-2 space-y-2">{operation.parameters.map((parameter) => <li key={`${parameter.in}-${parameter.name}`} className="rounded-md border p-3 text-sm"><code className="font-semibold">{parameter.name}</code><span className="ml-2 text-muted-foreground">{parameter.in}{parameter.required ? ' · requerido' : ''}</span>{parameter.description && <p className="mt-1 text-muted-foreground">{parameter.description}</p>}</li>)}</ul></section>}
    {requestExample !== undefined && <div className="space-y-2"><div className="flex items-center justify-between"><h4 className="font-medium">Cuerpo JSON</h4><CopyButton value={JSON.stringify(requestExample, null, 2)} /></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{JSON.stringify(requestExample, null, 2)}</code></pre></div>}
    <section><h4 className="font-medium">Respuestas</h4><ul className="mt-2 space-y-2">{responses.map(([status, response]) => <li key={status} className="rounded-md border p-3 text-sm"><code className="font-semibold">{status}</code><span className="ml-2 text-muted-foreground">{response.description}</span>{response.headers && Object.entries(response.headers).map(([name, header]) => <p key={name} className="mt-1"><code>{name}</code>: {header.description}</p>)}{response.content?.['application/json']?.examples ? Object.entries(response.content['application/json'].examples).map(([name, value]) => <div key={name} className="mt-2"><p className="text-xs text-muted-foreground">{name}</p><pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100"><code>{JSON.stringify(value.value, null, 2)}</code></pre></div>) : response.content?.['application/json']?.example !== undefined && <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100"><code>{JSON.stringify(response.content['application/json'].example, null, 2)}</code></pre>}</li>)}</ul></section>
  </article>;
}

export function BusinessApiReference() {
  const [active, setActive] = useState(endpoints[0].id);
  const current = endpoints.find((endpoint) => endpoint.id === active) ?? endpoints[0];
  return <section aria-labelledby="api-reference-title" className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <header className="border-b bg-muted/30 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">API v1 · OpenAPI {spec.openapi}</p><h2 id="api-reference-title" className="mt-2 text-2xl font-semibold">Documentación API</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{spec.info.description} Guarda la credencial en un backend o secret manager; nunca la expongas en una aplicación pública.</p></header>
    <div className="grid min-w-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Endpoints" className="border-b p-3 md:border-b-0 md:border-r"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedidos</p>{endpoints.map((endpoint) => <button key={endpoint.id} type="button" onClick={() => setActive(endpoint.id)} aria-current={active === endpoint.id ? 'page' : undefined} className={`block w-full rounded-md px-3 py-2 text-left text-sm ${active === endpoint.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><span className="mr-2 font-mono text-[11px] font-bold">{endpoint.method}</span><span className="font-mono">{endpoint.path}</span></button>)}</nav>
      <div className="min-w-0 space-y-6 p-5 sm:p-7"><div><p className="text-sm text-muted-foreground">{spec.info.title} · {spec.info.version}</p><p className="mt-2 text-sm"><strong>URL base:</strong> <code>{spec.servers[0].url}</code></p><p className="mt-2 text-sm"><strong>Autenticación:</strong> Bearer token en <code>Authorization</code>. La clave está ligada al negocio y no debe compartirse.</p></div><OperationDetails endpoint={current} />
         <section><h3 className="font-medium">Errores comunes</h3><ul className="mt-2 space-y-2">{Object.entries(spec['x-errorDescriptions']).map(([status, error]) => <li key={status} className="rounded-md border p-3 text-sm"><code className="font-semibold">{status}</code><span className="ml-2 text-muted-foreground">{error.description}</span>{'examples' in error && error.examples ? Object.entries(error.examples).map(([name, example]) => <div key={name} className="mt-2"><p className="text-xs text-muted-foreground">{name}</p><pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100"><code>{JSON.stringify(example.value, null, 2)}</code></pre></div>) : <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100"><code>{JSON.stringify(error.example, null, 2)}</code></pre>}</li>)}</ul></section>
      </div>
    </div>
  </section>;
}
