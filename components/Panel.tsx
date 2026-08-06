import { useEffect, useRef } from 'react';
import { usePickerState, updateSelectedStyle, setState, getState } from '@/lib/store';
import { SECTIONS } from './panel-fields';
import { buildCssText, saveSiteStyles, injectStyleTag } from '@/lib/style-store';
import { toPx, fromPx } from '@/lib/units';

const PANEL_WIDTH = 272;
const MARGIN = 16;

function defaultPosition() {
  return {
    x: window.innerWidth - PANEL_WIDTH - MARGIN,
    y: MARGIN,
  };
}

export default function Panel() {
  const state = usePickerState();
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  // Ref para gestionar el redimensionamiento mediante puntos de ancla
  const resizeRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!state.position) {
      setState({ position: defaultPosition() });
    }
  }, [state.position]);

  if (!state.active) return null;

  const position = state.position ?? defaultPosition();

  async function persist() {
    const css = buildCssText(getState().siteStyles);
    injectStyleTag(css);
    await saveSiteStyles(getState().siteStyles);
  }

  function handleChange(key: any, value: string) {
    updateSelectedStyle(key, value);
    setTimeout(persist, 0);
  }

  function handleNumberChange(key: any, rawValue: string) {
    handleChange(key, rawValue === '' ? '' : toPx(rawValue));
  }

  function handleCopyCss() {
    navigator.clipboard.writeText(buildCssText(state.siteStyles));
  }

  function handleResetSelector() {
    if (!state.selectedSelector) return;
    const next = { ...state.siteStyles };
    delete next[state.selectedSelector];
    setState({ siteStyles: next });
    setTimeout(persist, 0);
  }

  // --- Lógica de arrastre del Panel ---
  function handleDragStart(e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
  }

  function handleDragMove(e: PointerEvent) {
    if (!dragRef.current) return;
    const { startX, startY, originX, originY } = dragRef.current;
    const nextX = originX + (e.clientX - startX);
    const nextY = originY + (e.clientY - startY);
    const clampedX = Math.min(Math.max(nextX, 0), window.innerWidth - PANEL_WIDTH);
    const clampedY = Math.min(Math.max(nextY, 0), window.innerHeight - 40);
    setState({ position: { x: clampedX, y: clampedY } });
  }

  function handleDragEnd() {
    dragRef.current = null;
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', handleDragEnd);
  }

  // --- Lógica para Resize con Puntos de Ancla ---
  function handleResizeStart(e: React.PointerEvent, handle: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!state.hoverRect) return;

    resizeRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: state.hoverRect.width,
      startHeight: state.hoverRect.height,
    };

    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', handleResizeEnd);
  }

  function handleResizeMove(e: PointerEvent) {
    if (!resizeRef.current || !state.hoverRect) return;
    const { handle, startX, startY, startWidth, startHeight } = resizeRef.current;

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Ajustar ancho según el punto jalado
    if (handle.includes('e')) {
      newWidth = Math.max(10, startWidth + (e.clientX - startX));
    } else if (handle.includes('w')) {
      newWidth = Math.max(10, startWidth - (e.clientX - startX));
    }

    // Ajustar alto según el punto jalado
    if (handle.includes('s')) {
      newHeight = Math.max(10, startHeight + (e.clientY - startY));
    } else if (handle.includes('n')) {
      newHeight = Math.max(10, startHeight - (e.clientY - startY));
    }

    // Aplicar estilos
    if (handle.includes('e') || handle.includes('w')) {
      handleChange('width', `${Math.round(newWidth)}px`);
    }
    if (handle.includes('s') || handle.includes('n')) {
      handleChange('height', `${Math.round(newHeight)}px`);
    }

    // Actualizar rectángulo visual en pantalla
    setState({
      hoverRect: {
        ...state.hoverRect,
        width: newWidth,
        height: newHeight,
      },
    });
  }

  function handleResizeEnd() {
    resizeRef.current = null;
    window.removeEventListener('pointermove', handleResizeMove);
    window.removeEventListener('pointerup', handleResizeEnd);
  }

  const currentStyles = state.selectedSelector ? state.siteStyles[state.selectedSelector] ?? {} : {};

  // Elemento real seleccionado en la página (guardado por content.tsx al hacer click).
  // Si por algún motivo no está disponible, intentamos recuperarlo con el selector.
  const selectedElement: HTMLElement | null =
    (state as any).selectedElement ??
    (() => {
      if (!state.selectedSelector) return null;
      try {
        return document.querySelector(state.selectedSelector) as HTMLElement | null;
      } catch {
        return null;
      }
    })();

  function rgbToHex(value: string): string {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return value;
    const [, r, g, b] = match;
    const toHex = (n: string) => parseInt(n, 10).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Valor a mostrar en un input: primero el override ya guardado por el usuario,
  // y si no existe, el estilo REAL que tiene el elemento en la página (computed style).
  function fieldValue(key: string, type: string): string {
    const saved = (currentStyles as any)[key];
    if (saved !== undefined && saved !== '') return saved;
    if (!selectedElement) return '';
    const computed = getComputedStyle(selectedElement);
    const raw = (computed as any)[key];
    if (raw === undefined || raw === '') return '';
    return type === 'color' ? rgbToHex(raw) : raw;
  }

  // Extraer el nombre simple del Tag para el título del cuadro (Ej: DIV, BUTTON, SPAN)
  const tagName = state.selectedSelector
    ? state.selectedSelector.split(/[\s#\.:]/)[0].toUpperCase() || 'ELEMENT'
    : 'ELEMENT';

  return (
    <>
      {/* Rectángulo de Selección con Puntos de Ancla y Badge */}
      {state.hoverRect && (
        <div
          data-css-editor-panel="true"
          style={{
            position: 'fixed',
            // 'none' para que el recuadro no tape ni intercepte clicks sobre
            // elementos anidados/superpuestos que estén dentro de esta misma
            // zona; solo los puntos de anclaje (abajo) reactivan el pointer.
            pointerEvents: 'none',
            top: state.hoverRect.top,
            left: state.hoverRect.left,
            width: state.hoverRect.width,
            height: state.hoverRect.height,
            outline: '2px solid #3b82f6',
            background: 'rgba(59,130,246,0.08)',
            zIndex: 2147483646,
          }}
        >
          {/* Título flotante (Badge con Tipo de Tag y Medidas) */}
          <div
            style={{
              position: 'absolute',
              top: '-22px',
              left: '-2px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '3px 3px 0 0',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontFamily: 'sans-serif',
            }}
          >
            {tagName} — {Math.round(state.hoverRect.width)}px × {Math.round(state.hoverRect.height)}px
          </div>

          {/* 8 Puntos de Ancla (Resize Handles) */}
          {[
            { id: 'nw', cursor: 'nwse-resize', top: '-4px', left: '-4px' },
            { id: 'n', cursor: 'ns-resize', top: '-4px', left: 'calc(50% - 4px)' },
            { id: 'ne', cursor: 'nesw-resize', top: '-4px', right: '-4px' },
            { id: 'e', cursor: 'ew-resize', top: 'calc(50% - 4px)', right: '-4px' },
            { id: 'se', cursor: 'nwse-resize', bottom: '-4px', right: '-4px' },
            { id: 's', cursor: 'ns-resize', bottom: '-4px', left: 'calc(50% - 4px)' },
            { id: 'sw', cursor: 'nesw-resize', bottom: '-4px', left: '-4px' },
            { id: 'w', cursor: 'ew-resize', top: 'calc(50% - 4px)', left: '-4px' },
          ].map((handle) => (
            <div
              key={handle.id}
              onPointerDown={(e) => handleResizeStart(e, handle.id)}
              style={{
                position: 'absolute',
                pointerEvents: 'auto',
                width: '8px',
                height: '8px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #3b82f6',
                borderRadius: '2px',
                cursor: handle.cursor,
                top: handle.top,
                left: handle.left,
                right: handle.right,
                bottom: handle.bottom,
                zIndex: 2147483647,
              }}
            />
          ))}
        </div>
      )}

      {/* Panel Flotante de Edición */}
      <div
        data-css-editor-panel="true"
        style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
        className="fixed bg-white text-black shadow-2xl rounded-lg overflow-hidden z-[2147483647] text-sm max-h-[80vh] flex flex-col"
      >
        <div
          onPointerDown={handleDragStart}
          className="flex justify-between items-center px-3 py-2 bg-slate-800 text-white cursor-move select-none"
        >
          <span className="font-bold text-xs">CSS Live Editor</span>
          <button
            onClick={() => setState({ active: false, hoverRect: null, selectedSelector: null, selectedElement: null } as any)}
            className="text-xs underline"
          >
            Cerrar
          </button>
        </div>

        <div className="p-3 overflow-y-auto">
          {!state.selectedSelector && (
            <p className="text-gray-500 text-xs">Haz clic o pasa el cursor sobre un elemento de la página para editarlo.</p>
          )}

          {state.selectedSelector && (
            <>
              <p className="text-[10px] text-gray-500 mb-3 break-all">{state.selectedSelector}</p>

              {SECTIONS.map((section) => (
                <div key={section.title} className="mb-4">
                  <h2 className="font-semibold mb-2 text-xs">{section.title}</h2>
                  <div className="flex flex-col gap-2">
                    {section.fields.map((field) => (
                      <label key={field.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs">{field.label}</span>
                        {field.type === 'select' ? (
                          <select
                            value={fieldValue(field.key, 'select')}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="border rounded px-1 py-0.5 text-xs"
                          >
                            <option value="">—</option>
                            {field.options!.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'color' ? (
                          <input
                            type="color"
                            value={fieldValue(field.key, 'color') || '#000000'}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-8 h-6 border-none p-0"
                          />
                        ) : field.type === 'number' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={fromPx(fieldValue(field.key, 'number'))}
                              onChange={(e) => handleNumberChange(field.key, e.target.value)}
                              className="border rounded px-1 py-0.5 text-xs w-16"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={fieldValue(field.key, 'text')}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="border rounded px-1 py-0.5 text-xs w-24"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <button onClick={handleCopyCss} className="flex-1 bg-slate-800 text-white rounded px-2 py-1 text-xs">
                  Copiar CSS
                </button>
                <button onClick={handleResetSelector} className="flex-1 bg-gray-200 rounded px-2 py-1 text-xs">
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
