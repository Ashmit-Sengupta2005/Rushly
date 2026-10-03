import { create } from 'zustand';

// Slide-out cart. Opened by the navbar bag button and after any add-to-cart.
interface CartDrawerState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCartDrawer = create<CartDrawerState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
