# Banners reproducibles

El frontend consume MP4 H.264 de cinco segundos, sin sonido, y posters WebP.
Los vídeos de casa/apartamento proceden del modelo WebGL existente, no de una
imagen que sustituya su geometría. El banner CCTV conserva el YouTube original.
Las dos imágenes de IA son ilustraciones comerciales, nunca fotos de productos.

Herramientas de autoría, fuera de las dependencias React:

1. Instalar HyperFrames 0.8.158 (Apache-2.0) y GSAP 3.14.2 en `.local/media-tools`,
   con `npm install --prefix .local/media-tools --ignore-scripts --no-audit --no-fund hyperframes@0.8.158 gsap@3.14.2`.
2. Usar FFmpeg/FFprobe local. La distribución Windows de Gyan está enlazada
   por [FFmpeg](https://ffmpeg.org/download.html); comprobar su SHA256 antes de ejecutarla.
3. Iniciar el frontend local 5195; ejecutar `node scripts/capture-banner-models.cjs`.
4. Codificar cada carpeta de 60 PNG con `ffmpeg -framerate 12 -i .local/banner-captures/casa/%03d.png -t 5 -r 24 -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart .local/banner-captures/casa-source.mp4` (también apartamento).
5. Ejecutar `node media/banners/prepare.cjs`. Genera composiciones editables locales
   con medios propios y GSAP vendorizado; no hay recursos CDN durante el render.
6. `hyperframes check .local/banner-render/functions`, comprobar snapshots y
   `hyperframes render .local/banner-render/functions --workers 1 --low-memory-mode --fps 24 --crf 24 --output frontend/public/banner-assets/functions-loop.mp4`.
   Repetir recording/casa/apartamento. Ajustar PATH a FFmpeg/FFprobe y establecer
   `HYPERFRAMES_NO_TELEMETRY=1`. No se requiere API de IA, cuenta o render en nube.
7. Comprobar cada archivo con FFprobe: 5 s, 1280×720, H.264/yuv420p, 24 fps.

Los clips de las demos vuelven suavemente al ángulo inicial; la geometría,
luces y TV permanecen interactivas al abrir el panel. Solo se monta el vídeo
activo. Pausar, salir del viewport y reduced-motion detienen la reproducción.

## Dirección visual de IA

Generados con la herramienta de imágenes integrada, originales conservados en
su carpeta de generación. Composición panorámica fotográfica, residencia moderna
al anochecer, paleta azul, tercio izquierdo libre para texto, sin logos ni precios.
Seguridad: cámaras estratégicas, campo visual aproximado y grabador.
Funciones: detección de evento, audio y luz disuasoria como conceptos; la variante
concreta y sus capacidades se verifican en las fichas, no se deducen de la imagen.

Contrato técnico y licencia: [HyperFrames](https://github.com/heygen-com/hyperframes),
[composiciones](https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-core/SKILL.md).
