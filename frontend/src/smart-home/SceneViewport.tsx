import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { roomElevation, type StoreyView } from './architecture';
import {
  buildProperty,
  buildDevice,
  coverageMesh,
  disposeObject,
  watchMaterials,
  type PropertyModel,
} from './models';
import {
  roomAt,
  ROOMS,
  canPlace,
  snap,
  type Configuration,
  type DeviceKind,
  type VirtualDevice,
} from './domain';

export type ViewMode = 'isometrica' | 'superior' | 'recorrido';
export type ViewportHandle = {
  goToRoom: (id: string) => void;
  move: (direction: string, active: boolean) => void;
  doors: () => void;
  reset: () => void;
};
type Props = {
  config: Configuration;
  selected?: string;
  placing?: DeviceKind;
  view?: ViewMode;
  roof?: boolean;
  walls?: boolean;
  coverage?: boolean;
  preview?: boolean;
  daylight?: boolean;
  storey?: StoreyView;
  onSelect?: (id: string) => void;
  onPlace?: (room: string, x: number, z: number) => void;
  onMove?: (device: VirtualDevice) => void;
  onError?: (message: string) => void;
};

class PropertyRenderer {
  scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer;
  perspective = new THREE.PerspectiveCamera(48, 1, 0.05, 160);
  orthographic = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.05, 160);
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.perspective;
  orbit: OrbitControls;
  transform: TransformControls;
  model: PropertyModel;
  devices = new THREE.Group();
  overlays = new THREE.Group();
  current: Props;
  frame = 0;
  last = 0;
  dirty = true;
  visible = true;
  view: ViewMode = 'isometrica';
  yaw = 0;
  pitch = 0;
  walking = new Set<string>();
  dragOrigin?: { x: number; y: number; yaw: number; pitch: number };
  clickOrigin = { x: 0, y: 0 };
  size: ResizeObserver;
  visibility: IntersectionObserver;
  ray = new THREE.Raycaster();
  point = new THREE.Vector2();
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ambient = new THREE.HemisphereLight('#fff1df', '#667782', .45);
  sun = new THREE.DirectionalLight('#fff2d9', 1.8);
  environment: THREE.WebGLRenderTarget;
  unwatch: () => void;

  constructor(
    public host: HTMLDivElement,
    props: Props,
  ) {
    this.current = props;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !props.preview,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, props.preview ? 1.25 : 1.75),
    );
    this.renderer.setClearColor(props.config.scenario==='casa'?'#e5ebed':'#19262e');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = new RoomEnvironment();
    this.environment = pmrem.fromScene(studio, .04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = .6;
    studio.dispose();
    pmrem.dispose();
    this.unwatch = watchMaterials(this.invalidate);
    this.renderer.domElement.setAttribute(
      'aria-label',
      props.preview
        ? 'Vista tridimensional del inmueble'
        : 'Escenario 3D interactivo. Usa los controles de vista y dispositivos.',
    );
    this.renderer.domElement.setAttribute('data-testid', 'scene-canvas');
    this.renderer.domElement.tabIndex = props.preview ? -1 : 0;
    host.appendChild(this.renderer.domElement);
    this.scene.add(this.ambient);
    const sun = this.sun;
    sun.position.set(-8, 19, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(props.preview ? 768 : 1536, props.preview ? 768 : 1536);
    Object.assign(sun.shadow.camera, {
      left: -17,
      right: 17,
      top: 17,
      bottom: -17,
    });
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = .025;
    sun.shadow.radius = 3;
    this.scene.add(sun);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: props.config.scenario==='casa'?'#dce3e6':'#101b24', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.61;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.model = buildProperty(props.config.scenario);
    this.scene.add(this.model.group, this.devices, this.overlays);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.09;
    this.orbit.minDistance = 3;
    this.orbit.maxDistance = 45;
    this.orbit.minPolarAngle = 0.02;
    this.orbit.maxPolarAngle = Math.PI / 2 - 0.04;
    this.orbit.addEventListener('change', this.invalidate);
    this.transform = new TransformControls(
      this.camera,
      this.renderer.domElement,
    );
    this.transform.setMode('translate');
    this.transform.showY = false;
    this.transform.setTranslationSnap(0.25);
    this.transform.setSize(0.85);
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled =
        !e.value && this.view !== 'recorrido' && !this.current.preview;
      this.dirty = true;
    });
    this.transform.addEventListener('objectChange', this.invalidate);
    this.transform.addEventListener('mouseUp', () => {
      const object = this.transform.object;
      if (!object) return;
      const device = this.current.config.devices.find(
        (d) => d.id === object.userData.deviceId,
      );
      if (!device) return;
      const x = snap(object.position.x),
        z = snap(object.position.z),
        room = roomAt(this.current.config.scenario, x, z);
      if (!room || !canPlace(device.kind, room)) {
        object.position.set(device.x, device.y, device.z);
        this.current.onError?.(
          'Coloca el equipo dentro de un espacio permitido.',
        );
      } else this.current.onMove?.({ ...device, x, z, room: room.id });
      this.dirty = true;
    });
    this.setView(props.view || 'isometrica');
    this.update(props);
    this.size = new ResizeObserver(this.resize);
    this.size.observe(host);
    this.resize();
    this.visibility = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      this.dirty = true;
    });
    this.visibility.observe(host);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointercancel', this.cancelPointer);
    canvas.addEventListener('keydown', this.keyDown);
    canvas.addEventListener('keyup', this.keyUp);
    canvas.addEventListener('blur', this.clearWalking);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.frame = requestAnimationFrame(this.animate);
  }
  invalidate = () => {
    this.dirty = true;
  };
  resize = () => {
    const w = Math.max(this.host.clientWidth, 1),
      h = Math.max(this.host.clientHeight, 1),
      ratio = w / h;
    this.renderer.setSize(w, h, false);
    this.perspective.aspect = ratio;
    this.perspective.zoom = Math.min(this.current.config.scenario === 'casa' ? 1.45 : 1.7, Math.max(.75, ratio * 1.35));
    this.perspective.updateProjectionMatrix();
    const extent = this.current.config.scenario === 'casa' ? 14 : 9.5;
    this.orthographic.left = -extent * ratio;
    this.orthographic.right = extent * ratio;
    this.orthographic.top = extent;
    this.orthographic.bottom = -extent;
    this.orthographic.updateProjectionMatrix();
    this.dirty = true;
  };
  setView(view: ViewMode) {
    this.view = view;
    this.walking.clear();
    this.transform?.detach();
    this.camera = view === 'superior' ? this.orthographic : this.perspective;
    this.orbit.object = this.camera;
    this.transform.camera = this.camera;
    this.orbit.enabled = view !== 'recorrido' && !this.current.preview;
    if (view === 'superior') {
      this.camera.position.set(0, 30, 0.01);
      this.camera.up.set(0, 0, -1);
    } else {
      this.camera.up.set(0, 1, 0);
      const house = this.current.config.scenario === 'casa';
      this.camera.position.set(house ? 20 : 15, house ? 21 : 22, house ? 26 : 20);
    }
    this.orbit.target.set(0, this.current.config.scenario==='casa'?1.6:0, 0);
    this.camera.lookAt(this.orbit.target);
    this.orbit.update();
    if (view === 'recorrido') this.goToRoom('sala');
    this.dirty = true;
  }
  goToRoom = (id: string) => {
    const r = ROOMS[this.current.config.scenario].find(
      (room) => room.id === id,
    );
    if (!r) return;
    if (this.view === 'recorrido') {
      this.camera.position.set(r.x, roomElevation(this.current.config.scenario,r.id)+1.65, r.z + Math.min(r.d / 3, 1));
      this.yaw = 0;
      this.pitch = 0;
      this.look();
    } else {
      const offset = this.camera.position.clone().sub(this.orbit.target);
      this.orbit.target.set(r.x, roomElevation(this.current.config.scenario,r.id), r.z);
      this.camera.position
        .copy(this.orbit.target)
        .add(offset.multiplyScalar(0.65));
      this.orbit.update();
    }
    this.dirty = true;
  };
  doors = () => {
    for (const d of this.model.doors)
      d.userData.targetAngle = d.userData.targetAngle ? 0 : -Math.PI / 2;
    this.dirty = true;
  };
  move = (direction: string, active: boolean) => {
    if (active) this.walking.add(direction);
    else this.walking.delete(direction);
    this.dirty = true;
  };
  look() {
    this.camera.quaternion.setFromEuler(
      new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'),
    );
    this.dirty = true;
  }
  update(props: Props) {
    this.current = props;
    this.model.roof.visible = Boolean(props.roof);
    this.model.walls.visible = props.walls !== false;
    this.model.walls.children.forEach(wall => {
      wall.scale.y = this.view === 'recorrido' || props.roof ? 1 : (wall.userData.cutaway ?? 1);
      wall.visible=this.visibleStorey(wall.userData.elevation||0);
    });
    this.model.storeys.forEach(root=>{root.visible=this.visibleStorey(root.userData.elevation||0);});
    this.ambient.intensity = props.daylight === false ? .12 : .45;
    this.sun.intensity = props.daylight === false ? .12 : 1.8;
    this.scene.environmentIntensity = props.daylight === false ? .12 : .6;
    this.model.labels.forEach((l) => {
      l.visible = !props.preview && this.view !== 'recorrido';
    });
    this.transform.detach();
    disposeObject(this.devices);
    this.devices.clear();
    disposeObject(this.overlays);
    this.overlays.clear();
    let lights = 0;
    for (const device of props.config.devices) {
      const obj = buildDevice(
        device,
        device.kind === 'light' && device.on ? lights++ < 6 : true,
        props.config,
      );
      obj.position.y+=roomElevation(props.config.scenario,device.room);
      obj.visible=this.visibleStorey(roomElevation(props.config.scenario,device.room));
      this.devices.add(obj);
      if (device.id === props.selected) {
        if (props.onMove && this.view !== 'recorrido' && !props.preview && !props.placing)
          this.transform.attach(obj);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.4, 0.48, 32),
          new THREE.MeshBasicMaterial({
            color: '#1de4c1',
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(device.x, roomElevation(props.config.scenario,device.room)+0.08, device.z);
        ring.visible=obj.visible;
        this.overlays.add(ring);
      }
      if (
        props.coverage &&
        ['cctv', 'ip-camera', 'motion'].includes(device.kind) &&
        (device.id === props.selected || !props.selected)
      )
        this.overlays.add(coverageMesh(device));
    }
    this.renderer.domElement.style.cursor = props.placing
      ? 'crosshair'
      : 'grab';
    this.dirty = true;
  }
  visibleStorey(y:number) {
    return this.current.storey==='ground'?y===0:this.current.storey==='upper'?y>0:true;
  }
  pointerDown = (e: PointerEvent) => {
    this.clickOrigin = { x: e.clientX, y: e.clientY };
    if (this.view === 'recorrido') {
      this.dragOrigin = {
        x: e.clientX,
        y: e.clientY,
        yaw: this.yaw,
        pitch: this.pitch,
      };
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  };
  pointerMove = (e: PointerEvent) => {
    if (this.dragOrigin) {
      this.yaw = this.dragOrigin.yaw - (e.clientX - this.dragOrigin.x) * 0.006;
      this.pitch = THREE.MathUtils.clamp(
        this.dragOrigin.pitch - (e.clientY - this.dragOrigin.y) * 0.006,
        -1.1,
        1.1,
      );
      this.look();
    }
  };
  cancelPointer = () => {
    this.dragOrigin = undefined;
    this.walking.clear();
  };
  pointerUp = (e: PointerEvent) => {
    this.dragOrigin = undefined;
    if (
      this.current.preview ||
      this.transform.dragging ||
      Math.hypot(
        e.clientX - this.clickOrigin.x,
        e.clientY - this.clickOrigin.y,
      ) > 5
    )
      return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.point.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.point, this.camera);
    if (this.current.placing) {
      const hit = this.ray.intersectObjects(this.model.floors)[0];
      if (hit)
        this.current.onPlace?.(
          hit.object.userData.roomId,
          hit.point.x,
          hit.point.z,
        );
    } else {
      const hit = this.ray.intersectObjects(this.devices.children.filter(d=>d.visible), true)[0];
      if (hit) this.current.onSelect?.(hit.object.userData.deviceId);
    }
  };
  keyDown = (e: KeyboardEvent) => {
    if (this.view !== 'recorrido') return;
    const map: Record<string, string> = {
      w: 'forward',
      ArrowUp: 'forward',
      s: 'back',
      ArrowDown: 'back',
      a: 'left',
      ArrowLeft: 'left',
      d: 'right',
      ArrowRight: 'right',
      q: 'turnLeft',
      e: 'turnRight',
    };
    if (map[e.key]) {
      e.preventDefault();
      this.walking.add(map[e.key]);
    }
  };
  keyUp = () => this.walking.clear();
  clearWalking = () => this.walking.clear();
  contextLost = (e: Event) => {
    e.preventDefault();
    this.current.onError?.(
      'Se perdió la conexión gráfica. Recarga el escenario para continuar.',
    );
  };
  animate = (time: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const delta = Math.min((time - this.last) / 1000 || 0, 0.05);
    this.last = time;
    if (!this.visible || document.hidden) return;
    let animating = false;
    for (const d of this.model.doors) {
      if (Math.abs(d.rotation.y - d.userData.targetAngle) > 0.002) {
        d.rotation.y = this.reduced
          ? d.userData.targetAngle
          : THREE.MathUtils.damp(
              d.rotation.y,
              d.userData.targetAngle,
              6,
              delta,
            );
        animating = true;
      }
    }
    if (this.current.preview && !this.reduced) {
      this.orbit.autoRotate = true;
      this.orbit.autoRotateSpeed = 0.3;
      animating = true;
    }
    if (this.view === 'recorrido' && this.walking.size) {
      if (this.walking.has('turnLeft')) this.yaw += delta;
      if (this.walking.has('turnRight')) this.yaw -= delta;
      const dx =
          Number(this.walking.has('right')) - Number(this.walking.has('left')),
        dz =
          Number(this.walking.has('back')) -
          Number(this.walking.has('forward'));
      const next = this.camera.position.clone();
      next.x +=
        (dx * Math.cos(this.yaw) + dz * Math.sin(this.yaw)) * delta * 2.2;
      next.z +=
        (-dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) * delta * 2.2;
      if (
        roomAt(this.current.config.scenario, next.x, next.z) &&
        !this.model.obstacles.some((o) =>
          o.clone().expandByScalar(0.12).containsPoint(next),
        )
      )
        this.camera.position.copy(next);
      this.look();
      animating = true;
    } else this.orbit.update(delta);
    if (this.dirty || animating) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.size.disconnect();
    this.visibility.disconnect();
    this.orbit.dispose();
    this.transform.dispose();
    this.unwatch();
    this.environment.dispose();
    const c = this.renderer.domElement;
    c.removeEventListener('pointerdown', this.pointerDown);
    c.removeEventListener('pointerup', this.pointerUp);
    c.removeEventListener('pointermove', this.pointerMove);
    c.removeEventListener('pointercancel', this.cancelPointer);
    c.removeEventListener('keydown', this.keyDown);
    c.removeEventListener('keyup', this.keyUp);
    c.removeEventListener('blur', this.clearWalking);
    c.removeEventListener('webglcontextlost', this.contextLost);
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    c.remove();
  }
}

