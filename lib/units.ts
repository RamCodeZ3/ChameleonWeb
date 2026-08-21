export function toPx(value: string | number): string {
 if (value === '' || value === undefined || value === null) return '';
 return `${value}px`;
}

export function fromPx(value?: string): string {
 if (!value) return '';
 const match = value.match(/(-?\d+(\.\d+)?)/);
 return match ? match[1] : '';
}
