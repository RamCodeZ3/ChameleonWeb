import { useEffect, useRef, useState } from 'react';
import { usePickerState, updateSelectedStyle, setState, getState } from '@/lib/store';
import { SECTIONS } from './panel-fields';
import { buildCssText, saveSiteStyles, injectStyleTag } from '@/lib/style-store';
import { toPx, fromPx } from '@/lib/units';
import {
  X,
  GripVertical,
  Copy,
  RotateCcw,
  ChevronDown,
  MousePointerClick,
  Download,
  Trash2,
  Type,
  Palette,
  Ruler,
  Square,
  LayoutGrid,
  Sparkles,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

const PANEL_WIDTH = 288;
const MARGIN = 16;

// Color de acento del tema oscuro (equivalente a "violet-500" de Tailwind).
// Se usa tanto en clases de Tailwind como en los estilos inline del
// recuadro de selección que se dibuja directamente sobre la página.
const ACCENT = '#8b5cf6';

// Propiedades "de texto" que, al cambiarlas en el elemento seleccionado,
// también se aplican a sus descendientes. CSS ya hereda muchas de estas
// por defecto, pero si algún hijo tiene su propio valor (por una regla más
// específica del sitio original) esta regla explícita lo sobrescribe, que
// es lo que se espera al decir "cambié el color y el hijo no cambió".
const INHERITABLE_KEYS = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecoration',
  'textTransform',
  'whiteSpace',
]);

// Propiedades de tamaño del contenedor. Acá NO tiene sentido copiar el mismo
// ancho/alto a cada hijo (eso rompería el layout, todos quedarían del mismo
// tamaño). Lo "inteligente" es evitar que el contenido se desborde del
// nuevo tamaño: los hijos directos no exceden el ancho del contenedor, y
// los elementos de medios (imágenes/video/svg) se reescalan manteniendo
// proporción en vez de quedar recortados o estirados.
const RESIZE_KEYS = new Set(['width', 'height']);

function defaultPosition() {
  return {
    x: window.innerWidth - PANEL_WIDTH - MARGIN,
    y: MARGIN,
  };
}

// Asigna un ícono de Lucide a cada categoría según palabras clave en su
// título, para que el menú de edición se sienta organizado por tipo de
// propiedad en vez de una lista plana. Si ninguna coincide, se usa un
// ícono neutro por defecto.
const SECTION_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /tipograf|texto|font|text/i, icon: Type },
  { match: /color|fondo|background|bg/i, icon: Palette },
  { match: /borde|border|radius|contorno|outline/i, icon: Square },
  { match: /espac|margin|padding|tama|size|dimens|ancho|alto/i, icon: Ruler },
  { match: /posic|position|layout|display|flex|grid/i, icon: LayoutGrid },
  { match: /efect|shadow|sombra|opacity|opacidad|filter|transform/i, icon: Sparkles },
];

