# Business Integrations API — Diseño

## Objetivo

Permitir que cada negocio integre sus sistemas con Hi Delivery para consultar sus pedidos y crear pedidos mediante una API versionada, con credenciales administrables desde su perfil y autorización estrictamente limitada al negocio propietario.

## Estado y decisiones aprobadas

- Aprobada por el usuario la arquitectura de API dedicada/versionada, separada de las rutas del panel.
- Aprobado el contrato inicial de consulta y creación descrito abajo.
- Una API key por negocio. El negocio la genera desde su perfil; se muestra completa sólo una vez. Se puede habilitar/deshabilitar y regenerar; al regenerar, la anterior queda revocada.
- La clave inicia deshabilitada. Al estar deshabilitada o revocada, cualquier solicitud autenticada con ella falla inmediatamente.
- El consumidor manda precios de conceptos libres. La API calcula subtotal y total; nunca confía en un total enviado.
- La integración manda nombre/teléfono del cliente; el backend reutiliza o crea el cliente dentro del mismo negocio.
- La documentación será una referencia visual embebida estilo Stoplight, basada en OpenAPI y accesible sólo desde el perfil de negocio.
- La sesión web existente y su autenticación contra `users.password` no se modifican.

## Contexto del proyecto

- Web: Next.js 15, TypeScript, Supabase, grupo de rutas activo en `src/app`.
- El perfil del negocio está en `src/app/(admin)/profile/page.tsx` y actualmente muestra cuenta, contraseña, negocio y suscripción.
- El esquema Supabase de producción es `grupohubs`; `businesses.user_id` vincula negocio y usuario. El ID observado para el rol de negocio es `owen-business`, con nombre “Dueño de Negocio”. La autorización debe validar el ID y el vínculo real, no depender sólo del nombre de rol ni del alias `role-owner`.
- `orders.business_id` y `customers.business_id` permiten imponer el aislamiento por negocio.
- `create_order_with_items` existe en producción con argumentos `order_id_in`, `business_id_in`, `customer_id_in`, direcciones, datos del cliente, importes, estado, ruta y `items_in`; retorna filas de `orders`.
- No se encontró infraestructura de rate limiting ni documentación API instalada en el panel.

## Arquitectura

### Gestión de credenciales

- Agregar una tabla privada para API keys de integración asociada a `businesses`.
- Guardar sólo digest criptográfico, prefijo no secreto, estado habilitado, fechas de creación/último uso y revocación. La credencial tendrá entropía criptográfica suficiente; nunca se persistirá ni se registrará el valor plano.
- Una restricción garantizará como máximo una clave no revocada por negocio. Regenerar revoca la anterior e inserta otra.
- Rutas de gestión protegidas por la sesión web HttpOnly actual: estado/listado seguro, crear o regenerar, y activar/desactivar. El backend obtiene el usuario de sesión, verifica negocio asociado y rol de negocio activo; nunca acepta un `business_id` del cliente para autorizar.
- Respuesta de creación devuelve el secreto sólo en esa operación. UI lo presenta una sola vez con advertencia y acción de copiar; posteriores consultas devuelven sólo prefijo y metadatos.

### Autenticación de integraciones

- API externa autenticada con `Authorization: Bearer <api_key>`.
- El backend calcula el digest, resuelve una clave habilitada y no revocada, confirma negocio activo, deriva el `business_id` desde la fila de clave y actualiza `last_used_at` best-effort.
- Fallos de autenticación no revelan si la clave existe, está apagada o revocada: en todos esos casos se responde `401` con mensaje genérico. Un negocio inactivo no puede operar la API. El rate limit devuelve `429`.
- La autenticación API es separada de las sesiones de panel y de los tokens de repartidor.

## Contrato API v1

Base path: `/api/v1`. Todos los endpoints aceptan y retornan JSON, salvo errores estándar.

### `GET /api/v1/orders`

- Devuelve pedidos pertenecientes únicamente al negocio asociado a la clave.
- Paginación por cursor opaco, con tamaño predeterminado y máximo documentados (máximo inicial propuesto: 100).
- Filtros permitidos: estado, fecha de creación desde/hasta y actualización desde. Validar formato, rangos y estados.
- Respuesta incluye `data`, `next_cursor` y `has_more`; los registros incluyen los datos del pedido y del destinatario que el negocio necesita para conciliar/entregar, y excluyen credenciales, datos de otros negocios y detalles internos del rider/GPS.

### `GET /api/v1/orders/{id}`

- Devuelve detalle sólo si `orders.id` coincide y `orders.business_id` es el negocio derivado de la clave.
- Para un ID inexistente o perteneciente a otro negocio, responder igual (`404`) para evitar enumeración.
- Incluir datos de entrega, estado, timestamps útiles e items; omitir información de asignación/GPS interna y secretos.

### `POST /api/v1/orders`

Cabecera requerida `Idempotency-Key` para que reintentos de red no creen pedidos duplicados. Repetir clave con el mismo payload devuelve la respuesta/pedido original; reutilizarla con payload distinto responde `409`.

Payload conceptual:

```json
{
  "customer": { "name": "Ana Pérez", "phone": "+525500000000", "email": "ana@example.com" },
  "delivery_address": {
    "street": "Av. Ejemplo 123", "neighborhood": "Centro", "city": "Ciudad", "state": "Estado",
    "postal_code": "00000", "references": "Casa azul", "latitude": 19.4, "longitude": -99.1
  },
  "delivery_fee": 35,
  "items": [
    { "description": "Producto externo", "quantity": 2, "unit_price": 120.5 }
  ],
  "notes": "Sin cebolla"
}
```

