---
name: RubyMind
description: Evaluaciones educativas de opción múltiple en vivo, acompañadas por Ruby.
colors:
  bg-page: "#f7f1e8"
  bg-card: "#fffdfa"
  bg-elevated: "#eee6db"
  text-main: "#453527"
  text-muted: "#756453"
  primary: "#a94f24"
  primary-hover: "#8f3f1b"
  cinnamon: "#c3733a"
  sage: "#7ca58d"
  sage-light: "#e4ede3"
  true-bg: "#376d51"
  true-hover: "#29553e"
  false-bg: "#ac4238"
  false-hover: "#8e332b"
  danger: "#ac4238"
  warning-bg: "#fff0d4"
  warning-text: "#754615"
  border-color: "#d9cdbd"
  focus-ring: "#18788c"
  on-primary: "#fffaf5"
  on-answer: "#fff"
  secondary-text: "#31543d"
  info-bg: "#e0eff0"
  info-text: "#205f6b"
typography:
  display:
    fontFamily: "Nunito, sans-serif"
    fontSize: "clamp(2.25rem, 3.5vw, 3.25rem)"
    fontWeight: 900
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Nunito, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.55rem)"
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  question:
    fontFamily: "Nunito, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 850
    lineHeight: 1.4
  title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 800
rounded:
  progress: "4px"
  badge: "7px"
  compact: "8px"
  chip: "9px"
  control: "10px"
  panel: "12px"
  answer: "14px"
  card: "16px"
spacing:
  tight: "0.5rem"
  control-gap: "0.55rem"
  small: "0.65rem"
  medium: "1rem"
  card-mobile: "1.25rem"
  card: "1.5rem"
  workspace: "1.75rem"
  section: "2rem"
  page-inline: "1.5rem"
  page-top: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.sage-light}"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-main}"
    rounded: "{rounded.control}"
    padding: "0.6rem 1rem"
  input:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.control}"
    padding: "0.75rem 0.9rem"
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  nav-link:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.chip}"
    padding: "0.6rem 0.8rem"
  participant-chip:
    backgroundColor: "{colors.sage-light}"
    textColor: "#31543c"
    rounded: "{rounded.chip}"
    padding: "0.55rem 1rem"
  answer-true:
    backgroundColor: "{colors.true-bg}"
    textColor: "{colors.on-answer}"
    rounded: "{rounded.answer}"
    padding: "1.25rem"
  answer-false:
    backgroundColor: "{colors.false-bg}"
    textColor: "{colors.on-answer}"
    rounded: "{rounded.answer}"
    padding: "1.25rem"
---

# Design System: RubyMind

## Overview

**Creative North Star: "Una herramienta de evaluación clara con Ruby como compañera."**

RubyMind es una herramienta educativa de evaluación en vivo con una interfaz cálida y clara. La identidad confirmada combina crema, canela y marrón con verde y azul funcionales, tipografía Nunito y Ruby, una heeler canela basada en las referencias del usuario.

Las pantallas son de operación: preparar, entrar, responder y consultar resultados. La jerarquía mantiene la pregunta y las respuestas por delante de la mascota. Ruby acompaña bienvenida, espera, pregunta y resultados con nueve estados. Durante la pregunta se presenta pequeña (64px), sin tapar el enunciado ni bloquear respuestas o retrasar el reloj.

**Key Characteristics:**
- Crema y marrón como base de lectura; canela para la acción principal.
- Superficies claras, bordes suaves y profundidad contenida.
- Controles grandes y estados identificables por texto e iconos además de color.
- Movimiento breve, sin animación continua durante las preguntas.

## Colors

La paleta nace de Ruby y sus referencias: canela, crema, marrón, verde collar y azul placa. Los valores normativos están en el frontmatter; su fuente de implementación es `src/styles/app.css`.

### Primary
- **Canela de acción** (`primary`, `primary-hover`): botones principales y enlaces; la variante oscura permite texto claro. `cinnamon` conserva el tono de referencia declarado, sin reemplazar la acción accesible.

### Secondary
- **Verde de acompañamiento** (`sage`, `sage-light`): superficies de sala, participantes y resultados correctos. `true-bg` y `true-hover` son el verde oscuro de la respuesta Verdadero.

### Tertiary
- **Azul informativo** (`focus-ring`, `info-bg`, `info-text`): foco, tiempo y confirmación de envío. El foco no implica acierto.
- **Rojo de respuesta y error** (`false-bg`, `false-hover`, `danger`): Falso, urgencia y acciones destructivas. El texto y los iconos distinguen los significados.
- **Ámbar de aviso** (`warning-bg`, `warning-text`): reconexión y resultado incorrecto sin culpabilizar.

### Neutral
- **Crema de página**, **blanco cálido de tarjeta** y **crema elevado** (`bg-page`, `bg-card`, `bg-elevated`): separación de áreas sin gradientes.
- **Marrón de lectura** y **marrón secundario** (`text-main`, `text-muted`): títulos, contenido y ayuda.
- **Borde cálido** (`border-color`): contornos y divisores. `on-primary` y `on-answer` son textos claros de botones sólidos.

