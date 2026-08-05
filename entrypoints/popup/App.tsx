import { useEffect, useState } from 'react';
import type { Category, ColorSwatch, PaletteResult, ExtensionMessage } from '@/lib/types';

const CATEGORY_LABELS: Record<Category, string> = {
  primary: 'Primary color',
  secondary: 'Secondary color',
  background: 'Background',
  text: 'Text',
};

async function sendToActiveTab<T = any>(message: ExtensionMessage): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');
  return browser.tabs.sendMessage(tab.id, message) as Promise<T>;
}

export default function App() {
  const [palette, setPalette] = useState<PaletteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scan() {
    setLoading(true);
    setError(null);
    try {
      const result = await sendToActiveTab<PaletteResult>({ type: 'SCAN' });
      setPalette(result);
    } catch {
      setError('Could not scan this page. Reload the tab and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    scan();
  }, []);

  async function handleColorChange(category: Category, swatch: ColorSwatch, newColor: string) {
    await sendToActiveTab({ type: 'APPLY_OVERRIDE', category, rgb: swatch.rgb, newColor });
  }

  async function handleReset() {
    await sendToActiveTab({ type: 'RESET' });
    scan();
  }

  function handleCopy() {
    if (!palette) return;
    const lines: string[] = [];
    (Object.keys(palette) as Category[]).forEach((category) => {
      palette[category].forEach((swatch, i) => {
        lines.push(`--${category}-${i + 1}: ${swatch.hex};`);
      });
    });
    navigator.clipboard.writeText(`:root {\n  ${lines.join('\n  ')}\n}`);
  }

  return (
    <div className="w-80 p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-base">ChameleonWeb</h1>
        <button onClick={scan} className="text-xs underline">Rescan</button>
      </div>

      {loading && <p>Scanning page...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {palette &&
        (Object.keys(palette) as Category[]).map((category) => (
          <div key={category} className="mb-4">
            <h2 className="font-semibold mb-1">{CATEGORY_LABELS[category]}</h2>
            {palette[category].length === 0 && <p className="text-gray-500 text-xs">Not detected</p>}
            <div className="flex flex-wrap gap-2">
              {palette[category].map((swatch) => (
                <label key={swatch.rgb} className="flex flex-col items-center gap-1 cursor-pointer" title={`${swatch.hex} (${swatch.count} uses)`}>
                  <input
                    type="color"
                    defaultValue={swatch.hex}
                    onChange={(e) => handleColorChange(category, swatch, e.target.value)}
                    className="w-8 h-8 border-none p-0"
                  />
                  <span className="text-[10px]">{swatch.hex}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

      {palette && (
        <div className="flex gap-2 mt-4">
          <button onClick={handleCopy} className="flex-1 bg-slate-800 text-white rounded px-2 py-1 text-xs">
            Copy palette
          </button>
          <button onClick={handleReset} className="flex-1 bg-gray-200 rounded px-2 py-1 text-xs">
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
