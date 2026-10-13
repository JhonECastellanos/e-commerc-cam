import * as THREE from 'three';
import {
  DEVICE_TYPES,
  ROOMS,
  type Scenario,
  type Room,
  type VirtualDevice,
} from './domain';

export type PropertyModel = {
  group: THREE.Group;
  walls: THREE.Group;
  roof: THREE.Group;
  doors: THREE.Group[];
  floors: THREE.Mesh[];
  labels: THREE.Sprite[];
  obstacles: THREE.Box3[];
};
const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, roughness = 0.75) {
  const key = color + roughness;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: roughness < 0.4 ? 0.25 : 0,
      }),
    );
  return materials.get(key)!;
}
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  roughness = 0.75,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material(color, roughness),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function label(text: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(13,34,43,.88)';
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 96, 18);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = '600 30px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    }),
  );
  sprite.scale.set(2.6, 0.49, 1);
  sprite.renderOrder = 9;
  return sprite;
}
function plant(parent: THREE.Object3D, x: number, z: number, size = 0.5) {
  cylinder(parent, x, size * 0.3, z, size * 0.3, size * 0.6, '#b27e59');
  cylinder(parent, x, size, z, size * 0.15, size * 1.1, '#745f43');
  const leaves = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size * 0.65, 1),
    material('#597a61'),
  );
  leaves.position.set(x, size * 1.6, z);
  leaves.castShadow = true;
  parent.add(leaves);
}
function furniture(group: THREE.Group, room: Room) {
  const root = new THREE.Group();
  root.position.set(room.x, 0, room.z);
  group.add(root);
  const w = room.w,
    d = room.d;
  if (room.use === 'living') {
    box(root, 0, 0.025, 0, w * 0.62, 0.04, d * 0.56, '#a8b8ad');
    box(root, -w * 0.26, 0.42, 0, 0.9, 0.7, 2.7, '#b3b9b0');
    box(root, -w * 0.33, 0.85, 0, 0.28, 0.74, 2.7, '#a3afa8');
    for (const dz of [-0.9, 0, 0.9])
      box(root, -w * 0.23, 0.81, dz, 0.68, 0.16, 0.84, '#d3d3c9');
    box(root, 0, 0.43, 0, 1.25, 0.13, 0.8, '#9b785b');
    for (const dx of [-0.5, 0.5])
      box(root, dx, 0.2, 0, 0.08, 0.4, 0.65, '#414c4c');
    box(root, w * 0.35, 0.28, 0, 0.4, 0.5, 2.4, '#8a725d');
    box(root, w * 0.39, 1.3, 0, 0.07, 1.15, 2.2, '#203d49', 0.3);
    plant(root, w * 0.32, -d * 0.31, 0.6);
    const art = box(root, 0, 1.6, -d * 0.45, 1.1, 0.7, 0.05, '#6b8d86');
    art.rotation.z = -0.04;
  } else if (room.use === 'bedroom') {
    const bedW = Math.min(1.65, w * 0.55),
      bedD = Math.min(2.15, d * 0.65);
    box(root, 0, 0.26, 0, bedW, 0.42, bedD, '#9b8067');
    box(root, 0, 0.54, 0, bedW - 0.08, 0.18, bedD - 0.05, '#f3eee1');
    box(root, 0, 0.65, 0.25, bedW - 0.07, 0.08, bedD * 0.64, '#829d94');
    box(root, 0, 0.68, -bedD * 0.35, bedW * 0.84, 0.15, 0.36, '#fff8e8');
    box(root, 0, 0.69, -bedD * 0.49, bedW + 0.1, 0.98, 0.12, '#81654c');
    box(root, bedW * 0.64, 0.31, -bedD * 0.32, 0.35, 0.58, 0.4, '#a28567');
    cylinder(root, bedW * 0.64, 0.67, -bedD * 0.32, 0.1, 0.18, '#e7d0a0');
    if (d > 3) box(root, -w * 0.34, 1, d * 0.3, 0.55, 2, 1.4, '#c7bba4');
  } else if (room.use === 'kitchen') {
    for (let i = 0; i < 4; i++) {
      box(
        root,
        -w * 0.3 + i * 0.8,
        0.48,
        -d * 0.34,
        0.78,
        0.92,
        0.68,
        '#7e9c93',
      );
      box(
        root,
        -w * 0.3 + i * 0.8,
        0.96,
        -d * 0.34,
        0.8,
        0.06,
        0.75,
        '#f0ece0',
      );
      box(
        root,
        -w * 0.3 + i * 0.8,
        1.92,
        -d * 0.4,
        0.78,
        0.68,
        0.36,
        '#e3e1d5',
      );
    }
    box(root, w * 0.35, 1.02, -d * 0.25, 0.78, 2, 0.74, '#aeb9b7', 0.25);
    box(root, -w * 0.28, 1.01, -d * 0.34, 0.48, 0.05, 0.46, '#354b53', 0.2);
    cylinder(root, 0.8, 1.03, -d * 0.34, 0.21, 0.02, '#647d83');
    box(root, 0, 0.9, 0.65, 1.85, 0.08, 0.9, '#b18b64');
    for (const dx of [-0.6, 0.6])
      for (const dz of [0.15, 1.15]) {
        box(root, dx, 0.46, dz, 0.37, 0.08, 0.37, '#657e76');
        box(root, dx, 0.22, dz, 0.07, 0.43, 0.07, '#a28766');
      }
  } else if (room.use === 'bathroom') {
    box(root, -w * 0.32, 0.55, -d * 0.2, 0.66, 0.85, 0.42, '#dddcca');
    cylinder(root, -w * 0.32, 1, -d * 0.2, 0.25, 0.1, '#f5f2e9');
    box(root, -w * 0.43, 1.6, -d * 0.2, 0.05, 0.75, 0.55, '#b8d4d3', 0.15);
    box(root, w * 0.24, 0.12, d * 0.12, 0.45, 0.2, 0.72, '#eceadf');
    cylinder(root, w * 0.24, 0.43, d * 0.12, 0.23, 0.3, '#f6f2e5');
    box(root, w * 0.24, 0.69, d * 0.35, 0.44, 0.52, 0.16, '#f1ece2');
    if (d > 2) box(root, 0, 0.1, -d * 0.36, 1.3, 0.16, 0.9, '#ece7dd');
  } else if (room.use === 'study') {
    box(root, 0, 0.78, -d * 0.28, 1.75, 0.09, 0.65, '#ae8967');
    for (const dx of [-0.72, 0.72])
      box(root, dx, 0.37, -d * 0.28, 0.1, 0.74, 0.5, '#424e51');
    box(root, 0, 1.1, -d * 0.32, 0.8, 0.48, 0.06, '#244856', 0.3);
    box(root, 0, 0.43, 0, 0.55, 0.1, 0.55, '#879d93');
    box(root, 0, 0.78, 0.22, 0.55, 0.7, 0.08, '#758d83');
    box(root, w * 0.37, 1, 0, 0.35, 2, 1.7, '#b59a7c');
  } else if (room.use === 'closet') {
    for (let i = -2; i <= 2; i++) {
      box(root, i * 0.9, 1.03, 0, 0.88, 2, 0.55, '#b39879');
      box(root, i * 0.9 + 0.28, 1, 0.3, 0.025, 0.2, 0.035, '#655944');
    }
  } else if (room.use === 'garden') {
    box(root, 0, 0.04, 0, 1.4, 0.1, d, '#d1c7b3');
    for (const dx of [-5, 5])
      for (const dz of [-1.8, 1.8]) plant(root, dx, dz, dz > 0 ? 1.1 : 0.65);
    for (let i = -6; i <= 6; i++)
      box(root, i, 0.52, d * 0.47, 0.12, 1, 0.12, '#f0eadf');
    box(root, 0, 0.65, d * 0.47, 13, 0.1, 0.12, '#eee6d7');
  } else if (room.use === 'patio') {
    box(root, 0, 0.05, 0, w * 0.7, 0.1, d * 0.8, '#b2a18b');
    cylinder(root, -2, 0.77, 0, 0.85, 0.1, '#c7ad84');
    cylinder(root, -2, 0.36, 0, 0.12, 0.7, '#a18762');
    for (const dz of [-1.1, 1.1])
      box(root, -2, 0.42, dz, 0.65, 0.1, 0.52, '#647f77');
    box(root, 3, 0.67, -1, 1.2, 0.15, 0.6, '#263e44');
    cylinder(root, 3, 0.82, -1, 0.3, 0.16, '#435a60');
    plant(root, 5, 1.4, 0.9);
    plant(root, -5, -1.4, 1.1);
  }
}

