# Presentación comercial de InstalaCámara

La portada prioriza cámaras e instalación: vídeo de seguridad, modalidades, demos, combos destacados, wizard, combos instalables y productos individuales. La casa inteligente ofrece software y asesoría bajo cotización; las demos conservan sus controles y motor virtual.

- El banner recupera el enlace YouTube `CJ3dAAna7jQ` del frontend V1. Los banners administrativos prevalecen. Se usa la [API oficial del reproductor](https://developers.google.com/youtube/iframe_api_reference) para pausar/reanudar; con movimiento reducido el vídeo espera una acción explícita. Una URL MP4 autorizada puede configurarse como `video_url` o `VITE_SECURITY_VIDEO_URL`; no se descarga YouTube.
- WhatsApp se obtiene de ajustes, enlace social activo o `VITE_WHATSAPP_NUMBER`. El número comercial suministrado se guardó únicamente en el enlace social local editable desde `/admin/redes`; la configuración pública no tenía una fila para ese ajuste. No hay teléfono comercial incrustado en el código.
- El wizard conserva preguntas aplicables, recomienda el combo menor que cubre las áreas o revisión personalizada y comparte el perfil por WhatsApp. Checkout recibe y restaura el perfil desde sesión; el payload de pedidos y sus garantías de idempotencia siguen intactos. La revisión personalizada utiliza el formulario de asesoría existente.

## Catálogo y administración

Se importaron con autorización 37 fichas desde las carpetas originales y su clasificación en `CATALOGO/Categorizacion_jo.xlsx` (Hoja2). Los siete registros anteriores permanecen intactos: 44 productos en total. Los nuevos precios e instalación quedan a cotizar. `IC-…` es un código interno estable, no un SKU del fabricante. Dos carpetas no identifican un modelo exacto: conservan su nombre de origen. Los siete registros genéricos anteriores todavía requieren modelo para asociar una fotografía inequívoca; no se les asignó una foto de otro equipo.

La API pública existente entrega nombre, categoría, precio y foto. La marca y las fichas adicionales se enlazan con `catalog-products.json` mediante el modelo/código de la descripción, sin cambiar la API. Las fotos y precios administrativos prevalecen. Las fichas desactivadas no se recrean desde el JSON. La carpeta original CATALOGO se conserva; el frontend utiliza sus derivados WebP y las cargas administrativas. El proxy Vite/Nginx corrige únicamente el MIME de uploads WebP que el backend entrega como `application/octet-stream`; conserva JSON, errores y demás respuestas. No cambia archivos del backend.

Para reproducir la importación en otra base **local**, primero revisar las fichas y aprobar sus altas:

```powershell
python scripts/import-commercial-catalog.py
# Solo después de autorizar las altas y configurar .env local:
python scripts/import-commercial-catalog.py --apply --base-url http://127.0.0.1:8001
```

El importador utiliza endpoints administrativos existentes, omite precios nuevos, evita duplicados por nombre y guarda un snapshot en `.local/`. No se ejecuta durante el arranque. `scripts/catalog-index.py` regenera únicamente metadatos desde los originales y el Excel; no escribe en la base de datos.

## Verificación

`npm test`, `npm run build` y `E2E_BASE_URL=http://127.0.0.1:5195 npx playwright test platform.spec.ts commerce.spec.ts` comprueban reglas comerciales, fotos, perfil, recorrido, luces/TV, guardado y controles del reproductor en escritorio/móvil emulado. Los tests de reproducción sustituyen la API de YouTube para validar órdenes de control sin depender del proveedor; también se verifica por separado el vídeo original real. Las pruebas no crean pedidos ni asesorías. No se incluye fusión, cobros, controles de hardware ni despliegue de producción.
