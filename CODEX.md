# CODEX.md

Bitácora de cambios realizados por Codex para mantener continuidad técnica en este proyecto.

## Convención

- Registrar cambios funcionales hechos por Codex.
- Anotar decisiones que afectan validaciones, dependencias o base de datos.
- Mantener entradas breves y orientadas a seguimiento.

## Sesión 2026-03-17

### Dependencias

- `react-day-picker` actualizado a `^9.14.0` para compatibilidad con React 19.
- Wrapper de calendario adaptado al API de `react-day-picker@9`.
- `react-to-print` eliminado de `package.json` porque no estaba en uso y bloqueaba `npm install` con React 19.

### Formularios de repartidor

- `site/deliveryman/apply`:
  - Validación de WhatsApp reforzada.
  - Campo requerido en creación de cuenta.
  - Se aceptan formatos con o sin `+52`.
  - El valor se normaliza a `+52XXXXXXXXXX`.
- `site/deliveryman/apply/vehicle-info`:
  - `brandOther` sólo es obligatorio cuando `brand === "Otra"`.
  - Si se elige una marca normal, `brandOther` se limpia y no bloquea el envío.
  - El input de `brandOther` se muestra en una fila independiente para no romper el layout.
  - El bloque de uploads de licencia y circulación se reordenó para que empiece desde la columna izquierda y conserve mejor la secuencia visual.
  - Se eliminó un placeholder vacío que dejaba un hueco visual antes de `Licencia de Conducir (Frente)`.

### API y base de datos

- API de alta de repartidores:
  - Manejo explícito de error `409` cuando el correo ya existe.
  - Manejo explícito de error `409` cuando `phone_e164` ya existe.
- SQL:
  - Se añadió constraint única para `riders.phone_e164` en scripts de recreación.
  - Se agregó migración `src/sql/add_riders_phone_e164_unique.sql` para bases existentes.

### Dashboard

- `dashboard-stats` ahora evita depender exclusivamente de RPCs:
  - intenta usar `get_daily_dashboard_stats` o `get_business_dashboard_stats`
  - si fallan, calcula el resumen directamente desde la tabla `orders`
- La carga del dashboard ahora espera a que el usuario/rol estén resueltos antes de disparar la consulta, para no mezclar vista de admin con vista de dueño de negocio durante hidratación.
- El dashboard de admin ahora prioriza KPIs operativos:
  - repartidores registrados
  - repartidores activos
  - negocios registrados
  - negocios activos
  - pedidos del día
  - pedidos del mes
- El dashboard global del admin volvió más interactivo con:
  - grid de estados de pedidos activos
  - gráfica semanal de pedidos
  - gráfica semanal de ingresos
- Se agregó una visualización de capacidad de repartidores:
  - activos vs margen disponible
  - porcentaje de uso sobre la base total registrada
- Se compactó el layout del dashboard de admin:
  - los KPIs pequeños ahora pueden mostrarse en 4 columnas por fila desde `lg`
  - las gráficas se redistribuyeron para aprovechar mejor el ancho disponible
- Se removieron los KPIs redundantes de repartidores registrados/activos y la gráfica de capacidad pasó al primer bloque del dashboard.
- El primer bloque del dashboard de admin ahora abre con la gráfica de capacidad de repartidores y deja los KPIs de negocios/pedidos como resumen secundario.

### Repartidores

- En `/riders` se agregó un resumen superior con widgets compactos para:
  - repartidores registrados
  - repartidores asignados a zona
  - repartidores sin zona
- También se agregó un widget compacto de distribución por zona.
- Luego se compactó aún más ese bloque para reducir altura visual y dejar más espacio a la tabla.
- El widget de `incompletos` se sustituyó por un widget compacto de totales por estado para ver el resumen completo en una sola tarjeta.
- El resumen superior de `/riders` se reorganizó en dos líneas:
  - primera línea con widgets pequeños
  - segunda línea con el widget de estados ocupando todo el ancho
