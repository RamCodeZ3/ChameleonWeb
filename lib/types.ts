export interface EditableStyles {
 color?: string;
 backgroundColor?: string;
 fontSize?: string;
 fontFamily?: string;
 fontWeight?: string;
 lineHeight?: string;
 textAlign?: string;
 width?: string;
 height?: string;
 padding?: string;
 margin?: string;
 borderRadius?: string;
 borderWidth?: string;
 borderColor?: string;
 borderStyle?: string;
}

export type StyleKey = keyof EditableStyles;

// selector -> rules for that selector
export type SiteStyles = Record<string, EditableStyles>;

export type ToggleMessage = { type: 'TOGGLE_PICKER' };
