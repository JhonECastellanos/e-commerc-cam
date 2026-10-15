# Plataforma integrada — ejecución y alcance

Trabajo: `feature/integracion-smarthome-3d`, basado en `e-commerc-cam` `eced181`. Smarthome: `ec7a9d9`.

El remoto del e-commerce contenía administración de productos/banners, validaciones y pruebas que faltaban en el checkout V1. Se eligió esa base tras comparar ramas y verificar compilación. El checkout original se conserva con sus dos cambios locales; la integración está en un worktree separado dentro de la carpeta solicitada. Smarthome es una referencia de código, no un segundo servicio en ejecución.

## Abrir y ejecutar

- Abrir `e-commerc-cam.code-workspace` en VS Code. La carpeta operativa es `D:\Proyectos\Pagina_instalacion_camaras\e-commerc-cam`; el código aprovechado de Smarthome forma parte de esta aplicación y no necesita otro frontend, backend o contenedor.
- Iniciar Docker Desktop y ejecutar `iniciar.cmd`.
- Sitio: http://localhost:8094. Casa: `/simulador/casa`. Apartamento: `/simulador/apartamento`.
- Asesoría: `/asesoria`. Servicios y estimador: `/servicios`. Solicitudes: `/admin/asesorias`.
- Las credenciales de la cuenta local se generan en `.env`; no se muestran en consola ni deben enviarse al chat.
- `detener.cmd` detiene solo esta instancia y conserva sus volúmenes. No usar borrado de volúmenes para actualizar.

## Organización de contenedores

El grupo principal en Docker Desktop es `e-commerc-cam`: contiene `frontend`, `backend`, `db` y, al activar el perfil `cloudflare`, su propio `cloudflared`. El archivo Compose declara ese nombre y los iniciadores lo fijan expresamente, para no crear grupos adicionales al ejecutar desde otra carpeta. La excepción de pruebas es `instalacam-integracion-qa`, declarada en `compose.qa.yml` y detenida después de validar.

`iniciar-cloudflare.cmd` publica exclusivamente el frontend de esta plataforma en un enlace HTTPS temporal. El conector solo comparte la red `e-commerc-cam_cloudflare` con el frontend; no tiene conexión directa con la base ni utiliza configuración de otras aplicaciones. El backend acepta el host exacto generado mediante `.env.cloudflare`, sin habilitar todos los dominios de TryCloudflare. Los simuladores, el catálogo y las llamadas a `/api/` se sirven desde el mismo origen. La API administrativa sigue requiriendo autenticación.

La reorganización conserva los mismos volúmenes de la plataforma integrada, referenciados por nombre en `.env` como externos. No copia la base antigua ni elimina volúmenes. Los volúmenes históricos `e-commerc-cam_pgdata` y `e-commerc-cam_uploads_data` permanecen intactos y separados de los datos usados por la plataforma actual. Una instalación nueva usa los nombres `e-commerc-cam_plataforma_*` y crea sus propios volúmenes. Para operar la versión integrada usar los iniciadores de esta carpeta, no el Compose del checkout histórico V1.

Las imágenes antiguas se conservaron con etiquetas `historico-*`. La configuración de los contenedores antiguos se respaldó en `assets-recovery/container-organization/legacy-containers.dpapi`, excluida de Git y cifrada con DPAPI para este usuario de Windows. Los contenedores antiguos solo presentaban cambios de caché/arranque; los archivos de sus aplicaciones y datos siguen preservados en imágenes, repositorio y volúmenes.

## Integración implementada

Se conservan React 18, Vite, FastAPI, SQLAlchemy y PostgreSQL. Se actualizaron dependencias vulnerables (React Router, Tailwind, FastAPI, multipart y JWT) manteniendo rutas, colores y estructura. Three.js MIT construye la arquitectura y los equipos; el render incorpora mobiliario y materiales CC0 y una textura de jardín generada con IA. Las fuentes, licencias y prompts están en `frontend/public/smart-assets/ATTRIBUTION.md`. Smarthome no se ejecuta como una segunda plataforma.

La casa incluye fachada, dos habitaciones, cocina, sala, dos baños, pasillo, jardín y patio. El apartamento incluye tres habitaciones, baño, cocina, sala, estudio, clóset y acceso. Hay mobiliario con relieve, textiles con pliegues, ventanas, cortinas, techo extraíble, vistas isométrica/superior/primera persona y controles táctiles. La experiencia comercial usa ubicaciones estratégicas fijas: no hay paleta de productos, colocación, arrastre ni ajustes de cobertura. Seleccionar un equipo permite conocer su función; la iluminación y la TV muestran cambios de estado en la escena 3D.

