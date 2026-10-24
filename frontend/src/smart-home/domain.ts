import { randomId } from '../api/client';

export type Scenario = 'casa' | 'apartamento';
export type DeviceKind =
  | 'cctv'
  | 'ip-camera'
  | 'motion'
  | 'opening'
  | 'microphone'
  | 'speaker'
  | 'touchscreen'
  | 'switch'
  | 'outlet'
  | 'light'
  | 'server'
  | 'network'
  | 'rack';
export type Room = {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
  use: string;
  outdoor?: boolean;
  private?: boolean;
};
export type VirtualDevice = {
  id: string;
  kind: DeviceKind;
  name: string;
  room: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  on: boolean;
  range: number;
  angle: number;
};
export type AutomationRule = {
  id: string;
  sourceId: string;
  targetId: string;
  enabled: boolean;
};
export type Configuration = {
  version: 1;
  scenario: Scenario;
  devices: VirtualDevice[];
  rules: AutomationRule[];
  infrastructure: 'local' | 'cloud' | 'shared';
  unit: string;
};
export type SimulationAction = { ids: string[]; on: boolean };

export const DEVICE_TYPES: Record<
  DeviceKind,
  {
    label: string;
    short: string;
    color: string;
    height: number;
    installationPoints: number;
  }
> = {
  cctv: {
    label: 'Cámara CCTV',
    short: 'CCTV',
    color: '#19bdd1',
    height: 2.5,
    installationPoints: 1,
  },
  'ip-camera': {
    label: 'Cámara IP',
    short: 'IP',
    color: '#37d2a9',
    height: 2.5,
    installationPoints: 1,
  },
  motion: {
    label: 'Sensor de movimiento',
    short: 'MOV',
    color: '#fca54c',
    height: 2.1,
    installationPoints: 1,
  },
  opening: {
    label: 'Sensor de apertura',
    short: 'AP',
    color: '#ffbf70',
    height: 2,
    installationPoints: 1,
  },
  microphone: {
    label: 'Micrófono',
    short: 'MIC',
    color: '#b09aff',
    height: 1.4,
    installationPoints: 1,
  },
  speaker: {
    label: 'Altavoz',
    short: 'AUD',
    color: '#9882f2',
    height: 1.4,
    installationPoints: 1,
  },
  touchscreen: {
    label: 'Pantalla táctil',
    short: 'PANEL',
    color: '#6fb1ff',
    height: 1.5,
    installationPoints: 1,
  },
  switch: {
    label: 'Interruptor inteligente',
    short: 'INT',
    color: '#e0c45f',
    height: 1.2,
    installationPoints: 1,
  },
  outlet: {
    label: 'Tomacorriente inteligente',
    short: 'TOMA',
    color: '#debd55',
    height: 0.4,
    installationPoints: 1,
  },
  light: {
    label: 'Luz inteligente',
    short: 'LUZ',
    color: '#ffe199',
    height: 2.5,
    installationPoints: 1,
  },
  server: {
    label: 'Servidor local',
    short: 'IA',
    color: '#69a9fc',
    height: 0.45,
    installationPoints: 0,
  },
  network: {
    label: 'Equipo de red',
    short: 'RED',
    color: '#70ccee',
    height: 0.45,
    installationPoints: 0,
  },
  rack: {
    label: 'Rack de infraestructura',
    short: 'RACK',
    color: '#8bb1cb',
    height: 0,
    installationPoints: 0,
  },
};

const interior = (
  id: string,
  name: string,
  x: number,
  z: number,
  w: number,
  d: number,
  use: string,
  color = '#d5c8b7',
  privateRoom = false,
): Room => ({ id, name, x, z, w, d, use, color, private: privateRoom });
export const ROOMS: Record<Scenario, Room[]> = {
  casa: [
    interior('sala', 'Sala', -3.6, 3.5, 5.8, 5, 'living'),
    interior('cocina', 'Cocina', 3.6, 3.5, 5.8, 5, 'kitchen', '#cbd9d5'),
    interior('pasillo', 'Pasillo', 0, 0, 1.4, 12, 'hall', '#c8bca9'),
    interior(
      'habitacion1',
      'Habitación principal',
      -3.6,
      -2.5,
      5.8,
      7,
      'bedroom',
    ),
    interior(
      'habitacion2',
      'Habitación 2',
      3.6,
      -0.5,
      5.8,
      3,
      'bedroom',
      '#cec8c1',
    ),
    interior(
      'bano',
      'Baño principal',
      2.1,
      -4,
      2.8,
      4,
      'bathroom',
      '#e1ded4',
      true,
    ),
    interior('bano2', 'Baño social', 5, -4, 3, 4, 'bathroom', '#d8ddd4', true),
    {
      id: 'jardin',
      name: 'Jardín delantero',
      x: 0,
      z: 9,
      w: 13,
      d: 6,
      use: 'garden',
      color: '#6c9374',
      outdoor: true,
    },
    {
      id: 'patio',
      name: 'Patio trasero',
      x: 0,
      z: -9,
      w: 13,
      d: 6,
      use: 'patio',
      color: '#aba595',
      outdoor: true,
    },
  ],
  apartamento: [
    interior('sala', 'Sala', -4, 3.25, 5.6, 5.1, 'living'),
    interior('cocina', 'Cocina', 3.6, 3.9, 6, 3.8, 'kitchen', '#cbd9d5'),
    interior('pasillo', 'Pasillo', -0.3, 0, 1.8, 11.6, 'hall', '#c8bca9'),
    interior(
      'habitacion1',
      'Habitación principal',
      -4,
      -3.2,
      5.6,
      5.2,
      'bedroom',
    ),
    interior(
      'habitacion2',
      'Habitación 2',
      1.85,
      -3.6,
      2.5,
      4.4,
      'bedroom',
      '#cec8c1',
    ),
    interior(
      'habitacion3',
      'Habitación 3',
      4.85,
      -3.6,
      3.5,
      4.4,
      'bedroom',
      '#d7cabe',
    ),
    interior('estudio', 'Estudio', 4.85, 0.3, 3.5, 3.4, 'study', '#d1cdc1'),
    interior('bano', 'Baño', 1.85, -0.4, 2.5, 2, 'bathroom', '#e1ded4', true),
    interior('closet', 'Clóset', -4, 0.05, 5.6, 1.3, 'closet', '#b8a795', true),
    interior('entrada', 'Acceso', 1.85, 1.3, 2.5, 1.4, 'hall', '#c8bca9'),
  ],
};

