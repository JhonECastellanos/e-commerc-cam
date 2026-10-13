# Validación local de la integración

## Estado actual — consolidación del 13 de octubre de 2026

La carpeta operativa es `e-commerc-cam`, rama `feature/unificacion-catalogo-casa-3d`. Git es independiente del worktree anterior; las fuentes antiguas se respaldaron en un archivo tar.gz verificado (4.221 entradas), con SHA256 `87de996839e5b2b3bac2fb709bd63faf645601131617dae52f96d0fb68eba5dc`. Su retirada definitiva está pendiente de la autorización específica solicitada por la revisión automática.

Se conservaron las 132 fotografías de `CATALOGO` y se publicaron derivados WebP (9,53 MB) con manifiesto de rutas y hashes. El inventario público contiene 286 recursos: 154 originales y 132 fotografías; los recursos de los modelos se excluyen. Los kits se vinculan por marca, resolución, modalidad y número de cámaras; los productos genéricos sin modelo siguen pendientes de asociación por administración.

La casa tiene dos niveles visuales, terraza acristalada, escalera exterior, jardín, patio y vistas por planta. Los estados de luces, TV, panel y servidor conservan su motor y formato de asesoría. Las pruebas de UI detectaron y corrigieron una dependencia React que impedía actualizar la visibilidad por planta. El recorrido cambia de altura al elegir habitación; no simula subir físicamente la escalera. El acabado se inspira en la referencia y no reproduce su calidad fotográfica exacta.

Compilación local correcta; 85 pruebas pytest y Ruff pasan. Los 33 casos unitarios de frontend se verificaron (32 en la ejecución completa y los tres nuevos de fotos tras corregir la ruta Windows). Todas las imágenes respondieron y se decodificaron en escritorio y móvil. La prueba administrativa heredada había escrito una imagen de QA de un píxel y una solicitud ficticia: ambas referencias de negocio se restauraron con autorización específica, sin modificar otros registros. Las pruebas administrativas con escrituras ahora requieren `E2E_ADMIN_MUTATIONS=1` y un entorno QA seleccionado expresamente; están deshabilitadas por defecto.

Las secciones siguientes son el historial de validaciones anteriores, no la estructura operativa actual. Guía de clips: [SECUENCIAS_ISOMETRICAS.md](SECUENCIAS_ISOMETRICAS.md). Organización: [ORGANIZACION.md](ORGANIZACION.md).

La ejecución final de `playwright test platform.spec.ts` aprobó los diez casos en escritorio y móvil emulado sobre build estable: carrusel, dos modelos, luces/TV con diferencias de píxeles, guardado, eventos, niveles, recorrido, adjunto a asesoría y todas las imágenes del manifiesto. Se revisaron capturas reales del nuevo render. Una ejecución inicial del apartamento agotó el límite de 45 s mientras se construía Docker; los casos gráficos disponen de 90 s para el render por software. Los fallos iniciales de planta quedaron corregidos y verificados.

La comprobación HTTPS posterior detectó un 403 en la entrada directa `/catalogo`, por coincidencia con el directorio de fotografías: se añadieron las rutas SPA exactas en Nginx, conservando la entrega de WebP. Se ajustó además el enfoque del servidor desde una planta oculta y se restringió el recorrido a la altura de la planta correspondiente; para cambiar de nivel se utilizan los botones de habitación.

Fecha: 12 de octubre de 2026. Rama: `feature/integracion-smarthome-3d`. Aplicación compilada: `http://localhost:8094`, proyecto Docker `instalacam-integracion-local`, con volúmenes nuevos y datos de prueba.