- Luego se corrigió el duplicado del widget de estados y se compactó su altura para que el bloque superior ocupe realmente sólo dos líneas.
- `Total por Estado` y `Resumen por Zona` quedaron en la misma fila, con tipografía y densidad más compactas para compartir espacio.
- Los widgets del resumen superior de `/riders` ahora funcionan como filtros rápidos sobre la tabla inferior por estado y por zona.
- En `/riders` se agregó un buscador dinámico que filtra en tiempo real por nombre, email, teléfono y zona.
- `/riders` ahora usa un toolbar tipo negocios con:
  - buscador
  - botón de reinicio
  - control para mostrar/ocultar columnas

### Contexto Operativo Aprendido

- `cerebro.md` define la lógica deseada de asignación automática de pedidos:
  - el pedido nuevo entra como `pendiente de asignación`
  - sólo participan repartidores `is_active_for_orders = true`
  - deben estar dentro de un radio configurable del pickup
  - cada candidato recibe un score de idoneidad
- Factores del score:
  - distancia al negocio: mayor peso, menor distancia = mejor score
  - carga actual: 0 pedidos favorecido, 1 pedido penalizado, 2+ descalificado
  - tiempo desde la última asignación/completado: factor de justicia
  - tasa de aceptación: factor opcional de fiabilidad
- Estrategias de notificación contempladas:
  - por lotes: top 3 simultáneo, gana quien acepta primero
  - secuencial: uno por uno con ventana de decisión
- El documento recomienda iniciar con notificación por lotes como balance entre velocidad y equidad.

- `prompt.md` describe la app del repartidor del otro proyecto como prototipo Flutter UI-first:
  - fase 1 completamente mockeada, sin backend ni geolocalización real
  - stack esperado: Flutter, Dart, Riverpod, Google Maps con rutas/ubicaciones estáticas
  - flujo principal:
    - login simulado
    - home con toggle activo/inactivo
    - simulación de nueva orden con temporizador
    - flujo de pedido por pasos: ir al negocio, recoger, ir al cliente, evidenciar entrega
    - dashboard de ganancias
    - perfil y cierre de sesión
- Estados de orden relevantes para la experiencia móvil:
  - `pending_acceptance`, `accepted`, `at_store`, `picked_up`, `on_the_way`, `delivered`

### Propuesta de Configuración de Dispatch

- Para soportar ambos algoritmos de notificación/asignación desde configuración global:
  - `dispatch_algorithm`: `batch` o `sequential`
  - `dispatch_candidate_radius_km`: radio de búsqueda de repartidores candidatos
  - `dispatch_batch_size`: tamaño del lote para algoritmo simultáneo
  - `dispatch_decision_window_seconds`: ventana de respuesta por repartidor o lote
- La tabla candidata actual es `grupohubs.system_settings`, que ya está diseñada como single-row config (`id = 1`).
- `/settings` ya expone estos campos de dispatch para administración desde UI:
  - algoritmo
  - radio de búsqueda
  - tamaño de lote
  - ventana de decisión

### Estado Actual de Asignación de Pedidos

- El flujo activo de creación de pedidos desde POS usa `src/app/api/orders/route.ts`.
- Ese endpoint actualmente:
  - crea la orden vía RPC `create_order_with_items`
  - devuelve la orden al cliente
  - no muestra en código una llamada explícita a la lógica de asignación
- Existe una implementación separada en `src/api/orders/route.ts` con lógica `assignOrder(...)`, pero todo indica que no es la ruta activa del App Router.
- La lógica encontrada en `src/api/orders/route.ts` hoy está hardcodeada:
  - radio fijo de 10 km
  - sólo estrategia por lotes (`top 3`)
  - no consulta `system_settings`
