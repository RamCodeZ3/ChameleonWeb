import { usePickerState, updateSelectedStyle, setState } from '@/lib/store';
import { SECTIONS } from './panel-fields';
import { buildCssText, saveSiteStyles, injectStyleTag } from '@/lib/style-store';

export default function Panel() {
  const state = usePickerState();

  if (!state.active) return null;

  async function persist() {
    const css = buildCssText(state.siteStyles);
    injectStyleTag(css);
    await saveSiteStyles(state.siteStyles);
  }

  function handleChange(key: any, value: string) {
    updateSelectedStyle(key, value);
    setTimeout(persist, 0);
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

      <div className="fixed top-0 right-0 bottom-0 w-80 bg-white text-black shadow-2xl overflow-y-auto z-[2147483647] p-4 text-sm">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-bold">CSS Live Editor</h1>
          <button onClick={() => setState({ active: false })} className="text-xs underline">
            Cerrar
          </button>
        </div>

        {!state.selectedSelector && (
          <p className="text-gray-500">Haz clic en cualquier elemento de la página para editarlo.</p>
        )}

        {state.selectedSelector && (
          <>
            <p className="text-xs text-gray-500 mb-3 break-all">{state.selectedSelector}</p>

            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-4">
                <h2 className="font-semibold mb-2">{section.title}</h2>
                <div className="flex flex-col gap-2">
                  {section.fields.map((field) => (
                    <label key={field.key} className="flex items-center justify-between gap-2">
                      <span>{field.label}</span>
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
                      ) : (
                        <input
                          type="text"
                          value={(currentStyles as any)[field.key] ?? ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder="ej: 16px"
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
    </>
  );
}
