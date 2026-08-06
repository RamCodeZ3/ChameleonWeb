import type { StyleKey } from '@/lib/types';

export interface FieldDef {
  key: StyleKey;
  label: string;
  type: 'color' | 'text' | 'select' | 'number';
  options?: string[];
}

export const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Tamaño',
    fields: [
      { key: 'width', label: 'Ancho', type: 'number' },
      { key: 'height', label: 'Alto', type: 'number' },
    ],
  },
  {
    title: 'Tipografía',
    fields: [
      { key: 'fontFamily', label: 'Fuente', type: 'text' },
      { key: 'fontSize', label: 'Tamaño de texto', type: 'number' },
      { key: 'fontWeight', label: 'Grosor', type: 'select', options: ['normal', 'bold', '300', '500', '700', '900'] },
      { key: 'lineHeight', label: 'Interlineado', type: 'text' },
      { key: 'textAlign', label: 'Alineación', type: 'select', options: ['left', 'center', 'right', 'justify'] },
      { key: 'color', label: 'Color de texto', type: 'color' },
    ],
  },
  {
    title: 'Fondo y bordes',
    fields: [
      { key: 'backgroundColor', label: 'Fondo', type: 'color' },
      { key: 'borderColor', label: 'Color de borde', type: 'color' },
      { key: 'borderWidth', label: 'Grosor de borde', type: 'number' },
      { key: 'borderStyle', label: 'Estilo de borde', type: 'select', options: ['none', 'solid', 'dashed', 'dotted'] },
      { key: 'borderRadius', label: 'Radio de esquina', type: 'number' },
    ],
  },
  {
    title: 'Espaciado',
    fields: [
      { key: 'padding', label: 'Padding (todos los lados)', type: 'number' },
      { key: 'margin', label: 'Margin (todos los lados)', type: 'number' },
    ],
  },
];
