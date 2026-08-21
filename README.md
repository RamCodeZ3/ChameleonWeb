# ChameleonWeb

A browser extension that lets you visually select any element on a webpage and edit its CSS in real time — no DevTools required. Built for developers who want to quickly prototype style changes directly on a live site.

## Features

- **Visual element picker** — hover over any element to highlight it, click to select it.
- **Floating, draggable panel** — a small side panel appears on click, anchored to the top-right corner by default, and can be dragged anywhere on screen.
- **Resize handles** — drag the selection box's anchor points to resize the selected element (width/height) directly on the page.
- **Full style controls** — typography (font, size, weight, line height, alignment), colors (text, background, border), border radius/style/width, spacing (padding, margin), and size (width, height) — all with proper units (`px`) applied automatically, no need to type them.
- **Smart cascading** — text-related changes (color, font, etc.) automatically cascade to child elements. Resizing a container prevents its content from overflowing by capping child/media element widths.
- **Per-site persistence** — styles are saved per domain (`chrome.storage.local`), so your edits reload automatically the next time you visit the same site.
- **Export options**:
  - Copy the generated CSS ruleset to your clipboard.
  - Download the full page as a standalone `.html` file with your custom styles embedded.
- **Reset controls** — reset a single selected element, or reset all modified styles on the page at once.

## Tech Stack

- **[WXT](https://wxt.dev)** — extension framework (Manifest V3, dev server with HMR, cross-browser builds).
- **TypeScript**
- **React** — for the floating panel UI.
- **Tailwind CSS** — panel styling.
- **lucide-react** — icon set used in the panel.

## Architecture

The extension has two entrypoints — no popup:

```
entrypoints/
├── background.ts     # Listens for the toolbar icon click and toggles the picker
└── content.tsx        # Runs on every page: element picker, style engine, and the
                        # React panel (mounted inside a Shadow DOM for style isolation)
```

**How it works:**

1. Clicking the extension icon sends a `TOGGLE_PICKER` message to the active tab's content script.
2. While active, the content script tracks mouse movement and highlights the hovered element with an outline.
3. Clicking an element selects it, computes a stable CSS selector for it, and opens the panel.
4. Style changes made in the panel are written to an in-memory map (`selector → { property: value }`), which is compiled into real CSS rules and injected into the page via a single `<style>` tag — not inline styles. This keeps the output as clean, exportable CSS.
5. Every change is persisted to `chrome.storage.local`, keyed by the current hostname, and re-applied automatically on future visits to that site.

## Project Structure

```
entrypoints/
  background.ts
  content.tsx
components/
  Panel.tsx           # The floating editor panel
  panel-fields.ts      # Declarative definition of editable style fields, grouped by section
lib/
  types.ts             # Shared types (EditableStyles, SiteStyles, messages)
  selector.ts           # Generates a stable CSS selector for a clicked element
  store.ts               # Lightweight reactive store shared between DOM listeners and React
  style-store.ts          # Builds CSS text from the style map, persists/loads per-site styles
  units.ts                 # px <-> plain number conversion helpers for numeric inputs
assets/
  tailwind.css
```

## Getting Started

### Prerequisites

- Node.js
- pnpm
- Chrome or Brave (Chromium-based browsers)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the WXT dev server with hot module reload and (if `chromiumBinary` is configured in `wxt.config.ts`) launches the browser automatically with the extension loaded.

If you'd rather load it manually:

1. Open `brave://extensions` (or `chrome://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `.output/chrome-mv3-dev`.

### Build for production

```bash
pnpm build
```

### Package as a zip (for store submission)

```bash
pnpm zip
```

## Usage

1. Click the extension icon in the toolbar to activate the picker.
2. Hover over the page — elements highlight with an outline as you move the mouse.
3. Click an element to select it. The editor panel appears in the top-right corner.
4. Adjust styles in the panel; changes apply to the page instantly.
5. Drag the panel by its header to reposition it anywhere on screen.
6. Use the resize handles on the selection box to change the element's width/height directly.
7. When done, either:
   - **Copy CSS** to grab the generated stylesheet, or
   - **Download HTML** to export the full page with your changes baked in.
8. Press **Esc** or click the **X** to close the picker.

## Known Limitations

- Selector generation is a simple structural heuristic (tag + nth-of-type path). On highly dynamic pages (e.g., React/Vue apps with auto-generated class names), selectors may become unstable across re-renders.
- Padding and margin controls currently apply a single value to all four sides (shorthand only).
- Very large pages may see a brief scan delay when styles are first applied on load.

## License

GPL
