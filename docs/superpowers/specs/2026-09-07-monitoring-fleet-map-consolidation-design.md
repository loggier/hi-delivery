# Consolidación de Monitoreo de Flota

## Objetivo

Reemplazar las dos implementaciones actuales de `/monitoring` por un único módulo operativo, práctico y escalable. La prioridad es seguir en tiempo real a todos los riders y relacionar cada unidad con sus pedidos, sin perder superficie útil del mapa.

## Alcance

- Mostrar todos los riders aprobados, independientemente de que estén disponibles, ocupados o no disponibles.
- Permitir búsqueda y filtros por zona, disponibilidad, pedido activo y calidad de señal.
- Mantener un listado compacto de flota a la izquierda y un mapa dominante a la derecha.
- Abrir el contexto de la unidad seleccionada en una tarjeta flotante sobre el mapa.
- Conservar clustering, actualización realtime, orientación, velocidad, pedidos activos e historial reproducible.
- Consolidar la ruta sobre la arquitectura modular existente y retirar el flujo monolítico duplicado.

## Distribución

### Encabezado y filtros

El encabezado tendrá contadores compactos para toda la flota, disponibles, con pedido y sin señal. Los filtros no crearán paneles adicionales; se mantendrán en una barra compacta sobre el área de trabajo.

### Listado de flota

El panel izquierdo permanecerá visible en escritorio. Cada rider mostrará:

- avatar o iniciales;
- nombre y apellido;
- estado operativo;
- pedido activo, cuando exista;
- velocidad;
- antigüedad de la última ubicación;
- indicador visual de calidad de señal.

Los estados usarán una codificación consistente: verde para disponible, azul para rider con pedido, gris para no disponible y rojo para señal vencida. La señal vencida tiene prioridad visual sobre el estado operativo.

### Mapa

El mapa ocupará el resto del ancho disponible. Al cargar ejecutará `fitBounds` con todas las coordenadas válidas de la flota visible y aplicará padding. Si sólo existe una unidad o todas están muy próximas, el zoom máximo automático será 18.

El encuadre se recalculará cuando cambien filtros, pero no con cada evento realtime. Esto evita quitarle el control de cámara al operador. Un botón `Ver toda la flota` restaurará el encuadre en cualquier momento.

Los riders cercanos se agruparán con clusters. Las posiciones nuevas se interpolarán para mover la moto de forma suave. El curso del rider rotará el icono sin mover la cámara.

### Panel flotante

Seleccionar una unidad desde el listado o el mapa centrará suavemente su marcador y abrirá una tarjeta sobre el mapa, sin redimensionarlo. La tarjeta mostrará:

- nombre, avatar, zona y estado;
- velocidad y última señal;
- pedido activo con enlace al detalle;
- acciones `Centrar`, `Solicitar ubicación`, `Ver historial` y `Ver perfil`.

Cerrar la tarjeta no modificará el zoom ni el centro actual. Hacer clic en otro rider cambiará la selección. Hacer clic en una zona vacía del mapa cerrará la tarjeta.

## Pedidos e incidentes

Los pedidos e incidentes no tendrán columnas permanentes que reduzcan el mapa. Los contadores superiores y filtros permitirán encontrar pedidos sin asignar, riders ocupados y riders sin señal. Cuando un pedido o incidente esté relacionado con el rider seleccionado, aparecerá en su tarjeta flotante con acceso al detalle completo.

Los pickup, destinos y rutas sólo se mostrarán para el pedido seleccionado, evitando saturar el mapa.

## Historial

La acción `Ver historial` activará el modo de recorrido para el rider seleccionado:

- ocultará temporalmente las demás motos;
- dibujará la ruta histórica;
- moverá el mismo icono de moto durante la reproducción;
- actualizará fecha, hora, velocidad y orientación según el punto activo;
- permitirá elegir rango, velocidad, pausa, reinicio y posición manual;
- mostrará `Volver a vivo` como salida explícita.

Al volver a vivo se restaurarán la flota filtrada, la ubicación realtime actual y el encuadre correspondiente.

## Arquitectura

`page.tsx` quedará como entrada mínima y renderizará `MonitoringOperationsDesk`. La mesa utilizará:

- `useMonitoringController` para filtros y selección;
- `useMonitoringSnapshot` para el estado operativo periódico;
- `useMonitoringRealtime` para parches incrementales;
- `OperationsMap` para mapa, clusters, animación, rutas y cámara;
- un componente de listado de flota;
- una tarjeta contextual flotante;
- `RiderHistoryPanel` para consulta y reproducción.

El archivo monolítico y `LiveMap` se retirarán cuando toda su funcionalidad esté cubierta por los componentes modulares.

## Contrato de datos

El snapshot protegido debe entregar, como mínimo:

- riders: identidad, nombre, avatar, teléfono, zona, estado de aprobación, disponibilidad, coordenadas, velocidad, curso y timestamps de ubicación;
- pedidos: identificador, estado, rider, negocio, zona, pickup, destino y ruta disponible;
- relación rider-pedido activo;
- incidentes y KPIs ya calculados.

El snapshot se actualizará cada 15 segundos. Realtime actualizará ubicación, velocidad, curso, disponibilidad y asociaciones operativas que cambien entre snapshots. Los eventos con timestamp anterior al estado visible serán descartados.

El historial sólo se consultará mediante `/api/monitoring/history`, protegido por sesión administrativa. El navegador no consultará directamente `rider_location_history`.

## Errores y degradación

- Si realtime se desconecta, se conserva el último estado y continúa el polling.
- Si el snapshot falla temporalmente, se muestran los últimos datos con indicador de desactualización.
- Coordenadas inválidas no crean marcadores ni rompen el mapa.
- Las reglas que dependan de columnas ausentes se desactivan explícitamente en `dataHealth`.
- Las acciones sensibles conservan confirmación y auditoría.

## Responsive

En escritorio se usa la distribución de dos columnas. En tablet y móvil, el mapa conserva prioridad y el listado se abre como panel deslizable. La tarjeta contextual permanece superpuesta y usa altura máxima con scroll interno, sin bloquear los controles del mapa ni dejar overlays activos después de cerrarse.

## Verificación

- pruebas unitarias del filtrado, combinación de snapshot/realtime y estados visuales;
- pruebas UI de selección desde lista y marcador, tarjeta flotante y cierre;
- pruebas del encuadre inicial, cambio de filtros y botón de restauración;
- pruebas de clusters, actualización animada, velocidad y curso;
- pruebas de historial, reproducción y regreso a vivo;
- pruebas de degradación de snapshot y realtime;
- validación responsive en escritorio, tablet y móvil;
- `npm run lint` y `npm run typecheck` antes de cerrar la implementación.
