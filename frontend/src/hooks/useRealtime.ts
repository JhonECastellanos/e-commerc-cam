import { useEffect, useRef } from 'react';

const MAX_WS_FAILURES = 3;
const POLL_INTERVAL_MS = 30000;
const RECONNECT_MS = 5000;

// Actualizaciones en vivo vía WebSocket con degradación a sondeo periódico:
// en despliegues serverless (Vercel) no existen WebSockets, así que tras varios
// intentos fallidos se pasa a refrescar cada POLL_INTERVAL_MS.
export function useRealtime(onUpdate?: () => void) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/updates`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let failures = 0;
    let disposed = false;

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(() => cbRef.current?.(), POLL_INTERVAL_MS);
    }

    function connect() {
      if (disposed) return;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        startPolling();
        return;
      }

      ws.onopen = () => {
        failures = 0;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      };

      ws.onmessage = (event) => {
        if (event.data === 'reload') {
          cbRef.current?.();
        }
      };

      ws.onclose = () => {
        failures += 1;
        if (failures >= MAX_WS_FAILURES) {
          startPolling();
        } else {
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      ws?.close();
    };
  }, []);
}
