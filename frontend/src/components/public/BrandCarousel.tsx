import { useEffect, useRef } from 'react';

interface BrandCarouselProps {
  brands: any[];
}

export default function BrandCarousel({ brands }: BrandCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || brands.length === 0) return;
    let animationId: number;
    let x = 0;
    const speed = 0.5;
    const tick = () => {
      x -= speed;
      const half = container.scrollWidth / 2;
      if (Math.abs(x) >= half) x = 0;
      container.style.transform = `translateX(${x}px)`;
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [brands]);

  if (brands.length === 0) return null;
  const doubled = [...brands, ...brands];

  return (
    <div className="overflow-hidden">
      <div ref={containerRef} className="flex items-center gap-12" style={{ width: `${doubled.length * 200}px` }}>
        {doubled.map((brand, i) => (
          <div key={`${brand.id}-${i}`} className="flex-shrink-0 w-32 h-16 flex items-center justify-center">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            ) : (
              <span className="text-lg font-bold text-gray-300">{brand.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
