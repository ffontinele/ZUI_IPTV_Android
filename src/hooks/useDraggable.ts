import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook para fazer qualquer elemento arrastavel por toque/mouse.
 * Salva a posicao final no localStorage (pela chave key) pra persistir.
 * Retorna style e handlers para aplicar num <div>.
 */
export function useDraggable(key: string, initial: { x: number; y: number } = { x: 0, y: 0 }) {
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('zui-drag-' + key);
      if (saved) return JSON.parse(saved);
    } catch { /* ignora */ }
    return initial;
  });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const persist = useCallback((x: number, y: number) => {
    try { localStorage.setItem('zui-drag-' + key, JSON.stringify({ x, y })); } catch { /* ignora */ }
  }, [key]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const target = e.currentTarget as HTMLElement;
    try { target.releasePointerCapture(e.pointerId); } catch { /* ignora */ }
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newX = dragRef.current.origX + dx;
    const newY = dragRef.current.origY + dy;
    setPos({ x: newX, y: newY });
    persist(newX, newY);
    dragRef.current = null;
  }, [persist]);

  // Clampa a posicao pra dentro da viewport ao montar
  useEffect(() => {
    const clamp = () => {
      const el = document.querySelector('[data-drag="' + key + '"]') as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      const cx = Math.max(0, Math.min(pos.x, maxX));
      const cy = Math.max(0, Math.min(pos.y, maxY));
      if (cx !== pos.x || cy !== pos.y) setPos({ x: cx, y: cy });
    };
    setTimeout(clamp, 50);
  }, []);

  return {
    style: { transform: 'translate(' + pos.x + 'px, ' + pos.y + 'px)', touchAction: 'none' } as React.CSSProperties,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
