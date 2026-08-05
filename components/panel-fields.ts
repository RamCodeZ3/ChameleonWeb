import type { StyleKey } from '@/lib/types';

export interface FieldDef {
  key: StyleKey;
  label: string;
  type: 'color' | 'text' | 'select';
  options?: string[];
}

export const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Tipografía',
    fields: [
      { key: 'fontFamily', label: 'Fuente', type: 'text' },
      { key: 'fontSize', label: 'Tamaño', type: 'text' },
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
      { key: 'borderWidth', label: 'Grosor de borde', type: 'text' },
      { key: 'borderStyle', label: 'Estilo de borde', type: 'select', options: ['none', 'solid', 'dashed', 'dotted'] },
      { key: 'borderRadius', label: 'Radio de esquina', type: 'text' },
    ],
  },
  {
    title: 'Tamaño y espaciado',
    fields: [
      { key: 'width', label: 'Ancho', type: 'text' },
      { key: 'height', label: 'Alto', type: 'text' },
      { key: 'padding', label: 'Padding', type: 'text' },
      { key: 'margin', label: 'Margin', type: 'text' },
    ],
  },
];
