import { describe, expect, it, beforeEach } from 'vitest';
import { applyAction, interpretCommand, parseConfiguration } from '../src/smart-home/domain';
import { demonstrateMotion, homePreset, loadShowcase, showcaseConfiguration } from '../src/smart-home/showcase';

beforeEach(() => localStorage.clear());
describe('Smart-home presentation', () => {
  it.each(['casa','apartamento'] as const)('uses valid strategic points without observing intimate rooms: %s', scenario => {
    const config=showcaseConfiguration(scenario);
    expect(parseConfiguration(config)).toEqual(config);
    expect(config.devices.filter(d=>['cctv','ip-camera','microphone'].includes(d.kind)).some(d=>/habitacion|bano|closet/.test(d.room))).toBe(false);
    expect(config.devices.some(d=>d.kind==='server'&&d.on)).toBe(true);
    expect(config.devices.filter(d=>d.kind==='television')).toHaveLength(1);
  });
  it('controls television without specifying a room while preserving the local server', () => {
    const config=showcaseConfiguration('casa');
    const result=interpretCommand('Prende el TV',config);
    expect(result.action).toBeDefined();
    const next=applyAction(config,result.action!);
    expect(next.devices.find(d=>d.kind==='television')?.on).toBe(true);
    const off=homePreset(next,'off');
    expect(off.devices.filter(d=>['light','television'].includes(d.kind)).every(d=>!d.on)).toBe(true);
    expect(off.devices.find(d=>d.kind==='server')?.on).toBe(true);
  });
  it('turns on access illumination for a motion event and restores only states, never device placement', () => {
    const initial=homePreset(showcaseConfiguration('apartamento'),'off');
    const changed=demonstrateMotion(initial);
    expect(changed.devices.find(d=>d.kind==='light'&&d.room==='entrada')?.on).toBe(true);
    const saved=structuredClone(changed);
    const light=saved.devices.find(d=>d.kind==='light'&&d.room==='sala')!;
    light.x+=.25; light.on=true;
    localStorage.setItem('instalacam:showcase:v2:apartamento',JSON.stringify(saved));
    const restored=loadShowcase('apartamento');
    expect(restored.devices.find(d=>d.id===light.id)?.on).toBe(true);
    expect(restored.devices.find(d=>d.id===light.id)?.x).toBe(initial.devices.find(d=>d.id===light.id)?.x);
  });
});