## Typography

**Display Font / Body Font:** Nunito, con `sans-serif` de respaldo. La fuente variable local se sirve desde `public/fonts/nunito-latin.ttf` (pesos 200–1000, `font-display: swap`); su licencia OFL está en `public/fonts/OFL.txt`.

Una misma familia de formas redondeadas conecta títulos, controles y lectura. Los pesos fuertes diferencian acciones y cifras sin introducir una segunda familia.

### Hierarchy
- **Display:** bienvenida de acceso; peso y escala fluida definidos en `display`.
- **Headline:** título principal de pantalla; escala fluida definida en `headline`.
- **Question:** enunciado en vivo, centrado y con ancho máximo (34ch).
- **Title:** títulos de tarjetas; la tarjeta de acceso tiene una variante mayor (1.9rem).
- **Body:** lectura con interlineado amplio; descripciones de sección hasta (62ch) y bienvenida hasta (40ch).
- **Label:** etiquetas de campo y botones; navegación usa peso (750). No se fuerza mayúscula en las etiquetas generales.

Códigos de sala, cuenta regresiva y clasificación usan cifras tabulares. El código de ingreso se presenta en mayúsculas, centrado y espaciado (0.25em). Los títulos equilibran líneas y el texto largo puede partirse para no desbordar.

## Layout

Contenedor principal centrado de ancho máximo (1200px), con márgenes internos de escritorio (2.5rem 1.5rem 3rem). La barra superior y el pie comparten ese ancho de referencia. La partida se limita a (940px) y el ingreso a sala a (490px).

La biblioteca usa dos columnas: editor y lista, con proporción (0.8fr / 1.6fr) y separación (1.75rem); los editores permanecen pegados al borde superior (1.5rem) mientras hay espacio. El acceso distribuye bienvenida y formulario en (1.08fr / 1fr). Las respuestas Verdadero/Falso conservan dos columnas iguales incluso en móvil.

En (960px) la navegación puede envolver y se reduce la separación. En (700px) el acceso y los editores pasan a una columna, los editores dejan de ser sticky, la navegación ocupa una fila adicional y Ruby de bienvenida se reduce; se ocultan el subtítulo de marca y el bocadillo. En (420px) se compactan navegación y respuestas. El contenedor usa altura de viewport pequeña (`100svh`) con respaldo `100vh`.

Los controles tienen mínimos de altura: botón y selector (44px), campo (48px), acción de bloque (50px), botón grande (52px), respuesta (92px; 78px en móvil). Las filas de acciones y participantes envuelven; nombres y textos largos se parten dentro de su espacio.

## Elevation & Depth

Predominan superficies planas, fondos tonales y bordes de un píxel. La tarjeta de acceso es la excepción: elimina el borde y usa una sombra cálida suave (`0 12px 45px #6848240c`). Las tarjetas ordinarias no añaden sombra. El foco es un contorno azul (3px), separado del control (4px), no una elevación.

## Shapes

Los radios del frontmatter distinguen controles, tarjetas y elementos compactos: tarjeta (16px), respuesta (14px), paneles e imágenes (12px), campos y botones (10px), navegación y participantes (9px). Insignias y barras usan radios menores. El bocadillo de Ruby conserva una esquina inferior asimétrica (3px); no se aplica a otros paneles.

## Components

### Buttons

Acciones compactas de peso fuerte. Primario canela, secundario verde claro, ghost transparente con borde cálido y peligro rojo oscuro sobre fondo rojo claro. Hover solo en dispositivos con hover y puntero fino; cambia el fondo. Presionar escala el botón a (0.97) con transición (160ms); deshabilitar aplica opacidad (0.6) y cursor de bloqueo. El foco conserva el contorno global.

### Chips

Participantes sobre verde claro, texto verde oscuro y radio compacto. Insignias Verdadero/Falso incluyen texto. Puntaje y racha usan fondos tonales; no son botones ni incorporan estados de interacción ficticios.

### Cards / Containers

Tarjetas de blanco cálido, borde cálido, radio de tarjeta y separación interna de `spacing.card`; en móvil usan `spacing.card-mobile`. La tarjeta destacada adopta borde canela y fondo crema cálido. Avisos y reconexión usan superficies de estado con texto explícito.

### Inputs / Fields

Campos claros con borde cálido más oscuro (`#bdac97`), radio de control y etiqueta encima. Foco cambia el borde al azul del foco y mantiene contorno visible. La ayuda y los placeholders usan marrón secundario. El control de contraseña reserva espacio al botón de mostrar/ocultar; los errores se presentan mediante un aviso con mensaje y detalles.

### Navigation

Marca RubyMind, enlaces de texto y selector de idioma. El enlace actual y su hover usan fondo canela claro (`#f7e9db`) y texto primario; la selección también dispone de `aria-current`. La navegación envuelve en pantallas pequeñas y conserva controles accesibles por teclado. El enlace de salto aparece al recibir foco.

### Respuestas y tiempo

