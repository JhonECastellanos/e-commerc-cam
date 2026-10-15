import { useEffect, useRef, useState } from 'react';
type Player = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  destroy(): void;
};
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: {
    host: string;
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(): void;
      onError(): void;
    };
  }) => Player;
};
type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};
let loading: Promise<YouTubeAPI> | undefined;
function loadPlayer(): Promise<YouTubeAPI> {
  const host = window as YouTubeWindow;
  if (host.YT?.Player)
    return Promise.resolve(host.YT);
  if (loading)
    return loading;
  loading = new Promise((resolve, reject) => {
    const previous = host.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error('Vídeo no disponible')), 20000);
    host.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (host.YT)
        resolve(host.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error('Vídeo no disponible')); };
    document.head.append(script);
  });
  return loading;
}
export default function YouTubeMedia({ id, playing, onError }: {
  id: string;
  playing: boolean;
  onError(): void;
}) {
  const container = useRef<HTMLDivElement>(null), player = useRef<Player>();
  const desired = useRef(playing), [ready, setReady] = useState(false);
  desired.current = playing;
  const error = useRef(onError);
  error.current = onError;
  useEffect(() => {
    let alive = true;
    const mount = document.createElement('div');
    container.current?.append(mount);
    loadPlayer().then(api => {
      if (!alive)
        return;
      player.current = new api.Player(mount, {
        host: 'https://www.youtube-nocookie.com', videoId: id,
        playerVars: { origin: location.origin, autoplay: 0, mute: 1, loop: 1, playlist: id, controls: 1, playsinline: 1, rel: 0 },
        events: { onReady() { if (!alive)
            return; player.current?.mute(); setReady(true); if (desired.current)
            player.current?.playVideo();
          else
            player.current?.pauseVideo(); }, onError() { if (alive)
            error.current(); } },
      });
    }).catch(() => { if (alive)
      error.current(); });
    return () => { alive = false; player.current?.destroy(); player.current = undefined; mount.remove(); };
  }, [id]);
  useEffect(() => { if (ready) {
    if (playing)
      player.current?.playVideo();
    else
      player.current?.pauseVideo();
  } }, [playing, ready]);
  return <div ref={container} className="youtube-media" aria-label="Vídeo de referencia de videovigilancia"/>;
}
