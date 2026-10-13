import { lazy, Suspense, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, randomId } from '../../api/client';
import {
  applyAction,
  canPlace,
  createDevice,
  DEVICE_TYPES,
  installationSummary,
  interpretCommand,
  loadConfiguration,
  parseConfiguration,
  ROOMS,
  roomAt,
  snap,
  triggerSensor,
  type Configuration,
  type DeviceKind,
  type Scenario,
  type VirtualDevice,
} from '../../smart-home/domain';
import type { ViewMode, ViewportHandle } from '../../smart-home/SceneViewport';
import '../../smart-home/smart-home.css';

const SceneViewport = lazy(() => import('../../smart-home/SceneViewport'));
export default function SmartHomeLab() {
  const params = useParams();
  const scenario: Scenario =
    params.scenario === 'apartamento' ? 'apartamento' : 'casa';
  return <Lab key={scenario} scenario={scenario} />;
}
function Lab({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Configuration>(() => {
    try {
      if (new URLSearchParams(location.search).has('revision')) {
        const raw = sessionStorage.getItem('instalacam:review-design');
        if (raw) {
          const design = parseConfiguration(JSON.parse(raw));
          if (design.scenario === scenario) return design;
        }
      }
    } catch {
      /* Fall back to the owner's saved design. */
    }
    return loadConfiguration(scenario);
  });
  const [view, setView] = useState<ViewMode>('isometrica'),
    [roof, setRoof] = useState(false),
    [walls, setWalls] = useState(true),
    [coverage, setCoverage] = useState(true);
  const [selected, setSelected] = useState<string>(),
    [placing, setPlacing] = useState<DeviceKind>(),
    [roomId, setRoomId] = useState('cocina');
  const [tab, setTab] = useState('equipos'),
    [message, setMessage] = useState(''),
    [saved, setSaved] = useState(true);
  const [command, setCommand] = useState(''),
    [gemini, setGemini] = useState(false),
    [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ who: string; text: string }[]>([
    {
      who: 'Motor local',
      text: 'Prueba «Enciende las luces de la cocina». Las órdenes solo cambian esta simulación.',
    },
  ]);
  const [ruleTarget, setRuleTarget] = useState('');
  const stage = useRef<ViewportHandle>(null),
    root = useRef<HTMLDivElement>(null),
    importFile = useRef<HTMLInputElement>(null);
  const rooms = ROOMS[scenario],
    selectedDevice = config.devices.find((d) => d.id === selected);
  const summary = installationSummary(config);
  const update = (
    next: Configuration | ((prev: Configuration) => Configuration),
  ) => {
    setConfig(next);
    setSaved(false);
  };
  function add(
    kind: DeviceKind,
    id: string,
    position?: { x: number; z: number },
  ) {
    if (config.devices.length >= 128) {
      setMessage('El escenario admite hasta 128 equipos.');
      return;
    }
    const room = rooms.find((r) => r.id === id)!;
    try {
      const device = createDevice(kind, room, position);
      update({ ...config, devices: [...config.devices, device] });
      setSelected(device.id);
      setPlacing(undefined);
      setMessage(`${device.name} instalado en ${room.name}.`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function changeDevice(next: VirtualDevice) {
    const room = roomAt(scenario, next.x, next.z);
    if (!room || !canPlace(next.kind, room)) {
      setMessage('El equipo debe permanecer dentro de un espacio permitido.');
      return;
    }
    update({
      ...config,
      devices: config.devices.map((d) =>
        d.id === next.id ? { ...next, room: room.id } : d,
      ),
    });
  }
  function moveRoom(id: string) {
    if (!selectedDevice) return;
    const room = rooms.find((r) => r.id === id)!;
    if (!canPlace(selectedDevice.kind, room)) {
      setMessage('Elige un espacio no íntimo para cámaras y micrófonos.');
      return;
    }
    changeDevice({
      ...selectedDevice,
      room: id,
      x: snap(room.x),
      z: snap(room.z),
    });
  }
  function save() {
    try {
      localStorage.setItem(
        `instalacam:lab:${scenario}`,
        JSON.stringify(parseConfiguration(config)),
      );
      setSaved(true);
      setMessage(
        'Configuración guardada en este navegador. También puedes exportarla.',
      );
    } catch {
      setMessage(
        'No fue posible guardar en este navegador. Usa Exportar JSON para conservar tu diseño.',
      );
    }
  }
  function restore() {
    const restored = loadConfiguration(scenario);
    setConfig(restored);
    setSelected(undefined);
    setSaved(true);
    setMessage(
      'Se restauró la última configuración guardada, o el diseño inicial si no existe una copia.',
    );
  }
  function exportJSON() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `instalacam-${scenario}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function importJSON(file?: File) {
    if (!file) return;
    try {
      if (file.size > 262144) throw new Error('El archivo supera 256 KB.');
      const imported = parseConfiguration(JSON.parse(await file.text()));
      if (imported.scenario !== scenario)
        throw new Error(
          'Este archivo pertenece al otro inmueble. Ábrelo en su escenario.',
        );
      update(imported);
      setSelected(undefined);
      setMessage('Configuración importada. Pulsa Guardar para conservarla.');
    } catch (e) {
      setMessage((e as Error).message || 'Archivo inválido.');
    }
    if (importFile.current) importFile.current.value = '';
  }
  function share() {
    try {
      sessionStorage.setItem(
        'instalacam:advisory-design',
        JSON.stringify(parseConfiguration(config)),
      );
      navigate('/asesoria');
    } catch {
      setMessage(
        'No hay almacenamiento disponible. Exporta el archivo y conserva una copia antes de solicitar asesoría.',
      );
    }
  }
  async function sendCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || busy) return;
    const text = command.trim();
    setCommand('');
    setBusy(true);
    let result = interpretCommand(text, config),
      provider = 'Motor local';
    try {
      if (!result.action && gemini) {
        const response = await api.interpretSimulation({
          message: text,
          scenario,
          devices: config.devices.map((d) => ({
            id: d.id,
            kind: d.kind,
            room: d.room,
          })),
          consent: true,
        });
        provider = response.provider;
        result = {
          reply: response.reply,
          action: response.action || undefined,
        };
      }
      if (result.action) {
        const action = result.action;
        if (
          !action.ids.every((id) => config.devices.some((d) => d.id === id)) ||
          typeof action.on !== 'boolean'
        )
          throw new Error(
            'La interpretación no corresponde a los equipos de este escenario.',
          );
        update(applyAction(config, action));
      }
      setHistory((h) => [
        ...h.slice(-19),
        { who: 'Tú', text },
        { who: provider, text: result.reply },
      ]);
    } catch (err) {
      setHistory((h) => [
        ...h.slice(-19),
        { who: 'Tú', text },
        {
          who: 'Motor local',
          text:
            (err as Error).message +
            ' Puedes seguir usando las órdenes básicas sin IA externa.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (root.current?.requestFullscreen)
      await root.current
        .requestFullscreen()
        .catch(() =>
          setMessage(
            'El laboratorio ya ocupa toda la página. Tu navegador no permite el modo de pantalla completa.',
          ),
        );
    else
      setMessage(
        'El laboratorio ocupa toda la página. Usa el modo horizontal para ampliar el espacio.',
      );
  }
  const movement = (direction: string, text: string) => (
    <button
      aria-label={text}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        stage.current?.move(direction, true);
      }}
      onPointerUp={() => stage.current?.move(direction, false)}
      onPointerCancel={() => stage.current?.move(direction, false)}
    >
      {text}
    </button>
  );
  return (
    <div className="smart-lab" ref={root}>
      <header className="lab-header">
        <div>
          <Link to="/" className="lab-brand">
            InstalaCámara <span>· Laboratorio 3D</span>
          </Link>
          <h1>
            {scenario === 'casa'
              ? 'Casa inteligente'
              : 'Apartamento inteligente'}
          </h1>
        </div>
        <div className="lab-header-actions">
          <Link
            to={`/simulador/${scenario === 'casa' ? 'apartamento' : 'casa'}`}
          >
            {scenario === 'casa' ? 'Ver apartamento' : 'Ver casa'}
          </Link>
          <button onClick={fullscreen}>Pantalla completa</button>
          <Link to="/" aria-label="Cerrar laboratorio">
            Cerrar ×
          </Link>
        </div>
      </header>
      <main className="lab-body">
        <div className="lab-world">
          <div className="lab-toolbar">
            <div role="group" aria-label="Vistas">
              {(['isometrica', 'superior', 'recorrido'] as ViewMode[]).map(
                (v) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    onClick={() => {
                      setView(v);
                      if (v === 'recorrido') {
                        setRoof(false);
                        setWalls(true);
                      }
                    }}
                  >
                    {v === 'isometrica'
                      ? 'Isométrica'
                      : v === 'superior'
                        ? 'Superior'
                        : 'Primera persona'}
                  </button>
                ),
              )}
            </div>
            <div>
              <button aria-pressed={roof} onClick={() => setRoof(!roof)}>
                {roof ? 'Ocultar techo' : 'Mostrar techo'}
              </button>
              <button aria-pressed={!walls} onClick={() => setWalls(!walls)}>
                {walls ? 'Ocultar paredes' : 'Mostrar paredes'}
              </button>
              <button onClick={() => stage.current?.doors()}>
                Abrir / cerrar puertas
              </button>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="scene-loading">Construyendo tu espacio 3D…</div>
            }
          >
            <SceneViewport
              ref={stage}
              config={config}
              selected={selected}
              placing={placing}
              view={view}
              roof={roof}
              walls={walls}
              coverage={coverage}
              onSelect={(id) => {
                setSelected(id);
                setTab('equipos');
              }}
              onPlace={(id, x, z) => placing && add(placing, id, { x, z })}
              onMove={changeDevice}
              onError={setMessage}
            />
          </Suspense>
          <div className="world-caption">
            <span>
              {placing
                ? `Toca el suelo para colocar ${DEVICE_TYPES[placing].label}`
                : view === 'recorrido'
                  ? 'Arrastra para mirar · WASD / flechas para caminar'
                  : 'Arrastra para rotar · Pellizca o usa la rueda para ampliar'}
            </span>
            <button onClick={() => stage.current?.reset()}>
              Centrar vista
            </button>
            {placing && (
              <button onClick={() => setPlacing(undefined)}>
                Cancelar colocación
              </button>
            )}
          </div>
          {view === 'recorrido' && (
            <div
              className="walk-pad"
              aria-label="Controles táctiles de recorrido"
            >
              {movement('turnLeft', 'Girar ←')}
              {movement('forward', 'Avanzar ↑')}
              {movement('turnRight', 'Girar →')}
              {movement('left', 'Izquierda')}
              {movement('back', 'Atrás ↓')}
              {movement('right', 'Derecha')}
            </div>
          )}
          <div className="room-strip" aria-label="Recorrer habitaciones">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  stage.current?.goToRoom(r.id);
                  setRoomId(r.id);
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
        <aside className="lab-panel">
          <div className="lab-tabs" role="tablist" aria-label="Herramientas">
            {[
              ['equipos', 'Equipos'],
              ['chat', 'Chat y reglas'],
              ['proyecto', 'Mi proyecto'],
            ].map(([id, title]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {title}
              </button>
            ))}
          </div>
          <div className="panel-content">
            {tab === 'equipos' && (
              <>
                <p className="panel-intro">
                  Diseña una instalación a tu medida. Los equipos y la cobertura
                  son orientativos.
                </p>
                <label className="lab-field">
                  Espacio de instalación
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="device-palette">
                  {(Object.keys(DEVICE_TYPES) as DeviceKind[]).map((kind) => (
                    <div key={kind}>
                      <button
                        onClick={() => add(kind, roomId)}
                        aria-label={`Añadir ${DEVICE_TYPES[kind].label}`}
                      >
                        <span style={{ color: DEVICE_TYPES[kind].color }}>
                          {DEVICE_TYPES[kind].short}
                        </span>
                        {DEVICE_TYPES[kind].label}
                      </button>
                      <button
                        className="place-button"
                        title="Colocar tocando el plano"
                        aria-label={`Colocar ${DEVICE_TYPES[kind].label} en el plano`}
                        onClick={() => {
                          setPlacing(kind);
                          setMessage(
                            'Toca el suelo del escenario para ubicar el equipo.',
                          );
                        }}
                      >
                        ＋
                      </button>
                    </div>
                  ))}
                </div>
                <div className="device-list">
                  <h2>
                    Equipos instalados <span>{config.devices.length}</span>
                  </h2>
                  {config.devices.map((d) => (
                    <button
                      key={d.id}
                      className={selected === d.id ? 'selected' : ''}
                      onClick={() => setSelected(d.id)}
                    >
                      <i style={{ background: d.on ? '#53dab0' : '#869299' }} />
                      {d.name}
                      <small>
                        {rooms.find((r) => r.id === d.room)?.name} ·{' '}
                        {d.on ? 'Activo' : 'Inactivo'}
                      </small>
                    </button>
                  ))}
                </div>
                {selectedDevice && (
                  <div className="device-inspector">
                    <h2>Configurar equipo</h2>
                    <label className="lab-field">
                      Nombre
                      <input
                        maxLength={100}
                        value={selectedDevice.name}
                        onChange={(e) =>
                          changeDevice({
                            ...selectedDevice,
                            name: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="lab-field">
                      Mover a
                      <select
                        value={selectedDevice.room}
                        onChange={(e) => moveRoom(e.target.value)}
                      >
                        {rooms
                          .filter((r) => canPlace(selectedDevice.kind, r))
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <p className="muted">
                      Arrastra las flechas del equipo en el escenario o ajusta
                      sus coordenadas.
                    </p>
                    <div className="coordinate-fields">
                      {(['x', 'y', 'z'] as const).map((axis) => (
                        <label key={axis}>
                          {axis.toUpperCase()} (m)
                          <input
                            type="number"
                            step="0.25"
                            min={axis === 'y' ? 0 : -14}
                            max={axis === 'y' ? 3 : 14}
                            value={selectedDevice[axis]}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (Number.isFinite(n))
                                changeDevice({ ...selectedDevice, [axis]: n });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="lab-field">
                      Rotación · {selectedDevice.rotation}°
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={selectedDevice.rotation}
                        onChange={(e) =>
                          changeDevice({
                            ...selectedDevice,
                            rotation: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    {['cctv', 'ip-camera', 'motion'].includes(
                      selectedDevice.kind,
                    ) && (
                      <>
                        <label className="lab-field">
                          Alcance orientativo · {selectedDevice.range} m
                          <input
                            type="range"
                            min="1"
                            max="15"
                            value={selectedDevice.range}
                            onChange={(e) =>
                              changeDevice({
                                ...selectedDevice,
                                range: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="lab-field">
                          Apertura orientativa · {selectedDevice.angle}°
                          <input
                            type="range"
                            min="20"
                            max="120"
                            value={selectedDevice.angle}
                            onChange={(e) =>
                              changeDevice({
                                ...selectedDevice,
                                angle: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="lab-check">
                          <input
                            type="checkbox"
                            checked={coverage}
                            onChange={(e) => setCoverage(e.target.checked)}
                          />
                          Ver cobertura aproximada
                        </label>
                        <p className="muted">
                          La visualización no calcula obstáculos, óptica real ni
                          alcance garantizado. Un asesor verificará el diseño.
                        </p>
                      </>
                    )}
                    <div className="inspector-actions">
                      <button
                        onClick={() =>
                          update(
                            applyAction(config, {
                              ids: [selectedDevice.id],
                              on: !selectedDevice.on,
                            }),
                          )
                        }
                      >
                        {selectedDevice.on ? 'Apagar' : 'Encender'}
                      </button>
                      {['motion', 'opening', 'switch', 'touchscreen'].includes(
                        selectedDevice.kind,
                      ) && (
                        <button
                          onClick={() => {
                            update(triggerSensor(config, selectedDevice.id));
                            setMessage(
                              'Evento virtual enviado al motor de reglas.',
                            );
                          }}
                        >
                          Simular evento
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() => {
                          update({
                            ...config,
                            devices: config.devices.filter(
                              (d) => d.id !== selected,
                            ),
                            rules: config.rules.filter(
                              (r) =>
                                r.sourceId !== selected &&
                                r.targetId !== selected,
                            ),
                          });
                          setSelected(undefined);
                        }}
                      >
                        Retirar equipo
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {tab === 'chat' && (
              <>
                <h2>Prueba tu hogar</h2>
                <p className="panel-intro">
                  El motor propio ejecuta órdenes básicas sin conexión ni IA
                  externa.
                </p>
                <div className="chat-history" aria-live="polite">
                  {history.map((h, i) => (
                    <div key={i} className={h.who === 'Tú' ? 'human' : ''}>
                      <strong>{h.who}</strong>
                      <p>{h.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendCommand}>
                  <label className="lab-field">
                    Orden de texto
                    <input
                      value={command}
                      maxLength={400}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="Enciende las luces de la cocina"
                    />
                  </label>
                  <button
                    className="lab-primary"
                    disabled={busy || !command.trim()}
                  >
                    {busy ? 'Interpretando…' : 'Probar orden'}
                  </button>
                </form>
                <label className="lab-check">
                  <input
                    type="checkbox"
                    checked={gemini}
                    onChange={(e) => setGemini(e.target.checked)}
                  />
                  Usar Gemini para órdenes no reconocidas
                </label>
                <p className="muted">
                  Al activarlo autorizas enviar esa orden y los tipos de equipos
                  virtuales a Google. Requiere una clave configurada en el
                  servidor; no envía tus datos de contacto.
                </p>
                <h2 className="mt-6">Automatizaciones propias</h2>
                <p className="muted">
                  Selecciona un sensor, interruptor o panel en Equipos y
                  asócialo con un dispositivo.
                </p>
                {selectedDevice &&
                  ['motion', 'opening', 'switch', 'touchscreen'].includes(
                    selectedDevice.kind,
                  ) && (
                    <div>
                      <label className="lab-field">
                        Cuando se active {selectedDevice.name}
                        <select
                          value={ruleTarget}
                          onChange={(e) => setRuleTarget(e.target.value)}
                        >
                          <option value="">Elige el equipo a encender</option>
                          {config.devices
                            .filter((d) => d.id !== selected)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ·{' '}
                                {rooms.find((r) => r.id === d.room)?.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button
                        disabled={!ruleTarget}
                        onClick={() => {
                          if (
                            config.rules.length < 128 &&
                            !config.rules.some(
                              (r) =>
                                r.sourceId === selected &&
                                r.targetId === ruleTarget,
                            )
                          )
                            update({
                              ...config,
                              rules: [
                                ...config.rules,
                                {
                                  id: randomId(),
                                  sourceId: selected!,
                                  targetId: ruleTarget,
                                  enabled: true,
                                },
                              ],
                            });
                          setRuleTarget('');
                        }}
                      >
                        Crear regla
                      </button>
                    </div>
                  )}
                {config.rules.map((r) => (
                  <div className="rule-row" key={r.id}>
                    <label className="lab-check">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) =>
                          update({
                            ...config,
                            rules: config.rules.map((rule) =>
                              rule.id === r.id
                                ? { ...rule, enabled: e.target.checked }
                                : rule,
                            ),
                          })
                        }
                      />
                      {config.devices.find((d) => d.id === r.sourceId)?.name} →{' '}
                      {config.devices.find((d) => d.id === r.targetId)?.name}
                    </label>
                    <button
                      aria-label="Eliminar regla"
                      onClick={() =>
                        update({
                          ...config,
                          rules: config.rules.filter(
                            (rule) => rule.id !== r.id,
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
            {tab === 'proyecto' && (
              <>
                <h2>Una solución para tu inmueble</h2>
                <p className="panel-intro">
                  {summary.cameras} cámaras · {summary.devices} equipos ·{' '}
                  {summary.points} puntos de instalación orientativos.
                </p>
                <label className="lab-field">
                  Modalidad de infraestructura
                  <select
                    value={config.infrastructure}
                    onChange={(e) =>
                      update({
                        ...config,
                        infrastructure: e.target
                          .value as Configuration['infrastructure'],
                      })
                    }
                  >
                    <option value="local">
                      Servidor propio en la vivienda
                    </option>
                    <option value="cloud">Administración en la nube</option>
                    <option value="shared">Rack compartido del edificio</option>
                  </select>
                </label>
                <label className="lab-field">
                  Identificador de vivienda (sin datos personales)
                  <input
                    maxLength={80}
                    value={config.unit}
                    onChange={(e) =>
                      update({ ...config, unit: e.target.value })
                    }
                  />
                </label>
                <div className="project-note">
                  {config.infrastructure === 'shared'
                    ? 'Un rack puede atender varias unidades. Cada propietario necesita credenciales, redes y almacenamiento independientes. La capacidad se dimensiona tras una prueba de carga.'
                    : config.infrastructure === 'cloud'
                      ? 'Podemos administrar la plataforma en la nube. La conectividad y los dispositivos determinan qué funciones siguen operando localmente.'
                      : 'El servidor se cotiza por separado de su instalación, puesta en marcha y servicio de soporte. Puedes adquirirlo con nosotros o aportar hardware compatible.'}
                </div>
                <p className="muted">
                  Mantenimiento mensual o anual: cuidado, actualizaciones y
                  optimización del alcance contratado. Las funcionalidades
                  nuevas se cotizan aparte. Este laboratorio no crea cuentas ni
                  conecta equipos físicos.
                </p>
                <div className="project-actions">
                  <button onClick={save}>
                    {saved ? 'Guardar configuración' : 'Guardar cambios'}
                  </button>
                  <button onClick={restore}>Restaurar guardado</button>
                  <button onClick={exportJSON}>Exportar JSON</button>
                  <button onClick={() => importFile.current?.click()}>
                    Importar JSON
                  </button>
                  <input
                    hidden
                    ref={importFile}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => importJSON(e.target.files?.[0])}
                  />
                </div>
                <button className="lab-primary" onClick={share}>
                  Solicitar asesoría con este diseño
                </button>
                <Link to="/servicios" className="lab-services">
                  Explorar servicios y modalidades →
                </Link>
              </>
            )}
          </div>
          <div className="lab-status" role="status">
            {message ||
              (saved
                ? 'Diseño virtual · Sin control de hardware real'
                : 'Hay cambios sin guardar')}
          </div>
        </aside>
      </main>
    </div>
  );
}
