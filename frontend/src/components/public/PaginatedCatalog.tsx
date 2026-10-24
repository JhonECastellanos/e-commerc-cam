import { useEffect, useRef, useState, type ReactNode } from 'react';
export default function PaginatedCatalog<T>({ items, render, pageSize = 8, label, filterKey = '', className }: {
    items: T[];
    render: (item: T) => ReactNode;
    pageSize?: number;
    label: string;
    filterKey?: string;
    className: string;
}) {
    const [page, setPage] = useState(0);
    const start = useRef<{
        x: number;
        y: number;
    } | null>(null);
    const suppressClick = useRef(false);
    const pages = Math.ceil(items.length / pageSize), current = Math.min(page, Math.max(0, pages - 1));
    useEffect(() => setPage(0), [filterKey]);
    function move(next: number) { setPage(Math.max(0, Math.min(pages - 1, next))); }
    const numbers = [...new Set([0, current - 1, current, current + 1, pages - 1])].filter(n => n >= 0 && n < pages).sort((a, b) => a - b);
    return <div className="paged-catalog">
    {pages > 1 && <nav className="catalog-pagination" aria-label={`Paginación de ${label}`}>
      <span className="catalog-page-summary" aria-live="polite">{current * pageSize + 1}–{Math.min((current + 1) * pageSize, items.length)} de {items.length}</span>
      <button type="button" disabled={current === 0} onClick={() => move(current - 1)} aria-label={`Página anterior de ${label}`}>‹</button>
      {numbers.map((number, index) => <span className={`catalog-page-number ${Math.abs(number - current) > 1 ? 'catalog-page-edge' : ''}`} key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}<button type="button" aria-label={`Página ${number + 1} de ${label}`} aria-current={number === current ? 'page' : undefined} onClick={() => move(number)}>{number + 1}</button></span>)}
      <button type="button" disabled={current >= pages - 1} onClick={() => move(current + 1)} aria-label={`Página siguiente de ${label}`}>›</button>
      <span className="catalog-swipe-hint">Desliza para cambiar de página</span>
    </nav>}
    <div className={`catalog-swipe ${className}`} role="list" aria-label={label} onDragStart={e => e.preventDefault()} onClickCapture={e => { if (suppressClick.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick.current = false;
    } }} onPointerDown={e => { suppressClick.current = false; if (e.isPrimary)
        start.current = { x: e.clientX, y: e.clientY }; }} onPointerCancel={() => { start.current = null; }} onPointerUp={e => { const origin = start.current; start.current = null; if (!origin)
        return; const dx = e.clientX - origin.x, dy = e.clientY - origin.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClick.current = true;
        move(current + (dx < 0 ? 1 : -1));
    } }}>
      {items.slice(current * pageSize, (current + 1) * pageSize).map(render)}
    </div>
  </div>;
}