export function roomAt(
  scenario: Scenario,
  x: number,
  z: number,
): Room | undefined {
  return ROOMS[scenario].find(
    (r) =>
      x >= r.x - r.w / 2 &&
      x <= r.x + r.w / 2 &&
      z >= r.z - r.d / 2 &&
      z <= r.z + r.d / 2,
  );
}
export function canPlace(kind: DeviceKind, room: Room): boolean {
  return !(room.private && ['cctv', 'ip-camera', 'microphone'].includes(kind));
}
export const snap = (n: number) => Math.round(n * 4) / 4;

export function createDevice(
  kind: DeviceKind,
  room: Room,
  position?: { x: number; z: number },
): VirtualDevice {
  if (!canPlace(kind, room))
    throw new Error(
      'Cámaras y micrófonos se reservan para espacios no íntimos. Elige otra habitación.',
    );
  return {
    id: randomId(),
    kind,
    name: DEVICE_TYPES[kind].label,
    room: room.id,
    x: snap(position?.x ?? room.x),
    y: DEVICE_TYPES[kind].height,
    z: snap(position?.z ?? room.z),
    rotation: 0,
    on: false,
    range: 5,
    angle: 80,
  };
}

export function initialConfiguration(scenario: Scenario): Configuration {
  const getRoom = (id: string) => ROOMS[scenario].find((r) => r.id === id)!;
  const light = createDevice('light', getRoom('cocina'));
  const sensor = createDevice('motion', getRoom('cocina'), {
    x: getRoom('cocina').x - 0.6,
    z: getRoom('cocina').z,
  });
  return {
    version: 1,
    scenario,
    infrastructure: 'local',
    unit: 'Mi vivienda',
    devices: [
      light,
      createDevice('light', getRoom('sala')),
      sensor,
      createDevice(
        'ip-camera',
        getRoom(scenario === 'casa' ? 'jardin' : 'entrada'),
      ),
    ],
    rules: [
      {
        id: randomId(),
        sourceId: sensor.id,
        targetId: light.id,
        enabled: true,
      },
    ],
  };
}