| Comprobación | Resultado |
| --- | --- |
| Docker: frontend, API y PostgreSQL | Compilación correcta; API lista y base saludable |
| API: pytest | 85 pruebas aprobadas |
| API: Ruff | Sin errores |
| Frontend: Vitest | 26 pruebas aprobadas |
| Playwright sobre Nginx/API de Docker | 13 aprobadas; 1 omitida (administración en escritorio). Los 4 casos de modelos también pasan con comprobación adicional de píxeles renderizados al cargar y volver desde el panel |
| Dependencias npm y requirements del backend | Sin vulnerabilidades conocidas en las consultas realizadas |
| Imágenes | 154 recursos originales comprobados por HTTP y decodificados en Chrome, en ambos viewports; 50 SVG reparados |
| Checkout original | V1 `9947c1b`, con sus dos cambios locales conservados |
| Smarthome | `ec7a9d9`, sin cambios locales |

Las pruebas del navegador cubren los dos escenarios reales del carrusel, doble clic en escritorio y botón táctil en móvil, pantalla completa, habitaciones, techo/paredes, puertas, primera persona con movimiento sostenido, dispositivos, rotación, colocación por raycasting y snapping, reglas de sensor, chat local, guardar/restaurar e importar/exportar JSON. También cubren el envío de diseño/perfil, acceso administrativo, ajuste de recomendación y carga de imagen a través del proxy de producción.

Se comprobó que el ancho de la página principal y del laboratorio no excede el viewport móvil. La referencia del producto que se reemplazó temporalmente con una imagen sintética para probar uploads fue restaurada. Las solicitudes ficticias quedan identificadas como pruebas en la base local nueva; no se enviaron mensajes a clientes.

Vitest se ejecutó de nuevo sin construir Docker simultáneamente: una ejecución concurrente había agotado el tiempo de arranque de un worker. La ejecución final completa aprobó los 26 casos. La compilación avisa del tamaño de Three.js (628 kB, unos 160 kB gzip), cargado por separado al activar un escenario. Se revisaron capturas de los modelos en escritorio y móvil.

## Límites comprobados

- Gemini tiene integración y pruebas con proveedor simulado. No hay clave configurada ni prueba de una cuenta real; el chat local está operativo. El envío opcional de órdenes y contexto exclusivamente virtual fue autorizado por el usuario.
- Chrome emula un teléfono táctil; falta probar teléfonos físicos y Safari/WebGL de esos dispositivos.
- No se encontraron fotografías originales raster de los siete productos individuales. Se conserva el estado pendiente y la carga administrativa funciona; no se inventaron fotografías.
- No se probó un pago real con Wompi ni se migraron clientes/pedidos desde la base original. La copia de esa base a QA fue rechazada por la revisión automática por el posible traslado de datos de clientes y no se ejecutó.
- Antes de publicar faltan dominio/TLS, credenciales reales, políticas/datos del negocio, revisión de las tarifas sugeridas y validación de una migración autorizada. Los sistemas físicos y el aislamiento de un rack compartido requieren dimensionamiento y piloto; el simulador no controla hardware.

Comandos reproducibles y continuidad: [INTEGRACION_SMARTHOME.md](INTEGRACION_SMARTHOME.md). Criterio comercial y fuentes: [PROPUESTA_COMERCIAL.md](PROPUESTA_COMERCIAL.md).

## Reorganización de contenedores — 13 de octubre de 2026

El grupo principal es ahora `e-commerc-cam`, con tres servicios en ejecución: frontend, backend y db. Se retiraron los tres contenedores duplicados de `instalacam-integracion-local` y se recrearon los servicios del grupo original con las imágenes de la plataforma integrada. Los volúmenes actuales se reutilizaron directamente como externos; los volúmenes históricos permanecen intactos. El grupo de pruebas `instalacam-integracion-qa` sigue detenido.

Los conteos antes y después coinciden: 7 productos, 490 combos, 0 pedidos, 6 asesorías y 1 usuario. La API está lista y se verificaron el inicio de sesión y las consultas privadas de administración sin editar registros. Las 8 pruebas del carrusel, ambos modelos y el catálogo completo en escritorio/móvil pasan sobre la agrupación nueva. No cambiaron el código funcional, las credenciales ni la URL `http://localhost:8094`.

## Cloudflare propio del e-commerce — 13 de octubre de 2026

