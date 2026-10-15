# Agenda, agente y WhatsApp de InstalaCámara

## Puesta en marcha en este PC

Todo pertenece a Compose `e-commerc-cam`: base de datos, backend, frontend,
WhatsApp y túnel Cloudflare. No usa Hermes ni sesiones, volúmenes o credenciales
de ABI o Capturador. `services/whatsapp` reutiliza la tecnología y dos helpers
de compatibilidad de ABI, sin copiar contactos, historial ni datos de sesión.

1. Configurar `.env` desde `.env.example`, manteniendo los volúmenes existentes.
2. Crear `.env.whatsapp` con `WHATSAPP_GATEWAY_TOKEN` aleatorio de al menos 32
   caracteres y `WHATSAPP_GATEWAY_URL=http://whatsapp:3210`. Nunca subirlo a Git.
3. `docker compose build backend frontend whatsapp`.
4. `docker compose run --rm --no-deps backend python migrate_business.py`.
   Esta migración es aditiva, repetible y no siembra ni altera el catálogo.
5. `docker compose up -d db backend frontend whatsapp` y arrancar el perfil
   `cloudflare` mediante el procedimiento existente del proyecto.
6. En `/admin/agente`, pestaña WhatsApp, pulsar Conectar y escanear el QR desde
   Dispositivos vinculados del teléfono. La sesión tiene su volumen propio.

No se debe ejecutar `docker compose down -v`. El gateway no publica puertos al
host. Solo el backend autenticado expone su QR y su estado al administrador.
Su sesión y cola son datos privados; incluirlos en una copia de seguridad cifrada.

## Reglas comerciales y funcionamiento

La configuración inicial aprobada es domingo a domingo, 08:00–22:00 Colombia:
30 minutos CCTV, 60 minutos casa inteligente. Una agenda principal impide cruces.
Las instalaciones y bloqueos se crean manualmente con duración explícita.
La anticipación inicial es una hora y el horizonte 30 días; ambos son editables
en `/admin/agenda`. La disponibilidad pública nunca contiene nombres/contactos.
Reservas y reprogramaciones bloquean la fila de configuración en PostgreSQL y
vuelven a comprobar solapamientos antes del commit. Los envíos usan idempotencia.
Para reactivar citas canceladas se debe Reprogramar y volver a reservar capacidad.

El chat comercial funciona sin IA externa para orientación, catálogo, agenda y
derivación. WhatsApp inicia atención cuando recibe una consulta comercial
explícita (por ejemplo, los enlaces wa.me de la web incluyen InstalaCámara).
No importa conversaciones ni contactos anteriores. Los mensajes posteriores de
esa conversación se guardan en la bandeja, también durante la atención manual. ASESOR pausa automatización;
BAJA/STOP detiene respuestas automáticas. La bandeja permite responder manualmente
al cliente existente. Antes de usar un proveedor IA en WhatsApp se pide ACEPTO IA.

La cola de salida persiste en PostgreSQL. Los IDs también persisten en el gateway:
un reinicio no reenvía un mensaje ya enviado. Una entrega con resultado incierto
queda `uncertain`; no se reintenta automáticamente para evitar duplicados.
Una desconexión temporal conserva mensajes `pending` hasta recuperar la conexión.
El backend está diseñado para **un proceso Uvicorn**, como el Dockerfile actual;
los locks de conversación en memoria no son un coordinador entre réplicas.
Antes de escalar backend se requiere un consumidor durable único/lock por conversación.

## Conexión del modelo y MCP

`/admin/agente` guarda URL base, modelo, instrucciones y clave cifrada con una clave
derivada de SECRET_KEY. No cambiar SECRET_KEY sin volver a configurar la clave IA.
No se muestran claves guardadas ni se envían al frontend. La lista de modelos usa
GET `/models`; las respuestas usan POST `/chat/completions` del proveedor configurado.
Los presets son APIs compatibles; no se afirma compatibilidad con cualquier API
propietaria. El ID se puede escribir manualmente cuando no hay listado.
En Docker, un modelo ejecutado en el PC usa `host.docker.internal`, no localhost.

La IA pública está desactivada por defecto. El propietario debe configurar y
activar proveedor y modelo; puede autorizar su uso también para clientes. Las
instrucciones editables no conceden permisos de administración al chat público.
Los precios y características proceden de la base de datos. El CSV se genera al
descargar, con los mismos totales instalados que la API pública; no incluye costes
internos, claves ni clientes y neutraliza fórmulas de hojas de cálculo.

MCP real, Streamable HTTP stateless: `/api/admin/agent/mcp`, Bearer de administrador.
Soporta initialize, ping, tools/list, tools/call y notificaciones con HTTP202.
GET devuelve405 al no ofrecer SSE. Valida Origin y versión. Las herramientas de
consulta exponen catálogo, agenda y solicitudes al administrador. `propose_update`
prepara cambios de campos permitidos; el modelo no tiene shell, SQL, despliegue,
secretos ni una herramienta para confirmar sus propias propuestas. La confirmación
humana verifica autor, vencimiento, datos anteriores y registra el cambio.

## Vídeo y límites de producción

El MP4 de seguridad procede del vídeo indicado por el propietario
`https://www.youtube.com/watch?v=CJ3dAAna7jQ`, descargado con yt-dlp oficial:
15 segundos, H.264/720p sin audio. Se conserva como fallback local y se puede
subir/cambiar en Multimedia (máximo30MB). La disponibilidad en YouTube no demuestra
una licencia comercial; verificar los derechos del material antes de redistribuir.
El banner reproduce muted/loop/playsInline sin controles visibles por petición
del propietario. Respeta movimiento reducido y pausa fuera de la vista/pestaña.
Los banners YouTube configurados manualmente siguen siendo compatibles y pueden
generar telemetría que las extensiones de privacidad bloquean; el MP4 no la usa.

Sin credenciales Wompi no se abre una pasarela con clave vacía ni se aceptan
webhooks sin secreto. Se conservan las solicitudes de cotización. No hay pagos
reales verificados mientras el propietario no configure su cuenta de pagos.
Un túnel trycloudflare es temporal; depende de este PC, Docker y conexión activa.
La conexión personal utiliza una librería no oficial de WhatsApp Web y puede
requerir nueva vinculación o dejar de estar disponible. No es Meta Cloud API.

## Fuentes técnicas consultadas

- [whatsapp-web.js oficial](https://github.com/wwebjs/whatsapp-web.js) y
  [LocalAuth](https://docs.wwebjs.dev/LocalAuth.html): conexión Web y persistencia.
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports): protocolo y controles de transporte.
- [Gemini compatible OpenAI](https://ai.google.dev/gemini-api/docs/openai).
- [OpenRouter modelos](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties).
- [OpenCode proveedores](https://opencode.ai/docs/providers/).
- [yt-dlp oficial](https://github.com/yt-dlp/yt-dlp): descarga del material solicitado.
