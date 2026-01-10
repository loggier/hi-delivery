# Lógica de Asignación de Pedidos

Este documento describe el sistema propuesto para la asignación automática, justa y eficiente de pedidos a los repartidores.

## Visión General

El objetivo es crear un sistema que no solo asigne los pedidos rápidamente, sino que también sea equitativo con los repartidores y optimice los recursos de la plataforma. Para ello, se propone un **Sistema de Puntuación (Scoring)** que califica la idoneidad de cada repartidor disponible para un pedido específico.

## Flujo de Trabajo

1.  **Nuevo Pedido:** Cuando un pedido es creado, entra en estado "pendiente de asignación".
2.  **Búsqueda de Candidatos:** El sistema identifica a todos los repartidores que cumplen con los requisitos mínimos:
    *   Están **activos** para recibir pedidos (`is_active_for_orders = true`).
    *   Se encuentran dentro de un radio de X kilómetros del negocio (pickup).
3.  **Cálculo de Puntaje:** Para cada repartidor candidato, se calcula un "puntaje de idoneidad" basado en una combinación de factores.
4.  **Notificación Estratégica:** Se notifica al o a los repartidores con el puntaje más alto.
5.  **Asignación o Fallo:** Si un repartidor acepta, se le asigna el pedido. Si nadie acepta después de un tiempo, el pedido queda pendiente para asignación manual por parte de un administrador.

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

### 4. Tasa de Aceptación (Factor de Fiabilidad - Opcional)
Premia la fiabilidad y el compromiso de los repartidores con la plataforma.

*   **Lógica:** Un historial de aceptar pedidos consistentemente otorga un bono de puntos.
*   **Implementación:** Se calcula el porcentaje de aceptación de los últimos 50 pedidos notificados.
    *   *Ej: Tasa > 90% = +15 puntos; Tasa 70-89% = +5 puntos.*

---

## Estrategias de Notificación

Una vez calculado el puntaje para todos los candidatos, el sistema puede proceder de dos maneras:

### Opción A: Notificación por Lotes (Enfoque Rápido y Competitivo)
1.  **Seleccionar un Lote:** El sistema selecciona a los **3 repartidores con el puntaje más alto**.
2.  **Notificación Simultánea:** Se envía la notificación del nuevo pedido a los 3 repartidores al mismo tiempo.
3.  **Asignación "First-Come, First-Served":** El primer repartidor que acepte el pedido se lo queda. Los demás reciben una notificación de que el pedido ya fue tomado.

### Opción B: Notificación Secuencial Mejorada (Enfoque Justo y Ordenado)
1.  **Notificar al Mejor:** El sistema notifica **únicamente al repartidor con el puntaje más alto**.
2.  **Ventana de Decisión:** El repartidor tiene un tiempo límite (ej. 60 segundos) para aceptar o rechazar.
3.  **Pasar al Siguiente:** Si el repartidor rechaza o no responde, el sistema pasa al siguiente repartidor con el segundo mejor puntaje, y así sucesivamente hasta que el pedido sea aceptado o se agoten los candidatos.

## Conclusión

El **Sistema de Puntuación** con una estrategia de **Notificación por Lotes (Opción A)** parece ser el enfoque más balanceado para empezar, ya que maximiza la velocidad de asignación mientras mantiene un alto grado de justicia y eficiencia. Este modelo es escalable y puede ser ajustado fácilmente modificando la ponderación de los factores.
