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

  const currentStyles = state.selectedSelector ? state.siteStyles[state.selectedSelector] ?? {} : {};

  return (
    <>
      {state.hoverRect && (
        <div
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            top: state.hoverRect.top,
            left: state.hoverRect.left,
            width: state.hoverRect.width,
            height: state.hoverRect.height,
            outline: '2px solid #3b82f6',
            background: 'rgba(59,130,246,0.1)',
            zIndex: 2147483646,
          }}
        />
      )}

      <div
        style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
        className="fixed bg-white text-black shadow-2xl rounded-lg overflow-hidden z-[2147483647] text-sm max-h-[80vh] flex flex-col"
      >
        <div
          onPointerDown={handleDragStart}
          className="flex justify-between items-center px-3 py-2 bg-slate-800 text-white cursor-move select-none"
        >
          <span className="font-bold text-xs">CSS Live Editor</span>
          <button onClick={() => setState({ active: false })} className="text-xs underline">
            Cerrar
          </button>
        </div>

        <div className="p-3 overflow-y-auto">
          {!state.selectedSelector && (
            <p className="text-gray-500 text-xs">Haz clic en cualquier elemento de la página para editarlo.</p>
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
                            value={(currentStyles as any)[field.key] ?? ''}
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
                            value={(currentStyles as any)[field.key] || '#000000'}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-8 h-6 border-none p-0"
                          />
                        ) : field.type === 'number' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={fromPx((currentStyles as any)[field.key])}
                              onChange={(e) => handleNumberChange(field.key, e.target.value)}
                              className="border rounded px-1 py-0.5 text-xs w-16"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={(currentStyles as any)[field.key] ?? ''}
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
