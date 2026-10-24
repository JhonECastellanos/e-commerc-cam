import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import manifest from '../../data/image-manifest.json';

// Preserve remote uploads. Normalize legacy Windows paths and public/uploads prefixes.
export function imagePath(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const path = value.trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(path)) return path;
  if (/^(data:|javascript:|file:)/i.test(path)) return undefined;
  if (path.startsWith('/api/uploads/')) return path;
  if (/^\/?uploads\//.test(path)) return '/api/' + path.replace(/^\//, '');
  const publicIndex = path.toLowerCase().indexOf('public/');
  const local =
    '/' +
    (publicIndex >= 0 ? path.slice(publicIndex + 7) : path.replace(/^\/+/, ''));
  return (
    manifest.find((url) => url.toLowerCase() === local.toLowerCase()) || local
  );
}

export default function CatalogImage({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const normalized = imagePath(typeof src === 'string' ? src : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [normalized]);
  if (!normalized || failed)
    return (
      <div
        className={props.className}
        role="img"
        aria-label={alt || 'Imagen no disponible'}
      >
        <span className="flex h-full min-h-24 items-center justify-center text-center text-sm text-gray-500">
          Fotografía pendiente
          <br />
          {alt}
        </span>
      </div>
    );
  return (
    <img
      {...props}
      src={normalized}
      alt={alt}
      title={
        props.title ||
        (normalized.endsWith('.svg')
          ? 'Ilustración de referencia del catálogo. Fotografía del equipo sujeta a confirmación.'
          : undefined)
      }
      loading={props.loading || 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