export function buildProperty(scenario: Scenario): PropertyModel {
  const group = new THREE.Group(),
    walls = new THREE.Group(),
    roof = new THREE.Group();
  group.add(walls, roof);
  const floors: THREE.Mesh[] = [],
    labels: THREE.Sprite[] = [],
    doors: THREE.Group[] = [],
    obstacles: THREE.Box3[] = [];
  const edges = new Set<string>();
  const addWall = (
    x: number,
    z: number,
    length: number,
    alongX: boolean,
    exterior: boolean,
  ) => {
    const key = `${x.toFixed(2)}:${z.toFixed(2)}:${length.toFixed(2)}:${alongX}`;
    if (edges.has(key)) return;
    edges.add(key);
    const opening = Math.min(1, length * 0.4),
      side = (length - opening) / 2;
    for (const direction of [-1, 1]) {
      const offset = direction * (opening / 2 + side / 2);
      const mesh = box(
        walls,
        x + (alongX ? offset : 0),
        1.45,
        z + (alongX ? 0 : offset),
        alongX ? side : 0.14,
        2.9,
        alongX ? 0.14 : side,
        exterior ? '#e0dbce' : '#eee8da',
      );
      obstacles.push(new THREE.Box3().setFromObject(mesh));
    }
    box(
      walls,
      x,
      2.6,
      z,
      alongX ? opening : 0.14,
      0.6,
      alongX ? 0.14 : opening,
      '#e0dbce',
    );
    if (exterior && Math.abs(x) > 1) {
      const window = box(
        walls,
        x,
        1.35,
        z,
        alongX ? opening : 0.05,
        1.5,
        alongX ? 0.05 : opening,
        '#9dc1c2',
        0.2,
      );
      obstacles.push(new THREE.Box3().setFromObject(window));
      box(
        walls,
        x,
        0.35,
        z,
        alongX ? opening : 0.14,
        0.7,
        alongX ? 0.14 : opening,
        '#d9d5c8',
      );
    } else {
      const hinge = new THREE.Group();
      hinge.position.set(
        x - (alongX ? opening / 2 : 0),
        0,
        z - (alongX ? 0 : opening / 2),
      );
      box(
        hinge,
        alongX ? opening / 2 : 0,
        1.05,
        alongX ? 0 : opening / 2,
        alongX ? opening - 0.05 : 0.07,
        2.08,
        alongX ? 0.07 : opening - 0.05,
        '#b18f6d',
      );
      hinge.userData.targetAngle = 0;
      walls.add(hinge);
      doors.push(hinge);
    }
  };
  box(
    group,
    0,
    -0.35,
    0,
    14.6,
    0.48,
    scenario === 'casa' ? 25.5 : 13.2,
    '#314950',
  );
  for (const room of ROOMS[scenario]) {
    const floor = box(
      group,
      room.x,
      -0.055,
      room.z,
      room.w,
      0.14,
      room.d,
      room.color,
    );
    floor.userData.roomId = room.id;
    floors.push(floor);
    if (!room.outdoor) {
      for (let i = 0; i < Math.floor(room.w / 0.4); i++)
        box(
          group,
          room.x - room.w / 2 + 0.2 + i * 0.4,
          0.019,
          room.z,
          0.012,
          0.002,
          room.d,
          '#b3a78f',
        );
      const x1 = room.x - room.w / 2,
        x2 = room.x + room.w / 2,
        z1 = room.z - room.d / 2,
        z2 = room.z + room.d / 2;
      const extent = scenario === 'casa' ? 6.5 : 6.6;
      addWall(room.x, z1, room.w, true, Math.abs(z1) >= 5.79);
      addWall(room.x, z2, room.w, true, Math.abs(z2) >= 5.79);
      addWall(x1, room.z, room.d, false, Math.abs(x1) >= extent - 0.05);
      addWall(x2, room.z, room.d, false, Math.abs(x2) >= extent - 0.05);
    }
    furniture(group, room);
    const text = label(room.name, '#f2f1e6');
    text.position.set(room.x, 0.65, room.z + room.d * 0.22);
    labels.push(text);
    group.add(text);
  }
  if (scenario === 'casa') {
    // Actual pitched roof with ridge and eaves; removable as one object.
    const geometry = new THREE.BufferGeometry();
    const vertices = [
      -7.1, 3, -6.4, 0, 4.7, -6.4, 0, 4.7, 6.4, -7.1, 3, -6.4, 0, 4.7, 6.4,
      -7.1, 3, 6.4, 0, 4.7, -6.4, 7.1, 3, -6.4, 7.1, 3, 6.4, 0, 4.7, -6.4, 7.1,
      3, 6.4, 0, 4.7, 6.4, -7.1, 3, 6.4, 0, 4.7, 6.4, 7.1, 3, 6.4, -7.1, 3,
      -6.4, 7.1, 3, -6.4, 0, 4.7, -6.4,
    ];
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.computeVertexNormals();
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#59716c',
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, roofMat);
    mesh.castShadow = true;
    roof.add(mesh);
    box(group, 0, 0.04, 6.45, 2.3, 0.16, 1, '#bbb29f');
    for (const x of [-6.7, 6.7])
      box(group, x, 0.4, 0, 0.2, 0.7, 12.4, '#a7b2a4');
  } else {
    box(roof, 0, 3, 0, 14.2, 0.22, 12.2, '#ddd8cb');
    for (const z of [-5.8, 5.8])
      box(walls, 0, 2.97, z, 14, 0.12, 0.16, '#8ea29a');
  }
  return { group, walls, roof, floors, labels, doors, obstacles };
}

