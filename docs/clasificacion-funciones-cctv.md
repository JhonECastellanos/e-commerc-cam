# Modalidades y funciones del catálogo

Verificación: 14 octubre 2026. La API, precios, identificadores, fotografías y
registros administrativos permanecen intactos. La clasificación vive en el frontend;
solo agrupa equipos activos devueltos por la API. No crea servidores ni productos.

Cada modalidad tiene ramas únicas de funciones y filtros compartidos con el catálogo:
cableado, inalámbrico, híbrido y Solar / PoE. El mismo equipo puede aparecer en
cableado e híbrido como componente sujeto a integración compatible. Esto no le
atribuye Wi-Fi. No hay modelos Wi-Fi o solares inequívocamente identificados en
las fichas actuales: se ofrece asesoría sin presentar equipos inexistentes.

- PTZ significa giro y zoom motorizados; una lente varifocal motorizada no implica PTZ.
- Detección de eventos es distinta del movimiento físico. Los DVR AcuSense pueden
  aportar análisis al sistema: no lo convierte en una función nativa de toda cámara.
- Smart Hybrid Light combina iluminación IR/blanca, no conexiones cable/Wi-Fi.
- PoC por coaxial no es PoE por Ethernet. Solar y PoE son subramas distintas.
- Micrófono no implica altavoz. Entradas/salidas de alarma no implican sirena integrada.
- DVR/codificador es infraestructura de vídeo; servidor de IA es otro servicio a cotizar.

## Fuentes oficiales consultadas

| Familia | Ficha oficial | Resultado usado en presentación |
|---|---|---|
| B120HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109379/IPC-B120HAA-LU_Datasheet_20260602.pdf) | Ethernet/PoE, micrófono, movimiento 3.0; altavoz NA |
| B140HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/m000186010/IPC-B140HAA-LU_Datasheet_20260602.pdf) | Ethernet/PoE, micrófono y movimiento; no prometer Live Guard universal |
| B420HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109397/IPC-B420HAA-LU_Datasheet_20260514.pdf) | PoE, micrófono, movimiento; altavoz NA en LU(F) |
| B520HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109410/IPC-B520HAA-LU_Datasheet_20260514.pdf) | PoE, micrófono, movimiento; altavoz NA en LU(F) |
| B440HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109452/IPC-B440HAA-LU_Datasheet_20260514.pdf) | PoE, micrófono, movimiento; altavoz NA en LU |
| B540HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109462/IPC-B540HAA-LU_Datasheet_20260514.pdf) | PoE, micrófono, movimiento; altavoz NA en LU(F) |
| B620HAA | [LZU](https://assets.hikvision.com/prd/normal/all/doc/sm000109421/IPC-B620HAA-LZU_Datasheet_20260819.pdf) | PoE, micrófono, movimiento, 1 entrada/1 salida de alarma; sin altavoz integrado confirmado |
| B640HAA | [LZU](https://assets.hikvision.com/prd/normal/all/doc/sm000109471/IPC-B640HAA-LZU_Datasheet_20260518.pdf) | PoE, micrófono, movimiento, interfaz de alarma |
| D140HAA | [LU/SX](https://assets.hikvision.com/prd/normal/all/doc/sm000113502/IPC-D140HAA-LU_SX_Datasheet_20260603.pdf) | PoE/movimiento; audio bidireccional y luces Live Guard SOLO variante SX |
| T240HAA | [LUF/SX](https://assets.hikvision.com/prd/normal/all/doc/sm000113523/IPC-T240HAA-LUF_SXBLACK_Datasheet_20260703.pdf) | PoE/movimiento; audio bidireccional y luces SOLO SX; SD según F |
| T220HAA | [LU](https://assets.hikvision.com/prd/normal/all/doc/sm000109391/IPC-T220HAA-LU_Datasheet_20260601.pdf) | PoE, micrófono y movimiento; altavoz NA |
| DS-2AE5225ITG | [PTZ](https://assets.hikvision.com/prd/normal/all/doc/m000175265/DS-2AE5225ITG_Datasheet_20250820.pdf) | Giro/inclinación y zoom óptico 25x, diferente de detección de eventos |
| DS-2CE10KF0T-LFS | [TurboHD](https://assets.hikvision.com/prd/public/all/doc/m000104684/DS-2CE10KF0T-LFS_Datasheet_20250304.pdf) | Micrófono coaxial, iluminación híbrida; no Wi-Fi |
| HWD-7104MH-G4 | [DVR](https://www.hikvision.com/content/dam/hikvision/products/S000000001/S000000132/S000000133/S000000822/OFR000394/M000125975/Data_Sheet/Datasheet-of-HWD-7104MH-G4_V4.71.000_20230621.pdf) | Entradas analógicas e IP según capacidad; grabación/integración híbrida |

Las fichas oficiales contradicen la generalización de audio bidireccional, SD y
sirena en el Excel. Se conserva el original, pero la presentación limita esas
afirmaciones y exige variante exacta. D120HAA, D620HAA y D640HAA conservan su
tipo/conexión declarados; la descarga oficial no fue verificable (404/403/lectura
incompleta), por lo que no se añaden PoE, sirena o audio bidireccional por inferencia.
Los dos DVR sin modelo conservan su clasificación de grabación, sin especificaciones nuevas.

## Casa inteligente

Software propio coordina IoT; una integración local con modelos/servicios debe
implementarse y validarse al instalar. El navegador sigue siendo una demostración.
La propuesta contempla soporte mensual/anual o técnico bajo demanda; equipo y
puesta en marcha aparte. Modelos externos opcionales requieren API/licencia
compatible y límites/consumos acordados: una suscripción de chat no se presenta
como acceso automático a una API. No se publican cuotas de tokens ni precios nuevos.