- Con la información visible, para confirmar el proceso real actual falta revisar la definición SQL de la RPC `create_order_with_items`, porque podría incluir lógica de asignación dentro de la base de datos.
- Tras revisar la RPC compartida, la versión activa sólo inserta orden + items y no ejecuta asignación.
- Decisión técnica para v1:
  - no es obligatorio cambiar la tabla `orders`
  - sí hace falta reemplazar la RPC de creación para que invoque una función de dispatch
  - el dispatch debe leer `system_settings.dispatch_algorithm` y decidir entre `batch` y `sequential`
- Para resolver timeout y reintentos de asignación:
  - `orders` debe manejar una `ola activa` de riders notificados
  - esa ola necesita expiración de ventana de decisión
  - si nadie acepta, el sistema debe pasar al siguiente rider/lote automáticamente
  - si se agotan candidatos, la orden queda marcada como agotada para futura asignación manual por despachador
- Para trazabilidad real de dispatch se recomienda una tabla de auditoría separada:
  - un registro por rider notificado y por intento
  - con timestamps de notificación, expiración, aceptación o rechazo
  - esto complementa `orders.notified_riders` y `orders.rejected_riders`, que sólo sirven como estado agregado
- La UI de detalle de pedido ya quedó preparada para consumir esa trazabilidad:
  - resume `notified_riders`, `active_notified_riders`, expiración, agotamiento e intentos
  - muestra historial por rider desde `order_assignment_attempts` si la tabla ya existe y las funciones SQL escriben en ella
- Importante:
  - crear la tabla `order_assignment_attempts` no basta por sí solo
  - todavía hay que hacer que `dispatch_order`, `accept_order_assignment`, `reject_order_assignment` y `process_expired_order_dispatches` inserten/actualicen esos registros
- Siguiente paso definido:
  - reemplazar esas funciones en Supabase para que la auditoría quede operativa
  - cada notificación debe crear intento
  - cada aceptación, rechazo o expiración debe actualizar su intento correspondiente
- Validación posterior en base:
  - el proyecto no tenía aún las columnas de ola activa/expiración en `orders`
  - por eso no aparecieron `active_notified_riders`, `notification_expires_at` ni `dispatch_attempt_count`
  - `pg_cron` no está disponible en el proyecto Supabase actual (`schema "cron" does not exist`)
  - mientras no exista `pg_cron`, la expiración debe dispararse desde backend o ejecutarse manualmente

### Nota operativa

- Si la base ya contiene teléfonos duplicados en `grupohubs.riders`, la constraint única de `phone_e164` no podrá aplicarse hasta limpiar esos registros.

## Sesión 2026-03-18

### Integración Rider App vs Dispatch Real

- Se revisó la app Flutter `hid-repartidores` contra `CODEX.md`, `cerebro.md`, `docs/order_assignment_logic.md` y el contrato de datos visible en el admin web.
- Flujo real confirmado en código:
  - el alta de pedidos activa visible sigue entrando por `src/app/api/orders/route.ts`
  - esa ruta llama la RPC `create_order_with_items`
  - en el repo no aparece una llamada activa posterior a `dispatch_order`, así que el dispatch automático depende de SQL/RPC fuera del código versionado o todavía no está cerrado end-to-end en este repo
  - el admin web ya espera columnas y relaciones de dispatch enriquecido en `orders`:
    - `active_notified_riders`
    - `notification_expires_at`
    - `assignment_exhausted_at`
    - `dispatch_attempt_count`
    - `order_assignment_attempts`
- La app Flutter estaba desfasada respecto a ese contrato:
  - listaba pendientes sólo por `notified_riders`
  - aceptaba/rechazaba con `update` directo sobre `orders`
  - no reflejaba la ventana activa ni los intentos de asignación

### Cambios aplicados en `hid-repartidores`

