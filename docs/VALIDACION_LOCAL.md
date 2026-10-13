# Validación local de la integración

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
