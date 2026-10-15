import { describe, expect, it } from 'vitest';
import { applyAction, createDevice, initialConfiguration, interpretCommand, parseConfiguration, ROOMS, triggerSensor } from '../src/smart-home/domain';
import { serviceCostProposal } from '../src/smart-home/commercial';
describe('Virtual household engine', () => {
  it('applies a room-scoped Spanish command and preserves other rooms', () => {
    const config = initialConfiguration('casa');
    const result = interpretCommand('Enciende las luces de la cocina', config);
    expect(result.action).toBeDefined();
    const next = applyAction(config, result.action!);
    expect(next.devices.find(d => d.kind === 'light' && d.room === 'cocina')?.on).toBe(true);
    expect(next.devices.find(d => d.kind === 'light' && d.room === 'sala')?.on).toBe(false);
    expect(config.devices[0].on).toBe(false);
  });
  it('refuses ambiguous rooms, ambiguous actions and unknown devices', () => {
    const config = initialConfiguration('apartamento');
    for (const text of ['Enciende las luces', 'Enciende y apaga todas las luces', 'Enciende el micrófono del estudio']) expect(interpretCommand(text, config).action).toBeUndefined();
  });
  it('activates only the configured automation target', () => {
    const config = initialConfiguration('casa');
    const sensor = config.devices.find(d => d.kind === 'motion')!;
    const next = triggerSensor(config, sensor.id);
    expect(next.devices.find(d => d.room === 'cocina' && d.kind === 'light')?.on).toBe(true);
    expect(next.devices.find(d => d.room === 'sala' && d.kind === 'light')?.on).toBe(false);
  });
  it('validates saved configurations and blocks recording in intimate spaces', () => {
    const config = initialConfiguration('apartamento');
    expect(parseConfiguration(JSON.parse(JSON.stringify(config)))).toEqual(config);
    expect(() => createDevice('microphone', ROOMS.apartamento.find(r => r.id === 'closet')!)).toThrow();
    expect(() => parseConfiguration({ ...config, devices: [...config.devices, config.devices[0]] })).toThrow();
    expect(() => parseConfiguration({ ...config, devices: [{ ...config.devices[0], x: 99 }] })).toThrow();
  });
});
describe('Independent service proposal', () => {
  it('charges server setup separately and scales by dwelling without inventing an annual discount', () => {
    const single = serviceCostProposal({ infrastructure: 'local', units: 1, servers: 1, points: 4, integrated: false });
    const building = serviceCostProposal({ infrastructure: 'shared', units: 50, servers: 2, points: 4, integrated: false });
    expect(single.serverSetup).toBe(450000);
    expect(building.serverSetup).toBe(single.serverSetup * 2);
    expect(building.tenantSetup).toBeGreaterThan(0);
    expect(building.annual).toBe(building.monthly * 12);
    expect(single.setupTotal).toBe(single.serverSetup + single.deviceInstallation);
    const twoServers = serviceCostProposal({ infrastructure: 'local', units: 1, servers: 2, points: 4, integrated: false });
    expect(twoServers.monthly).toBe(single.monthly * 2);
  });
});
