# Rediseño público HID — Editorial local

## Objetivo aprobado

Renovar la experiencia pública para captar negocios. Dirección A: identidad editorial local, azul HID, blanco cálido, fotografía protagonista y Manrope. Acceso secundario para repartidores. Incluir favicon basado en el logo HID existente.

## Alcance

- Portada `/site` y entrada pública raíz según su redirección actual.
- Header, navegación móvil, footer y componentes públicos activos.
- Presentación visual de todos los pasos de registro en `/site/store/apply` y `/site/deliveryman/apply`, incluidos ubicación y confirmación.
- Favicon HID y metadatos públicos. El favicon raíz puede aparecer también en las pestañas del panel.
- Estilos y fuentes delimitados al layout público; dashboard, administración y autenticación conservan sus interfaces.

## Dirección visual

- Fondo blanco cálido `#f8f7f3`, texto azul profundo `#092b48`, acción azul HID `#0065ed`.
- Manrope para titulares y DM Sans para texto. Fuentes cargadas con mecanismos de Next, delimitadas al layout público.
- Titulares grandes, espaciado editorial, líneas finas, composiciones asimétricas y fotografía sin cubrirla con tarjetas.
- Logo real, proporciones conservadas. Favicon en tamaños adecuados, derivado del archivo de marca.
- Movimiento breve y discreto, respetando reducción de movimiento. Contenido visible aunque fallen animaciones.
- Fotografías optimizadas a partir de recursos existentes; la vista previa usa el banner actual para ilustrar la dirección. No inventar testimonios, métricas, clientes o garantías comerciales.

## Portada

1. Header: logo, cómo funciona, para tu negocio, preguntas, iniciar sesión y registrar negocio.
2. Hero: “Tu negocio merece llegar más lejos”, CTA “Registrar mi negocio”, enlace al proceso y fotografía HID.
3. Tipos de negocio, sin presentarlos como clientes existentes.
4. Proceso: registro, preparación de pedido, seguimiento de entrega.
5. Plataforma: estado de pedidos, cálculo de envío y operación centralizada. Ilustración identificada como diagrama, sin datos operativos simulados.
6. Integración API: cotización, creación y consulta; indicar habilitación requerida.
7. FAQ con información verificable en flujos actuales.
8. Cierre de captación, acceso a registro de repartidores y footer.

## Registro público

Usar encabezado claro, progreso por pasos, agrupación de campos, superficies sencillas y etiquetas legibles. Preservar validaciones, persistencia de formularios, uploads, mapas y llamadas API actuales. Errores y estados de envío visibles. Evitar componentes de presentación que dependan del estado de negocio fuera del formulario.

## Arquitectura

El layout público controla fuentes y tokens locales. Header, footer, secciones de portada y envoltorio de registros mantienen responsabilidades separadas. Reutilizar componentes UI existentes cuando sean adecuados, con estilos delimitados al sitio. Inspeccionar rutas activas antes de modificar duplicados en `(site)`.

## Accesibilidad y verificación

Navegación por teclado, foco visible, menú móvil accesible, contraste legible y FAQ semántica. Revisar escritorio y móvil, overflow, imágenes, enlaces y proporciones del logo. Ejecutar lint y typecheck e informar errores ajenos preexistentes. No ejecutar suites de pruebas según la instrucción previa del usuario. Las verificaciones de formularios no deben enviar altas reales.

## Vista de revisión

Maqueta HTML local: `.superpowers/brainstorm/90946-1791349501/content/business-editorial.html`. Es una propuesta visual, no la aplicación final. Botones de registro indican este estado sin enviar datos. El alcance y la dirección están listos para revisión del usuario antes del plan de implementación.