- `lib/services/order_assignment_service.dart` ahora centraliza el contrato de lectura de órdenes con fallback entre esquema enriquecido y esquema legacy.
- La app rider ahora considera un pedido pendiente sólo si:
  - sigue en `pending_acceptance`
  - no tiene `rider_id`
  - el rider no está en `rejected_riders`
  - la ventana sigue abierta si existe `notification_expires_at`
  - el rider está en `active_notified_riders` cuando esa ola activa existe
  - si la base todavía no tiene ola activa, cae a `notified_riders` como compatibilidad
- Aceptar/rechazar ahora intenta primero las RPCs de dispatch:
  - `accept_order_assignment`
  - `reject_order_assignment`
- Si esas RPCs no existen o tienen otra firma en una instalación legacy, la app cae al comportamiento anterior por `update` directo para no romper operación.
- `home_screen.dart` dejó de disparar notificaciones locales sólo por `notified_riders`; ahora valida la elegibilidad real del rider para la ola activa.
- `orders_screen.dart` dejó de filtrar pendientes con JSON containment directo y ahora consume la lógica centralizada del servicio.
- `order_details_sheet.dart` ahora muestra resumen de dispatch para el rider:
  - expiración de ventana
  - tamaño de la ola activa
  - contador de intentos
  - trazabilidad reciente desde `order_assignment_attempts`
- `order_card.dart` ahora muestra metadata de ventana/intentona cuando el pedido sigue pendiente.

### Validación

- `flutter analyze` en `hid-repartidores` quedó sin errores nuevos por estos cambios.
- Persisten warnings/info previos del proyecto, especialmente:
  - convenciones de nombres en enums/modelos
  - varios `curly_braces_in_flow_control_structures`
  - dos warnings existentes en `rider_availability_service.dart`

### Dependencia abierta

- Para que la app quede 100% alineada sin fallback legacy, falta confirmar o versionar en SQL las RPCs y funciones reales de dispatch (`dispatch_order`, `accept_order_assignment`, `reject_order_assignment`, `process_expired_order_dispatches`) junto con la escritura de `order_assignment_attempts`.

### Pedidos por Rol

- En `src/app/(admin)/orders/page.tsx` se corrigió el scoping del listado de pedidos según sesión:
  - admin (`role-admin`) carga pedidos globales sin filtro por negocio
  - dueño de negocio (`role-owner`) sólo carga pedidos de su `business_id`
- El módulo ahora espera a que `auth-store` termine de hidratar la sesión antes de disparar consultas:
  - evita que la vista de pedidos cargue con un filtro incorrecto mientras `user` todavía no está resuelto
  - el patrón quedó alineado con el dashboard para usuarios con scope de negocio

### Rider App: Mapa Principal y Navegación

- En `hid-repartidores` el `MapScreen` dejó de mostrar sólo la moto:
  - ahora carga pedidos activos del rider
  - pinta marcadores de negocio/cliente para esos pedidos
  - permite seleccionar un pedido activo desde un panel inferior
  - al seleccionar uno, traza la ruta actual desde la moto hasta su siguiente destino operativo
- El panel inferior del mapa se refinó:
  - el título ahora refleja el negocio/pedido seleccionado
  - se agregó acción `Ver pedido` para abrir una modal completa desde el mapa principal
- Se agregó apertura externa a Google Maps desde Flutter usando `url_launcher`.
- En el detalle del pedido (`order_details_sheet.dart`) ahora existe botón contextual:
  - `Ir al negocio` antes del pickup
  - `Ir al cliente` después del pickup
- Se añadió servicio auxiliar de navegación externa y se extendió `order_assignment_service.dart` para consultar pedidos activos propios.
- Validación:
  - `flutter pub get` ejecutado correctamente

### Rider App: Panel Minimizado y Notificación Viva

- El panel inferior del mapa ahora soporta dos estados intencionales:
  - expandido para operar acciones (`Ver pedido`, `Ver ruta`, `Abrir en Google Maps`)
  - minimizado para dejar visible la ruta con contexto breve del pedido activo
