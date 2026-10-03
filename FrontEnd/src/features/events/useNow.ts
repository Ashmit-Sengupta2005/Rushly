import { useSyncExternalStore } from 'react';

// One shared 1-second ticker for every clock/countdown on the page, instead of
// a setInterval per component. It only runs while something is subscribed.
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time in epoch ms, re-rendering once a second. */
export function useNow() {
  return useSyncExternalStore(subscribe, () => now);
}
