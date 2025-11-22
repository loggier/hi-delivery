
# Prompt para la Creación de Aplicación de Repartidor en Flutter

## 1. Visión General del Proyecto

**Objetivo:** Crear una aplicación móvil completa y robusta para repartidores utilizando Flutter. La aplicación debe ser moderna, intuitiva y eficiente, permitiendo a los repartidores gestionar todo el ciclo de entrega de pedidos, monitorear sus ganancias y gestionar su disponibilidad. La aplicación se conectará a un backend existente de Supabase.

**Inspiración de Diseño:** El diseño debe ser profesional, limpio y superior a las aplicaciones de delivery líderes como Rappi, DiDi Food y Uber Eats. Se debe priorizar una excelente experiencia de usuario (UX) con flujos de trabajo claros y una navegación intuitiva.

---

## 2. Stack Tecnológico Principal

*   **Framework:** Flutter (última versión estable).
*   **Lenguaje:** Dart.
*   **Base de Datos y Backend:** Supabase.
    *   **Autenticación:** Supabase Auth (inicio de sesión con email/contraseña).
    *   **Base de datos en tiempo real:** Supabase Realtime para la recepción de nuevos pedidos.
    *   **Base de datos:** Supabase (PostgreSQL) para almacenar datos de perfiles, pedidos, etc.
    *   **Storage:** Supabase Storage para subir pruebas de entrega (fotos).
*   **Gestión de Estado:** Riverpod.
*   **Geolocalización:** `geolocator` para obtener la ubicación y `flutter_background_geolocation` (o similar) para el seguimiento en segundo plano.
*   **Mapas:** Google Maps (`google_maps_flutter`).
*   **Notificaciones Push:** Firebase Cloud Messaging (FCM) integrado con Supabase Edge Functions para enviar notificaciones de nuevos pedidos.

---

## 3. Estructura de la Base de Datos (Supabase)

La aplicación debe interactuar con las siguientes tablas existentes:

*   `riders`: Perfil del repartidor.
*   `orders`: Información de los pedidos. El repartidor actualizará el `status` de esta tabla.
*   `businesses`: Para obtener información del negocio (dirección de recogida).
*   `customers`: Para obtener información del cliente (dirección de entrega).

---

## 4. desglose de Funcionalidades por Pantalla

### **Pantalla 1: Autenticación (Login)**

*   **Diseño:** Minimalista y profesional.
*   **Campos:** Email y Contraseña.
*   **Funcionalidad:**
    *   Validación de campos.
    *   Inicio de sesión contra Supabase Auth.
    *   Gestión de errores (credenciales incorrectas, sin conexión, etc.).
    *   Enlace a "Olvidé mi contraseña".
    *   Persistencia de la sesión para que el repartidor no tenga que iniciar sesión cada vez.

### **Pantalla 2: Pantalla Principal / Home (Con Mapa)**

Esta es la pantalla central de la aplicación.

*   **Componente Principal:** Un mapa de Google Maps que ocupa la mayor parte de la pantalla, centrado en la ubicación actual del repartidor.
*   **Barra de Estado Superior:**
    *   Un `Switch` o `Toggle` prominente para cambiar el estado entre **"Activo"** e **"Inactivo"**.
        *   **Activo:** El repartidor es visible para recibir pedidos. Se inicia el seguimiento de geolocalización en segundo plano. La UI debe reflejar claramente este estado (ej. color verde, texto visible).
        *   **Inactivo:** El repartidor no recibe pedidos. El seguimiento en segundo plano se detiene. La UI cambia para reflejar el estado (ej. color gris).
    *   Un ícono que lleva al perfil del usuario.
*   **Panel Inferior (Overlay):**
    *   Cuando no hay pedido activo, muestra un mensaje como "Esperando nuevos pedidos...".
    *   Cuando llega un **nuevo pedido**:
        *   Debe aparecer una tarjeta modal con una notificación sonora clara.
        *   La tarjeta mostrará:
            *   Dirección del negocio (recogida).
            *   Distancia estimada al negocio.
            *   Ganancia estimada por la entrega.
        *   Dos botones claros: **"Rechazar"** y **"Aceptar"**.
        *   Un temporizador visible que indica el tiempo restante para aceptar el pedido.

