# Precios orientativos y criterio comercial

Consulta: **12 de octubre de 2026**. Son propuestas para revisar, antes de IVA cuando aplique. No son tarifas contractuales aprobadas ni cambian los precios del catálogo existente.

## Referencias consultadas

| Fuente | Referencia publicada | Uso en la propuesta |
| --- | --- | --- |
| [Harley Vásquez: servidores](https://harleyvasqueztech.vercel.app/servicio-datacenter.html) | Instalación desde 450.000 COP; monitoreo desde 320.000 COP/mes | Separar puesta en marcha de mantenimiento |
| [Help Soluciones: servidores en Bogotá](https://www.helpsoluciones.com.co/blog/servidores-empresas-bogota-instalacion-mantenimiento) | 350.000–900.000 COP/mes para 1–2 servidores con atención empresarial | Comparar el coste de operación central; no trasladar su SLA a nuestro servicio |
| [Ramos Labs: servicio técnico](https://ramoslabs.com/servicio/) | Hogar desde 47.900 COP/mes por equipo; servidor desde 476.000 COP/mes | Distinguir soporte doméstico y empresarial y acotar inclusiones |
| [Sigma: Beelink S12 N100](https://sigmatiendas.com/es-co/products/mini-pc-beelink-s12-16-gb-ram-500-gb-ssd-con-intel-n100) | 1.504.000 COP; 16 GB RAM y SSD 500 GB en la página consultada | Candidato para automatización y servicios ligeros, sujeto a prueba de carga |
| [PS Shop: servidores](https://www.ps-shop.com.co/Categoria-Producto/servidores-y-almacenamiento/servidores-de-rack/) | PowerEdge T150 anunciado en 10.113.599 COP | Referencia de hardware empresarial; confirmar variante, impuestos y disponibilidad |
| [Tauret: RTX 5060 Ti 16 GB](https://tauretcomputadores.com/product/tarjeta-de-video-msi-geforce-rtx-5060-ti-ventus-2x-oc-plus-gddr7-16gb) | Referencia de GPU con 16 GB VRAM | Estudiar un nodo GPU compatible; no prometer que cabe o funciona en cualquier servidor |

Las ofertas de terceros son referencias publicadas, no cotizaciones recibidas. Sus alcances difieren y se deben reconfirmar antes de comprar. La elección técnica también usa [Home Assistant hardware](https://www.home-assistant.io/hardware/) y [Home Assistant Green](https://www.home-assistant.io/green/): un controlador de automatización no sustituye automáticamente un servidor de IA intensiva.

## Propuesta sugerida

| Concepto | Base sugerida | Motivo |
| --- | --- | --- |
| Puesta en marcha de servidor propio | 450.000 COP por servidor | Punto de partida de mercado; alcance doméstico sencillo |
| Gestión inicial en nube | 350.000 COP por proyecto | Configuración del software; infraestructura cloud aparte |
| Habilitación de vivienda en rack compartido | 90.000 COP por vivienda | Cuenta, permisos, separación y comprobaciones por unidad |
| Segmentación y configuración inicial de rack | 900.000 COP por proyecto | Trabajo central separado del alta de cada vivienda |
| Punto de cámara/sensor/luz conectado a tomas existentes | 75.000 COP | Regla de cálculo por punto adaptada de Smarthome; requiere revisar tiempo/materiales |
| Punto de instalación eléctrica integrada | 110.000 COP | Base heredada de la calculadora de Smarthome; trabajo eléctrico y materiales se validan en visita |
| Soporte remoto doméstico con servidor propio | 89.000 COP/servidor/mes | Alcance acotado: revisar funcionamiento, actualizaciones y optimización, sin visitas ilimitadas |
| Administración cloud | 129.000 COP/mes | Administración adicional; hosting y consumos externos aparte |
| Operación central compartida | 350.000 COP/servidor/mes + 49.000 COP/vivienda/mes | Separar coste central y atención por propietario; economías de escala sin mezclar datos |

El importe anual es **12 mensualidades**. No se supuso descuento ni permanencia. La instalación del servidor no se cobra nuevamente como punto IoT. Hardware, UPS, discos, red, cableado, obra civil, desplazamientos, repuestos, hosting y APIs no están incluidos en esos importes.

## Ejemplos de planeación

- Casa, un servidor, ocho puntos en tomas existentes: 1.050.000 COP de servicios iniciales, equipos aparte; soporte 89.000 COP/mes o 1.068.000 COP/año.
- Nube, ocho puntos: 950.000 COP de servicios iniciales; administración 129.000 COP/mes o 1.548.000 COP/año, más infraestructura cloud.
- Edificio, 50 viviendas, un servidor y sin puntos IoT incluidos: 5.850.000 COP de servicios iniciales; 2.800.000 COP/mes central + viviendas, equivalente a 56.000 COP por vivienda si se reparte entre las 50. No implica que un servidor soporte esa carga: CPU/GPU, video, voz, almacenamiento y concurrencia deben medirse.

La mensualidad cubre el alcance de mantenimiento contratado. Funcionalidades nuevas, ampliaciones e integraciones nuevas se cotizan aparte. Visitas, horarios y tiempos de respuesta deben figurar en un contrato; no se prometieron soporte ilimitado, disponibilidad absoluta ni servicio 24/7.

El simulador, el formulario y el estimador viven en el mismo e-commerce. La solicitud llega al panel con respuestas/perfil/diseño y el asesor puede corregirla. Los combos activos se mantienen; se recomienda personalización por necesidad técnica, no por preferencia comercial automática.
