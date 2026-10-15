import { applyAction, createDevice, parseConfiguration, ROOMS, triggerSensor, type Configuration, type DeviceKind, type Scenario } from './domain';

export function showcaseConfiguration(scenario: Scenario): Configuration {
  const rooms = ROOMS[scenario];
  const devices: Configuration['devices'] = [];
  const put = (kind: DeviceKind, room: string, x: number, z: number, y?: number, rotation = 0) => {
    const device = createDevice(kind, rooms.find(r => r.id === room)!, { x, z });
    device.id = `${scenario}:${kind}:${room}:${devices.length}`;
    device.rotation = rotation;
    if (y !== undefined) device.y = y;
    device.on = !['light', 'television'].includes(kind);
    devices.push(device);
    return device;
  };
  for (const r of rooms.filter(r => !r.outdoor && r.use !== 'closet' && r.id !== 'entrada')) {
    const light = put('light', r.id, r.x, r.z, 2.25);
    light.on = ['sala', 'pasillo'].includes(r.id);
  }
  const sala = rooms.find(r => r.id === 'sala')!;
  const cocina = rooms.find(r => r.id === 'cocina')!;
  put('television', 'sala', sala.x - sala.w * .39, sala.z, 1.4, 90);
  put('microphone', 'sala', sala.x, sala.z - sala.d * .34, 2.55);
  put('speaker', 'sala', sala.x - sala.w * .4, sala.z - sala.d * .3, 2.35);
  put('microphone', 'cocina', cocina.x, cocina.z - cocina.d * .4, 2.55);
  put('speaker', 'cocina', cocina.x + cocina.w * .4, cocina.z, 2.4);
  put('touchscreen', 'pasillo', .55, 1.4, 1.5, 270);
  put('server', 'pasillo', -.5, -.5, .67, 90);
  put('network', 'pasillo', -.5, -.5, 1.1, 90);
  put('ip-camera', 'sala', sala.x + sala.w * .42, sala.z + sala.d * .42, 2.65, 215);
  const entrance = scenario === 'casa' ? 'jardin' : 'entrada';
  const front = rooms.find(r => r.id === entrance)!;
  const camera = put('ip-camera', entrance, front.x + Math.min(front.w * .35, 2), front.z - front.d * .42, 2.65, 0);
  camera.name = 'Cámara del acceso';
  const sensor = put('motion', entrance, front.x, front.z, 2.25);
  const gardenLight = put('light', entrance, front.x + Math.min(front.w * .32, 1), front.z + front.d * .25, front.outdoor ? .6 : 2.25);
  if (scenario === 'casa') {
    put('ip-camera', 'patio', -4.5, -6.5, 2.65, 180).name = 'Cámara del patio';
    put('light', 'patio', 1, -9, 2.2);
  }
  return { version: 1, scenario, infrastructure: 'local', unit: 'Mi hogar', devices, rules: [{ id: `${scenario}:acceso`, sourceId: sensor.id, targetId: gardenLight.id, enabled: true }] };
}

export function loadShowcase(scenario: Scenario): Configuration {
  const initial = showcaseConfiguration(scenario);
  try {
    const saved = JSON.parse(localStorage.getItem(`instalacam:showcase:v2:${scenario}`) || 'null');
    if (saved?.scenario !== scenario) return initial;
    const parsed = parseConfiguration(saved);
    // La distribución estratégica permanece fija; solo se recuperan los estados.
    return { ...initial, devices: initial.devices.map(d => ({ ...d, on: parsed.devices.find(s => s.id === d.id)?.on ?? d.on })) };
  } catch { return initial; }
}

export function homePreset(config: Configuration, preset: 'welcome' | 'cinema' | 'night' | 'off'): Configuration {
  const ids = config.devices.filter(d => ['light', 'television'].includes(d.kind)).map(d => d.id);
  let next = applyAction(config, { ids, on: false });
  const selected = next.devices.filter(d =>
    preset === 'welcome' ? d.kind === 'light' && ['sala', 'cocina', 'pasillo'].includes(d.room) :
    preset === 'cinema' ? d.kind === 'television' || d.kind === 'light' && d.room === 'pasillo' :
    preset === 'night' ? d.kind === 'light' && ['pasillo', 'jardin', 'entrada'].includes(d.room) : false,
  );
  next = applyAction(next, { ids: selected.map(d => d.id), on: true });
  return next;
}

export function demonstrateMotion(config: Configuration): Configuration {
  const source = config.devices.find(d => d.kind === 'motion');
  return source ? triggerSensor(config, source.id) : config;
}

export const pointDescriptions: Partial<Record<DeviceKind, string>> = {
  'ip-camera': 'Observa accesos y zonas comunes. La propuesta evita cámaras en baños y habitaciones.',
  microphone: 'Permite hablar con el hogar desde las zonas comunes. Su integración puede procesar la voz en un servidor local.',
  speaker: 'Comunica respuestas y avisos en las zonas comunes, sin tener que mirar el teléfono.',
  touchscreen: 'Un punto de control del hogar: iluminación, TV, información de la vivienda y una bienvenida personalizada.',
  server: 'El servidor local coordina las reglas y puede alojar IA, reconocimiento de voz y análisis visual. Estos servicios requieren una instalación real; el escenario muestra su ubicación y su función.',
  network: 'Conecta los puntos de control y el servidor. La red se dimensiona según el inmueble.',
  motion: 'Un evento de movimiento puede activar iluminación y avisos. Aquí el evento es simulado.',
  light: 'Iluminación conectada: el cambio de estado se refleja en el material de la lámpara y en la luz real del escenario.',
  television: 'El televisor responde a las escenas del hogar y a órdenes de encendido y apagado.',
};
