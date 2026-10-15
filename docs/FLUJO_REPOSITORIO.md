# Desarrollo y producción

Este repositorio usa `desarrollo` para implementar y validar, y `master` para publicar versiones mediante pull request. El perfil `config/repository-manager.json` pertenece exclusivamente a `JhonECastellanos/e-commerc-cam`; no aplica las políticas ni las ramas de otros proyectos.

## Entrega

1. Vincular el trabajo a un issue y conservar los cambios existentes del propietario.
2. Crear commits de alcance concreto sobre `desarrollo`, con archivos seleccionados explícitamente y sin secretos ni datos comerciales.
3. Ejecutar pruebas de backend, frontend, compilación y recorridos afectados. Las pruebas administrativas que escriben usan una base aislada; nunca la base comercial.
4. Abrir o actualizar el PR `desarrollo` → `master`. Publicar la revisión del SHA final, diferenciando una revisión propia de una aprobación independiente. Esperar a que los checks de ese SHA terminen correctamente.
5. Comprobar la autorización humana vigente para el resultado, destino e impacto. Fusionar con merge commit para conservar la historia; no hacer push directo a producción ni force-push.
6. Verificar el SHA publicado y el comportamiento de la aplicación en su destino. Una fusión no acredita un despliegue y una URL temporal de Cloudflare no acredita un hosting permanente.
7. Sincronizar `desarrollo` con el merge de `master`, sin reescribir historia. Retirar ramas temporales únicamente después de verificar sus commits incorporados o su respaldo recuperable autorizado.

Los pushes a ambas ramas y todos los PR ejecutan CI. Las protecciones remotas de GitHub se verifican por separado: este perfil establece el comportamiento del agente y no reemplaza reglas del servidor. La tarea no instala vigilancia ni procesos periódicos.

## Consolidación inicial

Los PR #2, #4, #6 y #8 documentan las entregas anteriores. La promoción consolidada debe incluir sus commits y enlazar sus revisiones, sin publicar incrementos parciales. Antes de retirar sus ramas se comprueba que los respectivos heads sean ancestros de la versión integrada.

La antigua rama local `master` y `V1` contienen la raíz histórica `9947c1b`, distinta de `origin/master`. No se debe perder esa historia al normalizar las ramas: crear un bundle completo bajo `.local/release/`, verificarlo y probar la lectura del commit desde un clon del bundle. El respaldo es local e ignorado por Git; no incluye la base de datos ni sustituye sus copias de seguridad.

El propietario confirmó como destino de producción este PC con Docker y Cloudflare. El Compose conserva los datos en volúmenes; no se deben borrar ni sustituir por volúmenes vacíos durante una publicación. Los ejemplos heredados de Vercel/Render no son el destino de esta entrega. El workflow no invoca sus hooks ni instala un runner con acceso al PC: valida el SHA de `master` y registra que el despliegue local requiere comprobación independiente.

Después del merge se reconstruyen únicamente los servicios cambiados, se ejecutan las migraciones aditivas necesarias y se comprueban salud, readiness, fotografías y los flujos afectados a través de localhost y de la URL actual de Cloudflare. Conservar el conector existente evita cambiar innecesariamente la dirección; el enlace Quick Tunnel sigue siendo temporal y puede cambiar tras reiniciarlo. No registrar credenciales, datos de clientes ni sesiones de WhatsApp en GitHub.