Verdadero y Falso son botones amplios con etiqueta e icono, verde y rojo respectivamente. La selección usa borde blanco y contorno azul, permanece opaca al bloquearse y se refleja con `aria-pressed`. Tras responder, se bloquea una nueva elección y aparece una confirmación textual; los rechazos usan aviso de error. El reloj combina cifra, anillo y barra, pasa a peligro cuando quedan cinco segundos y no anima el desplazamiento de sus valores.

### Ruby y movimiento

Ruby se sirve como sprite PNG transparente de nueve poses en una cuadrícula (3×3), `public/mascot/ruby-states.png`. Las posiciones horizontales y verticales del fondo seleccionan la pose. El raster mide 1261×1247; se usan ventanas de 420⅓×400 con filas en y=0,390,800 para respetar el margen real y evitar dibujos vecinos en el encuadre. El prompt exacto se recupera con `impeccable embed-prompt public/mascot/ruby-states.png --read`. El nombre, la heeler canela y la paleta confirmados se conservan. Cuando la imagen aporta información propia recibe etiqueta accesible; en el componente de feedback la pose es decorativa y el mensaje traducido aporta el significado.

| Estado | Uso observado |
| --- | --- |
| `welcome` | Bienvenida e ingreso; el apodo se saluda si está escrito y el código tiene formato válido. |
| `idle` | Espera en lobby, mirando el contador; sin movimiento independiente de cola. |
| `cheer` | Inicio/avance y primeros instantes de ronda. |
| `think` | Junto al reloj de pregunta, con signo de interrogación; espera si falta resultado personal. |
| `celebrate` | Acierto, racha de al menos dos y podio; final del host. |
| `empathy` | Fallo ordinario con respuesta enviada. |
| `surprised` | Sin respuesta al cierre o racha previa de al menos dos que termina en cero. |
| `motivate` | Descenso observado de posición; cierre fuera del podio sin cercanía al tercero. |
| `sad` | Nadie acertó, con las precedencias personales indicadas abajo; final a pocos puntos del tercero. |

En pregunta, Ruby usa `cheer` únicamente dentro de los primeros (700ms) desde `openedAt`, ajustados por la diferencia con el reloj del servidor; después pasa a `think`. No se introduce una cuenta regresiva previa: el contrato no la ofrece y la indicación no condiciona el reloj ni los controles. Al pedir iniciar o avanzar, el host ve una indicación `cheer` de hasta (900ms), que se limpia con cambios de estado, error o conexión.

Los resultados se expresan tras el cierre del servidor. Para participantes, se evalúa primero ausencia de respuesta (`surprised`), luego acierto (`celebrate`), luego racha rota (`surprised`), después ausencia global de aciertos (`sad`) y finalmente fallo ordinario (`empathy`). Una racha correcta de al menos dos cambia el mensaje de celebración. Si baja en el ranking, aparece además un bloque `motivate`. Las comparaciones de posición y racha requieren baseline observada para esa ronda; no se inventa historia. El host muestra `sad` si existen resultados y nadie acertó, `celebrate` si hay algún acierto e `idle` si no hay resultados.

En la clasificación final, las posiciones (1–3) celebran. Fuera del podio, una diferencia no negativa de hasta (100 puntos) respecto al tercero muestra `sad`; el resto usa `motivate`. Este umbral (`RUBY_NEAR_PODIUM_POINTS`) es una decisión visual ajustable, no una regla de puntaje. El host celebra el final; si falta la entrada personal en la clasificación, el fallback es `welcome`.

El feedback usa Ruby de (180px) en lobby, (130px) en resultado, (195px) al finalizar, (64px) en pregunta y (85px) junto al ranking. Los mensajes usan marrón secundario; en pregunta son más pequeños (0.78rem), con ancho máximo (28ch).

La bienvenida y el salto de celebración duran (480ms), con curva `cubic-bezier(0.23, 1, 0.32, 1)`. La celebración de resultados incorpora ocho piezas de confeti, de (650ms) cada una, con retrasos entre (0–180ms), en canela, verde y azul. No hay bucles. Lobby, resultados y destacados entran con opacidad y desplazamiento de (6px), durante (240ms). Con movimiento reducido se eliminan salto, confeti, transformaciones y transiciones, conservando únicamente una aparición de opacidad de estados (120ms).

## Do's and Don'ts

### Do:
- **Do** mantener las acciones principales en canela y el texto de lectura en marrón.
- **Do** conservar etiquetas, iconos y foco visible junto a los estados de color.
- **Do** priorizar enunciado, respuestas y tiempo durante una pregunta.
- **Do** usar las nueve poses del sprite local de Ruby y respetar movimiento reducido.
- **Do** basar las reacciones de resultados en el cierre del servidor y las comparaciones en historia observada.
- **Do** mantener los textos y controles legibles en español e inglés.

### Don't:
- **Don't** usar a Ruby para culpabilizar por una respuesta incorrecta.
- **Don't** añadir movimiento continuo ni animar clasificación, cifras o enunciados durante una pregunta.
- **Don't** comunicar selección, error o acierto solamente mediante color.
- **Don't** sustituir la mascota o la paleta confirmadas por otra identidad.