El motor propio aplica escenas de bienvenida, televisión y noche, órdenes de iluminación/TV y eventos simulados de movimiento o gesto. Las pantallas 3D muestran el estado del hogar. Guarda/restaura los estados sin alterar la distribución fija y puede adjuntar el diseño a una asesoría. Los guardados antiguos se conservan en su clave anterior; las solicitudes existentes siguen permitiendo revisión de su diseño.

El chat básico funciona sin proveedor externo. La respuesta hablada utiliza voces locales del sistema; el dictado requiere compatibilidad y permiso de micrófono. El dictado mediante servicios de Internet necesita habilitar explícitamente su opción. Gemini sigue como intérprete opcional con consentimiento y clave en el backend; recibe exclusivamente órdenes y contexto virtual. No se añadieron APIs nuevas para renderizar. No hay herramientas de hardware ni reconocimiento visual real de cámaras en esta demostración. La referencia arquitectónica generada con IA es un recurso visual separado; las imágenes del catálogo no se reemplazan por texturas de la escena.

De Smarthome se adaptaron la regla de puntos de instalación, la separación entre equipos e instalación, la infraestructura por vivienda o edificio y el soporte periódico. Servidores/rack/red se presupuestan por separado para evitar cobrar su instalación también como un punto IoT.

`prospects` es una tabla nueva: conserva respuestas, perfil, diseño, consentimiento y revisión humana. Los modelos y precios del catálogo no cambiaron. El servidor clasifica y recomienda únicamente combos activos visibles; no inventa combos de 12 cámaras. El asesor puede ajustar la recomendación con justificación, conservando el perfil inicial. Los pedidos/pagos existentes mantienen su flujo.

## Imágenes

Se encontraron 154 SVG originales; 50 tenían una comilla incorrecta y no podían decodificarse aunque respondían HTTP 200. Se corrigieron esos archivos y sus generadores. El inventario está en `catalog-asset-audit.json`.

El listado ignoraba imágenes y la ficha ignoraba cargas administrativas. Ahora comparten un resolver, normalizan rutas Windows/public/uploads y mayúsculas de recursos estáticos y priorizan la imagen cargada. Nginx usa `location ^~ /api/` para que las fotografías subidas no terminen en el bloque estático con 404.

La búsqueda incluyó archivos ignorados, los dos repositorios, la imagen de backend, el contenedor de frontend detenido y el volumen original de uploads montado solo para lectura. No se encontraron fotografías raster de los siete productos individuales. Estos mantienen un estado pendiente; no se reemplazaron por fotografías genéricas. Los SVG son ilustraciones originales, no fotos de modelos exactos.

## Validación reproducible

Los resultados ejecutados y sus límites están en [VALIDACION_LOCAL.md](VALIDACION_LOCAL.md).

```powershell
cd frontend
npm.cmd test
npm.cmd run build
npm.cmd audit
$env:E2E_BASE_URL='http://127.0.0.1:8094'
npm.cmd run test:e2e
```

Pruebas de API: en `backend`, ejecutar `..\.venv\Scripts\python.exe -m pytest -q` y `..\.venv\Scripts\ruff.exe check app tests` después de instalar `requirements-dev.txt` en un entorno aislado. Auditoría: `python -m pip_audit -r requirements.txt`. Los tests de Gemini usan respuestas simuladas; no prueban una cuenta real del proveedor. Playwright usa Chrome con un perfil aislado y un viewport táctil; no sustituye pruebas en un teléfono físico.

## Antes de producción

La instancia entregada es local y usa volúmenes nuevos con datos de prueba. La copia de la base original fue rechazada por la revisión automática por el posible traslado de datos de clientes a QA; esa operación no se ejecutó. Una migración real requiere copia de seguridad autorizada, restauración y comprobación sobre datos reales.

Falta configurar dominio/TLS, credenciales de pagos, datos reales del negocio, WhatsApp y políticas comerciales. Definir responsable/canal/plazo de conservación en administración; la API bloquea nuevas asesorías en producción si esos datos están incompletos. Configurar y probar Gemini localmente si se desea, respetando su cuota y condiciones vigentes. Revisar los valores sugeridos en `PROPUESTA_COMERCIAL.md` antes de convertirlos en tarifas contractuales.

Para un rack físico compartido: dimensionar cargas y separar red, credenciales, memoria/RAG y almacenamiento por vivienda; consentimiento del propietario para soporte y auditoría por unidad. Un rack es infraestructura física; RAG es recuperación de conocimiento. No equivalen ni garantizan aislamiento. Esa operación física requiere un piloto independiente; el laboratorio no la activa.

No se publicó ni se hizo push. La continuidad es: completar datos/fotos originales y credenciales en local, validar teléfonos físicos y la migración autorizada, aprobar alcance/tarifas y finalmente autorizar el despliegue.
