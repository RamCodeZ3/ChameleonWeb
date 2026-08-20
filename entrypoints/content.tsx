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
  main: async (ctx) => {
    // Carga y aplica los estilos guardados previamente para este sitio
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

    // Detecta si el clic/movimiento ocurrió sobre nuestra propia UI.
    // composedPath() incluye elementos dentro del shadow root (a diferencia
    // de e.target, que queda "aplanado"), y también cubre el <a> de
    // descarga que Panel.tsx inyecta fuera del shadow root pero marcado
    // con data-css-editor-panel.
    function isOwnUiElement(e: Event): boolean {
      return e.composedPath().some((node) => {
        if (node === shadowHostEl) return true;
        if (!(node instanceof Element)) return false;
        return node.hasAttribute('data-css-editor-panel');
      });
    }

    function handleMouseMove(e: MouseEvent) {
      if (!getState().active) return;
      if (isOwnUiElement(e)) return;
      // Solo mostramos el preview de hover mientras no haya nada
      // seleccionado; una vez seleccionado, Panel.tsx controla el
      // recuadro (incluye los puntos de resize).
      if (getState().selectedElement) return;
      const target = e.target as Element;
      setState({ hoverRect: target.getBoundingClientRect() } as any);
    }

    function handleClick(e: MouseEvent) {
      if (!getState().active) return;
      if (isOwnUiElement(e)) return;

      const target = e.target as HTMLElement;
      e.preventDefault();
      e.stopPropagation();

      setState({
        selectedSelector: getUniqueSelector(target),
        selectedElement: target,
        hoverRect: target.getBoundingClientRect(),
      } as any);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setState({
          active: false,
          hoverRect: null,
          selectedSelector: null,
          selectedElement: null,
        } as any);
      }
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    browser.runtime.onMessage.addListener((message: ToggleMessage) => {
      if (message.type === 'TOGGLE_PICKER') {
        const next = !getState().active;
        setState(
          next
            ? { active: true }
            : { active: false, hoverRect: null, selectedSelector: null, selectedElement: null } as any
        );
      }
    });
  },
});