### **Pantalla 3: Flujo de Pedido Activo**

Una vez que un pedido es aceptado, el panel inferior de la pantalla principal se transforma para guiar al repartidor.

*   **Paso 1: En Camino al Negocio**
    *   **Título:** "Dirígete a [Nombre del Negocio]".
    *   **Información:** Dirección completa del negocio.
    *   **Acción:** Un botón grande **"Llegué al Negocio"**.
    *   El mapa debe mostrar la ruta optimizada desde la ubicación del repartidor hasta el negocio.

*   **Paso 2: Recoger Pedido**
    *   **Título:** "Confirma la Recolección".
    *   **Información:** Detalles del pedido (ej. ID de pedido, qué recoger).
    *   **Acción:** Un botón grande **"Pedido Recogido"**.
    *   Al presionar, el estado del pedido en Supabase se actualiza a `picked_up`.

*   **Paso 3: En Camino al Cliente**
    *   **Título:** "Entrega a [Nombre del Cliente]".
    *   **Información:** Dirección completa del cliente.
    *   **Acción:** Un botón grande **"Llegué a la Entrega"**.
    *   El mapa debe actualizarse para mostrar la ruta optimizada desde el negocio hasta la dirección del cliente.

*   **Paso 4: Entregar y Dejar Evidencia**
    *   **Título:** "Confirma la Entrega".
    *   **Funcionalidad:**
        *   Un botón para **"Tomar Foto de Evidencia"**. Esto abrirá la cámara del dispositivo.
        *   Una vez tomada, la foto se muestra en miniatura.
        *   La foto debe subirse a Supabase Storage en una carpeta específica (ej. `delivery-proofs/[order_id]`).
    *   **Acción:** Un botón grande **"Marcar como Entregado"**.
        *   Este botón solo se habilita después de tomar la foto de evidencia.
        *   Al presionar, se actualiza el estado del pedido a `delivered` en Supabase y se guarda la URL de la foto de evidencia.
    *   Tras la entrega, mostrar una pantalla de confirmación y volver al estado "Esperando nuevos pedidos".

### **Pantalla 4: Dashboard de Ganancias**

Accesible desde un Tab en la navegación inferior.

*   **Diseño:** Visual, con gráficos y tarjetas claras.
*   **Componentes:**
    *   Un selector de período: **Día, Semana, Mes**.
    *   Una tarjeta principal que muestra la **Ganancia Total** para el período seleccionado.
    *   Tarjetas secundarias mostrando:
        *   **Total de Pedidos** completados en el período.
        *   **Ganancia Promedio** por pedido.
    *   Un gráfico de barras sencillo que muestre las ganancias por día (en la vista semanal y mensual).
    *   Un listado de las últimas transacciones o pedidos completados, mostrando la ganancia de cada uno.

### **Pantalla 5: Perfil del Repartidor**

*   **Diseño:** Limpio y profesional.
*   **Información mostrada (solo lectura):**
    *   Foto de perfil.
    *   Nombre completo.
    *   Email.
    *   Teléfono.
    *   Calificación promedio (si existe en el esquema).
    *   Información del vehículo (marca, modelo, placa).
*   **Acciones:**
    *   Un botón para **"Cerrar Sesión"**.

---

## 5. Funcionalidades Clave Adicionales

*   **Geolocalización en Segundo Plano:** Es crucial. Cuando el repartidor está "Activo", la aplicación debe enviar sus coordenadas a Supabase (ej. a una tabla `rider_locations`) periódicamente, incluso si la app está en segundo plano o el teléfono está bloqueado. Esto es vital para la asignación de pedidos.
*   **Notificaciones Push:** Configurar FCM para que una función de Supabase envíe una notificación push al dispositivo del repartidor cuando se le asigne un nuevo pedido. La notificación debe hacer sonar la alerta de nuevo pedido en la app.
*   **Manejo de Errores y Conectividad:** La app debe manejar de forma elegante la pérdida de conexión a internet, mostrando mensajes claros al usuario y reintentando las operaciones cuando la conexión se restablezca.
