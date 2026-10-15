# Secuencias de cinco segundos para la casa inteligente

La fotografía de referencia muestra una casa de dos niveles abierta en corte, con terrazas, cristal, madera y luz cálida. Debe usarse como referencia en cada generación. Una imagen renderizada no contiene la geometría oculta del inmueble: un vídeo puede presentar acciones predefinidas, pero no permite recorrerlo o girarlo libremente. El modelo Three.js conserva esa interacción. Los clips serán una presentación opcional que utiliza el mismo motor de estados para los botones, luces y TV; no reemplazan el modelo.

## Entrega mínima: ocho clips, cuarenta segundos en total

Todos duran **5 segundos**, sin audio ni texto incrustado, 24 fps (120 fotogramas), 1920×1080 si la herramienta gratuita lo permite; 1280×720 es aceptable. MP4 H.264, sin marcas añadidas. Si la herramienta obliga a una marca de agua, conservarla y revisar sus condiciones comerciales. No hay que unir los ocho en un vídeo largo: se reproducen por acción. Un clip cuadrado 1024×1024 sirve en móvil con encuadre completo, sin recortar la vivienda; no exige otra generación.

Cada clip de estado emplea **la misma cámara fija**, misma exposición, distribución, plantas, muebles y posiciones del servidor y dispositivos. Preparar dos imágenes maestras consistentes: A con luces/TV apagadas y B con luces encendidas/TV apagada. No generar cada secuencia desde un diseño diferente. Cuando la herramienta admita imagen final, aportar también el estado final indicado. Guardar el último fotograma; será la imagen fija después de terminar la animación.

### Prompt común (anteponer a todos)

> Usa la imagen adjunta como referencia arquitectónica exacta. Render arquitectónico realista de una casa moderna de dos niveles, vista isométrica en corte, fachadas blancas, carpintería oscura, suelo de madera, terrazas con barandas de vidrio, jardín delantero y patio trasero. Preserva estrictamente la distribución, proporciones, muebles, puertas, plantas y puntos inteligentes de la referencia. Cámara ortográfica fija a tres cuartos, encuadre de toda la casa con margen del 10 %, fondo neutro claro. Materiales físicamente plausibles, reflejos discretos, sombras suaves. Duración exacta de cinco segundos, sin sonido, texto, logos, iconos flotantes ni personas. No deformes la arquitectura ni añadas habitaciones o dispositivos. Excepto la acción indicada, nada se mueve. Primer y último segundo estables; movimiento suave durante los tres segundos centrales. Mantén la exposición fija: no compenses automáticamente los cambios de iluminación.

| Archivo | Estado inicial → final | Movimiento y prompt específico |
|---|---|---|
| `01-presentacion.mp4` | A → A | «Casa en reposo. Únicamente acerca la cámara un 6 % entre los segundos 1 y 4, sin rotación ni cambio de perspectiva. Detén el movimiento el último segundo. Mantén luces y TV apagadas». Es un clip de entrada; no usarlo como fondo de los cambios de estado. |
| `02-bienvenida.mp4` | A → B | «Cámara inmóvil. Entre los segundos 1 y 2 enciende progresivamente las lámparas de sala y pasillo; entre 2 y 3 las de cocina. Luz cálida de 2700 K que ilumina físicamente el entorno. TV apagada. Entre 3 y 5 conserva ese estado». |
| `03-cocina-on.mp4` | A → cocina encendida | «Cámara inmóvil. Enciende solo la iluminación de la cocina de la planta alta entre los segundos 1 y 2, con transición suave de medio segundo. El resto de luces y TV permanecen apagadas. No cambies muebles ni exposición». |
| `04-cocina-off.mp4` | cocina encendida → A | «Cámara inmóvil y exactamente el mismo encuadre del clip anterior. Apaga únicamente la luz de la cocina entre los segundos 1 y 2. Conserva la iluminación natural y todas las otras condiciones». Puede derivarse invirtiendo 03 si no hay otros movimientos. |
| `05-tv-on.mp4` | B → B + TV | «Cámara inmóvil. El televisor de la sala pasa de negro a una imagen abstracta azul tenue entre los segundos 1 y 2. Aparece un reflejo azul discreto sobre el mueble y pared cercanos. No muestres contenido protegido ni letras. La iluminación de sala, cocina y pasillo no cambia». |
| `06-tv-off.mp4` | B + TV → B | «Cámara inmóvil. El televisor se apaga entre los segundos 1 y 2; pantalla negra y desaparición del reflejo azul. Mantén encendidas las mismas luces del clip anterior». Puede derivarse invirtiendo 05 si no hay otros movimientos. |
| `07-acceso-movimiento.mp4` | exterior nocturno apagado → luz acceso | «Cámara inmóvil y arquitectura idéntica, ambientación nocturna inicial estable. Entre los segundos 1 y 2 se enciende la luminaria del acceso y jardín como respuesta a un evento simulado. No añadas personas, alarmas, haces láser ni conos de vigilancia. Interior y TV no cambian». El aviso “Movimiento simulado” lo dibuja la web, no el vídeo. |
| `08-noche-segura.mp4` | B + TV → luces paso/acceso | «Cámara inmóvil, noche desde el primer fotograma. Entre 1 y 3 apaga el televisor y luces de sala y cocina; conserva únicamente pasillo y acceso con luz cálida tenue. Indicador discreto del servidor permanece verde. Últimos dos segundos estables». |

