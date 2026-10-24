import type { SVGProps } from 'react';
export default function CommercialIcon({ name = 'camera', ...props }: SVGProps<SVGSVGElement> & {
  name?: string;
}) {
  const paths: Record<string, string> = { camera: 'M4 7h11v10H4z M15 10l5-3v10l-5-3', shield: 'M12 3l8 3v6c0 5-8 9-8 9S4 17 4 12V6z M8 12l3 3 5-6', cable: 'M7 3v4m4-4v4 M5 7h8v4a4 4 0 01-8 0z M9 15v3a3 3 0 006 0v-5h4', wifi: 'M3 8a15 15 0 0118 0 M6 12a10 10 0 0112 0 M9 16a5 5 0 016 0 M12 20h.01', hybrid: 'M3 8h7v7H3z M14 8h7v7h-7z M10 11h4 M6 18h12', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8 M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10l2 2M5 19l2-2M17 7l2-2', home: 'M3 11l9-8 9 8 M5 9v12h14V9 M10 21v-7h4v7', building: 'M4 21V4h10v17 M14 9h6v12 M7 8h3m-3 4h3m-3 4h3m7-3h1m-1 4h1', server: 'M4 3h16v7H4z M4 14h16v7H4z M7 6h.01m0 11h.01 M11 6h6m-6 11h6', arrow: 'M5 12h14 M13 6l6 6-6 6', check: 'M5 12l4 4L19 6', play: 'M8 4l12 8-12 8z', pause: 'M8 4v16 M16 4v16', close: 'M5 5l14 14 M19 5L5 19', screen: 'M3 4h18v13H3z M8 21h8 M12 17v4' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.camera}/></svg>;
}