function getSectionIcon(title: string): LucideIcon {
  return SECTION_ICONS.find((s) => s.match.test(title))?.icon ?? SlidersHorizontal;
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

  // Categorías abiertas del menú de edición. El menú es un acordeón: cada
  // categoría empieza cerrada y solo se abre (hacia abajo) cuando el usuario
  // hace clic en su encabezado, nunca por hover.
  const [openSections, setOpenSections] = useState<string[]>([]);

  function toggleSection(title: string) {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }

  useEffect(() => {
    if (!state.position) {
      setState({ position: defaultPosition() });
    }
  }, [state.position]);

  // Al seleccionar un elemento nuevo, arrancamos el menú desde cero
  // (todas las categorías cerradas) en vez de arrastrar el estado de
  // apertura del elemento anterior.
  useEffect(() => {
    setOpenSections([]);
  }, [state.selectedSelector]);

  // El recuadro de selección se dibuja con position:fixed usando las
  // coordenadas que tenía el elemento en el momento del click. Si la
  // página hace scroll, esas coordenadas quedan desactualizadas y el
  // recuadro se "despega" del elemento real. Este efecto reubica el
  // recuadro en cada scroll/resize, y si el elemento seleccionado queda
  // totalmente fuera de la ventana visible, oculta el recuadro (no lo
  // deja "flotando" donde ya no hay nada que mostrar). La selección en sí
  // se mantiene: si volvés a scrollear hasta el elemento, el recuadro
  // reaparece solo.
  useEffect(() => {
    const selectedEl = (state as any).selectedElement as HTMLElement | null;
    if (!state.active || !selectedEl) return;

    let raf: number | null = null;

    function sync() {
      if (!selectedEl.isConnected) {
        // El elemento fue removido del DOM (por ejemplo, la página se
        // volvió a renderizar): ya no hay nada que seleccionar.
        setState({ hoverRect: null, selectedSelector: null, selectedElement: null } as any);
        return;
      }
      const rect = selectedEl.getBoundingClientRect();
      const fueraDeVista =
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth;

      setState({
        hoverRect: fueraDeVista
          ? null
          : { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      } as any);
    }

    function onScrollOrResize() {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        sync();
      });
    }

    // capture:true para detectar scroll de CUALQUIER contenedor scrolleable
    // de la página, no solo el scroll de la ventana.
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [state.active, (state as any).selectedElement]);

  if (!state.active) return null;

  const position = state.position ?? defaultPosition();

  async function persist() {
    const css = buildCssText(getState().siteStyles);
    injectStyleTag(css);
    await saveSiteStyles(getState().siteStyles);
  }

  // Aplica un estilo a CUALQUIER selector (no solo al seleccionado), para
  // poder escribir reglas adicionales como ".selector *" (hijos) sin
  // depender de una función del store que no conocemos de antemano.
  function updateStyleForSelector(selector: string, key: string, value: string) {
    const current = getState().siteStyles;
    setState({
      siteStyles: {
        ...current,
        [selector]: { ...(current[selector] || {}), [key]: value },
      },
    });
  }

  function handleChange(key: any, value: string) {
    if (!state.selectedSelector) return;
    const selector = state.selectedSelector;

    updateSelectedStyle(key, value);

    if (INHERITABLE_KEYS.has(key)) {
      // Cascada a los hijos: mismo valor para todos los descendientes,
      // así el cambio de color/tipografía se ve también en las etiquetas hijas.
      updateStyleForSelector(`${selector} *`, key, value);
    }

    if (RESIZE_KEYS.has(key)) {
      // Ajuste inteligente: en vez de forzar el mismo ancho/alto a cada
      // hijo (rompería el layout), evitamos que el contenido se desborde
      // del nuevo tamaño del contenedor.
      updateStyleForSelector(selector, 'boxSizing', 'border-box');
      updateStyleForSelector(`${selector} > *`, 'maxWidth', '100%');
      updateStyleForSelector(
        `${selector} img, ${selector} video, ${selector} svg, ${selector} canvas`,
        'maxWidth',
        '100%'
      );
      updateStyleForSelector(
        `${selector} img, ${selector} video, ${selector} svg, ${selector} canvas`,
        'height',
        'auto'
      );
    }

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

  // Resetea TODOS los estilos modificados en la página, no solo los del
  // elemento seleccionado. Es destructivo, así que pedimos confirmación.
  function handleResetAll() {
    const confirmado = window.confirm(
      '¿Restablecer todos los estilos modificados en esta página? Esta acción no se puede deshacer.'
    );
    if (!confirmado) return;
    setState({ siteStyles: {}, selectedSelector: null, selectedElement: null, hoverRect: null } as any);
    setTimeout(persist, 0);
  }

  // Descarga el HTML completo de la página actual, con los estilos nuevos
  // incrustados en un <style> dentro del <head>, y sin nuestra propia UI.
  function handleDownloadHtml() {
    const css = buildCssText(getState().siteStyles);
    const clone = document.documentElement.cloneNode(true) as HTMLElement;

    // Quitamos el panel/recuadro de selección y el host del shadow root de
    // nuestra propia extensión para que no aparezcan en el archivo exportado.
    clone.querySelectorAll('[data-css-editor-panel="true"]').forEach((el) => el.remove());
    clone.querySelectorAll('css-live-editor-ui').forEach((el) => el.remove());

    const styleTag = document.createElement('style');
    styleTag.id = 'css-live-editor-export';
    styleTag.textContent = css;

    const head = clone.querySelector('head');
    (head ?? clone).appendChild(styleTag);

    const html = `<!DOCTYPE html>\n${clone.outerHTML}`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const safeName =
      (document.title || 'pagina').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
      'pagina';

    const a = document.createElement('a');
    // Mismo atributo que usa el resto de la UI del editor: así el listener
    // global de selección (en content.tsx) lo reconoce como "parte de
    // nuestra propia interfaz" y no le cancela el click, aunque este <a>
    // viva fuera del shadow root (necesita estar en document.body para
    // que el navegador dispare la descarga correctamente).
    a.setAttribute('data-css-editor-panel', 'true');
    a.href = url;
    a.download = `${safeName}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
            outline: `2px solid ${ACCENT}`,
            background: 'rgba(139,92,246,0.10)',
            zIndex: 2147483646,
          }}
        >
          {/* Título flotante (Badge con Tipo de Tag y Medidas) */}
          <div
            style={{
              position: 'absolute',
              top: '-23px',
              left: '-2px',
              backgroundColor: ACCENT,
              color: '#ffffff',
              padding: '2px 7px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              borderRadius: '4px 4px 0 0',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            {tagName} · {Math.round(state.hoverRect.width)}×{Math.round(state.hoverRect.height)}
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
                backgroundColor: '#18181b',
                border: `1.5px solid ${ACCENT}`,
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

      {/* Panel Flotante de Edición — tema oscuro */}
      <div
        data-css-editor-panel="true"
        style={{ left: position.x, top: position.y, width: PANEL_WIDTH }}
        className="fixed bg-zinc-900 text-zinc-200 shadow-2xl ring-1 ring-white/10 rounded-xl overflow-hidden z-[2147483647] text-sm max-h-[80vh] flex flex-col font-sans"
      >
        {/* Encabezado */}
        <div
          onPointerDown={handleDragStart}
          className="flex justify-between items-center gap-2 px-3 py-2.5 bg-zinc-950 border-b border-white/5 cursor-move select-none"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical size={14} className="text-zinc-600 shrink-0" />
            <span className="font-semibold text-xs tracking-wide text-zinc-100 truncate">
              CSS Live Editor
            </span>
          </div>
          <button
            onClick={() => setState({ active: false, hoverRect: null, selectedSelector: null, selectedElement: null } as any)}
            className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {!state.selectedSelector && (
            <div className="flex flex-col items-center text-center gap-2 px-4 py-10 text-zinc-500">
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                <MousePointerClick size={16} className="text-violet-400" />
              </div>
              <p className="text-xs leading-relaxed max-w-[190px]">
                Hacé clic sobre un elemento de la página para editar su estilo.
              </p>
            </div>
          )}

          {state.selectedSelector && (
            <>
              {/* Selector actual */}
              <div className="px-3 pt-3 pb-2">
                <p
                  className="text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-md px-2 py-1.5 break-all"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
                  title={state.selectedSelector}
                >
                  {state.selectedSelector}
                </p>
              </div>

              {/* Menú de categorías (acordeón, se abre solo con clic, hacia abajo) */}
              <div className="px-3 pb-3 flex flex-col gap-1.5">
                {SECTIONS.map((section) => {
                  const isOpen = openSections.includes(section.title);
                  const Icon = getSectionIcon(section.title);
                  return (
                    <div
                      key={section.title}
                      className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="w-6 h-6 rounded-md bg-violet-500/10 text-violet-300 flex items-center justify-center shrink-0">
                          <Icon size={13} />
                        </span>
                        <span className="flex-1 text-xs font-medium text-zinc-200">
                          {section.title}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-zinc-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* El menú se despliega hacia abajo con una transición corta y deliberada */}
                      <div
                        className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1">
                            {section.fields.map((field) => (
                              <label key={field.key} className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-zinc-400">{field.label}</span>
                                {field.type === 'select' ? (
                                  <select
                                    value={fieldValue(field.key, 'select')}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-1.5 py-1 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                                  >
                                    <option value="">—</option>
                                    {field.options!.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : field.type === 'color' ? (
                                  <div className="w-8 h-6 rounded-md overflow-hidden border border-zinc-700 shrink-0">
                                    <input
                                      type="color"
                                      value={fieldValue(field.key, 'color') || '#000000'}
                                      onChange={(e) => handleChange(field.key, e.target.value)}
                                      className="w-full h-full border-none p-0 cursor-pointer bg-transparent"
                                    />
                                  </div>
                                ) : field.type === 'number' ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={fromPx(fieldValue(field.key, 'number'))}
                                      onChange={(e) => handleNumberChange(field.key, e.target.value)}
                                      className="bg-zinc-800 border border-zinc-700 rounded-md px-1.5 py-1 text-[11px] text-zinc-100 w-16 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                    <span className="text-[10px] text-zinc-500">px</span>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={fieldValue(field.key, 'text')}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="bg-zinc-800 border border-zinc-700 rounded-md px-1.5 py-1 text-[11px] text-zinc-100 w-24 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                                  />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Acciones sobre el elemento seleccionado */}
              <div className="flex gap-2 px-3 pb-3">
                <button
                  onClick={handleCopyCss}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                >
                  <Copy size={12} />
                  Copiar CSS
                </button>
                <button
                  onClick={handleResetSelector}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                >
                  <RotateCcw size={12} />
                  Reset elemento
                </button>
              </div>
            </>
          )}
        </div>

        {/* Pie fijo: acciones globales, siempre visibles (no dependen de tener un elemento seleccionado) */}
        <div className="flex gap-2 px-3 py-2.5 border-t border-white/5 bg-zinc-950">
          <button
            onClick={handleDownloadHtml}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
          >
            <Download size={12} />
            Descargar HTML
          </button>
          <button
            onClick={handleResetAll}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
          >
            <Trash2 size={12} />
            Reset página
          </button>
        </div>
      </div>
    </>
  );
}