export function buildDevice(
  device: VirtualDevice,
  illuminate = true,
): THREE.Group {
  const g = new THREE.Group();
  const color = DEVICE_TYPES[device.kind].color;
  const led = new THREE.MeshStandardMaterial({
    color: device.on ? '#64f8b5' : '#495d66',
    emissive: device.on ? '#34cc86' : '#000000',
    emissiveIntensity: device.on ? 1.3 : 0,
  });
  if (['cctv', 'ip-camera'].includes(device.kind)) {
    box(g, 0, 0, 0, 0.34, 0.25, 0.5, '#e2e8e6');
    const lens = cylinder(g, 0, 0, 0.26, 0.105, 0.025, '#152f3d');
    lens.rotation.x = Math.PI / 2;
    box(g, 0, -0.12, -0.25, 0.08, 0.08, 0.28, '#a0b7ba');
  } else if (device.kind === 'light') {
    cylinder(g, 0, 0.12, 0, 0.17, 0.08, '#677675');
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 10),
      new THREE.MeshStandardMaterial({
        color: device.on ? '#fff1b9' : '#dce0d3',
        emissive: device.on ? '#ffce62' : '#000000',
        emissiveIntensity: device.on ? 2 : 0,
      }),
    );
    g.add(glow);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 32),
      new THREE.MeshBasicMaterial({
        color: '#ffe6a1',
        transparent: true,
        opacity: device.on ? 0.3 : 0,
        depthWrite: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -device.y + 0.04;
    g.add(pool);
    // One inexpensive light per virtual bulb; capped total through the configuration limit.
    if (device.on && illuminate) {
      const light = new THREE.PointLight('#ffdc99', 3, 5, 2);
      light.position.y = -0.15;
      g.add(light);
    }
  } else if (device.kind === 'rack') {
    box(g, 0, 1.05, 0, 0.7, 2.1, 0.85, '#293e48');
    for (let i = 0; i < 7; i++) {
      box(g, 0, 0.25 + i * 0.24, 0.45, 0.58, 0.19, 0.02, '#4f626d');
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), led);
      dot.position.set(0.22, 0.25 + i * 0.24, 0.48);
      g.add(dot);
    }
  } else if (device.kind === 'server' || device.kind === 'network') {
    box(g, 0, 0, 0, 0.6, 0.35, 0.45, '#374d58');
    for (let i = -2; i <= 2; i++)
      box(g, i * 0.08, 0, 0.24, 0.025, 0.16, 0.02, '#91a5ad');
    if (device.kind === 'network')
      for (const x of [-0.22, 0.22])
        box(g, x, 0.3, -0.13, 0.025, 0.5, 0.025, '#354955');
  } else if (device.kind === 'touchscreen') {
    box(g, 0, 0, 0, 0.55, 0.4, 0.08, '#273f4d');
    box(
      g,
      0,
      0,
      0.047,
      0.47,
      0.32,
      0.01,
      device.on ? '#75d4d9' : '#607887',
      0.3,
    );
  } else if (device.kind === 'speaker' || device.kind === 'microphone') {
    cylinder(
      g,
      0,
      0,
      0,
      device.kind === 'speaker' ? 0.17 : 0.07,
      device.kind === 'speaker' ? 0.4 : 0.22,
      '#354e5d',
    );
  } else {
    box(g, 0, 0, 0, 0.2, 0.24, 0.08, '#e6e7dd');
    const center = box(g, 0, 0, 0.046, 0.1, 0.11, 0.02, color);
    center.material = led;
    if (device.kind === 'opening')
      box(g, 0.17, 0, 0, 0.06, 0.2, 0.07, '#f4f1e7');
  }
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.018, 6, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.23;
  g.add(marker);
  const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), led);
  indicator.position.set(0.2, 0.19, 0.21);
  g.add(indicator);
  g.position.set(device.x, device.y, device.z);
  g.rotation.y = (device.rotation * Math.PI) / 180;
  g.userData.deviceId = device.id;
  g.traverse((o) => {
    o.userData.deviceId = device.id;
  });
  return g;
}

export function coverageMesh(d: VirtualDevice) {
  const half = THREE.MathUtils.degToRad(d.angle / 2);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= 32; i++) {
    const a = -half + (i / 32) * half * 2;
    shape.lineTo(Math.sin(a) * d.range, Math.cos(a) * d.range);
  }
  shape.lineTo(0, 0);
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: '#28d8d4',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.z = (-d.rotation * Math.PI) / 180;
  mesh.position.set(d.x, 0.08, d.z);
  return mesh;
}

export function disposeObject(object: THREE.Object3D, shared = false) {
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const m of mats)
      if (
        shared ||
        ![...materials.values()].includes(m as THREE.MeshStandardMaterial)
      ) {
        (m as THREE.SpriteMaterial).map?.dispose();
        m.dispose();
      }
  });
}
