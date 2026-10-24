import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from 'react';
import { useRealtime } from '../src/hooks/useRealtime';

class FailingWebSocket {
  static instances: FailingWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FailingWebSocket.instances.push(this);
    // Falla de forma asíncrona, como un backend serverless sin soporte WS.
    setTimeout(() => this.onclose?.(), 10);
  }

  close() {}
}

function Probe({ onUpdate }: { onUpdate: () => void }) {
  useRealtime(onUpdate);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  FailingWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FailingWebSocket as unknown as typeof WebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useRealtime', () => {
  it('recibe mensajes reload por WebSocket cuando la conexión funciona', () => {
    const onUpdate = vi.fn();
    render(<Probe onUpdate={onUpdate} />);
    const ws = FailingWebSocket.instances[0];
    act(() => {
      ws.onopen?.();
      ws.onmessage?.({ data: 'reload' });
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('tras varios fallos de WebSocket degrada a sondeo periódico', () => {
    const onUpdate = vi.fn();
    render(<Probe onUpdate={onUpdate} />);

    // 3 intentos fallidos (cierre a los 10 ms + reconexión a los 5 s).
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(FailingWebSocket.instances.length).toBe(3);

    // Ya en modo sondeo: cada 30 s dispara la actualización.
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });
});
