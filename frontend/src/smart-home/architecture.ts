import type { Scenario } from './domain';

// Heights are visual architecture, separate from the stable advisory coordinates.
export function roomElevation(scenario: Scenario, room: string): number {
  return scenario === 'casa' && ['cocina', 'habitacion1', 'habitacion2', 'bano'].includes(room) ? 3.2 : 0;
}
export type StoreyView = 'all' | 'ground' | 'upper';
