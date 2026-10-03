import { create } from 'zustand';

// Colour themes layered on top of light/dark mode (next-themes owns that part).
// The CSS for each lives in index.css under [data-accent="…"].
export const ACCENTS = [
  { id: 'blaze', label: 'Blaze', swatch: 'linear-gradient(120deg, oklch(0.7 0.2 45), oklch(0.63 0.25 10))' },
  { id: 'ocean', label: 'Ocean', swatch: 'linear-gradient(120deg, oklch(0.62 0.19 250), oklch(0.56 0.24 295))' },
  { id: 'forest', label: 'Forest', swatch: 'linear-gradient(120deg, oklch(0.62 0.15 165), oklch(0.55 0.12 215))' },
] as const;

export type Accent = (typeof ACCENTS)[number]['id'];

// Keep in sync with the inline script in index.html (applies it before first paint)
const STORAGE_KEY = 'rushly-accent';

function isAccent(value: unknown): value is Accent {
  return ACCENTS.some((a) => a.id === value);
}

function readStored(): Accent {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isAccent(value) ? value : 'blaze';
  } catch {
    return 'blaze'; // storage blocked (private mode etc.) — default theme
  }
}

function apply(accent: Accent) {
  document.documentElement.dataset.accent = accent;
}

interface AccentState {
  accent: Accent;
  setAccent: (accent: Accent) => void;
}

export const useAccent = create<AccentState>((set) => ({
  accent: readStored(),
  setAccent: (accent) => {
    apply(accent);
    try {
      localStorage.setItem(STORAGE_KEY, accent);
    } catch {
      /* not persisted — still applied for this visit */
    }
    set({ accent });
  },
}));