const SceneViewport = forwardRef<ViewportHandle, Props>(
  function SceneViewport(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      engine = useRef<PropertyRenderer>(),
      latest = useRef(props);
    latest.current = props;
    const [error, setError] = useState('');
    useImperativeHandle(ref, () => ({
      goToRoom: (id) => engine.current?.goToRoom(id),
      move: (d, a) => engine.current?.move(d, a),
      doors: () => engine.current?.doors(),
      reset: () => engine.current?.setView(latest.current.view || 'isometrica'),
    }));
    useEffect(() => {
      try {
        const instance = new PropertyRenderer(host.current!, latest.current);
        engine.current = instance;
        setError('');
        return () => {
          instance.dispose();
          engine.current = undefined;
        };
      } catch {
        setError(
          'El navegador no pudo iniciar WebGL 2. Habilita la aceleración gráfica y vuelve a abrir el escenario. Tu configuración se conserva.',
        );
      }
    }, [props.config.scenario, props.preview]);
    useEffect(() => {
      engine.current?.setView(props.view || 'isometrica');
      engine.current?.update(props);
    }, [props.view]);
    useEffect(() => {
      if (engine.current) engine.current.current = props;
    }, [props]);
    useEffect(
      () => engine.current?.update(latest.current),
      [
        props.config,
        props.selected,
        props.placing,
        props.roof,
        props.walls,
        props.coverage,
        props.daylight,
        props.storey,
      ],
    );
    return (
      <div
        className={`scene-viewport ${props.placing ? 'placing' : ''}`}
        ref={host}
        data-testid="scene-viewport"
      >
        {error && (
          <div className="scene-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  },
);
export default SceneViewport;
