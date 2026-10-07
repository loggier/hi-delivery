# Rediseño público HID — Editorial local

## Objetivo aprobado

Renovar la experiencia pública para captar negocios. El usuario eligió la propuesta `hid-campaign-v3.html`: azul HID, blanco puro, Manrope, composición de negocio y repartidor y registro destacado. Referencia de comunicación visual: SoyRappi, adaptada a la identidad HID. Utilizar el contenido existente del sitio, sin agregar contenido comercial sobre API. Acceso secundario para repartidores. Incluir favicon basado en el logo HID existente.

## Alcance

- Portada `/site` y entrada pública raíz según su redirección actual.
- Header, navegación móvil, footer y componentes públicos activos.
- Presentación visual de todos los pasos de registro en `/site/store/apply` y `/site/deliveryman/apply`, incluidos ubicación y confirmación.
- Favicon HID y metadatos públicos. El favicon raíz puede aparecer también en las pestañas del panel.
- Estilos y fuentes delimitados al layout público; dashboard, administración y autenticación conservan sus interfaces.

## Dirección visual

- Fondo blanco puro `#ffffff`, texto azul profundo `#092b48`, acción azul HID `#0065ed`.
- Manrope para titulares y texto. Fuentes cargadas con mecanismos de Next, delimitadas al layout público. Texto principal de 18–20 px, navegación y botones de 16–17 px, etiquetas auxiliares de al menos 15 px. Titulares responsivos.
- Titulares grandes, secciones compactas, líneas finas y composición fotográfica de negocio con un recuadro de repartidor. Evitar separaciones excesivas y bloques vacíos. Espaciado vertical aproximado de 58 px en escritorio y 36 px en móvil.
- Logo real, proporciones conservadas. Favicon en tamaños adecuados, derivado del archivo de marca.
- Movimiento breve y discreto, respetando reducción de movimiento. Contenido visible aunque fallen animaciones.
- Animación con Framer Motion ya instalado: entrada coordinada del hero, reveal de secciones con IntersectionObserver/useAnimate, y hover corto en CTA/visual. Respetar `prefers-reduced-motion`; nada de scroll-jacking ni movimiento continuo.
- Fotografías optimizadas a partir de recursos existentes; la vista previa usa el banner actual para ilustrar la dirección. No inventar testimonios, métricas, clientes o garantías comerciales.

## Portada

1. Header: logo, negocios, beneficios, requisitos, preguntas, iniciar sesión y registro.
2. Hero: reutilizar “Potencia tus entregas y llega a más clientes”, descripción y CTA “Registra tu negocio” de `for-businesses.tsx`, con su fotografía existente. Panel de acceso al registro con sus tres etapas, sin formulario nuevo ni captura de datos en la portada.
3. Beneficios para negocios: tarifas competitivas y transparentes, seguimiento en tiempo real y cobertura sin flota propia, conservando los textos actuales.
4. Beneficios para repartidores: reutilizar los cuatro beneficios y textos actuales, identificados claramente como contenido de repartidores.
5. Proceso y requisitos: conservar el contenido actual de registro de repartidores y sus ocho requisitos.
6. Testimonios y FAQ: conservar los contenidos existentes sin escribir testimonios nuevos.
7. Cierre con CTA de negocio y footer.
8. No incluir sección de API ni las secciones comerciales inventadas en la primera propuesta. La prioridad de captación se expresa mediante orden, jerarquía y CTAs.

## Registro público

Usar encabezado claro, progreso por pasos, agrupación de campos, superficies sencillas y etiquetas legibles. Preservar validaciones, persistencia de formularios, uploads, mapas y llamadas API actuales. Errores y estados de envío visibles. Evitar componentes de presentación que dependan del estado de negocio fuera del formulario.

## Arquitectura

El layout público controla fuentes y tokens locales. Header, footer, secciones de portada y envoltorio de registros mantienen responsabilidades separadas. Reutilizar componentes UI existentes cuando sean adecuados, con estilos delimitados al sitio. Inspeccionar rutas activas antes de modificar duplicados en `(site)`.

Los registros conservan stores, query params, validadores y secuencia existente. Envoltorio compartido sólo estiliza; el progreso indica enlaces únicamente a pasos anteriores completados y no inventa navegación de avance que evada validaciones.

## Accesibilidad y verificación

Navegación por teclado, foco visible, menú móvil accesible, contraste legible y FAQ semántica. Revisar escritorio y móvil, overflow, imágenes, enlaces y proporciones del logo. Ejecutar lint y typecheck e informar errores ajenos preexistentes. No ejecutar suites de pruebas según la instrucción previa del usuario. Las verificaciones de formularios no deben enviar altas reales.

## Vista de revisión

Maqueta seleccionada: `.superpowers/brainstorm/90946-1791349501/content/hid-campaign-v3.html`. Sustituye las versiones anteriores. Revisada en navegador a 1440 px y 390 px: imágenes cargadas y sin desbordamiento horizontal. Es una propuesta visual, no la aplicación final; sus botones no envían datos. El usuario respondió “esa me gusta mas”.
