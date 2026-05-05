# Prompts de imagen para `site`

Objetivo: modernizar la línea visual del home con imágenes realistas, limpias y coherentes entre sí.

## Dirección visual

- Estilo fotográfico contemporáneo, natural y premium.
- Luz realista, composición limpia, sin aspecto de stock.
- Colores neutros con acentos azules y blancos, coherentes con Hi! Delivery.
- Evitar fondos recargados, texto incrustado, logos inventados o elementos caricaturescos.
- Priorizar escenas auténticas, comerciales y fáciles de recortar en web.

## Reglas para generar

- Formato horizontal para hero y negocios: `16:9`.
- Formato cuadrado o casi cuadrado para soporte / requisitos: `1:1` o `4:5`.
- Formato vertical suave para testimonios si se reemplazan avatares: `1:1`.
- Fondo nítido, sujeto principal bien definido.
- Sin marcas de agua.
- Sin texto visible en la imagen.
- Sin manos deformadas o ruedas/vehículos irreales.

## 1. Hero del sitio

Uso: fondo principal del banner.

Ruta sugerida:
- `public/banner-site-hid.mp4`
- `public/banner-site-hid.png` como poster

Prompt:

```text
Video hero cinematográfico para una plataforma de delivery moderna en México.
Un repartidor en motocicleta avanzando con seguridad por una avenida urbana limpia al atardecer,
con tráfico ligero, edificios contemporáneos y sensación de movimiento real.
Composición wide 16:9, sujeto principal centrado a la izquierda o centro,
espacio negativo para texto sobre la derecha o parte superior, luz suave, contraste moderado,
profundidad de campo sutil, colores reales, estilo premium y natural.
Sin texto, sin logos, sin marcas de agua, sin animación exagerada.
```

## 2. Requisitos del repartidor

Uso: imagen de la sección de requisitos.

Ruta sugerida:
- `public/requirements-hid.png`

Prompt:

```text
Foto editorial moderna de un repartidor revisando su documentación junto a una motocicleta
en un entorno urbano limpio y profesional.
La escena debe mostrar casco, licencia, papeles y actitud confiada,
con iluminación natural, composición clara, estilo realista y ordenado.
Encuadre 4:5 o 1:1, sujeto bien recortable, sin texto ni elementos de stock.
```

## 3. Para negocios

Uso: sección "Para Negocios".

Ruta sugerida:
- `public/businesses-hid.png`

Prompt:

```text
Imagen publicitaria realista de un negocio local moderno preparando pedidos para entrega.
Se ve un mostrador limpio, empaques listos, una persona del negocio revisando una tablet o teléfono,
y un ambiente de cocina o tienda contemporánea.
Debe transmitir crecimiento, control y eficiencia logística.
Encuadre horizontal 3:2 o 4:3, sin texto, sin logos, sin aspecto corporativo genérico.
```

## 4. Beneficios / tecnología

Uso: imagen complementaria para mostrar facilidad de uso y operación.

Ruta sugerida:
- `public/benefits-hid.png`

Prompt:

```text
Escena fotográfica moderna de una persona usando una app de delivery en un smartphone
mientras espera junto a su motocicleta o en un punto de entrega.
La interfaz del teléfono debe verse genérica y limpia, sin marcas reales.
Ambiente urbano suave, sensación de facilidad, agilidad y confianza.
Formato horizontal 16:9, realista, elegante, sin texto sobre la imagen.
```

## 5. Cómo funciona

Uso: imagen de soporte para explicar el flujo.

Ruta sugerida:
- `public/how-it-works-hid.png`

Prompt:

```text
Imagen conceptual realista de flujo de entrega moderna:
una secuencia visual de negocio, repartidor y cliente conectados de forma natural,
con elementos sutiles de app, ruta y paquete, sin estilo de infografía.
Debe verse limpia, tecnológica y actual, con composición horizontal 16:9.
Sin textos, sin flechas dibujadas, sin estética de stock.
```

## 6. Testimonios

Uso: avatares o retratos de apoyo.

Ruta sugerida:
- `public/testimonial-1.png`
- `public/testimonial-2.png`
- `public/testimonial-3.png`

Prompt:

```text
Retrato natural y auténtico de un repartidor latinoamericano con apariencia amable y profesional,
fondo neutro o urbano ligeramente desenfocado, iluminación suave, estilo editorial realista.
Plano cercano, formato cuadrado 1:1, sin texto, sin pose exagerada, sin apariencia de banco de imágenes.
```

## 7. Fallback del hero

Si prefieres no usar video, el poster puede ser una versión estática del hero.

Ruta sugerida:
- `public/banner-site-hid.png`

Prompt:

```text
Imagen estática principal para el hero del sitio de Hi! Delivery.
Un repartidor en motocicleta en ciudad moderna mexicana, composición wide 16:9,
espacio limpio para texto, look premium, natural y cinematográfico,
sin franjas negras, sin texto, sin elementos de stock.
```

## Notas de implementación

- Si generas nuevas imágenes, actualiza `src/app/site/_components/hero.tsx`,
  `src/app/site/_components/requirements.tsx` y `src/app/site/_components/for-businesses.tsx`
  para apuntar a los nuevos assets.
- Mantén los nombres simples para servirlos desde `public/`.
- Si una imagen no encaja, ajusta recorte en el componente antes de regenerar.
