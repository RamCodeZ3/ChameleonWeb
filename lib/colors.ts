export function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const [, r, g, b] = match;
  return (
    '#' +
    [r, g, b].map((x) => parseInt(x, 10).toString(16).padStart(2, '0')).join('')
  );
}

export function isTransparent(color: string): boolean {
  if (!color) return true;
  if (color === 'transparent') return true;
  const match = color.match(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*(\d*\.?\d+)\)/);
  return !!match && parseFloat(match[1]) === 0;
}
