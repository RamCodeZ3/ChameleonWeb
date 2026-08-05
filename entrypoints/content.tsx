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

    function isClickInsideUi(e: MouseEvent): boolean {
      return e.composedPath().includes(shadowHostEl);
    }

    function handleMouseMove(e: MouseEvent) {
      if (!getState().active) return;
      if (isClickInsideUi(e)) return;
      const target = e.target as Element;
      setState({ hoverRect: target.getBoundingClientRect() });
    }

    function handleClick(e: MouseEvent) {
      if (!getState().active) return;
      if (isClickInsideUi(e)) return;
      const target = e.target as Element;
      e.preventDefault();
      e.stopPropagation();
      setState({ selectedSelector: getUniqueSelector(target) });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setState({ active: false, hoverRect: null });
      }
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    browser.runtime.onMessage.addListener((message: ToggleMessage) => {
      if (message.type === 'TOGGLE_PICKER') {
        setState({ active: !getState().active });
      }
    });
  },
});
