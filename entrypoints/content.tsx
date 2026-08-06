import ReactDOM from 'react-dom/client';
import Panel from '@/components/Panel';
import { getUniqueSelector } from '@/lib/selector';
import { setState, getState } from '@/lib/store';
import { loadSiteStyles, buildCssText, injectStyleTag } from '@/lib/style-store';
import type { ToggleMessage } from '@/lib/types';
import '@/assets/tailwind.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Load and apply any previously saved styles for this site on page load
    const savedStyles = await loadSiteStyles();
    setState({ siteStyles: savedStyles });
    injectStyleTag(buildCssText(savedStyles));

    const ui = await createShadowRootUi(ctx, {
      name: 'css-live-editor-ui',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<Panel />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });

    ui.mount();

    const shadowHostEl = ui.shadowHost;

    // Etiquetas raíz/contenedoras que nunca se deben poder seleccionar.
    const IGNORED_TAGS = ['BODY', 'HTML', 'HEAD', 'SCRIPT', 'STYLE'];

    function isClickInsideUi(e: MouseEvent): boolean {
      return e.composedPath().includes(shadowHostEl);
    }

    // getBoundingClientRect() devuelve un DOMRect cuyas propiedades (top,
    // left, width, height) viven en el prototipo, no en la instancia. Si se
    // hace `{...rect}` en otro lado (como al redimensionar en Panel.tsx) el
    // resultado queda vacío y el recuadro "salta" a 0,0. Por eso siempre lo
    // convertimos a un objeto plano antes de guardarlo en el store.
    function rectToPlainObject(rect: DOMRect) {
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }

    // En vez de usar e.target (que puede resolver a BODY/HTML, o al propio
    // overlay del picker si hay elementos superpuestos), recorremos toda la
    // pila de elementos en ese punto -de más arriba a más abajo- y devolvemos
    // el primero que sea un elemento real de la página. Esto evita
    // seleccionar contenedores raíz y también "atraviesa" nuestra propia UI
    // si por algún motivo queda en el medio.
    function getElementAtPoint(x: number, y: number): HTMLElement | null {
      const stack = document.elementsFromPoint(x, y);
      for (const el of stack) {
        if (el === shadowHostEl) continue;
        if (IGNORED_TAGS.includes(el.tagName)) continue;
        return el as HTMLElement;
      }
      return null;
    }

    function clearSelection() {
      setState({ hoverRect: null, selectedSelector: null, selectedElement: null } as any);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!getState().active) return;
      if (isClickInsideUi(e)) return;
      // Una vez que hay un elemento seleccionado, dejamos de seguir el
      // mouse: si no, el rectángulo (y sus puntos de anclaje) se movían a
      // cualquier elemento que quedara bajo el cursor mientras el usuario
      // simplemente intentaba usar el panel.
      if (getState().selectedSelector) return;
      const target = getElementAtPoint(e.clientX, e.clientY);
      if (!target) return;
      setState({ hoverRect: rectToPlainObject(target.getBoundingClientRect()) });
    }

    function handleClick(e: MouseEvent) {
      if (!getState().active) return;
      if (isClickInsideUi(e)) return;
      const target = getElementAtPoint(e.clientX, e.clientY);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      // El click siempre fija (o cambia) la selección, aunque ya hubiera
      // una anterior: así se puede elegir otro elemento sin cerrar el panel.
      setState({
        selectedSelector: getUniqueSelector(target),
        selectedElement: target,
        hoverRect: rectToPlainObject(target.getBoundingClientRect()),
      } as any);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setState({ active: false } as any);
        clearSelection();
      }
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    browser.runtime.onMessage.addListener((message: ToggleMessage) => {
      if (message.type === 'TOGGLE_PICKER') {
        const nextActive = !getState().active;
        setState({ active: nextActive } as any);
        if (!nextActive) clearSelection();
      }
    });
  },
});
