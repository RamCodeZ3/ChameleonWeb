import type { EditableStyles, SiteStyles } from './types';

const PROP_MAP: Record<keyof EditableStyles, string> = {
  color: 'color',
  backgroundColor: 'background-color',
  fontSize: 'font-size',
  fontFamily: 'font-family',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  textAlign: 'text-align',
  width: 'width',
  height: 'height',
  padding: 'padding',
  margin: 'margin',
  borderRadius: 'border-radius',
  borderWidth: 'border-width',
  borderColor: 'border-color',
  borderStyle: 'border-style',
};

function storageKey(): string {
  return `css-editor:${location.hostname}`;
}

export async function loadSiteStyles(): Promise<SiteStyles> {
  const result = await browser.storage.local.get(storageKey());
  return (result[storageKey()] as SiteStyles) ?? {};
}

export async function saveSiteStyles(styles: SiteStyles): Promise<void> {
  await browser.storage.local.set({ [storageKey()]: styles });
}

export function buildCssText(styles: SiteStyles): string {
  return Object.entries(styles)
    .map(([selector, rules]) => {
      const declarations = Object.entries(rules)
        .filter(([, value]) => value)
        .map(([key, value]) => `  ${PROP_MAP[key as keyof EditableStyles]}: ${value} !important;`)
        .join('\n');
      return declarations ? `${selector} {\n${declarations}\n}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

export function injectStyleTag(cssText: string) {
  let tag = document.getElementById('__css-live-editor-styles__') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = '__css-live-editor-styles__';
    document.documentElement.appendChild(tag);
  }
  tag.textContent = cssText;
}
