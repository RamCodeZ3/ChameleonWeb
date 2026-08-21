import type { StyleKey } from '@/lib/types';
export interface FieldDef {
 key: StyleKey;
 label: string;
 type: 'color' | 'text' | 'select' | 'number';
 options?: string[];
}
export const SECTIONS: { title: string; fields: FieldDef[] }[] = [
 {
  title: 'Size',
  fields: [
   { key: 'width', label: 'Width', type: 'number' },
   { key: 'height', label: 'Height', type: 'number' },
  ],
 },
 {
  title: 'Typography',
  fields: [
   { key: 'fontFamily', label: 'Font', type: 'text' },
   { key: 'fontSize', label: 'Font size', type: 'number' },
   {
    key: 'fontWeight',
    label: 'Weight',
    type: 'select',
    options: ['normal', 'bold', '300', '500', '700', '900'],
   },
   { key: 'lineHeight', label: 'Line height', type: 'text' },
   {
    key: 'textAlign',
    label: 'Alignment',
    type: 'select',
    options: ['left', 'center', 'right', 'justify'],
   },
   { key: 'color', label: 'Text color', type: 'color' },
  ],
 },
 {
  title: 'Background & borders',
  fields: [
   { key: 'backgroundColor', label: 'Background', type: 'color' },
   { key: 'borderColor', label: 'Border color', type: 'color' },
   { key: 'borderWidth', label: 'Border width', type: 'number' },
   {
    key: 'borderStyle',
    label: 'Border style',
    type: 'select',
    options: ['none', 'solid', 'dashed', 'dotted'],
   },
   { key: 'borderRadius', label: 'Corner radius', type: 'number' },
  ],
 },
 {
  title: 'Spacing',
  fields: [
   { key: 'padding', label: 'Padding (all sides)', type: 'number' },
   { key: 'margin', label: 'Margin (all sides)', type: 'number' },
  ],
 },
];