- La versión minimizada ahora muestra:
  - negocio/pedido seleccionado
  - siguiente destino operativo
  - estado traducido
  - ETA estimada en minutos
  - distancia restante cuando la ruta ya fue calculada
- `home_screen.dart` cambió a `IndexedStack` para conservar el estado del `MapScreen` al cambiar de pestaña:
  - evita destruir y recrear el mapa
  - mantiene consistente la ruta visible y la sincronización de estado
- Se agregó `RiderNotificationService` en Flutter para Android:
  - crea una notificación persistente de bajo ruido para el rider
  - muestra `Disponible para recibir pedidos` cuando no hay orden activa
  - cuando existe pedido activo, refleja negocio, siguiente destino, estado, ETA y distancia
- La notificación Android ahora incluye acciones rápidas:
  - `Abrir app`
  - `Abrir Maps` cuando el pedido activo ya tiene destino resoluble
- La notificación viva se sincroniza desde `MapScreen` con el pedido/ruta seleccionados y cae a estado de disponibilidad cuando ya no hay pedidos activos.
- La navegación externa dejó de ser Android-only en la práctica:
  - en iOS intenta abrir la app de Google Maps si está instalada
  - si no existe, cae a Apple Maps usando el mismo destino operativo
- `RiderNotificationService` quedó inicializado también para iOS con solicitud explícita de permisos locales y una versión compatible de la notificación viva, aunque la experiencia más rica sigue siendo Android por las limitaciones nativas de iOS.

### Rider App: Deep Link Interno desde Notificaciones

- Se añadió `RiderAppIntentService` como bus ligero de intenciones internas para no depender de routing complejo.
- `HomeScreen` ahora escucha intenciones internas y fuerza el tab `Mapa` cuando la app se abre desde una notificación relacionada con operación del rider.
- `MapScreen` ahora procesa intenciones internas con contexto de pedido:
  - enfoca el pedido activo correspondiente
  - recalcula la ruta si hace falta
  - puede abrir directamente la modal completa del pedido
- La notificación viva del rider ahora envía `orderId` en payload y soporta:
  - tap general o acción `Abrir app` para abrir la app enfocando el pedido/ruta
  - acción `Ver pedido` para abrir directamente el detalle del pedido activo
  - acción `Abrir Maps` para navegación externa al siguiente destino
- La notificación operativa del pedido activo ahora cambia según fase real del viaje:
  - usa una presentación distinta para preparación, pickup, ruta y llegada
  - expone progreso visual del viaje en Android
  - eleva la urgencia cuando el rider llega al destino
  - mantiene una versión compatible en iOS con `interruptionLevel` ajustado por fase

### Rider App: Refinamiento del Mapa Operativo

- `MapScreen` ahora prioriza automáticamente el pedido más urgente cuando la selección previa ya no existe:
  - llegada al destino
  - ruta al cliente
  - pedido recogido
  - pickup en negocio
  - aceptación/preparación
- El mapa ahora muestra un banner superior compacto de viaje activo:
  - estado actual
  - negocio/pedido seleccionado
  - siguiente destino
  - ETA rápida
- El panel inferior mejoró la lectura operativa sin cambiar el layout base:
  - ETA y distancia ahora se muestran como métricas compactas
  - el color de acento cambia según fase del pedido
  - las tarjetas de pedidos activos heredan ese tono para reforzar jerarquía visual

### Rider App: Acciones Operativas desde Mapa

- El panel del mapa ahora permite avanzar estados sin salir de la navegación:
  - `Llegué al negocio`
  - `Pedido recogido`
  - `Llegué al cliente`
- Estas acciones usan transiciones reales desde `OrderAssignmentService` y registran `order_events` en modo best-effort con ubicación del rider cuando existe.
- La modal del pedido abierta desde mapa dejó de ser sólo lectura:
  - reutiliza `OrderDetailsSheet`
  - acepta/rechaza si aplica
  - permite `Recogido`, `En sitio` y completar con foto
  - al completar con evidencia desde mapa sube la prueba y marca la orden como `completed`
