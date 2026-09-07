# Monitoring Fleet Map Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar `/monitoring` en una sola vista operativa con listado de toda la flota, mapa dominante, detalle flotante e historial reproducible.

**Architecture:** `page.tsx` renderiza únicamente `MonitoringOperationsDesk`. Un snapshot protegido entrega el estado operativo completo cada 15 segundos y Realtime aplica parches recientes; el controller concentra filtros y selección. El mapa conserva el control de cámara, agrupa marcadores y superpone el contexto seleccionado sin reducir su superficie.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, TanStack Query, Google Maps, shadcn/ui, Vitest y Testing Library.

---

### Task 1: Enriquecer el contrato del snapshot

**Files:**
- Modify: `src/lib/monitoring/types.ts`
- Modify: `src/lib/monitoring/snapshot-service.ts`
- Test: `tests/integration/monitoring/repository-reads.test.ts`
- Test: `tests/integration/monitoring/schema-fallbacks.test.ts`

- [ ] **Step 1: Escribir pruebas fallidas del contrato visual**

Agregar casos que exijan identidad, ubicación y datos del pedido:

```ts
expect(snapshot.riders[0]).toMatchObject({
  id: 'r1', firstName: 'Juan', lastName: 'López',
  latitude: 25.5, longitude: -108.4, speed: 18, course: 90,
});
expect(snapshot.orders[0]).toMatchObject({
  id: 'o1', zoneId: 'z1', businessName: 'Negocio',
  pickup: { latitude: 25.5, longitude: -108.4 },
});
```

- [ ] **Step 2: Ejecutar las pruebas y confirmar el fallo**

Run: `npx vitest run tests/integration/monitoring/repository-reads.test.ts tests/integration/monitoring/schema-fallbacks.test.ts`

Expected: FAIL porque el snapshot actual omite esos campos.

- [ ] **Step 3: Extender tipos y normalizadores**

Añadir propiedades opcionales compatibles con schemas parciales:

```ts
export type MonitoringRider = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string | null;
  zoneId: string | null;
  activeForOrders: boolean;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  lastLocationReceivedAt: string | null;
  lastLocationUpdate: string | null;
  hasIrregularReporting?: boolean;
};
```

Consultar las columnas reales de `riders`, `orders` y `businesses`; normalizar coordenadas y URLs sin lanzar error por valores opcionales.

- [ ] **Step 4: Ejecutar pruebas del snapshot**

Run: `npx vitest run tests/unit/monitoring tests/integration/monitoring/repository-reads.test.ts tests/integration/monitoring/schema-fallbacks.test.ts`

Expected: PASS.

### Task 2: Completar filtros y parches realtime

**Files:**
- Modify: `src/lib/monitoring/types.ts`
- Modify: `src/lib/monitoring/snapshot-service.ts`
- Modify: `src/app/(admin)/monitoring/_hooks/use-monitoring-realtime.ts`
- Modify: `src/app/(admin)/monitoring/_hooks/use-monitoring-controller.ts`
- Test: `tests/unit/monitoring/filters.test.ts`
- Test: `tests/ui/monitoring/realtime-health.test.tsx`

- [ ] **Step 1: Escribir pruebas fallidas para filtros de flota**

```ts
expect(applyFleetFilter(riders, { fleetStatus: 'available' })).toEqual([available]);
expect(applyFleetFilter(riders, { fleetStatus: 'occupied' })).toEqual([occupied]);
expect(applyFleetFilter(riders, { signal: 'stale' })).toEqual([stale]);
```

- [ ] **Step 2: Ejecutar pruebas y confirmar el fallo**

Run: `npx vitest run tests/unit/monitoring/filters.test.ts tests/ui/monitoring/realtime-health.test.tsx`

Expected: FAIL porque faltan filtros y eventos operativos.

- [ ] **Step 3: Implementar el filtro único y realtime incremental**

Extender `MonitoringFilter` con:

```ts
fleetStatus?: 'all' | 'available' | 'occupied' | 'unavailable';
signal?: 'all' | 'fresh' | 'stale';
```

Realtime aceptará `INSERT` y `UPDATE`, descartará timestamps antiguos y emitirá también disponibilidad cuando venga en el payload.

- [ ] **Step 4: Verificar filtros y realtime**

Run: `npx vitest run tests/unit/monitoring/filters.test.ts tests/ui/monitoring/realtime-health.test.tsx`

Expected: PASS.

### Task 3: Construir listado de flota y contexto flotante

**Files:**
- Create: `src/app/(admin)/monitoring/_components/fleet-list.tsx`
- Create: `src/app/(admin)/monitoring/_components/rider-map-card.tsx`
- Modify: `src/app/(admin)/monitoring/_components/monitoring-filters.tsx`
- Test: `tests/ui/monitoring/fleet-list.test.tsx`
- Test: `tests/ui/monitoring/rider-map-card.test.tsx`

- [ ] **Step 1: Escribir pruebas UI fallidas**

```tsx
render(<FleetList riders={riders} selectedRiderId="r1" onSelectRider={select} />);
expect(screen.getByText('Juan López')).toBeInTheDocument();
expect(screen.getByText('18 km/h')).toBeInTheDocument();
fireEvent.click(screen.getByText('Juan López'));
expect(select).toHaveBeenCalledWith('r1');
```

```tsx
render(<RiderMapCard rider={rider} activeOrder={order} onClose={close} />);
expect(screen.getByRole('link', { name: /ver pedido/i })).toHaveAttribute('href', '/orders/o1');
```