// No eval, no external device URLs: the deterministic engine changes only virtual state.
export function applyAction(
  config: Configuration,
  action: SimulationAction,
): Configuration {
  const allowed = new Set(action.ids);
  return {
    ...config,
    devices: config.devices.map((d) =>
      allowed.has(d.id) ? { ...d, on: action.on } : d,
    ),
  };
}
export function triggerSensor(
  config: Configuration,
  sourceId: string,
): Configuration {
  const source = config.devices.find((d) => d.id === sourceId);
  if (
    !source ||
    !['motion', 'opening', 'switch', 'touchscreen'].includes(source.kind)
  )
    return config;
  const targets = config.rules
    .filter((r) => r.enabled && r.sourceId === sourceId)
    .map((r) => r.targetId);
  return applyAction(applyAction(config, { ids: [sourceId], on: true }), {
    ids: targets,
    on: true,
  });
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function interpretCommand(
  text: string,
  config: Configuration,
): { action?: SimulationAction; reply: string } {
  const command = normalize(text.trim());
  const off = /\b(apaga|apagar|desactiva|desactivar|off)\b/.test(command);
  const on = /\b(enciende|encender|activa|activar|prende|prender|on)\b/.test(
    command,
  );
  if (on === off)
    return {
      reply:
        'Indica una acción: «Enciende las luces de la cocina» o «Apaga las luces de la sala».',
    };
  const types: [RegExp, DeviceKind[]][] = [
    [/lu[zc]|iluminacion|bombill/, ['light']],
    [/camara|cctv/, ['cctv', 'ip-camera']],
    [/toma|enchufe/, ['outlet']],
    [/altavo[cz]|parlante/, ['speaker']],
    [/microfono/, ['microphone']],
    [/sensor/, ['motion', 'opening']],
    [/servidor/, ['server']],
    [/interruptor/, ['switch']],
    [/pantalla|panel/, ['touchscreen']],
    [/red|router/, ['network']],
  ];
  const kind = types.find(([pattern]) => pattern.test(command));
  if (!kind)
    return {
      reply:
        'Especifica qué dispositivo deseas controlar. También puedes seleccionarlo en la lista.',
    };
  const rooms = ROOMS[config.scenario].filter(
    (r) => command.includes(normalize(r.name)) || command.includes(r.id),
  );
  const targets = config.devices.filter(
    (d) =>
      kind[1].includes(d.kind) &&
      (rooms.length
        ? rooms.some((r) => r.id === d.room)
        : /\b(tod[oa]s?|vivienda|casa|apartamento)\b/.test(command)),
  );
  if (
    !rooms.length &&
    !/\b(tod[oa]s?|vivienda|casa|apartamento)\b/.test(command)
  )
    return {
      reply:
        'Indica la habitación o escribe «todas las luces» para actuar en toda la vivienda.',
    };
  if (!targets.length)
    return {
      reply:
        'No hay dispositivos de ese tipo en el espacio indicado. Instálalos primero desde Equipos.',
    };
  return {
    action: { ids: targets.map((d) => d.id), on },
    reply: `${on ? 'Encendí' : 'Apagué'} ${targets.length} dispositivo(s) virtual(es)${rooms.length ? ` en ${rooms.map((r) => r.name).join(', ')}` : ''}.`,
  };
}

export function parseConfiguration(value: unknown): Configuration {
  if (!value || typeof value !== 'object')
    throw new Error('Configuración inválida');
  const c = value as Configuration;
  if (
    c.version !== 1 ||
    !['casa', 'apartamento'].includes(c.scenario) ||
    !Array.isArray(c.devices) ||
    c.devices.length > 128 ||
    !Array.isArray(c.rules) ||
    c.rules.length > 128 ||
    !['local', 'cloud', 'shared'].includes(c.infrastructure) ||
    typeof c.unit !== 'string' ||
    c.unit.length > 80
  )
    throw new Error('Formato o versión de configuración inválido');
  const ids = new Set<string>();
  for (const d of c.devices) {
    if (!d) throw new Error('Dispositivo inválido');
    const room = roomAt(c.scenario, d.x, d.z);
    if (
      !DEVICE_TYPES[d.kind] ||
      typeof d.id !== 'string' ||
      !d.id ||
      d.id.length > 100 ||
      ids.has(d.id) ||
      typeof d.name !== 'string' ||
      !d.name.trim() ||
      d.name.length > 100 ||
      ![d.x, d.y, d.z, d.rotation, d.range, d.angle].every(Number.isFinite) ||
      d.y < 0 ||
      d.y > 3 ||
      d.rotation < 0 ||
      d.rotation > 360 ||
      d.range < 1 ||
      d.range > 15 ||
      d.angle < 20 ||
      d.angle > 120 ||
      typeof d.on !== 'boolean' ||
      !room ||
      room.id !== d.room ||
      !canPlace(d.kind, room)
    )
      throw new Error('Dispositivo o ubicación inválidos');
    ids.add(d.id);
  }
  for (const r of c.rules) {
    if (
      typeof r.id !== 'string' ||
      typeof r.enabled !== 'boolean' ||
      !ids.has(r.sourceId) ||
      !ids.has(r.targetId) ||
      !['motion', 'opening', 'switch', 'touchscreen'].includes(
        c.devices.find((d) => d.id === r.sourceId)!.kind,
      )
    )
      throw new Error('Automatización inválida');
  }
  // Copy only the documented schema; discard unexpected data and imported secrets.
  return {
    version: 1,
    scenario: c.scenario,
    infrastructure: c.infrastructure,
    unit: c.unit,
    devices: c.devices.map((d) => ({
      id: d.id,
      kind: d.kind,
      name: d.name,
      room: d.room,
      x: d.x,
      y: d.y,
      z: d.z,
      rotation: d.rotation,
      on: d.on,
      range: d.range,
      angle: d.angle,
    })),
    rules: c.rules.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      enabled: r.enabled,
    })),
  };
}

export function loadConfiguration(scenario: Scenario): Configuration {
  try {
    const value = localStorage.getItem(`instalacam:lab:${scenario}`);
    if (value) {
      const c = parseConfiguration(JSON.parse(value));
      if (c.scenario === scenario) return c;
    }
  } catch {
    /* Storage unavailable or old file: preserve a working lab. */
  }
  return initialConfiguration(scenario);
}
export function installationSummary(config: Configuration) {
  return {
    points: config.devices.reduce(
      (sum, d) => sum + DEVICE_TYPES[d.kind].installationPoints,
      0,
    ),
    cameras: config.devices.filter((d) =>
      ['cctv', 'ip-camera'].includes(d.kind),
    ).length,
    devices: config.devices.length,
    infrastructure: config.infrastructure,
    rooms: [...new Set(config.devices.map((d) => d.room))],
  };
}