No hace falta generar de nuevo 04 y 06 si se editan por inversión: son **seis generaciones y ocho archivos finales**. Revisar que el vídeo no incluya movimiento de personas, pantallas animadas o fluctuaciones que delaten la inversión.

## Cuatro clips opcionales para explicar la propuesta

Mantener la arquitectura original. Cada uno dura 5 s y vuelve a la presentación general al terminar; no se usan para representar el estado persistente.

9. `09-servidor-local.mp4`: «Acerca suavemente la cámara al armario técnico del pasillo entre 1 y 3, sin atravesar paredes. Servidor compacto y equipo de red con indicadores discretos. Mantén encuadre estable entre 3 y 5. Sin circuitos mágicos, hologramas ni texto». La web añade la explicación de IA local; el clip no prueba procesamiento de IA.
10. `10-panel-touch.mp4`: «Acerca la cámara al panel táctil de la entrada entre 1 y 3. Pantalla con bloques abstractos estables, sin letras inventadas. Conserva la arquitectura y termina sin movimiento». La información personalizada real debe renderizarse en HTML o como textura del modelo, no generarse como texto ilegible.
11. `11-planta-alta.mp4`: «Eleva suavemente la cámara y enfoca la terraza y cocina de la planta alta entre 1 y 3; no conviertas el plano ni inventes zonas ocultas. Detente entre 3 y 5». Si el generador deforma la arquitectura, usar un movimiento de cámara del modelo 3D.
12. `12-jardin-patio.mp4`: «Desplaza suavemente la cámara hacia el jardín visible entre 1 y 3, manteniendo la orientación isométrica; muestra la luminaria y cámara fija del acceso sin alterar su posición. Detente entre 3 y 5». Para un patio que no aparezca en la imagen maestra se necesita otra imagen maestra renderizada del mismo modelo; no pedir al generador que lo invente.

## Cómo encadenarlos sin engañar al usuario

- Al recibir una orden, primero el motor valida y actualiza el estado; después se reproduce el clip compatible. Al acabar, mostrar su último fotograma y el estado confirmado.
- Las secuencias anteriores muestran combinaciones concretas. Si el estado inicial es distinto (p. ej. cocina encendida y sala apagada), no reproducir un clip que encienda toda la casa. Mantener el modelo 3D para esa combinación. Soportar todas las combinaciones mediante vídeos completos exigiría muchos más clips.
- No invertir un clip de encendido para “apagado” si cambian otros objetos. Evitar clips nocturnos para una escena diurna. Mantener un fundido breve solo entre encuadres compatibles.
- Cargar clips bajo demanda, respetar `prefers-reduced-motion`, ofrecer pausar y dejar audio/voz al aplicativo. No activar el micrófono automáticamente.
- Entregar cada vídeo con imagen inicial y final, nombre, duración y estado mostrado. Revisar fotogramas 0, 24, 60, 96 y 119: paredes rectas, mismo sofá, misma TV, dispositivos en posiciones estables, ausencia de objetos que aparecen/desaparecen.
- El vídeo no demuestra un servidor físico, reconocimiento visual ni control real: esos sistemas siguen pendientes de instalación. No anunciar un avatar hablando ni sincronización labial; la voz actual sale del sistema del navegador.

Fuentes técnicas: [cámaras ortográficas y perspectiva de Blender](https://docs.blender.org/manual/en/latest/render/cameras.html), [render de Cycles](https://www.blender.org/features/rendering/), [VideoTexture de Three.js](https://threejs.org/docs/pages/VideoTexture.html). Los movimientos y cantidades anteriores son decisiones de producción para este proyecto, no límites impuestos por esas herramientas.
