import type { Combo } from './commercial';
export type CameraAnswers = {
  property?: string;
  environment?: string;
  perimeter?: string;
  accesses?: string;
  areas?: number;
  units?: number;
  priority?: string;
  existing?: string;
  connectivity?: string;
  urgency?: string;
};
const properties: Record<string, string> = { casa: 'Casa', apartamento: 'Apartamento', local: 'Local comercial', oficina: 'Oficina', bodega: 'Bodega', edificio: 'Proyecto de vivienda / edificio' };
type CameraQuestion = {
  key: keyof CameraAnswers;
  title: string;
  options?: string[][];
  numeric?: boolean;
  max?: number;
};
export const cameraQuestions = (a: CameraAnswers): CameraQuestion[] => [
  { key: 'property', title: '¿Dónde necesitas las cámaras?', options: Object.entries(properties) },
  ...(a.property === 'edificio' ? [{ key: 'units', title: '¿Cuántas viviendas incluye el proyecto?', numeric: true, max: 5000 }] : []),
  { key: 'environment', title: '¿Qué zonas necesitas vigilar?', options: [['interior', 'Interior'], ['exterior', 'Exterior'], ['ambos', 'Interior y exterior']] },
  ...(['casa', 'apartamento'].includes(a.property || '') && a.environment !== 'interior' ? [{ key: 'perimeter', title: a.property === 'casa' ? '¿Qué zona exterior es prioritaria?' : '¿Qué zona exterior del apartamento requiere revisión?', options: a.property === 'casa' ? [['acceso', 'Acceso y fachada'], ['jardin', 'Jardín o patio'], ['perimetro', 'Varios lados del inmueble']] : [['acceso', 'Acceso a la vivienda'], ['balcon', 'Balcón o terraza'], ['comunes', 'Zona común, con autorización']] }] : []),
  ...(['local', 'oficina', 'bodega'].includes(a.property || '') ? [{ key: 'accesses', title: '¿Cuántos accesos quieres vigilar?', options: [['1', 'Un acceso'], ['2', 'Dos accesos'], ['3+', 'Tres o más accesos']] }] : []),
  { key: 'areas', title: a.property === 'edificio' ? '¿Cuántas áreas por vivienda quieres cubrir?' : '¿Cuántas áreas quieres cubrir aproximadamente?', numeric: true, max: 500 },
  { key: 'priority', title: '¿Qué priorizas en tu instalación?', options: [['precio', 'Precio'], ['calidad', 'Detalle de imagen'], ['facilidad', 'Facilidad de instalación']] },
  { key: 'existing', title: '¿Ya tienes cámaras o un grabador?', options: [['no', 'Es una instalación nueva'], ['si', 'Quiero aprovechar mis equipos']] },
  { key: 'connectivity', title: '¿Qué conexión tienes disponible?', options: [['wifi', 'Wi-Fi'], ['cable', 'Red por cable'], ['ambas', 'Wi-Fi y red por cable'], ['ninguna', 'Sin conexión disponible'], ['asesoria', 'Necesito revisar la conectividad']] },
  { key: 'urgency', title: '¿Para cuándo necesitas el proyecto?', options: [['pronto', 'Lo antes posible'], ['mes', 'Durante el próximo mes'], ['planificando', 'Estoy comparando opciones']] },
] as CameraQuestion[];
export function cleanCameraAnswers(a: CameraAnswers): CameraAnswers {
  const result = { ...a };
  if (a.property !== 'edificio')
    delete result.units;
  if (!['casa', 'apartamento'].includes(a.property || '') || a.environment === 'interior')
    delete result.perimeter;
  if (!['local', 'oficina', 'bodega'].includes(a.property || ''))
    delete result.accesses;
  return result;
}
// Only the known questionnaire fields may be restored from navigation or browser storage.
export function readCameraProfile(navigation: unknown, stored: string | null): CameraAnswers | undefined {
  try {
    const source = navigation || (stored ? JSON.parse(stored)?.answers : undefined);
    if (!source || typeof source !== 'object' || !properties[source.property])
      return;
    const restored: CameraAnswers = {};
    for (const question of cameraQuestions(source)) {
      const value = source[question.key];
      if (question.numeric) {
        if (Number.isInteger(value) && value >= 1 && value <= (question.max || 500))
          Object.assign(restored, { [question.key]: value });
      }
      else if (question.options?.some(([key]) => key === value))
        Object.assign(restored, { [question.key]: value });
    }
    return cleanCameraAnswers(restored);
  }
  catch {
    return;
  }
}
export function recommendCameras(a: CameraAnswers, combos: Combo[]) {
  const finalAnswers = cleanCameraAnswers(a), areas = Number(a.areas || 0);
  const custom = a.existing === 'si' || a.property === 'edificio' || areas > 12 || areas < 1 || a.connectivity === 'ninguna' || a.perimeter === 'comunes';
  const modes = a.priority === 'facilidad' && a.environment === 'interior' && ['wifi', 'ambas'].includes(a.connectivity || '') ? ['inalambrico', 'hibrido'] : ['cableado', 'hibrido'];
  const fitting = combos.filter(c => c.active !== false && Number(c.cameras_count) >= areas && modes.includes(c.mode)).sort((a, b) => a.cameras_count - b.cameras_count || Number(a.final_price) - Number(b.final_price));
  const smallest = fitting[0]?.cameras_count;
  const compatible = fitting.filter(c => c.cameras_count === smallest).sort((x, y) => a.priority === 'calidad' ? parseFloat(y.resolution) - parseFloat(x.resolution) || Number(x.final_price) - Number(y.final_price) : Number(x.final_price) - Number(y.final_price));
  const reasons: string[] = [];
  if (areas < 1)
    reasons.push('Necesitamos revisar los espacios para estimar la cantidad de cámaras.');
  if (a.property === 'edificio')
    reasons.push('Varias viviendas requieren dimensionar infraestructura y separar datos y permisos por vivienda.');
  if (a.existing === 'si')
    reasons.push('Es necesario revisar compatibilidad y estado de los equipos actuales.');
  if (areas > 12)
    reasons.push('El número de áreas supera un combo estándar de hasta 12 cámaras.');
  if (a.connectivity === 'ninguna')
    reasons.push('Hay que revisar la red y el acceso remoto antes de elegir el sistema.');
  if (a.perimeter === 'comunes')
    reasons.push('La vigilancia de zonas comunes requiere revisar permisos y alcance.');
  if (!custom && compatible.length)
    reasons.push(`El combo de ${smallest} cámaras puede cubrir las ${areas} áreas indicadas sin aumentar innecesariamente la cantidad.`);
  if (!compatible.length)
    reasons.push('No hay un combo activo que corresponda a la cantidad y modalidad orientativas.');
  reasons.push(a.priority === 'facilidad' && modes.includes('inalambrico') ? 'La conexión Wi-Fi declarada permite evaluar una alternativa inalámbrica; falta medir cobertura y alimentación.' : 'Una instalación cableada o híbrida permite evaluar grabación y puntos exteriores; falta revisar distancias y alimentación.');
  return { finalAnswers, custom: custom || !compatible.length, compatible: custom ? [] : compatible.slice(0, 3), reasons, mode: modes[0] };
}
export function cameraSummary(a: CameraAnswers) {
  const clean = cleanCameraAnswers(a);
  return [`Inmueble: ${properties[clean.property || ''] || 'Por definir'}`, clean.units ? `Viviendas: ${clean.units}` : '', `Áreas${clean.property === 'edificio' ? ' por vivienda' : ''}: ${clean.areas || 'Por definir'}`, `Zonas: ${clean.environment || 'Por definir'}`, clean.perimeter ? `Exterior: ${clean.perimeter}` : '', clean.accesses ? `Accesos: ${clean.accesses}` : '', `Prioridad: ${clean.priority}`, `Equipos actuales: ${clean.existing === 'si' ? 'Sí' : 'No'}`, `Conectividad: ${clean.connectivity}`, `Plazo: ${clean.urgency}`].filter(Boolean).join('\n');
}
