import { useSyncExternalStore } from 'react';
import type { EditableStyles, SiteStyles } from './types';

interface PickerState {
  active: boolean;
  hoverRect: DOMRect | null;
  selectedSelector: string | null;
  siteStyles: SiteStyles;
  position: { x: number; y: number } | null;
}

let state: PickerState = {
  active: false,
  hoverRect: null,
  selectedSelector: null,
  siteStyles: {},
  position: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function setState(patch: Partial<PickerState>) {
  state = { ...state, ...patch };
  emit();
}

export function updateSelectedStyle(key: keyof EditableStyles, value: string) {
  if (!state.selectedSelector) return;
  const selector = state.selectedSelector;
  const current = state.siteStyles[selector] ?? {};
  const next: SiteStyles = {
    ...state.siteStyles,
    [selector]: { ...current, [key]: value },
  };
  setState({ siteStyles: next });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePickerState() {
  return useSyncExternalStore(subscribe, getState);
}
