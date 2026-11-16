# Interfaz RubyMind

Mode: Operate. Scope: acceso, registro, cuestionarios, preguntas, ingreso a sala, lobby, partida y resultados.

## Direction contract
THESIS: Una herramienta de evaluación clara con Ruby como compañera. Se conserva la navegación web y las tareas actuales.

OWN-WORLD: Crema de la referencia, canela para acciones primarias con variante oscura accesible, marrón para texto, verde para acompañamiento y aciertos, azul para tiempo e información. Nunito local, superficies limpias y esquinas de 12–16px.

STORY: Entrar, preparar preguntas o unirse por código; responder y consultar resultados. Ruby saluda por apodo al ingresar con código de formato válido; espera mirando el contador en lobby, anima al arrancar y piensa junto al reloj. Tras el cierre del servidor celebra, acompaña el error, se sorprende o anima según el resultado y la historia observada.

FIRST VIEWPORT: Navegación superior compacta. Acceso dividido entre bienvenida con Ruby y formulario. Biblioteca con encabezado, acceso a sala y editor junto a la lista. Juego con código y tiempo visibles, enunciado amplio y botones grandes.

FORM: seed: none (pinned). Referencias del usuario: las tres imágenes de Ruby y su paleta; nombre confirmado «RubyMind». Pantallas de aplicación construidas directamente en código. Gesto distintivo: el sprite transparente local `ruby-states.png` reúne nueve poses en una cuadrícula 3×3. Ruby acompaña bienvenida, lobby, pregunta y resultados. En pregunta mide 64px; no tapa el enunciado ni bloquea respuestas. Este pedido explícito sustituye la decisión anterior de cambiar expresión solo en descanso o resultado.

MOTION: Feedback de presión 160ms, entradas de estados 240ms ease-out. Celebrate combina salto de 480ms y ocho piezas de confeti de 650ms con retrasos de hasta 180ms; no hay bucles y movimiento reducido elimina salto y confeti. En pregunta, cheer se muestra solo dentro de los primeros 700ms desde openedAt del servidor y luego cambia a think; el reloj y los controles siguen activos. El host también ve una indicación cheer breve al pedir iniciar o avanzar, hasta 900ms o cambio de estado/error/conexión; no es una cuenta regresiva previa real. Idle usa una pose mirando el contador, sin animación independiente de cola. Sin movimiento continuo ni animación de clasificación, cifras o enunciados durante una pregunta. Hover limitado a puntero fino.


## Reacciones observadas
- `welcome`: acceso e ingreso; saludo con apodo cuando existe y el código tiene formato válido.
- `idle`: espera en lobby; para host sin resultados también es el estado de reposo.
- `cheer`: indicación visual de inicio/avance y comienzo de la pregunta según el tiempo del servidor.
- `think`: pregunta junto al reloj, con signo de interrogación; también espera si falta el resultado personal.
- `celebrate`: acierto; mensaje de racha si alcanza al menos dos; podio (posición 1–3) y cierre final del host. Se acompaña de confeti cuando corresponde a un resultado confirmado.
- `empathy`: fallo ordinario con respuesta enviada.
- `surprised`: sin respuesta al cierre o racha previa de al menos dos que cae a cero. Estas condiciones preceden a `sad` para el participante.
- `motivate`: bloque adicional junto al ranking cuando empeora una posición previamente observada; cierre fuera de podio que no cumple cercanía al tercero.
- `sad`: nadie acertó, salvo los casos personales anteriores de timeout o racha rota; cierre fuera del podio a no más de 100 puntos del tercero.

El umbral de cercanía `RUBY_NEAR_PODIUM_POINTS` es visual y ajustable; no altera puntaje ni posiciones. El host celebra un cierre de pregunta con resultados y algún acierto, o muestra sad si nadie acertó. La comparación de racha y posición toma una baseline observada para esa ronda; no fabrica historia tras reconectar. El contrato no incluye una cuenta regresiva previa real.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
