import type {
  Category,
  ColorProperty,
  ColorSwatch,
  ExtensionMessage,
  PaletteResult,
} from '@/lib/types';
import { rgbToHex, isTransparent } from '@/lib/colors';

interface Bucket {
  rgb: string;
  hex: string;
  count: number;
  elements: { el: HTMLElement; property: ColorProperty }[];
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let buckets: Record<Category, Bucket[]> | null = null;
    const overrides = new Map<HTMLElement, Partial<Record<ColorProperty, string>>>();

    const BLOCKLIST = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'NOSCRIPT', 'TITLE']);
    const BRAND_SELECTOR =
      'a, button, input[type="submit"], input[type="button"], nav, header, [class*="btn"], [class*="button"]';

    function cssPropName(p: ColorProperty): string {
      if (p === 'backgroundColor') return 'background-color';
      if (p === 'borderColor') return 'border-color';
      return 'color';
    }

    function addColor(map: Map<string, Bucket>, rgb: string, el: HTMLElement, property: ColorProperty) {
      if (isTransparent(rgb)) return;
      let bucket = map.get(rgb);
      if (!bucket) {
        bucket = { rgb, hex: rgbToHex(rgb), count: 0, elements: [] };
        map.set(rgb, bucket);
      }
      bucket.count += 1;
      bucket.elements.push({ el, property });
    }

    function topN(map: Map<string, Bucket>, n: number): Bucket[] {
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, n);
    }

    function serialize(list: Bucket[]): ColorSwatch[] {
      return list.map(({ rgb, hex, count }) => ({ rgb, hex, count }));
    }

    function scanPage(): PaletteResult {
      const bgMap = new Map<string, Bucket>();
      const textMap = new Map<string, Bucket>();
      const brandMap = new Map<string, Bucket>();

      const elements = Array.from(document.body.querySelectorAll<HTMLElement>('*')).slice(0, 4000);

      for (const el of elements) {
        if (BLOCKLIST.has(el.tagName)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const style = getComputedStyle(el);
        addColor(bgMap, style.backgroundColor, el, 'backgroundColor');

        if (el.textContent && el.textContent.trim().length > 0) {
          addColor(textMap, style.color, el, 'color');
        }

        if (el.matches(BRAND_SELECTOR)) {
          addColor(brandMap, style.backgroundColor, el, 'backgroundColor');
          addColor(brandMap, style.color, el, 'color');
        }
      }

      const backgroundTop = topN(bgMap, 5);
      const textTop = topN(textMap, 5);
      const brandTop = topN(brandMap, 10).filter(
        (b) => !backgroundTop[0] || b.rgb !== backgroundTop[0].rgb
      );

      const primaryBucket = brandTop.slice(0, 1);
      const secondaryBucket = brandTop.slice(1, 2);

      buckets = {
        background: backgroundTop,
        text: textTop,
        primary: primaryBucket,
        secondary: secondaryBucket,
      };

      return {
        background: serialize(backgroundTop),
        text: serialize(textTop),
        primary: serialize(primaryBucket),
        secondary: serialize(secondaryBucket),
      };
    }

    function applyOverride(category: Category, rgb: string, newColor: string) {
      const bucket = buckets?.[category].find((b) => b.rgb === rgb);
      if (!bucket) return;

      for (const { el, property } of bucket.elements) {
        if (!overrides.has(el)) overrides.set(el, {});
        const stored = overrides.get(el)!;
        const cssProp = cssPropName(property);
        if (!(property in stored)) {
          stored[property] = el.style.getPropertyValue(cssProp);
        }
        el.style.setProperty(cssProp, newColor, 'important');
      }
    }

    function resetAll() {
      for (const [el, props] of overrides.entries()) {
        for (const key of Object.keys(props) as ColorProperty[]) {
          const cssProp = cssPropName(key);
          const original = props[key];
          if (original) el.style.setProperty(cssProp, original);
          else el.style.removeProperty(cssProp);
        }
      }
      overrides.clear();
    }

    browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'SCAN') {
        sendResponse(scanPage());
      } else if (message.type === 'APPLY_OVERRIDE') {
        applyOverride(message.category, message.rgb, message.newColor);
        sendResponse({ ok: true });
      } else if (message.type === 'RESET') {
        resetAll();
        sendResponse({ ok: true });
      }
    });
  },
});