- El mapa principal también quedó alineado visualmente con la modal:
  - negocio usa `assets/images/bussines.png`
  - cliente usa `assets/images/home.png`
  - se eliminaron los íconos Material anteriores para mantener consistencia entre ambos mapas

### Rider App: Build Android

- `flutter_local_notifications` exigió activar `coreLibraryDesugaring` en Android.
- Se actualizó `android/app/build.gradle.kts` en `hid-repartidores` para:
  - habilitar `isCoreLibraryDesugaringEnabled = true`
  - agregar `coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")`
- También quedó configurada la firma release en Android:
  - `android/key.properties` carga alias, passwords y ruta del keystore
  - `build.gradle.kts` ahora crea `signingConfigs.release`
  - si existe `key.properties`, `release` se firma con ese keystore; si no, cae a debug para no romper compilación local
- Ajuste importante:
  - como el keystore real está en la raíz de `hid-repartidores`, la ruta válida quedó `../my-release-key.keystore` desde `android/key.properties`
  - la variante `../../my-release-key.keystore` no coincide con esta estructura actual

### Web Admin: Google Maps Script Dedupe

- En el módulo de negocios se agregó un `id` estable compartido al loader de Google Maps:
  - `src/app/(admin)/businesses/business-form.tsx`
  - `src/app/(admin)/businesses/[id]/page.tsx`
- El `id` fijado (`hi-delivery-businesses-google-maps`) evita que `@react-google-maps/api` trate esas cargas como scripts distintos y reduzca el warning de carga múltiple en `/businesses/new`.

### Web Admin: Alta de Categoría de Negocio

- Se corrigió `business-categories/new`:
  - `grupohubs.business_categories.id` no tiene default en base
  - el formulario estaba intentando crear sin `id`
  - ahora genera `id` en cliente con prefijo `bizcat-` + `crypto.randomUUID()` antes de llamar `useCreate`
- También se ajustó el tipo del mutation para aceptar explícitamente `{ id, name, type, active }` en creación.

### Web Admin: Alta de Plan

- Se corrigió `plans/new`:
  - `grupohubs.plans.id` no tiene default en base
  - el formulario estaba creando sin `id`
  - ahora genera `id` en cliente con prefijo `plan-` + `crypto.randomUUID()` antes de llamar `useCreate`
- También se ajustó el tipo del mutation para aceptar explícitamente el payload completo del plan con `id`.

### Web Admin: Validación de Negocios

- Se alineó la validación de create/edit de negocios con la regla operativa actual:
  - obligatorios:
    - sección principal del negocio
    - información de contacto
    - detalles operativos sin fotos
    - ubicación
  - opcionales:
    - información fiscal/documental
    - notas
- `businessSchema` ahora exige explícitamente:
  - `category_id`
  - `zone_id`
  - `phone_whatsapp`
  - `logo_url`
  - `delivery_time_min`
  - `delivery_time_max`
  - `has_delivery_service`
  - `average_ticket`
  - `weekly_demand`
  - además valida que el máximo de entrega no sea menor que el mínimo
- Se corrigió el flujo admin de creación de negocios:
  - `/api/businesses` ya no crea sólo un perfil mínimo/incompleto
  - ahora procesa el formulario completo del admin, sube archivos, valida el payload y persiste `category_id` y el resto de campos operativos
- También se endureció el update:
  - `/api/businesses/[id]` ahora normaliza y valida el formulario completo antes de actualizar
- En `business-form.tsx`, si cambia el tipo y la categoría ya no aplica, el reset de `category_id` ahora cae a `""` y revalida, en vez de quedar en `undefined`.
  - `flutter analyze` sin errores nuevos; sólo permanecen los warnings/info previos del proyecto