- [ ] **Step 2: Ejecutar pruebas y confirmar el fallo**

Run: `npx vitest run tests/ui/monitoring/fleet-list.test.tsx tests/ui/monitoring/rider-map-card.test.tsx`

Expected: FAIL porque los componentes no existen.

- [ ] **Step 3: Implementar componentes compactos**

El listado usa avatar saneado, color por estado y botón accesible por fila. La tarjeta flotante usa posición absoluta dentro del contenedor del mapa, altura máxima y scroll interno; expone `Centrar`, `Solicitar ubicación`, `Historial`, `Ver perfil` y pedido activo.

- [ ] **Step 4: Ejecutar pruebas UI**

Run: `npx vitest run tests/ui/monitoring/fleet-list.test.tsx tests/ui/monitoring/rider-map-card.test.tsx`

Expected: PASS.

### Task 4: Consolidar mapa, cámara e historial

**Files:**
- Modify: `src/app/(admin)/monitoring/_components/operations-map.tsx`
- Modify: `src/app/(admin)/monitoring/_components/rider-history-panel.tsx`
- Test: `tests/ui/monitoring/operations-map.test.tsx`

- [ ] **Step 1: Escribir pruebas fallidas de cámara e historial**

```ts
expect(map.fitBounds).toHaveBeenCalledTimes(1);
expect(map.setZoom).toHaveBeenCalledWith(18);
fireEvent.click(screen.getByRole('button', { name: /ver toda la flota/i }));
expect(map.fitBounds).toHaveBeenCalledTimes(2);
```

Verificar además que playback oculta las demás motos, usa el icono de rider y restaura la flota al volver a vivo.

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `npx vitest run tests/ui/monitoring/operations-map.test.tsx`

Expected: FAIL en zoom, restauración o marcador de playback.

- [ ] **Step 3: Implementar comportamiento de cámara**

`fitBounds` se ejecuta al cargar y al cambiar el conjunto filtrado, salvo que el operador haya manipulado la cámara. Un token explícito restaura el encuadre. Después de `idle`, el zoom automático se limita a 18.

La animación interpola posiciones durante 900 ms; clustering permanece activo. En historial sólo se renderiza el rider seleccionado y el marcador de playback usa su curso.

- [ ] **Step 4: Verificar mapa e historial**

Run: `npx vitest run tests/ui/monitoring/operations-map.test.tsx tests/integration/monitoring/history-route.test.ts`

Expected: PASS.

### Task 5: Activar la mesa modular y retirar duplicación

**Files:**
- Modify: `src/app/(admin)/monitoring/page.tsx`
- Modify: `src/app/(admin)/monitoring/_components/monitoring-operations-desk.tsx`
- Delete: `src/app/(admin)/monitoring/live-map.tsx`
- Modify: `tests/ui/monitoring/operations-desk.test.tsx`
- Modify: `tests/ui/monitoring/responsive-context.test.tsx`

- [ ] **Step 1: Actualizar pruebas de composición**

```tsx
render(<MonitoringOperationsDesk />);
expect(screen.getByRole('region', { name: /flota en vivo/i })).toBeInTheDocument();
expect(screen.getByTestId('operations-map')).toBeInTheDocument();
expect(screen.queryByText('Contexto operativo')).not.toBeInTheDocument();
```

Al seleccionar un rider, verificar que aparece la tarjeta flotante y el mapa sigue montado.

- [ ] **Step 2: Ejecutar pruebas y confirmar el fallo**

Run: `npx vitest run tests/ui/monitoring/operations-desk.test.tsx tests/ui/monitoring/responsive-context.test.tsx`

Expected: FAIL porque la ruta y el layout todavía usan estructuras anteriores.

- [ ] **Step 3: Componer el layout aprobado**

Reducir `page.tsx` a:

```tsx
import { MonitoringOperationsDesk } from './_components/monitoring-operations-desk';

export default function MonitoringPage() {
  return <MonitoringOperationsDesk />;
}
```

La mesa renderiza filtros y KPIs compactos, `FleetList` a la izquierda y un contenedor relativo con `OperationsMap` y `RiderMapCard` a la derecha. En móvil, la lista pasa a panel deslizable.

- [ ] **Step 4: Retirar implementación legacy**

Eliminar `live-map.tsx` y cualquier import o prueba que dependa de sus helpers, trasladando las funciones puras de interpolación a `operations-map.tsx`.

- [ ] **Step 5: Verificar composición completa**

Run: `npx vitest run tests/ui/monitoring tests/integration/monitoring`

Expected: PASS.

### Task 6: Documentar y validar el módulo

**Files:**
- Modify: `CODEX.md`

- [ ] **Step 1: Documentar arquitectura y degradación**

Registrar que `/monitoring` usa una sola mesa modular, snapshot protegido, realtime incremental, listado completo, mapa con bounds y contexto flotante.

- [ ] **Step 2: Ejecutar validación estática**

Run: `npm run lint`

Expected: sin errores nuevos de monitoring.

Run: `npm run typecheck`

Expected: sin errores nuevos de monitoring.

- [ ] **Step 3: Ejecutar regresión completa de monitoring**

Run: `npx vitest run tests/unit/monitoring tests/integration/monitoring tests/ui/monitoring tests/scale/monitoring`

Expected: PASS.

- [ ] **Step 4: Validar visualmente**

Run: `npm run dev`

Comprobar `/monitoring` en escritorio y viewport móvil: carga, bounds inicial, filtros, selección, tarjeta flotante, clusters, historial y regreso a vivo.
