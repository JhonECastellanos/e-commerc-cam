# Catálogo y administración

La raíz operativa sigue siendo `e-commerc-cam`. La web local está en `http://localhost:8094`; el acceso administrativo es `/admin/login`, también enlazado en el pie del sitio. Se conservan la autenticación y las cuentas existentes. No se publican credenciales.

- **Combos:** buscar por nombre, marca o ID; crear, editar precios de equipos y tarifa por cámara, activar/ocultar, cambiar foto y eliminar con confirmación. El editor avanzado conserva especificaciones, almacenamiento y elementos incluidos. La configuración general se conserva en Multimedia; Precios mantiene la auditoría. Los cambios de combos desde el nuevo editor también se auditan.
- **Productos:** crear, editar categoría/marca, precio, instalación opcional y fotografía; ocultar o eliminar. La clasificación por conexión y funciones puede personalizarse expresamente en cada ficha, conservando la clasificación automática cuando esa opción está desactivada. Solo deben marcarse capacidades verificadas del modelo.
- **Multimedia:** añadir/eliminar banners, editar orden, visibilidad, texto, foto y URL YouTube/MP4. El selector sugiere los vídeos existentes. La selección de demos controla cuáles acompañan a los banners; las demos interactivas siguen accesibles en Casa inteligente.
- **Clientes:** Órdenes y Solicitudes de asesoría conservan sus rutas, datos, perfiles, revisión y configuración 3D asociada.

La API de combos incluye las ofertas activas identificadas por nombre, aunque no tengan nivel destacado, y conserva las ofertas destacadas heredadas. Las 480 filas anónimas de la matriz de precios permanecen disponibles para el cotizador, sin aparecer como fichas comerciales de Combos. En portada se mantienen las tres ofertas destacadas HiLook y se añaden tres ofertas Dahua mediante carrusel. El catálogo usa paginación superior: seis combos u ocho equipos por página, filtros antes de paginar y gesto horizontal. No se borraron los registros genéricos históricos ni se inventaron precios para reemplazarlos. La administración permite revisar su vigencia.

`ComboPublic` añade nombre e indicador de instalación; `ProductOut` añade marca, instalación opcional y especificaciones que ya existían en base de datos. Se conservan los campos y rutas anteriores; no hay migración de tablas. No se exponen ganancias internas. El catálogo ahora refleja los cambios administrativos de esos campos.

## Corrección confirmada de marca y fotografías

Los originales HiLook contienen un kit de 4 cámaras, dos kits de 8 y uno de 10. El de 10 tiene su propio registro, código `IC-HIK-010` y precio existentes. La ficha antigua Dahua `13cam_2mp_dvr_16chanels_2tb_app` no corresponde a ese kit: se oculta conservando su registro y precios. No se transforma en un Dahua de 10 ni se cambia el precio HiLook. La semilla ya no crea esa ficha incorrecta.

`scripts/corregir-combos-catalogo.py` aplica únicamente esa ocultación mediante la API administrativa local, con `--apply`, después de verificar que existe una única ficha HiLook de 10 activa. Por defecto solo informa. Las credenciales se toman del entorno; la operación es idempotente y queda auditada.

La carpeta original HiLook `8Cam_2mp_dvr_4chanels_app` conserva su nombre. Su fotografía muestra ocho cámaras y DVR de ocho canales; el registro correspondiente se llama `8Cam_2mp_dvr_8chanels_app`. El resolver incluye esa asociación explícita y no intercambia sus fotos con las del kit de 8 cámaras y 2 TB. Las cargas administrativas tienen prioridad.

`scripts/prepare-catalog.py` conserva los originales, reutiliza derivados por hash y guarda nuevos WebP de forma atómica. `CatalogImage`, `comboPhotos` y `productPhoto` siguen siendo los resolvers de imágenes. No se sustituyen fotos identificadas por imágenes de otro producto.

## Validación y alcance

Las pruebas CRUD del backend utilizan SQLite en memoria. Las pruebas de interacción administrativa del navegador interceptan las escrituras con datos sintéticos; no escriben en la base comercial. Las pruebas heredadas con mutaciones siguen desactivadas sin `E2E_ADMIN_MUTATIONS=1`. La única modificación comercial de esta entrega es la ocultación Dahua descrita y confirmada por el propietario.

El error TS2591 de `vite.config.ts` se corrige utilizando `loadEnv` de Vite y comprobando ese archivo con el proyecto TypeScript. Se mantienen las variables `VITE_API_PROXY_TARGET` y `VITE_API_PROXY`, sin nuevas dependencias.

La demostración 3D, checkout y asesoría conservan su comportamiento. La validación de móvil usa emulación de Chromium; no demuestra control de hardware físico. El estado histórico de aquella fase se documentó antes de su posterior promoción; el estado de cada entrega se registra en su PR.

## Actualización de administración comercial

- **Combos:** ofertas comerciales con fotografías HiLook/Dahua; las filas anónimas de cálculo siguen disponibles para el cotizador, sin aparecer como productos. La vista inicial muestra publicados; los ocultos se recuperan con el filtro. Los precios instalados se editan aquí.
- **Productos / Precios:** un solo editor para equipos, clasificación, valores internos y galerías. Las altas empiezan como borrador. Agrega una foto y activa «Visible en catálogo» para publicar. Retirar la última foto oculta la ficha y conserva el registro y los archivos originales. El filtro «Borradores y ocultos» permite recuperarla.
- **Precios individuales:** `show_product_prices` está desactivado por defecto. El interruptor persiste en Configuración y oculta importes de equipo e instalación en la API pública y el catálogo del agente/CSV. Los combos mantienen sus importes. El historial de cambios permanece consultable en Precios.
- **Multimedia:** los banners existentes y las cuatro demostraciones muestran sus recursos actuales. Las demos guardan imagen y vídeo por separado en `business_config` (`media_house`, `media_apartment`, `media_functions`, `media_recording`). Se pueden subir imágenes JPG/PNG/WebP y MP4 hasta 30 MB. Sus valores predeterminados siguen disponibles sin migración ni importación. Estos recursos presentan el simulador; no reemplazan su canvas.
- **Conócenos:** muestra `about_image_url`, administrado desde Multimedia → Configuración. El endpoint crea la configuración cuando aún no existe.

Las galerías administradas usan `specs.catalog_images`: una lista explícita vacía significa que se retiraron las fotos y tiene prioridad sobre los índices históricos. Los índices `combo_photos.json` y `product_photos.json` referencian exclusivamente archivos del catálogo original; las pruebas verifican sus recursos. No se borran ni reseembran tablas o volúmenes.

Validación: pytest con SQLite y cargas temporales; Vitest; build de Vite y Docker; Playwright de escritorio/móvil con escrituras interceptadas. `E2E_ADMIN_MUTATIONS` permanece desactivado en la base comercial.
