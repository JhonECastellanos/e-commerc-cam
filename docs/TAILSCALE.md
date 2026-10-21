# Publicación del e-commerce con Tailscale

El perfil `internet` añade un único conector al proyecto Compose `e-commerc-cam`, con identidad `instalacam` y volumen propio. No usa claves, identidades, volúmenes ni redes de Capturador. Imagen oficial fijada por versión y digest; userspace, sin privilegios, Docker socket, dispositivos TUN ni puertos publicados. Estado persistente y configuración en `.local`, excluidos de Git.

Ejecutar `iniciar-tailscale.cmd -Compilar` la primera vez; después, `iniciar-tailscale.cmd`. Si pide autorización, abrir el enlace mostrado e iniciar sesión con la cuenta Tailscale existente. No enviar contraseñas ni claves por chat. Se comprueban los bloqueos antes de activar Funnel; la configuración inicial `{}` no publica nada. Los permisos Funnel de la cuenta deben estar habilitados para este dispositivo; no se modifica la política de otros proyectos.

Funnel publica HTTPS hacia el puerto **interno 8082** de Nginx. La lista permitida comprende únicamente páginas comerciales, recursos y APIs de visitante: catálogo, asesoría, agenda, chat, simulación y cotización. El panel, login, APIs administrativas, MCP, integraciones internas y archivos privados responden 404; no se confía en esconder el enlace. Se descartan credenciales Bearer en esta entrada. El administrador mantiene su autenticación y acceso local en `http://localhost:8094/admin/login`; también se oculta su enlace en los dominios públicos.

La configuración de hosts y origen se guarda en `.env.tailscale`, sin credenciales, y no vuelve a sembrar la base. El perfil Cloudflare heredado usa igualmente el filtro 8082 cuando se active; este iniciador no lo arranca. Para retirar la publicación: `iniciar-tailscale.cmd -Desactivar`. Conserva identidad, archivos, sesiones y base de datos. El PC y Docker deben permanecer encendidos para que el enlace responda.

Validar tanto accesos públicos como bloqueos, incluidas rutas codificadas, administración local y las demostraciones 3D. Las pruebas de captación deben interceptar las escrituras o utilizar una base desechable.

En Docker Desktop, el iniciador reinicia únicamente el conector tras cambiar la configuración para aplicarla aunque Windows no transmita notificaciones del archivo. La autorización inicial dispone de 30 minutos; si se agota, volver a ejecutar el iniciador y usar el enlace vigente. La primera publicación puede tardar varios minutos por el certificado HTTPS y la propagación DNS; si no responde dentro del plazo de comprobación, el conector se detiene y la configuración vuelve a cerrarse.

Referencias oficiales: [Docker](https://tailscale.com/docs/features/containers/docker/docker-params), [Funnel](https://tailscale.com/docs/features/tailscale-funnel).