El grupo `e-commerc-cam` tiene cuatro servicios: frontend, backend, db y su conector cloudflared. El acceso local en 8094 se recuperó recreando únicamente el frontend. La red del túnel comparte exclusivamente el frontend; se verificó que no comparte la red del conector de otras aplicaciones. La revisión de fuentes no encontró referencias a Capturador, su endpoint de autenticación ni su enlace en esta plataforma.

Se validó HTTPS mediante el túnel temporal generado por `iniciar-cloudflare.cmd`: portada, login del e-commerce, catálogo, ambos simuladores, API, productos, combos y favicon respondieron 200. `/api/admin/me` sin token respondió 401 y el login vacío respondió 422. El preflight permitió el origen exacto del túnel; una petición HTTP con un Host ajeno a través del frontend fue rechazada con 400. No se enviaron credenciales administrativas al dominio público ni solicitudes comerciales durante estas pruebas.

Pasaron seis pruebas Playwright de carrusel y configuración de casa/apartamento, y dos del catálogo completo, en escritorio y móvil emulado. La revisión secuencial de imágenes por Internet excedió inicialmente 45 segundos; al repetir esas dos pruebas con `--timeout=180000`, ambas pasaron. `nginx -t`, el parser de PowerShell y `docker compose --profile cloudflare config --quiet` también pasaron. Una segunda ejecución del iniciador reutilizó el mismo enlace sin recrear los servicios.

El backend conserva sus credenciales y volúmenes y utiliza la base existente con `AUTO_INIT_DB=false`. El inicio normal reconecta el túnel cuando ya fue activado; la parada de los cuatro servicios se comprobó con Compose en modo `--dry-run`. El enlace puede cambiar tras detener/reiniciar el conector: consultar `.local/cloudflare-url.txt` o la salida del iniciador. Esto valida el acceso temporal y no sustituye las comprobaciones de producción pendientes indicadas arriba.

## Presentación arquitectónica del hogar — 13 de octubre de 2026

Se reemplazó la interfaz de experimentación con equipos por una presentación del hogar con ubicaciones estratégicas fijas, servidor local, iluminación, TV, pantallas, micrófonos y altavoces. Se conservan los modelos tridimensionales y el recorrido; no se sustituye la escena por una imagen. El render incorpora mapas de madera, mobiliario glTF CC0, textiles con pliegues, cristales, sombras y luz de entorno. La referencia visual y la textura aplicada al jardín se generaron con la herramienta integrada de imágenes; no requieren una API de generación en el aplicativo.

Compilación local y de las imágenes Docker correcta. Pasaron 85 pruebas de la API con SQLite en memoria. Los 26 casos existentes del frontend y los cuatro nuevos del hogar pasaron; estos últimos se repitieron tras corregir una iluminación duplicada del acceso. Sobre compilación estable pasaron ocho pruebas Playwright de carrusel, casa/apartamento y adjunto a asesoría. Cuatro pruebas de casa/apartamento se repitieron y pasaron por el enlace público, con validación de cambios en los píxeles del canvas al encender iluminación/TV, estados, eventos simulados, guardado, recorrido y ausencia de controles de colocación. La recarga automática de Vite interrumpió capturas iniciales; la validación final se hizo sin esa recarga.

El perfil comercial por HTTPS respondió 200 con el diseño que incluye TV y servidor. Salud respondió 200 y la consulta administrativa sin token 401. No se registraron solicitudes comerciales, pagos ni operaciones del negocio. Se reconstruyeron únicamente frontend y backend dentro de `e-commerc-cam`; base, volúmenes, túnel y aplicaciones ajenas se conservaron. El manifiesto del catálogo sigue con sus 154 recursos originales; los recursos del render están excluidos de ese manifiesto.

Límites: el render en tiempo real aproxima la referencia visual y no equivale a su imagen generada. El teléfono está emulado; falta evaluación visual en dispositivos físicos. El dictado/voz dependen del navegador y sus permisos y no se probaron con micrófono físico. Los eventos de movimiento/gesto son simulados y la propuesta de servidor local no instala modelos de IA ni controla hardware real.
