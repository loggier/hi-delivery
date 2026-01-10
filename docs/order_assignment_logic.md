# Lógica de Asignación de Pedidos

Este documento describe el sistema propuesto para la asignación automática, justa y eficiente de pedidos a los repartidores.

## Visión General

El objetivo es crear un sistema que no solo asigne los pedidos rápidamente, sino que también sea equitativo con los repartidores y optimice los recursos de la plataforma. Para ello, se propone un **Sistema de Puntuación (Scoring)** que califica la idoneidad de cada repartidor disponible para un pedido específico.

## Flujo de Trabajo Detallado

1.  **Nuevo Pedido:** Cuando un pedido es creado, entra en estado `"pending_acceptance"`.

2.  **Búsqueda de Candidatos:** El sistema identifica a todos los repartidores que cumplen con los requisitos:
    *   Están **activos** (`is_active_for_orders = true`).
    *   Se encuentran dentro de un radio geográfico razonable.
    *   Tienen **menos de 2 pedidos** en curso.
    *   No están en la lista `rejected_riders` para este pedido.

3.  **Cálculo de Puntaje (Core-HID):** Para cada repartidor candidato, se calcula un "puntaje de idoneidad" basado en una combinación de factores (ver abajo).

4.  **Notificación Estratégica:** Se notifica al o a los repartidores con el puntaje más alto. Esto se logra añadiendo sus IDs al campo `notified_riders` en la tabla `orders`.

5.  **Escucha en la App (Flutter):**
    *   La app de cada repartidor escucha en tiempo real los cambios en la tabla `orders`.
    *   Si el ID del repartidor aparece en el campo `notified_riders` de un nuevo pedido, la app muestra la notificación para aceptar o rechazar.

6.  **Acción del Repartidor:**
    *   **Si Acepta:** La app llama a una API que actualiza el pedido, estableciendo el `rider_id` y cambiando el `status` a `'accepted'`. El proceso de asignación para este pedido finaliza.
    *   **Si Rechaza:** La app llama a una API que:
        *   Registra el rechazo en la tabla `rider_events` (`event_type: 'rejected'`).
        *   Añade el ID del repartidor a la lista `rejected_riders` del pedido.
        *   **Vuelve a ejecutar el paso 2 y 3** para encontrar y notificar al siguiente mejor candidato.

7.  **Fallo de Asignación:** Si se agotan los candidatos y nadie acepta, el pedido queda pendiente para asignación manual por parte de un administrador.

---

## Factores del Sistema de Puntuación (Scoring)

El puntaje de cada repartidor se calcula sumando puntos ponderados de los siguientes factores:

### 1. Distancia al Negocio (Ponderación Alta)
Es el factor más crítico para asegurar recogidas rápidas.

*   **Lógica:** Menor distancia = Más puntos.
*   **Implementación:** Se puede usar una fórmula inversa (ej. `Puntos = 1 / distancia_en_km`).

### 2. Carga de Trabajo Actual (Ponderación Media)
Prioriza a los repartidores con menos carga para equilibrar el trabajo y asegurar un buen servicio.

*   **Lógica:** Repartidores con 0 pedidos obtienen más puntos que aquellos con 1 pedido. Repartidores con 2 o más pedidos quedan descalificados para recibir nuevas asignaciones.
*   **Ejemplo de Puntuación:**
    *   0 pedidos activos: +20 puntos.
    *   1 pedido activo: +5 puntos.
    *   2+ pedidos activos: -1000 puntos (descalificación).

### 3. Tiempo desde la Última Asignación (Factor de Justicia)
Este factor previene que los mismos repartidores acaparen todos los pedidos solo por su ubicación, promoviendo una distribución más equitativa.

*   **Lógica:** Más tiempo de inactividad (sin recibir un pedido) = Más puntos.
*   **Implementación:** Se calcula el tiempo transcurrido desde `completed_at` del último pedido del repartidor. Se puede asignar un punto por cada X minutos de espera.

### 4. Tasa de Aceptación (Factor de Fiabilidad)
Premia la fiabilidad y el compromiso de los repartidores con la plataforma, consultando la tabla `rider_events`.

*   **Lógica:** Un historial de aceptar pedidos consistentemente otorga un bono de puntos.
*   **Implementación:** Se calcula el porcentaje de aceptación de los últimos 50 pedidos notificados.
    *   *Ej: Tasa > 90% = +15 puntos; Tasa 70-89% = +5 puntos.*

---

## Estrategia de Notificación Propuesta

Una vez calculado el puntaje para todos los candidatos, se recomienda el siguiente enfoque híbrido:

1.  **Seleccionar un Lote:** El sistema selecciona a los **3 repartidores con el puntaje más alto**.
2.  **Notificación Simultánea:** Se actualiza `notified_riders` con los IDs de los 3 repartidores al mismo tiempo.
3.  **Asignación "First-Come, First-Served":** El primer repartidor que acepte el pedido se lo queda. Los demás reciben una notificación de que el pedido ya fue tomado.
4.  **Si nadie acepta:** Tras un tiempo (ej. 60 segundos), se puede volver a ejecutar el proceso para encontrar al siguiente lote de candidatos, o marcar el pedido para asignación manual.
