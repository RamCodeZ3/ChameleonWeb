export type Category = 'background' | 'text' | 'primary' | 'secondary';
export type ColorProperty = 'color' | 'backgroundColor' | 'borderColor';

export interface ColorSwatch {
  rgb: string;
  hex: string;
  count: number;
}

export interface PaletteResult {
  background: ColorSwatch[];
  text: ColorSwatch[];
  primary: ColorSwatch[];
  secondary: ColorSwatch[];
}

export type ScanMessage = { type: 'SCAN' };
export type ApplyOverrideMessage = {
  type: 'APPLY_OVERRIDE';
  category: Category;
  rgb: string;
  newColor: string;
};
export type ResetMessage = { type: 'RESET' };

export type ExtensionMessage = ScanMessage | ApplyOverrideMessage | ResetMessage;
