
# Prompt para la Creación de Aplicación de Repartidor en Flutter (Enfoque UI Primero)

## 1. Visión General del Proyecto

**Objetivo:** Crear el **prototipo visual y de navegación** de una aplicación móvil para repartidores utilizando Flutter. El objetivo principal es construir todas las pantallas, componentes de UI y flujos de navegación con **datos completamente maquetados (mockeados)**. La aplicación debe ser moderna, intuitiva y estéticamente superior a competidores como Rappi y Uber Eats, para validar la experiencia de usuario (UX) antes de conectar cualquier lógica de backend o de hardware.

**Fase Actual:** **Fase 1 - Diseño y Navegación.** No se debe implementar ninguna conexión a base de datos (Supabase), ni funcionalidades que dependan de hardware real como la geolocalización en segundo plano.

---

## 2. Stack Tecnológico (Fase 1)

*   **Framework:** Flutter (última versión estable).
*   **Lenguaje:** Dart.
*   **Gestión de Estado:** Riverpod (para gestionar el estado de la UI, como el estado "Activo"/"Inactivo").
*   **Datos:** **100% Maquetados.** Crear clases/modelos en Dart para simular Pedidos, Perfil de Repartidor, Historial de Ganancias, etc. No se conectará a ninguna base de datos externa.
*   **Mapas:** Google Maps (`google_maps_flutter`). Se utilizará para mostrar **ubicaciones estáticas y rutas predefinidas** (maquetadas), no la ubicación real del dispositivo.
*   **Navegación:** Utilizar un sistema de enrutamiento robusto (como GoRouter o el Navigator 2.0 de Flutter) para gestionar el flujo entre pantallas.
*   **Backend y Geolocalización:** **Pospuestos para Fase 2.** No implementar `supabase_flutter`, `geolocator`, `flutter_background_geolocation` ni notificaciones push (FCM) en esta etapa.

---

## 3. Estructura de Datos Maquetados (Modelos en Dart)

Crear los siguientes modelos de datos en Dart. Estos serán poblados con datos falsos (hardcodeados) para simular la funcionalidad de la aplicación.

*   `Rider`:
    *   `id`, `firstName`, `lastName`, `email`, `phone`, `avatarUrl`, `vehicleInfo` (ej. "Moto Italika 2022"), `averageRating`.
*   `Order`:
    *   `id`, `status` (ej. 'pending_acceptance', 'accepted', 'at_store', 'picked_up', 'on_the_way', 'delivered'), `pickupAddress`, `deliveryAddress`, `pickupBusinessName`, `customerName`, `estimatedEarnings`, `itemsDescription`.
*   `EarningStats`:
    *   `daily`, `weekly`, `monthly` (cada uno con `totalEarnings`, `totalOrders`, `averagePerOrder`).
    *   `recentTransactions` (una lista de objetos con `orderId` y `amount`).

---

## 4. Desglose de Funcionalidades por Pantalla (UI y Navegación)

### **Pantalla 1: Autenticación (Login)**

*   **Diseño:** Minimalista y profesional.
*   **Campos:** Email y Contraseña.
*   **Funcionalidad (Maquetada):**
    *   Validar que los campos no estén vacíos.
    *   Al presionar "Iniciar Sesión", **simular una carga de 2 segundos** y luego navegar a la Pantalla Principal (Home). No realizar ninguna llamada de red.
    *   Mostrar un Snackbar o Toast para errores de validación simples (ej. "Email inválido").

### **Pantalla 2: Pantalla Principal / Home (Con Mapa)**

Esta es la pantalla central de la aplicación.

*   **Componente Principal:** Un mapa de Google Maps que ocupa la mayor parte de la pantalla, mostrando una **ubicación fija** (ej. centro de una ciudad) con un marcador que simula la posición del repartidor.
*   **Barra de Estado Superior:**
    *   Un `Switch` o `Toggle` prominente para cambiar el estado entre **"Activo"** e **"Inactivo"**.
        *   **Activo:** La UI debe reflejar este estado (ej. color verde, texto visible). El panel inferior muestra "Esperando nuevos pedidos...".
        *   **Inactivo:** La UI cambia para reflejar el estado (ej. color gris). El panel inferior puede ocultarse o mostrar "Estás desconectado".
    *   Un ícono de perfil que navega a la Pantalla de Perfil.
*   **Panel Inferior (Overlay):**
    *   **Estado "Esperando Pedido":** Mensaje "Esperando nuevos pedidos...".
    *   **Simulación de Nuevo Pedido:** Tras 5 segundos de estar "Activo", debe aparecer una tarjeta modal con una notificación sonora (usar un asset local).
        *   La tarjeta mostrará datos maquetados: Dirección del negocio, distancia estimada y ganancia estimada.
        *   Botones: **"Rechazar"** (cierra el modal y vuelve a "Esperando...") y **"Aceptar"** (navega al flujo de pedido activo).
        *   Un temporizador visual (ej. de 30 segundos).

### **Pantalla 3: Flujo de Pedido Activo (Navegación por Pasos)**

Una vez aceptado un pedido, el panel inferior de la pantalla principal guía al repartidor.

*   **Paso 1: En Camino al Negocio**
    *   **UI:** Muestra la dirección maquetada del negocio. El mapa muestra una **ruta predefinida (Polyline estática)** desde la ubicación fija del repartidor hasta el negocio.
    *   **Acción:** Botón **"Llegué al Negocio"**. Al presionarlo, se actualiza el estado del pedido (en el state management local) y se muestra el siguiente paso.

*   **Paso 2: Recoger Pedido**
    *   **UI:** Muestra detalles maquetados del pedido.
    *   **Acción:** Botón **"Pedido Recogido"**. Al presionarlo, se actualiza el estado y se muestra el siguiente paso.

*   **Paso 3: En Camino al Cliente**
    *   **UI:** Muestra la dirección maquetada del cliente. El mapa actualiza la Polyline para mostrar la ruta desde el negocio hasta el cliente.
    *   **Acción:** Botón **"Llegué a la Entrega"**.

*   **Paso 4: Entregar y Dejar Evidencia**
    *   **UI:** Muestra un botón para **"Tomar Foto de Evidencia"**. Al presionarlo, **simular la acción mostrando una imagen de muestra (asset local)**, sin abrir la cámara real.
    *   **Acción:** Botón **"Marcar como Entregado"** (se habilita después de "tomar" la foto). Al presionarlo, se muestra una pantalla de confirmación y la app regresa al estado "Esperando nuevos pedidos" en la Home.

### **Pantalla 4: Dashboard de Ganancias**

Accesible desde una Tab en la navegación inferior (junto a Home y Perfil).

*   **Diseño:** Visual, con gráficos y tarjetas claras, usando **datos maquetados**.
*   **Componentes:**
    *   Selector de período: **Día, Semana, Mes**. Al cambiar, los datos que se muestran deben actualizarse (cambiando entre diferentes sets de datos maquetados).
    *   Tarjeta principal con **Ganancia Total** del período.
    *   Tarjetas secundarias: **Total de Pedidos** y **Ganancia Promedio**.
    *   Gráfico de barras (usando `fl_chart` o similar) mostrando ganancias por día.
    *   Listado de las últimas transacciones maquetadas.

### **Pantalla 5: Perfil del Repartidor**

*   **Diseño:** Limpio y profesional.
*   **Información (solo lectura):** Mostrar datos maquetados del `Rider` (foto de perfil, nombre, email, etc.).
*   **Acciones:**
    *   Un botón para **"Cerrar Sesión"** que navega de vuelta a la Pantalla de Login.