- El negocio se deriva de la API key; `business_id`, `rider_id`, `status`, `order_total`, `subtotal`, `estimated_earnings` y timestamps no son campos aceptados del request.
- Nombre/teléfono se validan y normalizan. Buscar cliente por teléfono normalizado dentro de ese negocio; si no existe, crear el cliente en ese negocio. No asociar ni reutilizar clientes de otros negocios.
- Precios e importes deben ser números decimales válidos, finitos, no negativos, con precisión monetaria de dos decimales y límites documentados; el subtotal se calcula en servidor con aritmética decimal como suma de `quantity * unit_price`, y el total como subtotal + `delivery_fee`.
- La dirección de recolección se deriva del perfil del negocio. No se permite que el consumidor cambie la ubicación/negocio de origen.
- Estado inicial fijado por servidor a `pending_acceptance`; la creación usa el flujo de `create_order_with_items` y el dispatch/push existentes, best-effort según patrones del proyecto.
- La creación del cliente, la deduplicación/idempotencia y la creación de la orden deben quedar coordinadas atómicamente en base de datos o en una RPC transaccional; no dejar clientes huérfanos ni pedidos duplicados si falla un paso.
- Respuesta `201` con `id`, `status`, montos calculados y timestamps públicos del pedido.

### Errores, límites y observabilidad

- Formato estándar: `{ "error": { "code": "...", "message": "...", "details": ... } }`; no incluir errores SQL, stack traces, hash de claves ni datos de otros negocios.
- Usar `400` para payload/filtros inválidos, `401` genérico para API key faltante/inválida/apagada/revocada, `403` para negocio inactivo, `404` para pedido no visible, `409` para conflicto de idempotencia, `422` para validación semántica, `429` para rate limit y `500/503` para fallos internos/dependencias.
- Implementar rate limiting compartido entre instancias, atómico y respaldado por Postgres/RPC o infraestructura distribuida existente; límite inicial propuesto: 60 solicitudes por minuto por clave. No usar sólo memoria del proceso Next.js.
- `last_used_at` y métricas mínimas de uso serán best-effort. No registrar cabeceras de autorización, credenciales ni PII completa.
- Aplicar límites al tamaño del body, número de items, cantidad, precios, página y filtros; deshabilitar caché de respuestas autenticadas.

## Documentación y perfil

- Añadir bloque “Integraciones API” al perfil del negocio, sólo para la cuenta asociada al rol `owen-business`/dueño; el resto de roles no ve la sección ni puede abrir directamente su endpoint.
- El bloque permite crear/regenerar, habilitar/deshabilitar y consultar metadatos de la única clave.
- Añadir navegación interna a “Documentación API” en el perfil, con estilo Stoplight: panel lateral por endpoints, método/path, autenticación, parámetros, schemas, ejemplos listos para copiar y catálogo de respuestas/errores.
- Mantener una definición OpenAPI versionada como fuente de verdad para la documentación, sin incorporar un renderer pesado por defecto. La UI usa los componentes y patrones del panel.
- Incluir ejemplos `curl` y JSON para listar, consultar detalle y crear pedido; indicar que el secreto debe vivir en backend/secret manager del cliente, nunca en frontend público.
- El documento público de referencia no incluirá una API key de ejemplo real.

## Seguridad e invariantes

1. La API key, no el payload, determina `business_id`.
2. No existe lectura, escritura o detalle entre negocios; toda query incluye scope server-side.
3. `service_role` sólo se utiliza en backend y nunca se devuelve al cliente.
4. El hash no permite recuperar el secreto y el secreto sólo aparece una vez.
5. La desactivación/revocación tiene efecto en la siguiente solicitud sin esperar expiración de JWT.
6. El API key no altera el login actual, sesiones del panel ni permisos de la app rider.
7. El POST es idempotente y no permite cambiar estado o asignar repartidor.
8. Mantener la integridad del flujo actual del POS y Shipping; reutilizar su RPC cuando sea compatible.

## Validación de aceptación

- Clave ausente, inválida, deshabilitada o revocada no permite consulta/creación.
- Negocio A no ve ni modifica pedidos/clientes de B incluso cambiando IDs/filtros/payload.
- Dueño de negocio sólo administra la clave del negocio vinculado a su sesión; admin/rider y usuarios no vinculados no acceden a la sección/API de gestión.
- El secreto aparece una sola vez y la base sólo contiene su hash/prefijo.
- GET lista/detalle soportan paginación y no filtran campos internos.
- POST calcula totales, valida cantidades/precios/dirección, crea o reutiliza cliente dentro de scope, crea pedido pendiente y se puede reintentar con la misma idempotency key sin duplicar.
- Reutilizar idempotency key con body distinto produce `409`.
- La documentación concuerda con el OpenAPI y sus ejemplos/errores; sólo se presenta en perfil de negocio.
- Validar al menos análisis estático/lint y pruebas de API/key management; incluir pruebas negativas de aislamiento cross-business y de rotación/desactivación.

## Fuera de alcance para v1

- Webhooks, callbacks, eventos de cambio de estado o gestión/cancelación de pedidos desde integraciones.
- API keys adicionales por negocio, scopes configurables por clave, IP allowlist, OAuth de terceros o API pública anónima.
- Exponer acceso directo a Supabase/PostgREST o datos de riders.
- Cambiar la autenticación web existente.
