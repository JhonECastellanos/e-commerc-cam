# Una plataforma operativa

La copia operativa es `D:\Proyectos\Pagina_instalacion_camaras\e-commerc-cam`, rama `feature/integracion-smarthome-3d`, remoto `JhonECastellanos/e-commerc-cam`. Tiene un único frontend, backend y Compose. El Git se independizó del worktree anterior y conserva los commits de integración. No se borró el repositorio principal ni se reescribió su historia.

`CATALOGO`, junto a esa carpeta, contiene las fotografías originales. `scripts/prepare-catalog.py` genera derivados WebP de máximo 1200 px y un manifiesto con ruta original y SHA256. Para regenerar: instalar `scripts/requirements-assets.txt` en un entorno Python y ejecutar el script. Los derivados se versionan: una clonación y un build Docker funcionan sin copiar los 627 MB originales ni instalar Pillow en producción. Se procesan todas las fotografías; no se publica el Excel comercial.

El frontend prioriza fotografías subidas por el administrador, después vincula kits cableados por marca, resolución y número de cámaras. No usa un kit diferente cuando faltan fotos. Las imágenes de kits son referencias; capacidades de disco y componentes se confirman en la cotización. Los productos individuales necesitan un SKU explícito o una imagen asignada por administración: los siete registros genéricos existentes no identifican fabricantes/modelos suficientes para adjudicarles fotografías de equipos distintos. El formulario y modelo del catálogo no se modificaron.

Las copias V1, Smarthome, Proyecto_IA_construccion e Instalacion_camaras se conservan únicamente como respaldo recuperable en `_RESPALDOS`; incluyen los cambios locales antiguos de `frontend/package.json` y `vite.config.ts`. Los originales de ese otro CATALOGO están dentro del respaldo. No son proyectos para ejecutar.

Docker mantiene el proyecto `e-commerc-cam` y los mismos volúmenes externos de PostgreSQL, uploads y acuerdos. No se usan `down -v`, migraciones ni reinicialización. Su Cloudflare sigue siendo independiente del Capturador y ABI. Los lanzadores de la carpeta raíz apuntan solo a este proyecto. El Quick Tunnel puede cambiar al renovar el conector.

La casa usa dos niveles visuales (cocina, habitaciones y baño principal arriba), terraza y jardín. Los dispositivos mantienen sus coordenadas de asesoría y añaden elevación solo al render. Los controles permiten ver la casa completa o aislar cada planta. El recorrido por habitación cambia de altura; no simula subir escaleras físicamente. Luces y TV siguen siendo acciones virtuales. La referencia aportada guía el diseño; la geometría WebGL no se anuncia como una reproducción fotográfica exacta.

GitHub: el código integrado pertenece al repositorio principal. El repositorio remoto Smarthome permanece como referencia histórica; no hace falta borrarlo para que la plataforma deje de depender de él. Su eliminación remota y una fusión a producción son acciones independientes de esta consolidación.
